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
            "config": {"niche": "restaurante", "style": "premium", "title": "Menu de inverno", "titles": ["Prato 1"], "product": "Menu de inverno", "audience": "famílias", "colors": "azul", "notes": "sem preço"},
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
        from sqlalchemy import select
        with database.SessionLocal() as session:
            brief = session.scalar(select(database.CampaignBrief))
            assert brief.details["product"] == "Menu de inverno"
            assert brief.details["notes"] == "sem preço"
        assert client.get("/api/v1/orders/unknown").status_code == 403
        test_engine.dispose()


def test_payment_instructions_require_order_token(monkeypatch, tmp_path):
    import database
    import main
    from sqlalchemy.orm import sessionmaker
    engine = database.create_engine(f"sqlite:///{tmp_path}/orders.db", connect_args={"check_same_thread": False})
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=engine))
    database.init_db()
    payload = {"client": {"email": "buyer@example.com", "instagram": "buyer", "whatsapp": "11999999999"}, "config": {"niche": "café", "style": "premium", "title": "Café da casa", "goal": "", "titles": []}, "purchase": {"quantity": "3", "price": "R$ 9,90"}}
    order_id = database.record_checkout(payload, "transaction-123")
    token = database.issue_order_access(order_id)
    database.save_payment_instructions(order_id, "pix-code", None, True)
    client = TestClient(main.app)
    assert client.get(f"/api/v1/orders/{order_id}/payment").status_code == 403
    result = client.get(f"/api/v1/orders/{order_id}/payment", headers={"X-Order-Token": token})
    assert result.status_code == 200
    assert result.json()["pix_code"] == "pix-code"
    engine.dispose()
