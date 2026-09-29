# Piloto assistido na Netlify

Esta branch publica apenas `frontend/`. A prévia do conteúdo é feita no navegador. O botão final abre o WhatsApp com o briefing preenchido; a pessoa revisa e envia a mensagem. O site não cria cobrança, não confirma pagamento, não inicia o worker e não entrega arquivos automaticamente.

## Publicação

1. Crie um site na Netlify conectado ao repositório `pengyn-studio`.
2. Selecione a branch `feat/netlify-assisted-pilot` como branch de publicação.
3. A configuração `netlify.toml` na raiz define `frontend` como diretório publicado. Não há comando de build nem variáveis secretas.
4. Abra a URL de prévia da Netlify e teste o fluxo completo no celular antes de divulgar o endereço.

Não publique a pasta `backend/` nessa versão. Não coloque tokens do Mercado Pago ou da OpenAI no frontend ou nas configurações de build do site estático.

## Operação dos primeiros pedidos

1. Confirme que o número `+55 11 96785-8493` e o e-mail de atendimento publicados estão funcionando.
2. Receba o briefing pelo WhatsApp, confirme pacote, preço, prazo e forma de entrega antes de enviar o link de pagamento.
3. Verifique o pagamento na conta do provedor; não use comprovante enviado pelo cliente como única confirmação.
4. Produza, revise e entregue as imagens e legendas pelo canal combinado. Acompanhe pedidos e custos em um registro privado.
5. Teste uma compra real de baixo valor e a solicitação de reembolso antes de divulgar o site.

Para voltar ao checkout automático no futuro, use a branch de produto automatizado com banco, storage e worker persistentes. Esta branch não é a infraestrutura desse fluxo.
