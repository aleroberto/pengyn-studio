import httpx
import os
import logging

logger = logging.getLogger("uvicorn.error")

class IAService:
    def __init__(self):
        # Buscaremos a chave das variáveis de ambiente em produção por segurança
        self.api_key = os.getenv("IA_API_KEY", "mock-key-para-desenvolvimento-local")
        # Exemplo usando a URL base padrão (pode ser OpenAI, Midjourney API, Leonardo.ai, etc.)
        self.api_url = "https://api.openai.com/v1/images/generations"

    async def generate_post_image(self, niche: str, style: str, title: str) -> dict:
        """
        Dispara a requisição assíncrona para a API de IA gerando um post padronizado em 1:1.
        """
        # Engenharia de Prompt: Injetamos as variáveis do usuário e blindamos a qualidade técnica
        prompt_final = (
            f"A professional social media post for Instagram about {niche}. "
            f"Visual style: {style}. Main headline text to include or inspire: '{title}'. "
            f"Commercial photography, high-end graphic design, centered composition, "
            f"clean layout, perfect lighting, ultra-realistic, 8k resolution."
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Payload configurado rigorosamente no formato quadrado exigido pelo nosso carrossel
        payload = {
            "prompt": prompt_final,
            "ncell": 1,
            "size": "1080x1080",  # Padrão absoluto do Instagram e do nosso Frontend
            "response_format": "url"
        }

        logger.info(f"[IA SERVICE] Iniciando geração para o nicho '{niche}' com estilo '{style}'...")

        # Em desenvolvimento local, se não houver chave real, simulamos a resposta em milissegundos
        if self.api_key == "mock-key-para-desenvolvimento-local":
            import asyncio
            await asyncio.sleep(1.5) # Simula o delay da rede
            
            # Mocks de imagens reais quadradas de alta qualidade para o fluxo de testes funcionar
            mock_images = {
                "hamburgueria": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1080&h=1080&fit=crop",
                "barbearia": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1080&h=1080&fit=crop",
                "estética": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1080&h=1080&fit=crop"
            }
            
            selected_url = mock_images.get(niche.lower(), "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&h=1080&fit=crop")
            
            return {"status": "success", "image_url": selected_url}

        # Bloco de chamada HTTP real usando o httpx assíncrono
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.api_url, headers=headers, json=payload, timeout=30.0)
                
                if response.status_code != 200:
                    logger.error(f"[IA SERVICE] Erro na API externa: {response.text}")
                    return {"status": "error", "message": "Falha na comunicação com o motor de IA."}
                
                data = response.json()
                # Captura a URL gerada (estrutura padrão baseada no DALL-E da OpenAI)
                generated_url = data["data"][0]["url"]
                return {"status": "success", "image_url": generated_url}
                
            except httpx.RequestError as exc:
                logger.error(f"[IA SERVICE] Erro de rede: {exc}")
                return {"status": "error", "message": "Tempo limite esgotado ao conectar com a IA."}