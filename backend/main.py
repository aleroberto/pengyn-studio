from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, ValidationError
import logging
import uuid
import os
from pathlib import Path
import uvicorn

from database import attach_payment, fail_checkout, get_order, get_delivery, get_order_by_transaction_id, queue_paid_order, record_checkout, validate_payment
from services.ia_service import IAService
from services.instagram_service import InstagramService
from services.payment_service import PRICE_MAP, PaymentService
from services.mercado_pago import MercadoPagoService

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

instagram_service = InstagramService()
ia_service = IAService()
payment_service = PaymentService()
mercado_pago = MercadoPagoService()

app = FastAPI(
    title="Pengyn Studio API",
    description="Backend para geração de posts e validação de dados com IA",
    version="1.0.0",
)

Path(os.getenv("ASSET_DIR", "./assets")).mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=os.getenv("ASSET_DIR", "./assets")), name="assets")

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
    order_id = queue_paid_order(charge["transaction_id"])
    if order_id is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    payment_service.mark_paid(charge["transaction_id"])
    return {"status": "queued", "action": "generation_queued", "order_id": order_id, "images": []}


@app.get("/")
def read_root():
    return {"status": "online", "message": "Bem-vindo à API do Pengyn Studio!"}


@app.get("/api/v1/orders/{order_id}/delivery")
def read_delivery(order_id: str):
    result = get_delivery(order_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    return result


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

        if not mercado_pago.token and os.getenv("ENABLE_DEMO_PAYMENT", "false").lower() != "true":
            raise HTTPException(status_code=503, detail="Pagamento indisponível.")
        order_id = record_checkout(order, f"creating-{uuid.uuid4()}")
        try:
            if mercado_pago.token:
                charge = await mercado_pago.create_pix(order_id, str(payload.client.email), int(expected_price.replace("R$", "").strip().replace(",", "")))
                attach_payment(order_id, charge["transaction_id"])
            else:
                charge = await payment_service.create_pix_charge(email=str(payload.client.email), price=expected_price, order=order)
                attach_payment(order_id, charge["transaction_id"])
        except Exception:
            fail_checkout(order_id)
            raise
        logger.info(f"Cobrança criada com sucesso: {charge['transaction_id']}")
        return {
            "success": True,
            "message": "Cobrança gerada com sucesso! Aguardando pagamento.",
            "transaction_id": charge["transaction_id"],
            "order_id": order_id,
            "pix_code": charge["pix_copia_e_cola"],
            "ticket_url": charge.get("ticket_url"),
            "demo_payment": not bool(mercado_pago.token),
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
    if mercado_pago.token or os.getenv("ENABLE_DEMO_PAYMENT", "false").lower() != "true":
        raise HTTPException(status_code=404, detail="Simulação indisponível.")
    try:
        logger.info(f"Simulando pagamento para transação: {payload.transaction_id}")
        
        charge = payment_service.get_charge(payload.transaction_id)
        if not charge:
            logger.warning(f"Transação não encontrada: {payload.transaction_id}")
            raise HTTPException(status_code=404, detail="Transação não encontrada. Gere o PIX de novo.")

        if charge["status"] == "paid":
            return {"status": "queued", "order_id": get_order_by_transaction_id(charge["transaction_id"]), "images": []}

        logger.info(f"Processando pedido para transação: {payload.transaction_id}")
        result = await _fulfill_order(charge)
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
    if mercado_pago.token or os.getenv("ENABLE_DEMO_PAYMENT", "false").lower() != "true":
        raise HTTPException(status_code=404, detail="Webhook de demonstração indisponível.")
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


@app.post("/api/v1/webhooks/mercado-pago")
async def mercado_pago_webhook(request: Request):
    if not mercado_pago.token or not mercado_pago.secret:
        raise HTTPException(status_code=503, detail="Webhook indisponível.")
    data_id = request.query_params.get("data.id", "")
    if not mercado_pago.verify_signature(data_id, request.headers.get("x-request-id", ""), request.headers.get("x-signature", "")):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")
    body = await request.json()
    if body.get("type") != "payment" or str(body.get("data", {}).get("id")) != data_id:
        return {"status": "ignored"}
    try:
        payment = await mercado_pago.get_payment(data_id)
    except Exception:
        logger.exception("Falha ao consultar pagamento no Mercado Pago")
        raise HTTPException(status_code=502, detail="Falha ao verificar pagamento.")
    transaction_id = validate_payment(payment)
    if transaction_id:
        queue_paid_order(transaction_id)
    return {"status": "accepted"}
