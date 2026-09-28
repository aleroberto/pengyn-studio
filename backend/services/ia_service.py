import asyncio
import base64
import json
import logging
import os
import re

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
        self.api_key = os.getenv("OPENAI_API_KEY") or os.getenv("IA_API_KEY", MOCK_KEY)
        self.api_url = "https://api.openai.com/v1/images/generations"
        self.model = os.getenv("IA_IMAGE_MODEL", "gpt-image-2")

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

    async def generate_campaign(self, niche: str, style: str, titles: list[str], goal: str, storage, brief: dict | None = None) -> list[dict]:
        """Create copy and durable images. Mock output is explicit local demo only."""
        brief = brief or {}
        if self.api_key == MOCK_KEY:
            if os.getenv("ALLOW_MOCK_GENERATION", "false").lower() != "true":
                raise RuntimeError("Configure OPENAI_API_KEY para gerar campanhas reais.")
            return [{"title": title, "caption": f"Vamos falar de {re.sub(r'^\s*\d+\s*[.)-]\s*', '', title)}. O que você gostaria de saber sobre {brief.get('product') or niche}?", "visual_prompt": self._prompt(niche, style, title, goal), "image_url": MOCK_IMAGES[i % len(MOCK_IMAGES)]} for i, title in enumerate(titles)]

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        posts = []
        async with httpx.AsyncClient(timeout=180.0) as client:
            for title in titles:
                copy_response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json={
                    "model": os.getenv("IA_TEXT_MODEL", "gpt-4o-mini"),
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": "Você cria campanhas para pequenos negócios. Responda apenas JSON com as chaves caption e visual_prompt. Não invente preços, avaliações ou informações sobre o negócio."},
                        {"role": "user", "content": f"Crie legenda em português e prompt visual detalhado para um post sobre {niche}. Estilo: {style}. Tema: {title}. Objetivo: {goal}. "
                         f"Produto/serviço: {brief.get('product', '')}. Público: {brief.get('audience', '')}. "
                         f"Cores: {brief.get('colors', '')}. Orientações fornecidas pelo cliente: {brief.get('notes', '')}."},
                    ],
                })
                copy_response.raise_for_status()
                concept = json.loads(copy_response.json()["choices"][0]["message"]["content"])
                prompt = str(concept["visual_prompt"])[:2000]
                image_response = await client.post(self.api_url, headers=headers, json={
                    "model": self.model, "prompt": prompt, "size": "1024x1024", "quality": os.getenv("IA_IMAGE_QUALITY", "medium"), "n": 1,
                })
                image_response.raise_for_status()
                encoded = image_response.json()["data"][0]["b64_json"]
                image_url = storage.save(base64.b64decode(encoded, validate=True))
                posts.append({"title": title[:200], "caption": str(concept["caption"])[:2000], "visual_prompt": prompt, "image_url": image_url})
        return posts
