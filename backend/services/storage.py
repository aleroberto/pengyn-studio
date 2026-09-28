"""Keep generated images beyond the lifetime of an OpenAI response."""
import os
from pathlib import Path
from uuid import uuid4


class ImageStorage:
    def save(self, image: bytes) -> str:
        key = f"{uuid4().hex}.png"
        bucket = os.getenv("S3_BUCKET")
        if bucket:
            import boto3
            client = boto3.client("s3", endpoint_url=os.getenv("S3_ENDPOINT_URL") or None)
            client.put_object(Bucket=bucket, Key=f"campaigns/{key}", Body=image, ContentType="image/png")
            base = os.environ["ASSET_PUBLIC_BASE_URL"].rstrip("/")
            return f"{base}/campaigns/{key}"
        directory = Path(os.getenv("ASSET_DIR", "./assets"))
        directory.mkdir(parents=True, exist_ok=True)
        (directory / key).write_bytes(image)
        return f"/assets/{key}"
