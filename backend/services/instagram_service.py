import re
import logging

logger = logging.getLogger("uvicorn.error")

class InstagramService:
    def clean_username(self, input_string: str) -> str:
        """
        Limpa o input extraindo o username puro de links ou arrobas.
        """
        clean = input_string.strip().replace("@", "")
        
        if "instagram.com" in clean:
            match = re.search(r"instagram\.com/([^/?#]+)", clean)
            if match:
                clean = match.group(1)
        
        return clean.replace("/", "")

    async def validate_profile(self, raw_username: str) -> dict:
        """
        Valida estritamente se a string segue as regras oficiais de sintaxe do Instagram.
        """
        username = self.clean_username(raw_username)
        
        if not username:
          return {"valid": False, "message": "O campo do Instagram não pode ficar vazio."}

        # Regra 1: Limite de tamanho oficial
        if len(username) > 30:
            return {"valid": False, "message": "O nome de usuário não pode ter mais de 30 caracteres."}

        # Regra 2: Caracteres permitidos (letras, números, ponto e underline)
        # ^[a-zA-Z0-9._]+$ garante que toda a string siga esse padrão do início ao fim
        if not re.match(r"^[a-zA-Z0-9._]+$", username):
            return {"valid": False, "message": "Use apenas letras, números, pontos (.) ou sublinhados (_)."}
        
        logger.info(f"[INSTAGRAM] Sintaxe do perfil '@{username}' validada com sucesso.")
        return {
            "valid": True, 
            "username": username, 
            "message": "Formato de usuário válido."
        }