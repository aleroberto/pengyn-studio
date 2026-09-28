# Pengyn Studio

Plataforma para geração de posts de Instagram com IA, permitindo criar artes ultra-realistas em segundos sem designer.

## 🚀 Visão Geral

O Pengyn Studio é uma aplicação web que permite:
- Criar estratégias personalizadas de posts para Instagram
- Gerar imagens ultra-realistas com IA
- Processar pagamentos via PIX (simulado na demo)
- Entregar posts prontos para uso

## 📁 Estrutura do Projeto

```
pengyn-studio/
├── backend/
│   ├── main.py              # API FastAPI principal
│   ├── requirements.txt     # Dependências Python
│   ├── Dockerfile          # Configuração Docker do backend
│   ├── vercel.json         # Configuração deploy Vercel
│   └── services/
│       ├── ia_service.py           # Serviço de geração de imagens
│       ├── instagram_service.py    # Validação de perfis Instagram
│       └── payment_service.py      # Processamento de pagamentos
├── frontend/
│   ├── index.html          # Página principal
│   ├── script.js           # Lógica frontend
│   ├── styles.css          # Estilos
│   └── images/             # Imagens estáticas
├── .github/
│   └── workflows/
│       └── ci.yml          # Pipeline CI/CD
├── docker-compose.yml      # Orquestração local
└── README.md               # Este arquivo
```

## 🛠️ Tecnologias

### Backend
- **FastAPI**: Framework web moderno e rápido
- **Python 3.11**: Linguagem principal
- **Pydantic**: Validação de dados
- **httpx**: Cliente HTTP assíncrono
- **OpenAI API**: Geração de imagens (configurável)

### Frontend
- **HTML5/CSS3**: Interface responsiva
- **JavaScript Vanilla**: Lógica de interação
- **CSS Grid/Flexbox**: Layout moderno

## 🚀 Como Executar

### Pré-requisitos
- Docker e Docker Compose
- Python 3.11+ (se não usar Docker)
- npm (opcional, para dependências futuras)

### Via Docker Compose (Recomendado)

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/pengyn-studio.git
cd pengyn-studio
```

2. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. Inicie os serviços:
```bash
docker-compose up --build
```

4. Acesse:
- Frontend: `http://localhost:8080` (precisa configurar servidor web)
- Backend API: `http://localhost:8000`
- Documentação API: `http://localhost:8000/docs`

### Via Python (Desenvolvimento Local)

1. Crie ambiente virtual:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

2. Instale dependências:
```bash
pip install -r requirements.txt
```

3. Configure variáveis de ambiente:
```bash
export IA_API_KEY="sua-chave-openai"  # ou use a mock key
export IA_IMAGE_MODEL="dall-e-3"
```

4. Execute o servidor:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

5. Abra o frontend diretamente no navegador:
```bash
cd ../frontend
# Abra index.html no navegador ou use um servidor web
python -m http.server 8080
```

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `IA_API_KEY` | Chave da API OpenAI para geração de imagens | `mock-key-para-desenvolvimento-local` |
| `IA_IMAGE_MODEL` | Modelo de IA para geração de imagens | `dall-e-3` |

### Endpoints da API

#### `GET /`
Status da API

#### `POST /api/v1/validate-instagram`
Valida perfil do Instagram (validação de sintaxe atualmente)

**Body:**
```json
{
  "username": "seu_perfil"
}
```

#### `POST /api/v1/checkout`
Cria cobrança PIX e inicia processo de checkout

**Body:**
```json
{
  "config": {
    "niche": "hamburgueria",
    "style": "premium",
    "title": "Hamburguer Artesanal",
    "goal": "vendas",
    "titles": ["Post 1", "Post 2"]
  },
  "client": {
    "instagram": "@seu_perfil",
    "whatsapp": "(11) 99999-9999",
    "email": "cliente@email.com"
  },
  "purchase": {
    "quantity": "3",
    "price": "R$ 9,90"
  }
}
```

#### `POST /api/v1/simulate-payment`
Simula pagamento aprovado (demo local)

**Body:**
```json
{
  "transaction_id": "uuid-da-transacao"
}
```

#### `POST /api/v1/webhook/payment`
Webhook para notificações de pagamento (integrar com gateway real)

## 🧪 Testes

Para executar os testes (quando implementados):
```bash
cd backend
pytest tests/
```

## 📦 Deploy

### Vercel (Backend)
O backend está configurado para deploy automático no Vercel através do `vercel.json`.

### GitHub Actions
CI/CD configurado para rodar em cada push/PR na branch `develop`:
- Linting com Flake8
- Validação de sintaxe Python
- Cache de dependências

## 🔧 Desenvolvimento

### Adicionar novos nichos
Edite `frontend/script.js` na função `generateDynamicStrategy()` para adicionar novas estratégias.

### Modificar preços
Atualize `PRICE_MAP` em `backend/services/payment_service.py` e os preços no frontend.

### Personalizar estilos
Modifique `frontend/styles.css` para ajustar cores, layouts e animações.

## 📝 Licença

Este projeto é uma demonstração educacional.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
## M1 — pedidos persistentes

O checkout agora devolve `order_id` e grava cliente, marca, campanha e pedido em banco.
`GET /api/v1/orders/{order_id}` informa o estado persistido do pedido e da campanha.
Use `DATABASE_URL=postgresql+psycopg://usuario:senha@host:5432/pengyn`
para PostgreSQL. Sem essa variável, o desenvolvimento local usa `backend/pengyn.db`
(SQLite). Configure um banco persistente no deploy: o disco temporário da Vercel
não serve para armazenar pedidos. O schema é criado automaticamente nesta primeira
etapa; migrações versionadas serão necessárias antes de alterar dados de produção.

