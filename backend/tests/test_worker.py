import asyncio
import os
import tempfile

from sqlalchemy.orm import sessionmaker


def test_paid_order_is_queued_and_delivered_once(monkeypatch):
    with tempfile.TemporaryDirectory() as directory:
        import database
        import worker
        db_engine = database.create_engine(f"sqlite:///{directory}/orders.db", connect_args={"check_same_thread": False})
        monkeypatch.setattr(database, "engine", db_engine)
        monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=db_engine))
        database.init_db()
        payload = {"client": {"email": "test@example.com", "whatsapp": "11999999999", "instagram": "test"}, "config": {"niche": "café", "style": "clean", "title": "Café novo", "goal": "venda", "titles": ["Especial"]}, "purchase": {"quantity": "3", "price": "R$ 9,90"}}
        order_id = database.record_checkout(payload, "transaction-test")
        assert database.queue_paid_order("transaction-test") == order_id
        assert database.queue_paid_order("transaction-test") == order_id

        class FakeService:
            async def generate_campaign(self, niche, style, titles, goal, storage):
                assert titles == ["Especial", "Café novo 2", "Café novo 3"]
                return [{"title": title, "caption": "Legenda", "visual_prompt": "Prompt", "image_url": f"/assets/{i}.png"} for i, title in enumerate(titles)]

        assert asyncio.run(worker.process_one(service=FakeService())) is True
        assert asyncio.run(worker.process_one(service=FakeService())) is False
        delivery = database.get_delivery(order_id)
        assert delivery["status"] == "ready"
        assert len(delivery["images"]) == 3
        db_engine.dispose()
