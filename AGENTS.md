# Pengyn Studio - Project Information

## Build Commands

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Docker
```bash
docker-compose up --build
```

### Tests
```bash
cd backend
pytest tests/
```

## Test Commands
```bash
cd backend
pytest tests/ -v
pytest tests/ -v --cov=services  # Requires pytest-cov
```

## Verification Steps
1. Start backend: `uvicorn main:app --reload --host 127.0.0.1 --port 8000`
2. Access API docs: `http://127.0.0.1:8000/docs`
3. Run tests: `pytest tests/`
4. Check Docker: `docker-compose up --build`

## Project Structure
- **Backend**: FastAPI application with services for AI, Instagram validation, and payment processing
- **Frontend**: Vanilla HTML/CSS/JS for user interface
- **Services**:
  - `ia_service.py`: Image generation with OpenAI API (mocked by default)
  - `instagram_service.py`: Instagram profile validation (syntax + optional real validation)
  - `payment_service.py`: Mock payment processing with PIX simulation

## Environment Variables
- `IA_API_KEY`: OpenAI API key (default: mock for development)
- `IA_IMAGE_MODEL`: AI model (default: dall-e-3)
- `INSTAGRAM_API_KEY`: Instagram Graph API key (optional, for real validation)
- `ENABLE_REAL_INSTAGRAM_VALIDATION`: Enable real Instagram validation (default: false)

## Known Issues/Limitations
- Instagram validation currently only checks syntax unless real validation is enabled
- Payment processing is mocked - needs real gateway integration
- Images are mocked unless OpenAI API key is provided
- Frontend needs web server for proper deployment

## CI/CD
- GitHub Actions runs on push/PR to `develop` branch
- Uses Flake8 for linting
- Caches pip dependencies for faster builds

## Deployment
- Backend configured for Vercel deployment via `vercel.json`
- Frontend needs web server configuration for production