from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import uvicorn
from services.ia_service import IAService
from services.instagram_service import InstagramService

instagram_service = InstagramService()
ia_service = IAService()

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
    Recebe o payload completo do frontend e aciona a geração de imagens via IA.
    """
    print(f"Recebendo pedido de {payload.client.email} para o plano de {payload.purchase.quantity}")
    
    # Aciona o motor de serviço assíncrono que criamos
    ia_result = await ia_service.generate_post_image(
        niche=payload.config.niche,
        style=payload.config.style,
        title=payload.config.title
    )
    
    if ia_result["status"] == "error":
        raise HTTPException(status_code=500, detail=ia_result["message"])
        
    return {
        "success": True,
        "message": "Imagens geradas com sucesso via Inteligência Artificial!",
        "order_summary": {
            "client_email": payload.client.email,
            "items": payload.purchase.quantity,
            "total": payload.purchase.price
        },
        "generated_assets": [
            {
                "type": "image",
                "url": ia_result["image_url"]
            }
        ]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    