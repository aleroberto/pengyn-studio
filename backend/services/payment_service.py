import uuid
import logging

logger = logging.getLogger(__name__)

PRICE_MAP = {
    "3": "R$ 9,90",
    "6": "R$ 14,90",
    "12": "R$ 19,90",
}


class PaymentService:
    def __init__(self):
        self.merchant_key = "mock-payment-key"
        self._charges: dict[str, dict] = {}

    async def create_pix_charge(self, email: str, price: str, order: dict) -> dict:
        """
        Simula a criação de uma cobrança PIX e guarda o pedido para o webhook.
        """
        transaction_id = str(uuid.uuid4())
        logger.info(f"[PAYMENT] Criando cobrança de {price} para {email}. ID: {transaction_id}")

        charge = {
            "transaction_id": transaction_id,
            "pix_copia_e_cola": (
                f"00020101021226830014br.gov.bcb.pix2561{transaction_id}"
                "52040000530398654049.905802BR5913Pengyn Studio6009Sao Paulo62070503***6304"
            ),
            "status": "pending",
            "email": email,
            "price": price,
            "order": order,
        }
        self._charges[transaction_id] = charge
        return charge

    def get_charge(self, transaction_id: str) -> dict | None:
        return self._charges.get(transaction_id)

    def mark_paid(self, transaction_id: str) -> dict | None:
        charge = self._charges.get(transaction_id)
        if not charge:
            return None
        charge["status"] = "paid"
        return charge
