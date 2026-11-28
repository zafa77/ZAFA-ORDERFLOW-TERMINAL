'use strict';
// A public Formspree form ID is a routing identifier, not an API secret.
// Keep blank until the owner has created the form, verified the recipient,
// enabled domain restriction/spam filtering, and approved the privacy notice.
const FORM_ID='';
const ENABLED=/^[a-zA-Z0-9]{6,32}$/.test(FORM_ID);
const forms=[...document.querySelectorAll('.feedback-form')];
const notice=document.getElementById('feedbackAvailability');
if(ENABLED){notice.textContent='Mesajele sunt trimise privat echipei ZAFA prin Formspree. Nu ai nevoie de cont.'}
for(const form of forms){
 const fieldset=form.querySelector('fieldset'),status=form.querySelector('.form-status'),button=form.querySelector('button[type=submit]');
 fieldset.disabled=!ENABLED;
 let pending=false;
 const show=(message,state='')=>{status.textContent=message;status.dataset.state=state};
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!ENABLED){show('Trimiterea nu este încă activată.','error');return}
  if(pending||!form.reportValidity())return;
  const data=new FormData(form),kind=form.dataset.kind==='bug'?'Bug report':'Feature request';
  const module=String(data.get('module')||'').trim(),title=String(data.get('title')||'').trim(),message=String(data.get('message')||'').trim(),email=String(data.get('email')||'').trim(),environment=String(data.get('environment')||'').trim();
  if(data.get('_gotcha')){show('Trimitere respinsă.','error');return}
  if(!['Orderflow Terminal','Liquidity Map','ZAFA Academy','Economic Calendar','Home / Community','Altul'].includes(module)||title.length<5||title.length>120||message.length<15||message.length>3000||email.length>254||environment.length>100){show('Verifică datele și limitele de caractere.','error');return}
  const payload={type:kind,module,title,message};
  if(email)payload.email=email;
  if(environment)payload.environment=environment;
  pending=true;fieldset.disabled=true;button.setAttribute('aria-busy','true');show('Se trimite mesajul…');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch('https://formspree.io/f/'+FORM_ID,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
   if(!response.ok){show(response.status===429?'Limita de mesaje a fost atinsă. Încearcă mai târziu.':'Mesajul nu a fost acceptat. Încearcă din nou mai târziu.','error');return}
   form.reset();show('Mesajul a fost acceptat de serviciul de feedback. Mulțumim!','success');
  }catch{show('Nu am putut confirma trimiterea. Verifică conexiunea înainte de a încerca din nou.','error')}
  finally{clearTimeout(timeout);pending=false;fieldset.disabled=false;button.removeAttribute('aria-busy')}
 });
}
