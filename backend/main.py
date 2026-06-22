from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import uvicorn

app = FastAPI(
    title="Pengyn Studio API",
    description="Backend para geração de posts e validação de dados com IA",
    version="1.0.0"
)

# Configuração do CORS para o Frontend se conectar localmente sem travar
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

@app.post("/api/v1/validate-instagram")
async def validate_instagram(request: ProfileValidationRequest):
    """
    Rota rápida para verificar se o perfil do Instagram existe e está público.
    """
    clean_username = request.username.strip().replace("@", "").split("/")[-1]
    
    if not clean_username or clean_username.lower() == "null":
        raise HTTPException(status_code=400, detail="Nome de usuário inválido.")
    
    # Mock inicial de validação simunlando o comportamento do Redis/API
    # Se digitar apenas números ou "erro", simulamos o comportamento de perfil não encontrado
    if clean_username.isdigit() or clean_username.lower() == "erro":
        return {
            "valid": False, 
            "message": "Perfil não foi encontrado, verifique se digitou corretamente."
        }
        
    return {
        "valid": True, 
        "username": clean_username, 
        "message": "Perfil validado com sucesso!"
    }

@app.post("/api/v1/checkout")
async def create_checkout(payload: CheckoutPayload):
    """
    Recebe o payload completo do frontend para iniciar o processo de pagamento e IA.
    """
    print(f"Recebendo pedido de {payload.client.email} para o plano de {payload.purchase.quantity}")
    
    # Aqui entrará a lógica do webhook da Juno/MercadoPago e a fila do Celery/Background Tasks
    return {
        "success": True,
        "message": "Payload recebido! Aguardando confirmação de pagamento para iniciar geração via IA.",
        "order_summary": {
            "client_email": payload.client.email,
            "items": payload.purchase.quantity,
            "total": payload.purchase.price
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)