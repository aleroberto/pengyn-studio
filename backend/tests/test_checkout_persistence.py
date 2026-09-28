"""Checkout survives a new database session and reports the correct state."""
import asyncio
import os
import tempfile

from fastapi.testclient import TestClient


def test_checkout_persists_order(monkeypatch):
    with tempfile.TemporaryDirectory() as directory:
        monkeypatch.setenv("ENABLE_DEMO_PAYMENT", "true")
        monkeypatch.setenv("DATABASE_URL", f"sqlite:///{directory}/orders.db")
        import database
        import main
        from sqlalchemy.orm import sessionmaker
        test_engine = database.create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
        monkeypatch.setattr(database, "engine", test_engine)
        monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=test_engine))
        database.init_db()
        client = TestClient(main.app)
        response = client.post("/api/v1/checkout", json={
            "config": {"niche": "restaurante", "style": "premium", "title": "Menu de inverno", "titles": ["Prato 1"]},
            "client": {"instagram": "restaurante", "whatsapp": "11999999999", "email": "owner@example.com"},
            "purchase": {"quantity": "3", "price": "R$ 9,90"},
        })
        assert response.status_code == 200, response.text
        order_id = response.json()["order_id"]
        saved = client.get(f"/api/v1/orders/{order_id}", headers={"X-Order-Token": response.json()["order_token"]})
        assert saved.status_code == 200
        assert saved.json()["status"] == "pending"
        assert saved.json()["amount_cents"] == 990
        assert saved.json()["campaign"]["title"] == "Menu de inverno"
        assert client.get("/api/v1/orders/unknown").status_code == 403
        test_engine.dispose()
