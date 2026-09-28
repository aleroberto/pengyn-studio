from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, ValidationError
import logging
import uvicorn

from database import get_order, record_checkout, update_order
from services.ia_service import IAService
from services.instagram_service import InstagramService
from services.payment_service import PRICE_MAP, PaymentService

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

instagram_service = InstagramService()
ia_service = IAService()
payment_service = PaymentService()

app = FastAPI(
    title="Pengyn Studio API",
    description="Backend para geração de posts e validação de dados com IA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler global
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    logger.error(f"Erro de validação: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erro não tratado: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Erro interno do servidor. Por favor, tente novamente."},
    )


class ProfileValidationRequest(BaseModel):
    username: str


class ClientData(BaseModel):
    instagram: str
    whatsapp: str
    email: EmailStr


class PostConfig(BaseModel):
    niche: str
    style: str
    title: str
    goal: str = ""
    titles: list[str] = Field(default_factory=list)


class PurchaseData(BaseModel):
    quantity: str
    price: str


class CheckoutPayload(BaseModel):
    config: PostConfig
    client: ClientData
    purchase: PurchaseData


class WebhookNotification(BaseModel):
    transaction_id: str
    event: str
    email: str | None = None
    niche: str | None = None
    style: str | None = None
    title: str | None = None


class SimulatePaymentRequest(BaseModel):
    transaction_id: str


def _expected_titles(quantity: int, titles: list[str], fallback_title: str) -> list[str]:
    cleaned = [item.strip() for item in titles if item and item.strip()]
    if len(cleaned) >= quantity:
        return cleaned[:quantity]
    while len(cleaned) < quantity:
        cleaned.append(f"{fallback_title} {len(cleaned) + 1}")
    return cleaned


async def _fulfill_order(charge: dict) -> dict:
    order = charge["order"]
    config = order["config"]
    titles = _expected_titles(
        quantity=int(order["purchase"]["quantity"]),
        titles=config.get("titles") or [],
        fallback_title=config.get("title") or f"{config['niche']} — {config['style']}",
    )

    ia_result = await ia_service.generate_post_images(
        niche=config["niche"],
        style=config["style"],
        titles=titles,
        goal=config.get("goal") or "",
    )

    if ia_result.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail=ia_result.get("message", "Falha ao gerar as artes."),
        )

    payment_service.mark_paid(charge["transaction_id"])
    update_order(charge["transaction_id"], "paid", "ready")
    images = ia_result["images"]
    return {
        "status": "processed",
        "action": "images_generated",
        "url": images[0]["image_url"],
        "images": images,
    }


@app.get("/")
def read_root():
    return {"status": "online", "message": "Bem-vindo à API do Pengyn Studio!"}


