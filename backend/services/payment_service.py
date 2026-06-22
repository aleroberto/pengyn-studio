import uuid
import logging

logger = logging.getLogger("uvicorn.error")

class PaymentService:
    def __init__(self):
        # Em produção, aqui ficariam os tokens do Asaas, Mercado Pago, etc.
        self.merchant_key = "mock-payment-key"

    async def create_pix_charge(self, email: str, price: str) -> dict:
        """
        Simula a criação de uma cobrança PIX no gateway de pagamento.
        Devolve um ID de transação fictício e um "Copy and Paste" do PIX.
        """
        transaction_id = str(uuid.uuid4())
        logger.info(f"[PAYMENT] Criando cobrança de {price} para {email}. ID: {transaction_id}")
        
        return {
            "transaction_id": transaction_id,
            "pix_copia_e_cola": f"00020101021226830014br.gov.bcb.pix2561{transaction_id}52040000530398654049.905802BR5913Pengyn Studio6009Sao Paulo62070503***6304",
            "status": "pending"
        }