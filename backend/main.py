from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

import uvicorn

from services.ia_service import IAService
from services.instagram_service import InstagramService
from services.payment_service import PaymentService

instagram_service = InstagramService()
ia_service = IAService()
payment_service = PaymentService()

app = FastAPI(
    title="Pengyn Studio API",
    description="Backend para geração de posts e validação de dados com IA",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, substituiremos pelo domínio da Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# SCHEMAS DE DADOS (PYDANTIC)
# --------------------------------------------------------------------------
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

class PurchaseData(BaseModel):
    quantity: str
    price: str

class CheckoutPayload(BaseModel):
    config: PostConfig
    client: ClientData
    purchase: PurchaseData

# --------------------------------------------------------------------------
# ROTAS / ENDPOINTS
# --------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"status": "online", "message": "Bem-vindo à API do Pengyn Studio!"}

# 3. Atualize a rota antiga por esta:
@app.post("/api/v1/validate-instagram")
async def validate_instagram(request: ProfileValidationRequest):
    """
    Verifica em tempo real se o perfil do Instagram existe e está público.
    """
    result = await instagram_service.validate_profile(request.username)
    return result



@app.post("/api/v1/checkout")
async def create_checkout(payload: CheckoutPayload):
    """
    Inicia o pedido gerando a cobrança PIX mockada para o cliente.
    """
    charge = await payment_service.create_pix_charge(
        email=payload.client.email, 
        price=payload.purchase.price
    )
    
    return {
        "success": True,
        "message": "Cobrança gerada com sucesso! Aguardando pagamento.",
        "transaction_id": charge["transaction_id"],
        "pix_code": charge["pix_copia_e_cola"],
        "order_summary": {
            "client_email": payload.client.email,
            "items": payload.purchase.quantity,
            "total": payload.purchase.price
        }
    }

# MODELO DE PAYLOAD QUE O GATEWAY DE PAGAMENTO ENVIA PARA O WEBHOOK
class WebhookNotification(BaseModel):
    transaction_id: str
    event: str  # ex: "payment.approved", "payment.failed"
    email: str
    niche: str
    style: str
    title: str

@app.post("/api/v1/webhook/payment")
async def payment_webhook(notification: WebhookNotification):
    """
    O Gateway de pagamento chama essa rota quando o status do Pix muda.
    Se aprovado, inicia o motor de Inteligência Artificial.
    """
    print(f"\n[WEBHOOK] Notificação recebida para Transação: {notification.transaction_id}")
    print(f"[WEBHOOK] Evento: {notification.event} | Cliente: {notification.email}")
    
    if notification.event == "payment.approved":
        print("[WEBHOOK] Pagamento Aprovado! Disparando geração de posts com IA...")
        
        # Chama o serviço de IA em background
        ia_result = await ia_service.generate_post_image(
            niche=notification.niche,
            style=notification.style,
            title=notification.title
        )
        
        print(f"[WEBHOOK] IA Concluída! Imagem pronta para envio: {ia_result['image_url']}")
        # Aqui entraria a função de disparo de e-mail ou WhatsApp para entregar a imagem ao cliente
        
        return {"status": "processed", "action": "images_generated", "url": ia_result["image_url"]}
        
    return {"status": "ignored", "reason": "Evento não mapeado para liberação de assets."}
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    