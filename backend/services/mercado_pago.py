"""Mercado Pago Pix adapter. Never trust payment state from a browser or webhook body."""
import hashlib
import hmac
import os
import time
from decimal import Decimal

import httpx

API_URL = "https://api.mercadopago.com/v1/payments"


class MercadoPagoService:
    def __init__(self, token=None, secret=None):
        self.token = token if token is not None else os.getenv("MP_ACCESS_TOKEN", "")
        self.secret = secret if secret is not None else os.getenv("MP_WEBHOOK_SECRET", "")

    async def create_pix(self, order_id: str, email: str, amount_cents: int) -> dict:
        if not self.token:
            raise RuntimeError("MP_ACCESS_TOKEN não configurado")
        headers = {"Authorization": f"Bearer {self.token}", "X-Idempotency-Key": order_id}
        payload = {"transaction_amount": float(Decimal(amount_cents) / 100), "description": "Campanha Pengyn Studio", "payment_method_id": "pix", "payer": {"email": email}, "external_reference": order_id}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(API_URL, headers=headers, json=payload)
            response.raise_for_status()
        payment = response.json()
        transaction_data = payment.get("point_of_interaction", {}).get("transaction_data", {})
        if not payment.get("id") or not transaction_data.get("qr_code"):
            raise ValueError("Mercado Pago não retornou um código Pix válido")
        return {"transaction_id": str(payment["id"]), "pix_copia_e_cola": transaction_data["qr_code"], "ticket_url": transaction_data.get("ticket_url")}

    def verify_signature(self, data_id: str, request_id: str, signature: str) -> bool:
        if not self.secret or not data_id or not request_id or not signature:
            return False
        values = dict(part.strip().split("=", 1) for part in signature.split(",") if "=" in part)
        ts, expected = values.get("ts", ""), values.get("v1", "")
        if not ts.isdigit() or not expected:
            return False
        # Reject old replays. Mercado Pago uses Unix milliseconds in recent examples,
        # while some notifications/documentation use seconds.
        timestamp = int(ts) / (1000 if len(ts) > 10 else 1)
        if abs(time.time() - timestamp) > 300:
            return False
        manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{ts};"
        digest = hmac.new(self.secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(digest, expected.lower())

    async def get_payment(self, payment_id: str) -> dict:
        if not payment_id.isdigit():
            raise ValueError("ID de pagamento inválido")
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(f"{API_URL}/{payment_id}", headers={"Authorization": f"Bearer {self.token}"})
            response.raise_for_status()
            return response.json()
