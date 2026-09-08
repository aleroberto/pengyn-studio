import re
import logging
import os
import httpx

logger = logging.getLogger(__name__)

WHATSAPP_DIGITS_RE = re.compile(r"\D")


class InstagramService:
    def __init__(self):
        self.instagram_api_key = os.getenv("INSTAGRAM_API_KEY")
        self.enable_real_validation = os.getenv("ENABLE_REAL_INSTAGRAM_VALIDATION", "false").lower() == "true"

    def clean_username(self, input_string: str) -> str:
        clean = input_string.strip().replace("@", "")

        if "instagram.com" in clean:
            match = re.search(r"instagram\.com/([^/?#]+)", clean)
            if match:
                clean = match.group(1)

        return clean.replace("/", "")

    async def validate_profile(self, raw_username: str) -> dict:
        username = self.clean_username(raw_username)

        if not username:
            return {"valid": False, "message": "O campo do Instagram não pode ficar vazio."}

        if len(username) > 30:
            return {"valid": False, "message": "O nome de usuário não pode ter mais de 30 caracteres."}

        if not re.match(r"^[a-zA-Z0-9._]+$", username):
            return {"valid": False, "message": "Use apenas letras, números, pontos (.) ou sublinhados (_)."}

        # Validação sintática passou, agora tenta validação real se habilitada
        if self.enable_real_validation and self.instagram_api_key:
            return await self._validate_profile_real(username)

        logger.info(f"[INSTAGRAM] Sintaxe do perfil '@{username}' validada com sucesso.")
        return {
            "valid": True,
            "username": username,
            "message": "Formato de usuário válido.",
        }

    async def _validate_profile_real(self, username: str) -> dict:
        """
        Validação real usando API do Instagram (Graph API ou similar).
        Requer INSTAGRAM_API_KEY configurada.
        """
        try:
            logger.info(f"[INSTAGRAM] Validando perfil real '@{username}'")
            
            # Exemplo de implementação usando Graph API do Facebook/Instagram
            # Nota: Isso requer configuração de app no Facebook Developers
            headers = {
                "Authorization": f"Bearer {self.instagram_api_key}",
            }
            
            # URL fictícia - substituir pela endpoint real da API do Instagram
            url = f"https://graph.instagram.com/{username}?fields=username,account_type"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"[INSTAGRAM] Perfil '@{username}' validado com sucesso via API")
                    return {
                        "valid": True,
                        "username": username,
                        "message": "Perfil validado com sucesso.",
                        "account_type": data.get("account_type", "unknown")
                    }
                elif response.status_code == 404:
                    logger.warning(f"[INSTAGRAM] Perfil '@{username}' não encontrado")
                    return {
                        "valid": False,
                        "message": "Perfil do Instagram não encontrado."
                    }
                else:
                    logger.error(f"[INSTAGRAM] Erro na API: {response.status_code}")
                    # Fallback para validação sintática em caso de erro da API
                    return self._fallback_validation(username)
                    
        except httpx.RequestError as exc:
            logger.error(f"[INSTAGRAM] Erro de rede na validação real: {exc}")
            return self._fallback_validation(username)
        except Exception as e:
            logger.error(f"[INSTAGRAM] Erro inesperado na validação real: {str(e)}")
            return self._fallback_validation(username)

    def _fallback_validation(self, username: str) -> dict:
        """
        Fallback para validação sintática quando a API real falha.
        """
        logger.warning(f"[INSTAGRAM] Usando validação sintática como fallback para '@{username}'")
        return {
            "valid": True,
            "username": username,
            "message": "Formato de usuário válido (validação de API indisponível).",
        }

    def normalize_whatsapp(self, raw_value: str) -> dict:
        digits = WHATSAPP_DIGITS_RE.sub("", raw_value or "")
        if digits.startswith("55") and len(digits) in (12, 13):
            digits = digits[2:]

        if len(digits) not in (10, 11):
            return {
                "valid": False,
                "digits": digits,
                "message": "Informe um WhatsApp com DDD e 10 ou 11 dígitos.",
            }

        return {"valid": True, "digits": digits, "message": "WhatsApp válido."}
