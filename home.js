'use strict';
const $=id=>document.getElementById(id);
const canvas=$('preview'),ctx=canvas.getContext('2d'),range=$('demoRange'),play=$('demoPlay');
const names={footprint:'Execuții la fiecare nivel de preț',heatmap:'Lichiditate afișată în timp',dom:'Registrul de ordine la un moment dat'};
const descriptions={footprint:'Compară volumele agresive bid și ask pe fiecare nivel. Delta afișată este diferența dintre cele două.',heatmap:'Urmărește benzile de lichiditate și evoluția prețului. Dispariția unei benzi nu identifică singură cauza.',dom:'Compară dimensiunile limită la bid și ask. Cantitatea afișată se poate modifica înaintea executării.'};
let mode='footprint',frame=Number(range.value),timer=null;
const prices=Array.from({length:36},(_,i)=>100+Math.sin(i*.48)*1.5+i*.14+Math.cos(i*1.17)*.45);
function volume(i,j,side){return 12+Math.floor(85*Math.abs(Math.sin(i*1.71+j*.91+side*2.7)))+(j===3?60:0)}
function draw(){if(!ctx)return;const w=Math.max(280,canvas.clientWidth),h=Math.max(220,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#080f19';ctx.fillRect(0,0,w,h);
const right=w-66,top=26,bottom=h-28,ph=bottom-top,Y=p=>bottom-(p-97)/12*ph,cols=mode==='footprint'?(w<520?4:7):25;
function line(x1,y1,x2,y2,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function text(v,x,y,c='#a9b5c3',align='left',size=10){ctx.fillStyle=c;ctx.font=size+'px ui-monospace,Consolas,monospace';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(v),x,y)}
function box(x,y,a,b,c){ctx.fillStyle=c;ctx.fillRect(x,y,a,b)}
if(mode!=='dom'){for(let p=98;p<=108;p+=2){line(0,Y(p),right,Y(p),'#263648');text(p.toFixed(2),w-8,Y(p),'#a9b5c3','right')}}
line(right,0,right,h,'#40526a');text('ZAFA / DEMO',12,13,'#e5bc77');text('PREȚ',w-8,13,'#a9b5c3','right');
if(mode==='footprint'){const cw=right/cols,begin=Math.max(0,frame-cols+1),count=frame-begin+1;for(let i=begin;i<=frame;i++){const x=(i-begin+.5)*cw,p=Math.round(prices[i]*2)/2,prev=Math.round(prices[Math.max(0,i-1)]*2)/2;line(x,Y(p+1.5),x,Y(p-1.5),p>=prev?'#41d8ab':'#ff7188');let delta=0;for(let j=0;j<7;j++){const v=p+(3-j)*.5,yy=Y(v),hh=Math.max(12,ph/24-1),bid=volume(i,j,0),ask=volume(i,j,1);delta+=ask-bid;const bw=Math.min(34,cw*.37);box(x-bw-2,yy-hh/2,bw,hh,'rgba(255,113,136,'+(.10+bid/190*.35)+')');box(x+2,yy-hh/2,bw,hh,'rgba(65,216,171,'+(.10+ask/190*.35)+')');text(bid,x-4,yy,'#ffc0c9','right',w<450?9:10);text(ask,x+4,yy,'#b4ead7','left',w<450?9:10)}text('Δ '+(delta>0?'+':'')+delta,x,bottom+13,delta>=0?'#41d8ab':'#ff7188','center',9)}}
else if(mode==='heatmap'){const begin=Math.max(0,frame-cols+1),cw=right/cols;for(let i=begin;i<=frame;i++){let x=(i-begin)*cw;for(let j=0;j<24;j++){const p=97+j*.5,base=Math.abs(Math.sin(j*.83+i*.18))*.17,wall=(j===16&&i<23?.72:j===7?.43:j===20?.32:0),v=Math.min(.93,base+wall);box(x,Y(p+.5),cw+.2,ph/24+.2,v>.48?'rgba(229,188,119,'+v+')':'rgba(55,124,170,'+Math.max(.04,v)+')')}}for(let i=begin+1;i<=frame;i++){const x=(i-begin+.5)*cw;line(x-cw,Y(prices[i-1]),x,Y(prices[i]),'#f3eadc',1.8);if(i%3===0){ctx.beginPath();ctx.arc(x,Y(prices[i]),3+i%5,0,Math.PI*2);ctx.fillStyle=prices[i]>=prices[i-1]?'#41d8ab99':'#ff718899';ctx.fill()}}text('LICHIDITATE EXEMPLIFICATIVĂ',12,bottom+13,'#a9b5c3')}
else {const mid=Math.round(prices[frame]*2)/2;for(let j=0;j<13;j++){const p=mid+(6-j)*.5,y=top+(j+.5)*ph/13,qty=volume(frame,j,j<6?1:0),bw=Math.min(right*.42,qty/160*right*.40),hh=ph/13-2;if(j<6)box(right*.52,y-hh/2,bw,hh,'#ff71884d');else if(j>6)box(right*.48-bw,y-hh/2,bw,hh,'#41d8ab4d');else box(0,y-hh/2,right,hh,'#e5bc7726');text(p.toFixed(2),right*.5,y,'#f3eadc','center');text(p.toFixed(2),w-8,y,'#a9b5c3','right');if(j<6)text(qty,right*.78,y,'#ffc0c9','center');if(j>6)text(qty,right*.22,y,'#b4ead7','center')}box(0,0,right,24,'#080f19');text('BID',right*.22,13,'#41d8ab','center');text('ASK',right*.78,13,'#ff7188','center');text('SNAPSHOT DIDACTIC',12,bottom+13,'#a9b5c3')}
$('demoStep').textContent=(frame+1)+' / '+prices.length;$('demoPrice').textContent=prices[frame].toFixed(2);
}
function stop(){if(timer!==null)clearInterval(timer);timer=null;play.textContent='▶ Redă';play.setAttribute('aria-pressed','false')}
function update(n){frame=Math.max(0,Math.min(prices.length-1,Number(n)||0));range.value=String(frame);draw()}
for(const b of document.querySelectorAll('[data-demo]'))b.onclick=()=>{mode=b.dataset.demo;for(const x of document.querySelectorAll('[data-demo]'))x.setAttribute('aria-pressed',String(x===b));$('demoTitle').textContent=names[mode];$('demoDescription').textContent=descriptions[mode];draw()};
range.oninput=()=>{stop();update(range.value)};
play.onclick=()=>{if(timer!==null){stop();return}if(frame===prices.length-1)update(0);play.textContent='Ⅱ Pauză';play.setAttribute('aria-pressed','true');timer=setInterval(()=>{if(document.hidden||frame>=prices.length-1){stop();return}update(frame+1)},380)};
$('demoReset').onclick=()=>{stop();update(0)};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
if(typeof IntersectionObserver==='function')new IntersectionObserver(es=>{if(!es[0].isIntersecting)stop()}).observe(canvas);
if(typeof ResizeObserver==='function')new ResizeObserver(draw).observe(canvas);else window.addEventListener('resize',draw);
draw();
