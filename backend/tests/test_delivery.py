import asyncio
import io
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker


def test_delivery_access_regeneration_and_zip(monkeypatch, tmp_path):
    import database
    import main
    import worker
    engine = database.create_engine(f"sqlite:///{tmp_path}/orders.db", connect_args={"check_same_thread": False})
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setenv("ASSET_DIR", str(tmp_path / "assets"))
    database.init_db()
    payload = {"client": {"email": "test@example.com", "whatsapp": "11999999999", "instagram": "test"}, "config": {"niche": "café", "style": "clean", "title": "Café novo", "goal": "vendas", "titles": []}, "purchase": {"quantity": "3", "price": "R$ 9,90"}}
    order_id = database.record_checkout(payload, "test-payment")
    token = database.issue_order_access(order_id)
    headers = {"X-Order-Token": token}
    client = TestClient(main.app)
    assert client.get(f"/api/v1/orders/{order_id}/delivery").status_code == 403
    assert client.get(f"/api/v1/orders/{order_id}/delivery", headers={"X-Order-Token": "wrong"}).status_code == 403
    database.queue_paid_order("test-payment")
    assets_dir = tmp_path / "assets"
    assets_dir.mkdir()

    class FakeService:
        async def generate_campaign(self, niche, style, titles, goal, storage):
            output = []
            for title in titles:
                image_url = storage.save(b"PNG-image-bytes")
                output.append({"title": title, "caption": "Legenda pronta", "visual_prompt": "Prompt", "image_url": image_url})
            return output

    assert asyncio.run(worker.process_one(service=FakeService()))
    delivery = client.get(f"/api/v1/orders/{order_id}/delivery", headers=headers).json()
    assert delivery["status"] == "ready"
    download = client.get(f"/api/v1/orders/{order_id}/download", headers=headers)
    assert download.status_code == 200
    with zipfile.ZipFile(io.BytesIO(download.content)) as archive:
        assert "post-1.png" in archive.namelist()
        assert "Legenda pronta" in archive.read("legendas.txt").decode()
    path = f"/api/v1/orders/{order_id}/posts/0/regenerate"
    assert client.post(path).status_code == 403
    assert client.post(path, headers=headers).status_code == 200
    assert client.post(path, headers=headers).status_code == 409
    assert asyncio.run(worker.process_one(service=FakeService()))
    assert client.get(f"/api/v1/orders/{order_id}/delivery", headers=headers).json()["images"][0]["regeneration_status"] == "completed"
    engine.dispose()
