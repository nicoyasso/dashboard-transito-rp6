'use strict';
// Datos fuente: aforos de 24 h informados para km 39 y 109; intervalos para km 120.
const measured={39:[19,404,53,23,29,125,45,0,6],109:[12,668,54,45,71,192,83,1,0]};
const intervals=[
 {start:'16:56',end:'20:26',v:[5,156,4,17,17,119,85,1,1]},
 {start:'23:10',end:'04:45',v:[3,12,5,23,9,52,14,6,4]},
 {start:'09:00',end:'12:30',v:[5,184,16,15,13,103,68,1,0]},
 {start:'14:52',end:'20:22',v:[5,284,23,22,25,172,127,0,3]},
 {start:'23:40',end:'04:40',v:[0,13,6,9,17,23,5,3,2]},
 {start:'09:20',end:'12:10',v:[3,206,21,9,5,65,51,0,0]}
];
const cats=[['Motocicletas','Motocicletas'],['Livianos','Hasta 2 ejes y hasta 2,30 m de altura'],['Dos ejes altos / tres bajos','Dos ejes de más de 2,30 m o tres ejes bajos'],['Tres ejes altos','Tres ejes de más de 2,30 m'],['Cuatro ejes','Vehículos de 4 ejes'],['Cinco ejes','Vehículos de 5 ejes'],['Seis ejes','Vehículos de 6 ejes'],['Siete ejes','Vehículos de 7 ejes'],['Ocho o más ejes','Vehículos de 8 o más ejes']];
const pointColors={'39':'#2563eb','109':'#10a37f','120':'#e69c3b'};
const colors=['#f5a74d','#2e6ee6','#12b8bd','#8b75d7','#e77a88','#315e9f','#21a477','#a78bfa','#8793a7'];
const sum=a=>a.reduce((s,x)=>s+x,0),fmt=n=>Math.round(n).toLocaleString('es-AR');
const mins=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
function overlap(a,b,c,d){return Math.max(0,Math.min(b,d)-Math.max(a,c));}
function integerize(values){const target=Math.round(sum(values));const base=values.map(Math.floor);let missing=target-sum(base);values.map((v,i)=>({i,frac:v-Math.floor(v)})).sort((a,b)=>b.frac-a.frac).slice(0,missing).forEach(x=>base[x.i]++);return base;}
function compute120(){
 const observed={day:{minutes:0,v:Array(9).fill(0)},night:{minutes:0,v:Array(9).fill(0)}};
 for(const r of intervals){let a=mins(r.start),b=mins(r.end);if(b<=a)b+=1440;
  let dayMinutes=0;for(const shift of [-1440,0,1440])dayMinutes+=overlap(a,b,360+shift,1170+shift);
  const nightMinutes=b-a-dayMinutes;
  for(const [key,part] of [['day',dayMinutes],['night',nightMinutes]]){
   observed[key].minutes+=part;
   r.v.forEach((v,i)=>observed[key].v[i]+=v*part/(b-a));
  }
 }
 const rawDay=observed.day.v.map(v=>v/observed.day.minutes*810);
 const rawNight=observed.night.v.map(v=>v/observed.night.minutes*630);
 // Fijar total y composición diaria: redondear el total una sola vez.
 const full=integerize(rawDay.map((v,i)=>v+rawNight[i]));
 const day=integerize(rawDay);
 const night=full.map((v,i)=>v-day[i]);
 return {full,day,night,observed};
}
const km120=compute120();
// Intervalos adicionales transcritos del paloteo aportado (CAT 0 a CAT 8).
// Se mantienen los totales de 24 h declarados para km 39 y 109 como base oficial del tablero.
const additionalIntervals={
 39:[
  {start:'12:35',end:'17:23',v:[5,117,11,7,12,44,10,0,4]},
  {start:'04:20',end:'12:35',v:[7,180,26,3,10,24,12,0,2]}
 ],
 109:[
  {start:'17:00',end:'23:59',v:[5,193,12,14,14,65,30,0,0]},
  {start:'00:00',end:'09:30',v:[4,162,18,14,17,45,11,0,0]},
  {start:'09:30',end:'17:23',v:[3,313,24,17,40,82,42,1,0]},
  {start:'17:25',end:'04:20',v:[7,107,16,13,7,57,23,0,0]}
 ]
};
function splitUsingOwnIntervals(km){
 const observed={day:{minutes:0,v:Array(9).fill(0)},night:{minutes:0,v:Array(9).fill(0)}};
 for(const r of additionalIntervals[km]){
  let a=mins(r.start),b=mins(r.end);if(b<=a)b+=1440;
  let d=0;for(const shift of [-1440,0,1440])d+=overlap(a,b,360+shift,1170+shift);
  for(const [key,part] of [['day',d],['night',b-a-d]]){
   observed[key].minutes+=part;
   r.v.forEach((v,i)=>observed[key].v[i]+=v*part/(b-a));
  }
 }
 const full=measured[km].slice();
 // Repartir el total medido entre franjas usando la composición horaria
 // de los propios intervalos del km. No se atribuye precisión horaria inexistente.
 const day=full.map((v,i)=>{
  const d=observed.day.v[i]/observed.day.minutes*810;
  const n=observed.night.v[i]/observed.night.minutes*630;
  return Math.min(v,Math.max(0,Math.round(v*(d+n>0?d/(d+n):810/1440))));
 });
 return {full,day,night:full.map((v,i)=>v-day[i]),observed};
}
const data={120:km120,39:splitUsingOwnIntervals(39),109:splitUsingOwnIntervals(109)};
const chartMap={};
const point=document.getElementById('point'),period=document.getElementById('period');
function selectedRows(){return [39,109,120].map(k=>({km:k,v:data[k][period.value]}));}
function createChart(id,type,labels,datasets,options={}){
 if(!window.Chart)return;
 if(chartMap[id])chartMap[id].destroy();
 const el=document.getElementById(id);if(!el)return;
 chartMap[id]=new Chart(el,{type,data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:11}}},scales:type==='doughnut'?{}:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#eef2f7'}}},...options}});
}
function refresh(){
 const rows=selectedRows(),sel=point.value,active=sel==='all'?rows:rows.filter(r=>String(r.km)===sel);
 const aggregate=Array.from({length:9},(_,i)=>sum(active.map(r=>r.v[i])));
 const total=sum(aggregate),groups=[sum(aggregate.slice(0,3)),sum(aggregate.slice(3,5)),sum(aggregate.slice(5))];
 const sub=sel==='all'?'Suma de progresivas, no flujo único':`Km ${sel}`;
 const items=[['Vehículos',fmt(total),sub],['Livianos y semilivianos',fmt(groups[0]),'CAT 0–2 · '+(total?fmt(groups[0]/total*100):0)+' %'],['Semipesados',fmt(groups[1]),'CAT 3–4'],['Pesados',fmt(groups[2]),'CAT 5–8']];
 document.getElementById('kpis').innerHTML=items.map(s=>`<div class="kpi"><div class="lab">${s[0]}</div><div class="val">${s[1]}</div><div class="sub">${s[2]}</div></div>`).join('');
 document.getElementById('volumeNote').textContent=period.value==='full'?'24 horas':period.value==='day'?'06:00–19:30':'19:30–06:00';
 document.getElementById('compositionLabel').textContent=sel==='all'?'Suma comparativa':`Km ${sel}`;
 const labels=rows.map(r=>'Km '+r.km),palette=rows.map(r=>pointColors[r.km]);
 createChart('volumes','bar',labels,[{label:'Vehículos',data:rows.map(r=>sum(r.v)),backgroundColor:palette,borderRadius:7}],{plugins:{legend:{display:false}}});
 createChart('composition','doughnut',cats.map((_,i)=>'CAT '+i),[{data:aggregate,backgroundColor:colors,borderColor:'#fff',borderWidth:2}],{cutout:'65%'});
 createChart('grouped','bar',cats.map((_,i)=>'CAT '+i),rows.map((r,i)=>({label:'Km '+r.km,data:r.v,backgroundColor:palette[i],borderRadius:3})));
 createChart('stacked','bar',labels,cats.map((_,i)=>({label:'CAT '+i,data:rows.map(r=>sum(r.v)?r.v[i]/sum(r.v)*100:0),backgroundColor:colors[i]})),{indexAxis:'y',scales:{x:{stacked:true,max:100,ticks:{callback:v=>v+'%'}},y:{stacked:true}},plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.raw.toFixed(1)+' %'}}}});
 createChart('groups','bar',labels,[{label:'Livianos y semilivianos · CAT 0–2',data:rows.map(r=>sum(r.v.slice(0,3))),backgroundColor:'#3169db'},{label:'Semipesados · CAT 3–4',data:rows.map(r=>sum(r.v.slice(3,5))),backgroundColor:'#8b75d7'},{label:'Pesados · CAT 5–8',data:rows.map(r=>sum(r.v.slice(5))),backgroundColor:'#16a085'}],{scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}});
 createChart('heavy','bar',labels,[{label:'Pesados',data:rows.map(r=>sum(r.v.slice(5))),backgroundColor:'#16a085',borderRadius:6}],{plugins:{legend:{display:false}}});
 document.querySelector('#dataTable tbody').innerHTML=rows.map(r=>`<tr><td>Km ${r.km}</td><td>${r.km===120?'Proyección':'Aforo 24 h'}${period.value==='full'?'':' · franja estimada desde intervalos propios'}</td>${r.v.map(x=>`<td>${fmt(x)}</td>`).join('')}<td>${fmt(sum(r.v))}</td></tr>`).join('');
 updateMapLabels();
}
function vehicleSVG(i){
 // Siluetas ilustrativas vectoriales según cantidad de ejes.
 const wheels=i===0?2:i===1?2:i===2?3:i===3?3:i;
 if(i===0)return `<svg viewBox="0 0 120 70" role="img" aria-label="Motocicleta"><g fill="none" stroke="#25364d" stroke-width="3"><circle cx="27" cy="49" r="11"/><circle cx="91" cy="49" r="11"/><path d="M27 49L47 28L68 49H91L74 22H61M47 28L58 49L27 49M68 49L80 34"/></g></svg>`;
 const n=Math.min(wheels,8),length=104,first=18,step=(length-30)/(n-1);
 const tires=Array.from({length:n},(_,j)=>`<circle cx="${(first+j*step).toFixed(1)}" cy="55" r="5.5" fill="#25364d"/>`).join('');
 if(i===1)return `<svg viewBox="0 0 120 70" role="img" aria-label="Automóvil"><path d="M10 44L18 35L35 31L47 20H76L88 33H103L110 44V53H10Z" fill="#25364d"/><path d="M47 24H73L81 34H38Z" fill="#dce8f8"/>${tires}</svg>`;
 return `<svg viewBox="0 0 120 70" role="img" aria-label="Vehículo de ${i===8?'ocho o más':i} ejes"><rect x="8" y="23" width="${i>=5?74:61}" height="28" rx="2" fill="#25364d"/><path d="M${i>=5?82:69} 34H99L109 44V51H${i>=5?82:69}Z" fill="#25364d"/><rect x="91" y="37" width="9" height="7" fill="#dce8f8"/>${tires}</svg>`;
}
document.getElementById('categoryCards').innerHTML=cats.map((c,i)=>`<div class="category-card"><div class="category-art">${vehicleSVG(i)}</div><div><div class="catnum">CATEGORÍA ${i}</div><div class="catname">${c[0]}</div><div class="catdesc">${c[1]}</div></div></div>`).join('');
point.addEventListener('change',refresh);period.addEventListener('change',refresh);
document.getElementById('export').addEventListener('click',()=>{
 const rows=[['Km','Franja','Origen',...cats.map((_,i)=>'CAT '+i),'Total'],...selectedRows().map(r=>[r.km,period.value,r.km===120?'Proyección':'Aforo 24 h',...r.v,sum(r.v)])];
 const csv='\uFEFF'+rows.map(r=>r.join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='rp6_conteos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
let map=null;
const markers={};
const fixedPoints={'39':[-31.119232100492237,-59.34792374521982],'109':[-31.72100222948659,-59.181135179389784],'120':[-31.813300025981913,-59.17049075165788]};
const mapPoint=document.getElementById('mapPoint');
function updateMapLabels(){
 if(!map)return;
 for(const [km,marker] of Object.entries(markers)){
  const values=data[km][period.value];
  const light=sum(values.slice(0,3)),medium=sum(values.slice(3,5)),heavy=sum(values.slice(5));
  marker.bindPopup(`<div class="map-popup"><strong>RP 6 · Km ${km}</strong><div>${period.options[period.selectedIndex].text}</div><b>${fmt(sum(values))} vehículos</b><div>Livianos y semilivianos (CAT 0–2): ${fmt(light)}</div><div>Semipesados (CAT 3–4): ${fmt(medium)}</div><div>Pesados (CAT 5–8): ${fmt(heavy)}</div><small>${km==='120'?'Proyección a 24 h':'Aforo de 24 h'} · franjas estimadas desde intervalos</small></div>`);
 }
}
function filterMap(){
 if(!map)return;
 const selected=mapPoint.value;
 const visible=[];
 for(const [km,marker] of Object.entries(markers)){
  if(selected==='all'||selected===km){marker.addTo(map);visible.push(marker.getLatLng());}
  else map.removeLayer(marker);
 }
 if(selected==='all' && visible.length>1)map.fitBounds(L.latLngBounds(visible).pad(.22),{animate:false,maxZoom:11});
 else if(visible.length)map.setView(visible[0],12,{animate:false});
 setTimeout(()=>map.invalidateSize(),60);
}
if(window.L){
 map=L.map('mapView',{scrollWheelZoom:false}).setView([-31.48,-59.26],9);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
 for(const [km,coords] of Object.entries(fixedPoints))markers[km]=L.circleMarker(coords,{radius:10,color:'#ffffff',weight:2,fillColor:pointColors[km],fillOpacity:1,title:`RP 6 · Km ${km}`});
 updateMapLabels();filterMap();
 mapPoint.addEventListener('change',filterMap);
 window.addEventListener('resize',()=>map.invalidateSize());
}else{
 document.getElementById('mapView').innerHTML='<p class="map-fallback">Se necesita conexión a Internet para cargar Leaflet y el mapa.</p>';
}
refresh();
if(!window.Chart)document.getElementById('volumeNote').textContent='No se pudo cargar Chart.js. Verificá tu conexión.';
