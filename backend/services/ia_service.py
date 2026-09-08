import asyncio
import logging
import os

import httpx

logger = logging.getLogger(__name__)

MOCK_KEY = "mock-key-para-desenvolvimento-local"

MOCK_IMAGES = [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1080&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1080&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1080&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1080&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1080&h=1080&fit=crop",
]


class IAService:
    def __init__(self):
        self.api_key = os.getenv("IA_API_KEY", MOCK_KEY)
        self.api_url = "https://api.openai.com/v1/images/generations"
        self.model = os.getenv("IA_IMAGE_MODEL", "dall-e-3")

    def _prompt(self, niche: str, style: str, title: str, goal: str) -> str:
        goal_part = f" Marketing goal: {goal}." if goal else ""
        return (
            f"A professional social media post for Instagram about {niche}. "
            f"Visual style: {style}.{goal_part} "
            f"Main headline text to include or inspire: '{title}'. "
            "Commercial photography, high-end graphic design, centered composition, "
            "clean layout, perfect lighting, ultra-realistic, square 1:1."
        )

    async def generate_post_images(
        self,
        niche: str,
        style: str,
        titles: list[str],
        goal: str = "",
    ) -> dict:
        try:
            if not titles:
                titles = [f"{niche} — {style}"]

            logger.info(
                f"[IA SERVICE] Gerando {len(titles)} arte(s) para '{niche}' / '{style}'."
            )

            if self.api_key == MOCK_KEY:
                logger.info("[IA SERVICE] Usando modo mock para desenvolvimento")
                await asyncio.sleep(1.2)
                images = []
                for index, title in enumerate(titles):
                    images.append({
                        "title": title,
                        "image_url": MOCK_IMAGES[index % len(MOCK_IMAGES)],
                    })
                return {"status": "success", "images": images}

            images = []
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient() as client:
                for title in titles:
                    payload = {
                        "model": self.model,
                        "prompt": self._prompt(niche, style, title, goal),
                        "n": 1,
                        "size": "1024x1024",
                        "response_format": "url",
                    }
                    try:
                        response = await client.post(
                            self.api_url,
                            headers=headers,
                            json=payload,
                            timeout=45.0,
                        )
                    except httpx.RequestError as exc:
                        logger.error(f"[IA SERVICE] Erro de rede: {exc}")
                        return {
                            "status": "error",
                            "message": "Tempo limite esgotado ao conectar com a IA.",
                        }

                    if response.status_code != 200:
                        logger.error(f"[IA SERVICE] Erro na API externa: {response.text}")
                        return {
                            "status": "error",
                            "message": "Falha na comunicação com o motor de IA.",
                        }

                    data = response.json()
                    generated_url = data["data"][0]["url"]
                    images.append({"title": title, "image_url": generated_url})

            return {"status": "success", "images": images}
        except Exception as e:
            logger.error(f"[IA SERVICE] Erro inesperado na geração de imagens: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": "Erro inesperado ao gerar imagens. Tente novamente.",
            }
