# Início com Pix manual

## O que esta versão faz

O cliente escolhe e-mail ou WhatsApp. Apenas o contato escolhido é obrigatório. A função Netlify envia os dados para register.alexandre@gmail.com e só então mostra o Pix. Se o canal for e-mail, tenta também enviar uma confirmação ao cliente. WhatsApp e entrega são manuais. Não há confirmação automática de pagamento.

O e-mail recebido pelo vendedor é o registro operacional inicial do pedido. Não há banco de dados nem painel administrativo nesta versão. A numeração identifica o pedido; o titular do Pix ajuda a localizar a transferência na conta.

## Configuração na Netlify

Configure as variáveis com escopo Functions pela interface da Netlify:

- RESEND_API_KEY: chave da conta Resend.
- ORDER_FROM_EMAIL: remetente autorizado/verificado no Resend. Não basta colocar um Gmail arbitrário. O destinatário do vendedor é register.alexandre@gmail.com.
- PIX_CODE_3, PIX_CODE_6, PIX_CODE_12: códigos Pix copia e cola reais, gerados pelo seu banco com os valores R$ 9,90, R$ 14,90 e R$ 19,90.
- PIX_QR_3, PIX_QR_6, PIX_QR_12: URLs HTTPS ou caminhos locais das imagens dos QR Codes correspondentes (opcionais; copia e cola funciona sem elas).
- DELIVERY_NOTICE: texto exato do prazo e horário de confirmação/entrega para pacotes prontos.
- CUSTOM_DELIVERY_NOTICE: prazo e horário para gerar pedidos de nichos ausentes. Sem esta configuração esses pedidos permanecem indisponíveis.
- AVAILABLE_COLLECTIONS: códigos separados por vírgula, por exemplo ALI,BEL. Ative apenas após concluir os arquivos e ZIPs e incluir as 12 miniaturas em frontend/catalog-data.js com available: true.
- MANUAL_SALES_ENABLED: true somente após configurar e testar o fluxo.

O Pix de R$ 9,90 (pacote de 3 imagens) já está incluído no código, junto ao QR enviado pelo proprietário. Não precisa preencher PIX_CODE_3 ou PIX_QR_3 para usar esse padrão. Os códigos e QR Codes de R$ 14,90 e R$ 19,90 também estão incluídos. As variáveis PIX_CODE e PIX_QR são opcionais para substituir os padrões. Se substituir PIX_CODE_3, configure também o QR correspondente; o QR padrão não será reaproveitado automaticamente.

Faça novo deploy após configurar. Sem credenciais e Pix reais, a página permanece navegável, mas não aceita pedidos. Nunca exponha RESEND_API_KEY no frontend.

## Conferência

Teste os dois canais, confirme que o vendedor recebe os dados, copie o Pix e confira valor/destinatário no banco. O QR deve corresponder exatamente ao código e ao pacote. O frontend não gera códigos Pix. Teste uma compra real de ponta a ponta antes de divulgar.

Confira sempre o crédito na conta e envie o link do ZIP pelo canal escolhido. O e-mail do pedido de WhatsApp contém um link wa.me para abrir a conversa. Não há envio automático de WhatsApp.

## Aplicação

O patch pengyn-manual-pix-page.patch inclui o catálogo e esta mudança, partindo de feat/mobile-feed-clarity. Não aplique junto com pengyn-catalog-ready-images.patch na mesma branch. Para quem já aplicou o catálogo, use apenas pengyn-manual-pix-update.patch.
