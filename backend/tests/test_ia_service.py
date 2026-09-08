import pytest
from services.ia_service import IAService


@pytest.fixture
def ia_service():
    return IAService()


class TestIAService:
    def test_prompt_generation(self, ia_service):
        prompt = ia_service._prompt(
            niche="hamburgueria",
            style="premium",
            title="Hamburguer Artesanal",
            goal="vendas"
        )
        
        assert "hamburgueria" in prompt.lower()
        assert "premium" in prompt.lower()
        assert "hamburguer artesanal" in prompt.lower()
        assert "vendas" in prompt.lower()

    def test_prompt_generation_without_goal(self, ia_service):
        prompt = ia_service._prompt(
            niche="barbearia",
            style="minimalista",
            title="Corte Premium",
            goal=""
        )
        
        assert "barbearia" in prompt.lower()
        assert "minimalista" in prompt.lower()
        assert "corte premium" in prompt.lower()
        assert "marketing goal" not in prompt.lower()

    @pytest.mark.asyncio
    async def test_generate_post_images_mock(self, ia_service):
        # Usa a mock key para testar sem API real
        ia_service.api_key = "mock-key-para-desenvolvimento-local"
        
        result = await ia_service.generate_post_images(
            niche="hamburgueria",
            style="premium",
            titles=["Post 1", "Post 2"],
            goal="vendas"
        )
        
        assert result["status"] == "success"
        assert "images" in result
        assert len(result["images"]) == 2
        assert result["images"][0]["title"] == "Post 1"
        assert result["images"][1]["title"] == "Post 2"
        assert "image_url" in result["images"][0]

    @pytest.mark.asyncio
    async def test_generate_post_images_empty_titles(self, ia_service):
        ia_service.api_key = "mock-key-para-desenvolvimento-local"
        
        result = await ia_service.generate_post_images(
            niche="estetica",
            style="luxo",
            titles=[],
            goal=""
        )
        
        assert result["status"] == "success"
        assert len(result["images"]) == 1
        assert "estetica" in result["images"][0]["title"].lower()