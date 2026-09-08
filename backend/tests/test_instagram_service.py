import pytest
from services.instagram_service import InstagramService


@pytest.fixture
def instagram_service():
    return InstagramService()


class TestInstagramService:
    def test_clean_username_simple(self, instagram_service):
        assert instagram_service.clean_username("john_doe") == "john_doe"
        assert instagram_service.clean_username("@john_doe") == "john_doe"

    def test_clean_username_with_url(self, instagram_service):
        assert instagram_service.clean_username("https://instagram.com/john_doe") == "john_doe"
        assert instagram_service.clean_username("instagram.com/john_doe") == "john_doe"
        assert instagram_service.clean_username("https://instagram.com/john_doe/") == "john_doe"

    def test_clean_username_with_special_chars(self, instagram_service):
        assert instagram_service.clean_username("john.doe.123") == "john.doe.123"
        assert instagram_service.clean_username("john_doe_test") == "john_doe_test"

    def test_validate_profile_valid(self, instagram_service):
        result = instagram_service.clean_username("valid_user123")
        assert result == "valid_user123"

    @pytest.mark.asyncio
    async def test_validate_profile_empty(self, instagram_service):
        result = await instagram_service.validate_profile("")
        assert result["valid"] is False
        assert "vazio" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_validate_profile_too_long(self, instagram_service):
        result = await instagram_service.validate_profile("a" * 31)
        assert result["valid"] is False
        assert "30" in result["message"]

    @pytest.mark.asyncio
    async def test_validate_profile_invalid_chars(self, instagram_service):
        result = await instagram_service.validate_profile("user#name")
        assert result["valid"] is False
        assert "letras" in result["message"].lower() or "caracteres" in result["message"].lower()

    def test_normalize_whatsapp_valid_10_digits(self, instagram_service):
        result = instagram_service.normalize_whatsapp("(11) 9999-9999")
        assert result["valid"] is True
        assert result["digits"] == "1199999999"

    def test_normalize_whatsapp_valid_11_digits(self, instagram_service):
        result = instagram_service.normalize_whatsapp("(11) 99999-9999")
        assert result["valid"] is True
        assert result["digits"] == "11999999999"

    def test_normalize_whatsapp_with_country_code(self, instagram_service):
        result = instagram_service.normalize_whatsapp("+55 11 99999-9999")
        assert result["valid"] is True
        assert result["digits"] == "11999999999"

    def test_normalize_whatsapp_invalid_digits(self, instagram_service):
        result = instagram_service.normalize_whatsapp("(11) 999-999")
        assert result["valid"] is False
        assert "10 ou 11" in result["message"]

    def test_normalize_whatsapp_empty(self, instagram_service):
        result = instagram_service.normalize_whatsapp("")
        assert result["valid"] is False