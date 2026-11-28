/* ZAFA Chart Link — shared local crosshair. No network requests or external data. */
(function(){
'use strict';
const KEY='zafa-crosshair-link-v1',CHANNEL='zafa-chart-link-v1';
const stamp=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bucharest',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const within=(v,a,b)=>Math.max(a,Math.min(b,v));
const validPoint=p=>p&&Number.isFinite(p.time)&&p.time>0&&Number.isFinite(p.price)&&p.price>0;
function enabled(){try{return localStorage.getItem(KEY)!=='off'}catch{return true}}
function setEnabled(value){try{localStorage.setItem(KEY,value?'on':'off')}catch{}}
function priceText(price,perPixel){const d=Math.min(12,Math.max(2,Math.ceil(-Math.log10(Math.max(perPixel,1e-12)))+1));return price.toFixed(d)}
function create({plot,canvas,project,market,active=()=>true,control}){
const layer=document.createElement('div');layer.className='zafa-crosshair';layer.hidden=true;layer.setAttribute('aria-hidden','true');
layer.innerHTML='<i class="zc-x"></i><i class="zc-y"></i><span class="zc-price"></span><span class="zc-time"></span>';
plot.append(layer);const [vx,hy,pl,tl]=layer.children;
let local=null,remote=null,frame=null,lastSent=0,lastMarket=null,linked=enabled(),channel=null;
const sender=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
try{if(typeof BroadcastChannel==='function')channel=new BroadcastChannel(CHANNEL)}catch{}
const send=(kind,p)=>{if(!channel||!linked)return;const m=market();if(kind==='point'&&!m)return;try{channel.postMessage({kind,sender,market:kind==='clear'?lastMarket:m,time:p?.time,price:p?.price});lastMarket=kind==='point'?m:null}catch{}};
function clearLocal(){local=null;if(lastMarket)send('clear');refresh()}
function reset(){clearLocal();remote=null;layer.hidden=true}
function refresh(broadcast=false){const g=project(),m=market();if(!g||!active()){layer.hidden=true;return}
let x,y,p,other=false;
if(local){x=within(local.x,0,g.right);y=local.y;if(y<g.top||y>g.bottom){layer.hidden=true;return}p=g.at(x,y);if(!validPoint(p)){layer.hidden=true;return}if(broadcast&&linked&&m&&Date.now()-lastSent>=35){lastSent=Date.now();send('point',p)}}
else if(linked&&m&&remote?.market===m&&validPoint(remote)){p=remote;other=true;const xy=g.xy(p);x=xy.x;y=xy.y;if(x<0||x>g.right||y<g.top||y>g.bottom){layer.hidden=true;return}}
else{layer.hidden=true;return}
if(!Number.isFinite(x)||!Number.isFinite(y)){layer.hidden=true;return}
layer.hidden=false;layer.classList.toggle('zc-remote',other);vx.style.transform='translateX('+x+'px)';vx.style.top=g.top+'px';vx.style.height=(g.bottom-g.top)+'px';hy.style.transform='translateY('+y+'px)';hy.style.width=g.right+'px';
pl.style.top=y+'px';pl.style.left=g.right+'px';pl.textContent=priceText(p.price,g.perPixel);
tl.style.top=(g.bottom+2)+'px';tl.style.left=within(x,56,Math.max(56,g.right-56))+'px';tl.textContent=stamp.format(p.time)+' RO';
}
function schedule(){if(frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;refresh(true)})}
plot.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||e.buttons||!active()){clearLocal();return}const b=canvas.getBoundingClientRect();local={x:e.clientX-b.left,y:e.clientY-b.top};schedule()});
plot.addEventListener('pointerleave',clearLocal);plot.addEventListener('pointerdown',clearLocal);window.addEventListener('blur',clearLocal);window.addEventListener('pagehide',reset);
if(channel)channel.onmessage=e=>{const d=e.data;if(!d||d.sender===sender||!linked||!active())return;if(d.kind==='clear'){if(remote?.sender===d.sender){remote=null;refresh()}return}if(d.kind==='point'&&d.market&&d.market===market()&&validPoint(d)){remote=d;refresh()}};
function applyLink(value,write){if(!value&&lastMarket)send('clear');linked=!!value;remote=null;if(control)control.checked=linked;if(write)setEnabled(linked);refresh()}
if(control){control.checked=linked;control.addEventListener('change',()=>applyLink(control.checked,true))}
window.addEventListener('storage',e=>{if(e.key===KEY)applyLink(enabled(),false)});
return {refresh,reset};
}
window.ZafaChartLink={create,priceText};
})();
