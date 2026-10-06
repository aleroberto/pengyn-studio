import { createHash } from 'node:crypto';
const prices={3:990,6:1490,12:1990};
const codes=['ALI','BEL','MOD','CAS','SER','BEM','PET','AUT','EDU','TEC'];
const defaultPix={3:{code:'00020101021126360014br.gov.bcb.pix0114+551194609203352040000530398654049.905802BR5917ALEXANDRE ROBERTO6009SAO PAULO622905251M459TJ8DP9J3GX331TXV5FA163042692',qr:'/images/pix/qrcode-990.jpeg'},6:{code:'00020101021126360014br.gov.bcb.pix0114+5511946092033520400005303986540514.905802BR5917ALEXANDRE ROBERTO6009SAO PAULO622905251M45A3B72SK83187SWYE50GQ66304E7D4',qr:'/images/pix/qrcode-1490.jpeg'},12:{code:'00020101021126360014br.gov.bcb.pix0114+5511946092033520400005303986540519.905802BR5917ALEXANDRE ROBERTO6009SAO PAULO622905251M45A7FT5VWAGEH940K0FEH9B630490C6',qr:'/images/pix/qrcode-1990.jpeg'}};
function settings(){return {enabled:process.env.MANUAL_SALES_ENABLED==='true'&&Boolean(process.env.RESEND_API_KEY&&process.env.ORDER_FROM_EMAIL&&process.env.DELIVERY_NOTICE),deliveryNotice:process.env.DELIVERY_NOTICE||'',customNotice:process.env.CUSTOM_DELIVERY_NOTICE||'',available:(process.env.AVAILABLE_COLLECTIONS||'').split(',').filter(c=>codes.includes(c)),pix:Object.fromEntries([3,6,12].map(q=>[q,{code:process.env[`PIX_CODE_${q}`]||defaultPix[q]?.code||'',qr:process.env[`PIX_CODE_${q}`]?(process.env[`PIX_QR_${q}`]||''):(process.env[`PIX_QR_${q}`]||defaultPix[q]?.qr||'')}]))};}
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function email(payload,key){const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:process.env.ORDER_FROM_EMAIL,...payload}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('email unavailable');}
export default async function handler(request){
 const cfg=settings();if(request.method==='GET')return json(cfg);
 if(request.method!=='POST')return json({message:'Método não permitido.'},405);
 if(!cfg.enabled)return json({message:'Pedidos temporariamente indisponíveis.'},503);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({message:'Origem inválida.'},403);
 let p;try{const raw=await request.text();if(raw.length>8000)return json({message:'Pedido muito longo.'},413);p=JSON.parse(raw);}catch{return json({message:'Dados inválidos.'},400);}
 const quantity=Number(p.quantity),name=clean(p.client?.name,100),payer=clean(p.payer,100),channel=p.client?.channel,contact=clean(p.client?.contact,254),custom=p.mode==='custom';
 if(!prices[quantity]||!['catalog','custom'].includes(p.mode)||!name||!payer||p.acceptedTerms!==true||!['email','whatsapp'].includes(channel)||! /^[0-9a-f-]{36}$/i.test(p.requestId||''))return json({message:'Confira os campos do pedido.'},400);
 if(channel==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))return json({message:'Informe um e-mail válido.'},400);
 const phone=contact.replace(/\D/g,'');if(channel==='whatsapp'&&!/^55\d{10,11}$/.test(phone))return json({message:'Informe WhatsApp brasileiro com DDD.'},400);
 const macro=clean(p.request?.macro,100),micro=clean(p.request?.micro,100),details=clean(p.request?.details,1500);
 if(custom&&(!macro||!micro||!details||!cfg.customNotice))return json({message:'Confira o nicho e o prazo do pedido.'},400);
 if(!custom&&(!codes.includes(p.collection)||!cfg.available.includes(p.collection)))return json({message:'Coleção ainda indisponível.'},409);
 if(!cfg.pix[quantity].code)return json({message:'Pix deste pacote ainda indisponível.'},503);
 const normalized={quantity,name,payer,channel,contact:channel==='whatsapp'?phone:contact,custom,collection:custom?null:p.collection,macro,micro,details};
 const digest=createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0,16);const id=`PG-${p.requestId}-${digest}`;
 const notice=custom?cfg.customNotice:cfg.deliveryNotice;
 const lines=[`Pedido: ${id}`,`Status: aguardando confirmação manual do pagamento`,`Cliente: ${name}`,`Entrega: ${channel}`,`Contato: ${normalized.contact}`,`Titular do Pix: ${payer}`,`Quantidade: ${quantity} imagens`,`Valor: R$ ${(prices[quantity]/100).toFixed(2).replace('.',',')}`,`Coleção: ${normalized.collection||'Nicho solicitado'}`,`Macro nicho: ${macro}`,`Micro nicho: ${micro}`,`Temas: ${details}`,`Prazo informado: ${notice}`];
 const conversation=channel==='whatsapp'?`<p><a href="https://wa.me/${phone}">Abrir conversa no WhatsApp</a></p>`:'';
 try{await email({to:['register.alexandre@gmail.com'],subject:`Novo pedido ${id} — aguardando Pix`,html:`<h2>Pedido recebido</h2><pre>${escape(lines.join('\n'))}</pre>${conversation}<p>Confira o crédito na conta antes de enviar o link. Este aviso não confirma pagamento.</p>`},`${id}-admin`);}catch{return json({message:'Não foi possível registrar o pedido. Tente novamente antes de pagar.'},502);}
 let confirmationSent=false;if(channel==='email'){try{await email({to:[contact],subject:`Seu pedido ${id} — Pengyn Studio`,text:`${lines.join('\n')}\n\nPedido recebido. Após a confirmação manual do pagamento, enviaremos o link das imagens pelo canal escolhido.\nO recebimento deste e-mail não confirma pagamento.`},`${id}-client`);confirmationSent=true;}catch{/* O pedido já chegou ao vendedor. Não pedir ao cliente que refaça a compra. */}}
 return json({orderId:id,status:'awaiting_manual_payment',confirmationSent,pix:cfg.pix[quantity],deliveryNotice:notice});
}