@app.get("/api/v1/orders/{order_id}")
def read_order(order_id: str):
    order = get_order(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    return order


@app.post("/api/v1/validate-instagram")
async def validate_instagram(request: ProfileValidationRequest):
    try:
        logger.info(f"Validando perfil Instagram: {request.username}")
        result = await instagram_service.validate_profile(request.username)
        logger.info(f"Resultado validação Instagram: {result['valid']}")
        return result
    except Exception as e:
        logger.error(f"Erro ao validar Instagram: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro ao validar perfil do Instagram. Tente novamente."
        )


@app.post("/api/v1/checkout")
async def create_checkout(payload: CheckoutPayload):
    try:
        logger.info(f"Iniciando checkout para email: {payload.client.email}")
        
        instagram = await instagram_service.validate_profile(payload.client.instagram)
        if not instagram["valid"]:
            logger.warning(f"Instagram inválido: {instagram['message']}")
            raise HTTPException(status_code=400, detail=instagram["message"])

        whatsapp = instagram_service.normalize_whatsapp(payload.client.whatsapp)
        if not whatsapp["valid"]:
            logger.warning(f"WhatsApp inválido: {whatsapp['message']}")
            raise HTTPException(status_code=400, detail=whatsapp["message"])

        quantity = str(payload.purchase.quantity)
        expected_price = PRICE_MAP.get(quantity)
        if not expected_price:
            logger.warning(f"Quantidade inválida: {quantity}")
            raise HTTPException(status_code=400, detail="Pacote inválido. Escolha 3, 6 ou 12 posts.")

        if payload.purchase.price != expected_price:
            logger.warning(f"Preço incorreto: esperado {expected_price}, recebido {payload.purchase.price}")
            raise HTTPException(status_code=400, detail="O preço do pacote não confere.")

        order = {
            "config": {
                "niche": payload.config.niche,
                "style": payload.config.style,
                "title": payload.config.title,
                "goal": payload.config.goal,
                "titles": payload.config.titles,
            },
            "client": {
                "instagram": instagram["username"],
                "whatsapp": whatsapp["digits"],
                "email": str(payload.client.email),
            },
            "purchase": {
                "quantity": quantity,
                "price": expected_price,
            },
        }

        logger.info(f"Criando cobrança PIX para {expected_price}")
        charge = await payment_service.create_pix_charge(
            email=str(payload.client.email),
            price=expected_price,
            order=order,
        )

        order_id = record_checkout(order, charge["transaction_id"])
        logger.info(f"Cobrança criada com sucesso: {charge['transaction_id']}")
        return {
            "success": True,
            "message": "Cobrança gerada com sucesso! Aguardando pagamento.",
            "transaction_id": charge["transaction_id"],
            "order_id": order_id,
            "pix_code": charge["pix_copia_e_cola"],
            "order_summary": {
                "client_email": str(payload.client.email),
                "instagram": instagram["username"],
                "items": quantity,
                "total": expected_price,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no checkout: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro ao processar checkout. Tente novamente."
        )


@app.post("/api/v1/simulate-payment")
async def simulate_payment(payload: SimulatePaymentRequest):
    """
    Atalho da demo local: marca o PIX mockado como pago e dispara a geração.
    """
    try:
        logger.info(f"Simulando pagamento para transação: {payload.transaction_id}")
        
        charge = payment_service.get_charge(payload.transaction_id)
        if not charge:
            logger.warning(f"Transação não encontrada: {payload.transaction_id}")
            raise HTTPException(status_code=404, detail="Transação não encontrada. Gere o PIX de novo.")

        if charge["status"] == "paid" and charge.get("images"):
            logger.info(f"Transação já processada, retornando imagens existentes")
            images = charge["images"]
            return {
                "status": "processed",
                "action": "images_generated",
                "url": images[0]["image_url"],
                "images": images,
            }

        logger.info(f"Processando pedido para transação: {payload.transaction_id}")
        result = await _fulfill_order(charge)
        charge["images"] = result["images"]
        logger.info(f"Pedido processado com sucesso: {payload.transaction_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao simular pagamento: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro ao processar simulação de pagamento. Tente novamente."
        )


@app.post("/api/v1/webhook/payment")
async def payment_webhook(notification: WebhookNotification):
    try:
        logger.info(f"Webhook recebido: {notification.event} para transação {notification.transaction_id}")
        
        charge = payment_service.get_charge(notification.transaction_id)
        if not charge:
            logger.warning(f"Transação não encontrada no webhook: {notification.transaction_id}")
            raise HTTPException(status_code=404, detail="Transação não encontrada.")

        if notification.event != "payment.approved":
            logger.info(f"Evento ignorado: {notification.event}")
            return {"status": "ignored", "reason": "Evento não mapeado para liberação de assets."}

        logger.info(f"Processando webhook para transação: {notification.transaction_id}")
        result = await _fulfill_order(charge)
        charge["images"] = result["images"]
        logger.info(f"Webhook processado com sucesso: {notification.transaction_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no webhook de pagamento: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro ao processar webhook de pagamento."
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
