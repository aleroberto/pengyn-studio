# Catálogo de imagens prontas

Esta branch substitui a página inicial pelo catálogo. O backend anterior e seus arquivos permanecem no repositório, mas a nova página não chama o fluxo antigo de geração personalizada.

## Ativação das coleções

Edite frontend/catalog-data.js. Para cada macro nicho, inclua 12 registros em images com preview (URL de uma miniatura pública) e alt (descrição da foto). Marque available como true apenas quando os originais, a revisão e os ZIPs estiverem prontos. Os previews devem reproduzir os arquivos do pacote.

As coleções começam vazias e indisponíveis. Os espaços na página não são fotos de produtos disponíveis. Os pacotes menores selecionam as primeiras 3 ou 6 imagens na ordem do catálogo.

## Checkout e e-mails

checkoutEndpoint começa vazio. Não há pagamento, envio de e-mail, gravação de pedidos ou entrega nesta mudança de frontend. O endpoint separado precisa validar preços, catálogo, quantidade e disponibilidade no servidor, persistir o pedido e devolver checkout_url. O frontend envia apenas o pedido, nunca confirma pagamento. Configure allowedCheckoutHosts com os hosts exatos permitidos pelo provedor.

Após webhook de pagamento validado, a automação futura deve enviar confirmação ao cliente. Para nichos ausentes, enviar os dados também para register.alexandre@gmail.com. Nenhuma credencial deve entrar em catalog-data.js. O prazo de 30 minutos ainda não está prometido, pois depende da operação sob demanda.

## Armazenamento proposto

Miniaturas públicas no site ou em bucket público separado. Originais e ZIPs em bucket privado no Cloudflare R2. Manter 3 ZIPs por coleção (3, 6, 12 imagens). O backend associa o pedido pago à chave do ZIP e emite URL assinada temporária. Para link exclusivo por pedido, usar rota com token de pedido que verifica acesso e emite URL temporária; URL assinada sozinha não é de uso único.

## Netlify

Importe a branch feat/catalog-ready-images. netlify.toml publica frontend sem comando de build. A página pode ser revisada antes de ativar vendas.
