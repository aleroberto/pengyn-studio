import hashlib
import hmac
import time
from decimal import Decimal

import httpx
import pytest
from services.mercado_pago import MercadoPagoService


@pytest.mark.asyncio
async def test_pix_request_and_response(monkeypatch):
    async def handler(request):
        assert request.headers["X-Idempotency-Key"] == "order-123"
        import json
        body = json.loads(request.content)
        assert body["payment_method_id"] == "pix"
        assert Decimal(str(body["transaction_amount"])) == Decimal("9.9")
        assert body["external_reference"] == "order-123"
        return httpx.Response(201, json={"id": 12345, "point_of_interaction": {"transaction_data": {"qr_code": "PIX-REAL", "ticket_url": "https://example.test/pix"}}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client)
    service = MercadoPagoService(token="test-token", secret="test-secret")
    charge = await service.create_pix("order-123", "test@example.com", 990)
    assert charge["transaction_id"] == "12345"
    assert charge["pix_copia_e_cola"] == "PIX-REAL"
    await client.aclose()


def test_signature_rejects_tampering_and_replay():
    service = MercadoPagoService(token="test", secret="secret")
    ts = str(int(time.time()))
    request_id = "req-123"
    digest = hmac.new(b"secret", f"id:123;request-id:{request_id};ts:{ts};".encode(), hashlib.sha256).hexdigest()
    signature = f"ts={ts},v1={digest}"
    assert service.verify_signature("123", request_id, signature)
    assert not service.verify_signature("124", request_id, signature)
    assert not service.verify_signature("123", "other", signature)
    assert not service.verify_signature("123", request_id, f"ts=1,v1={digest}")


def test_payment_validation_checks_amount_reference_and_method(monkeypatch, tmp_path):
    import database
    from sqlalchemy.orm import sessionmaker
    engine = database.create_engine(f"sqlite:///{tmp_path}/orders.db", connect_args={"check_same_thread": False})
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=engine))
    database.init_db()
    order_id = database.record_checkout({"client": {"email": "x@example.com", "whatsapp": "11999999999", "instagram": "x"}, "config": {"niche": "x", "style": "x", "title": "x", "goal": "", "titles": []}, "purchase": {"quantity": "3", "price": "R$ 9,90"}}, "creating-id")
    database.attach_payment(order_id, "123")
    payment = {"id": "123", "status": "approved", "payment_method_id": "pix", "external_reference": order_id, "transaction_amount": 9.9}
    assert database.validate_payment(payment) == "123"
    assert database.validate_payment({**payment, "transaction_amount": 1}) is None
    assert database.validate_payment({**payment, "external_reference": "other"}) is None
    assert database.validate_payment({**payment, "payment_method_id": "visa"}) is None
    engine.dispose()
