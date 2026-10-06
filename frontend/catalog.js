/* API de catálogo separada do checkout antigo de geração personalizada. */
const config = window.PENGYN_CATALOG;
const prices = {3: 'R$ 9,90', 6: 'R$ 14,90', 12: 'R$ 19,90'};
let selected = config.collections[0], quantity = 12;
let operation=null, orderId=null;
const endpoint="/.netlify/functions/manual-order";
let requestId=crypto.randomUUID();
const $ = id => document.getElementById(id);
const form = $('catalog-order-form');
function mode(){return form.elements.mode.value;}
function ready(){return selected.available && selected.images.length === 12;}
function text(tag, content){const el=document.createElement(tag);el.textContent=content;return el;}
function updateOrder(){
  const custom=mode()==='custom';$('custom-fields').hidden=!custom;
  ['macro','micro','details'].forEach(id=>$(id).required=custom);
  $('order-summary').replaceChildren(text('p',custom?'Pedido de outro nicho':selected.name),text('p',`${quantity} imagens · sem personalização`),text('b',prices[quantity]));
  $('delivery-description').textContent=custom?'O prazo de preparação será confirmado antes do pagamento.':'A entrega do pacote disponível acontece após a confirmação do pagamento.';
  const enabled=Boolean(operation?.enabled&&operation.pix[quantity]?.code)&&(custom?Boolean(operation.customNotice):ready()&&operation.available.includes(selected.code));
  $('order-submit').disabled=!enabled;
  $('order-feedback').textContent=!operation?.enabled?'Os pedidos ainda não estão disponíveis. Estamos preparando as coleções e o pagamento.':!custom&&!ready()?'Esta coleção está em preparação. Escolha outra coleção disponível ou solicite um nicho.':!enabled?'Este pacote ainda não está disponível para pedidos.':'';
  if(operation?.enabled)$('delivery-description').textContent=custom?operation.customNotice:operation.deliveryNotice;
}
function render(){
  document.querySelectorAll('.category').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.code===selected.code)));
  $('collection-code').textContent='COLEÇÃO 01';$('collection-name').textContent=selected.name;
  $('collection-description').textContent=selected.description;$('collection-compatibility').textContent=selected.compatibility;
  $('palette').replaceChildren(...selected.colors.map(color=>{const el=document.createElement('span');el.className='swatch';el.style.background=color;return el;}));
  $('collection-status').textContent=ready()?'Coleção disponível':'Coleção em preparação';
  $('preview-grid').replaceChildren(...Array.from({length:quantity},(_,i)=>{
    const cell=document.createElement('div');cell.className='preview-item';const asset=selected.images[i];
    if(asset){const img=document.createElement('img');img.src=asset.preview;img.alt=asset.alt;img.loading='lazy';cell.append(img);}
    else{const placeholder=document.createElement('div');placeholder.className='placeholder';placeholder.append(text('b',String(i+1).padStart(2,'0')),text('span','Imagem em preparação'));cell.append(placeholder);}
    cell.append(text('small',selected.roles[i]));return cell;
  }));
  $('preview-note').textContent=ready()?'Estas são as imagens da coleção selecionada.':'Os espaços indicam a sequência planejada. As fotos serão exibidas quando a coleção estiver pronta.';
  updateOrder();
}
for(const c of config.collections){const b=text('button',c.name);b.type='button';b.className='category';b.dataset.code=c.code;b.addEventListener('click',()=>{selected=c;render();});$('categories').append(b);}
document.querySelectorAll('.plan').forEach(b=>b.addEventListener('click',()=>{quantity=Number(b.dataset.quantity);document.querySelectorAll('.plan').forEach(p=>{const active=p===b;p.classList.toggle('selected',active);p.setAttribute('aria-pressed',String(active));});render();}));
form.addEventListener('change',()=>{updateChannel();updateOrder();});
function updateChannel(){const whatsapp=$('delivery-channel').value==='whatsapp';$('email-field').hidden=whatsapp;$('phone-field').hidden=!whatsapp;$('client-email').required=!whatsapp;$('client-phone').required=whatsapp;}
updateChannel();
$('custom-request').addEventListener('click',()=>{form.querySelector('[value="custom"]').checked=true;updateOrder();$('pedido').scrollIntoView({behavior:'smooth',block:'start'});$('macro').focus({preventScroll:true});});
let submitting=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();if(submitting||orderId||$('order-submit').disabled||!form.reportValidity()||$('website').value)return;
 const channel=$('delivery-channel').value;
 let contact=channel==='email'?$('client-email').value.trim():$('client-phone').value.replace(/\D/g,'');
 if(channel==='whatsapp'){if(contact.length===10||contact.length===11)contact='55'+contact;if(!/^55\d{10,11}$/.test(contact)){$('order-feedback').textContent='Informe um WhatsApp brasileiro com DDD.';return;}}
 submitting=true;$('order-submit').disabled=true;$('order-feedback').textContent='Registrando seu pedido…';
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,mode:mode(),collection:mode()==='catalog'?selected.code:null,quantity,payer:$('payer').value.trim(),client:{name:$('client-name').value.trim(),channel,contact},request:mode()==='custom'?{macro:$('macro').value.trim(),micro:$('micro').value.trim(),details:$('details').value.trim()}:null,acceptedTerms:true})});
  const data=await response.json();if(!response.ok)throw new Error(data.message||'Não foi possível registrar o pedido. Tente novamente.');
  orderId=data.orderId;$('payment-order-id').textContent='Pedido: '+orderId;$('payment-amount').textContent='Valor do pacote: '+prices[quantity];$('pix-code').value=data.pix.code;
  if(data.pix.qr){const url=new URL(data.pix.qr,location.href);if(url.protocol==='https:'||url.origin===location.origin){$('pix-qr').src=url.href;$('pix-qr').hidden=false;}}
  $('payment-notice').textContent=data.deliveryNotice;
  $('confirmation-notice').textContent=channel==='whatsapp'?'Pedido recebido. Após a confirmação manual do pagamento, o link será enviado pelo WhatsApp informado.':data.confirmationSent?'Enviamos a confirmação do pedido por e-mail. O pagamento ainda será conferido manualmente.':'Pedido recebido. Guarde este número. A confirmação por e-mail não pôde ser enviada agora, mas o vendedor recebeu seus dados.';
  $('manual-payment').hidden=false;$('manual-payment').scrollIntoView({behavior:'smooth',block:'start'});
  form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);document.querySelectorAll('.category,.plan,#custom-request').forEach(el=>el.disabled=true);$('order-feedback').textContent='Pedido recebido. Confira o Pix abaixo.';
 }catch(error){$('order-feedback').textContent=error.message;submitting=false;updateOrder();$('order-feedback').textContent=error.message;}
});
$('copy-pix').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('pix-code').value);$('copy-feedback').textContent='Código Pix copiado.';}catch{$('pix-code').focus();$('pix-code').select();$('copy-feedback').textContent='Selecione e copie o código acima.';}});
fetch(endpoint).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{operation=data;updateOrder();}).catch(()=>{$('order-feedback').textContent='Pedidos indisponíveis no momento. Tente novamente mais tarde.';});

render();
const typing=document.querySelector('.typing');const words=['uma boa imagem.','um feed consistente.','uma nova ideia.'];let word=0,index=words[0].length,deleting=true;
function tick(){index+=deleting?-1:1;typing.textContent=words[word].slice(0,index);let delay=deleting?50:100;if(index===0){deleting=false;word=(word+1)%words.length;delay=400;}else if(index===words[word].length&&!deleting){deleting=true;delay=2000;}setTimeout(tick,delay);}
setTimeout(tick,1200);
