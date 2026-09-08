import pytest
from services.payment_service import PaymentService, PRICE_MAP


@pytest.fixture
def payment_service():
    return PaymentService()


class TestPaymentService:
    def test_price_map(self):
        assert PRICE_MAP["3"] == "R$ 9,90"
        assert PRICE_MAP["6"] == "R$ 14,90"
        assert PRICE_MAP["12"] == "R$ 19,90"

    @pytest.mark.asyncio
    async def test_create_pix_charge(self, payment_service):
        order = {
            "config": {"niche": "hamburgueria", "style": "premium"},
            "client": {"instagram": "@test", "whatsapp": "1199999999", "email": "test@test.com"},
            "purchase": {"quantity": "3", "price": "R$ 9,90"}
        }
        
        charge = await payment_service.create_pix_charge(
            email="test@test.com",
            price="R$ 9,90",
            order=order
        )
        
        assert "transaction_id" in charge
        assert "pix_copia_e_cola" in charge
        assert charge["status"] == "pending"
        assert charge["email"] == "test@test.com"
        assert charge["price"] == "R$ 9,90"

    def test_get_charge_exists(self, payment_service):
        # Primeiro cria uma charge
        import asyncio
        order = {"test": "data"}
        asyncio.run(payment_service.create_pix_charge("test@test.com", "R$ 9,90", order))
        
        # Pega a última charge criada
        charges = payment_service._charges
        if charges:
            transaction_id = list(charges.keys())[0]
            charge = payment_service.get_charge(transaction_id)
            assert charge is not None
            assert charge["transaction_id"] == transaction_id

    def test_get_charge_not_exists(self, payment_service):
        charge = payment_service.get_charge("non-existent-id")
        assert charge is None

    def test_mark_paid(self, payment_service):
        # Primeiro cria uma charge
        import asyncio
        order = {"test": "data"}
        charge = asyncio.run(payment_service.create_pix_charge("test@test.com", "R$ 9,90", order))
        transaction_id = charge["transaction_id"]
        
        # Marca como pago
        updated_charge = payment_service.mark_paid(transaction_id)
        assert updated_charge is not None
        assert updated_charge["status"] == "paid"

    def test_mark_paid_non_existent(self, payment_service):
        charge = payment_service.mark_paid("non-existent-id")
        assert charge is None