O PIX e a geração ainda são simulados e executados no processo da API. O webhook
atual não autentica o remetente e **não deve ser exposto como confirmação real de
pagamento**. A próxima etapa integra geração, storage e processamento em segundo
plano; depois vem o gateway PIX com validação de webhook.

## M2 — geração de campanhas

O pagamento de demonstração coloca o pedido na fila persistida `generation_jobs`.
Execute a API e, em outro processo, `cd backend && python worker.py`. O worker
cria legenda e prompt visual com o modelo de texto, gera uma imagem por post com
`gpt-image-2`, salva os arquivos e registra os posts em `assets`. Consulte
`GET /api/v1/orders/{order_id}/delivery`; estados: `queued`, `generating`,
`ready` ou `failed`. A interface faz consultas periódicas após a simulação.

Variáveis do worker e da API:

- `OPENAI_API_KEY`: chave de API; necessária para imagens reais.
- `IA_TEXT_MODEL` (padrão `gpt-4o-mini`), `IA_IMAGE_MODEL` (padrão `gpt-image-2`), `IA_IMAGE_QUALITY` (padrão `medium`).
- `DATABASE_URL`: **a mesma URL** na API e no worker. PostgreSQL é recomendado para mais de um worker.
- `S3_BUCKET`, `S3_ENDPOINT_URL`, `ASSET_PUBLIC_BASE_URL`: bucket S3/R2 e URL pública correspondente. Configure credenciais AWS usuais (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) no worker. O bucket/URL deve permitir leitura dos assets entregues.
- Sem bucket, `ASSET_DIR` (padrão `./assets`) guarda imagens localmente, servidas em `/assets`. API e worker precisam compartilhar esse diretório; o Docker Compose já compartilha `/data`.
- `ENABLE_DEMO_PAYMENT=true` libera os endpoints de pagamento falso apenas para desenvolvimento. `ALLOW_MOCK_GENERATION=true` permite imagens demonstrativas sem API key.

Exemplo local: `docker compose up --build`. Para geração real: defina
`OPENAI_API_KEY` no `.env` e `ALLOW_MOCK_GENERATION=false`. O checkout ainda
emite PIX falso: **não use esse fluxo para cobrar clientes**. O endpoint de
webhook da demo não valida assinatura e fica desabilitado fora do modo demo.

O worker atual registra falhas para inspeção, mas não reprocessa automaticamente.
Não hospede o worker em Vercel; use um serviço contínuo com banco e storage
persistentes. A integração com OpenAI e S3/R2 exige credenciais próprias e ainda
não foi exercitada em ambiente externo.

## M3 — Pix pelo Mercado Pago

Defina `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` na API. O checkout usa
`POST /v1/payments` com `X-Idempotency-Key` por pedido e devolve o Pix gerado
pelo Mercado Pago. Cadastre `https://SEU_BACKEND/api/v1/webhooks/mercado-pago`
como URL de webhook para o tópico `payment`. O webhook verifica HMAC, busca o
pagamento no gateway e confere ID, referência, valor, meio Pix e status aprovado
antes de enfileirar a campanha. Eventos repetidos não criam outro job.

Sem `MP_ACCESS_TOKEN`, o checkout só funciona se `ENABLE_DEMO_PAYMENT=true`.
Com token configurado, os endpoints de simulação são bloqueados. **Não aceite
pagamentos reais antes de validar a integração em conta de testes e configurar
banco, worker e storage persistentes no mesmo ambiente.** A API na Vercel
sem worker contínuo não processa a campanha.

## M4 — entrega ao cliente

O checkout retorna `order_token` uma única vez. A interface o guarda na sessão
do navegador para acompanhar o pedido, consultar a galeria, pedir **uma** nova
versão por post e baixar imagens e legendas em ZIP. As rotas de pedido exigem
`X-Order-Token`; somente o hash do token é salvo no banco. Salve o token de
forma segura caso precise recuperar o pedido fora da sessão atual. Esse acesso
por token é provisório; histórico e login ficam para o M5.

Rotas: `GET /api/v1/orders/{id}/delivery`, `POST /api/v1/orders/{id}/posts/{position}/regenerate`
e `GET /api/v1/orders/{id}/download`. O ZIP usa o mesmo storage da geração.
Pedidos criados antes do M4 não possuem token e exigem uma estratégia de
migração antes de disponibilizá-los na nova interface. Em ambiente de demo,
as imagens ilustrativas externas não são armazenadas localmente; download
completo requer geração real e storage configurado.

## Interface — etapas 1 e 2

A página apresenta o modo de pagamento informado pela API (`payment_mode`:
`live`, `demo` ou `unavailable`) e diferencia exemplos visuais da campanha
criada para o cliente. A prévia da campanha é montada localmente a partir de
segmento, produto, público e objetivo; ela **não** chama a IA antes do pagamento.
O briefing completo é salvo em `campaign_briefs` e entregue ao worker para
orientar as legendas e os prompts visuais. A tabela adicional é criada no
bootstrap atual; antes de operar com dados em produção, use migrações versionadas.

## Interface — etapa 3

A página mostra preços antes do briefing, resume o pedido antes de gerar o Pix,
e permite copiar um link de acesso ao pedido. O link inclui o token no fragmento
(`#`): o navegador o lê e remove da barra após abrir; ele não é enviado na URL
para o servidor. Trate-o como uma senha: qualquer pessoa com esse link pode
consultar a campanha. O código Pix é recuperável pela rota autenticada
`GET /api/v1/orders/{id}/payment`. O status tem atualização manual se a espera
for longa. A entrega por e-mail continua fora desta etapa.
