/* Tu dinero no puede estar quieto · lógica: contador de inflación, gráficos y simulador */
(function(){
  document.documentElement.classList.add('js');
  const fmt=(v,d=0)=>v.toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d})+' €';
  const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Inflation meter: 100.000 € losing purchasing power at 4,9 % a year, since local midnight */
  const lost=document.getElementById('lost');
  const perMs=100000*(1-1/1.049)/(365*24*3600*1000);
  function meter(){
    const now=new Date(), mid=new Date(now); mid.setHours(0,0,0,0);
    const v=perMs*(now-mid); const s=fmt(v,4);
    const i=s.lastIndexOf(',');
    lost.innerHTML=s.slice(0,i+3)+'<span class="cents">'+s.slice(i+3)+'</span>';
  }
  meter(); RM?setInterval(meter,1000):(function loop(){meter();requestAnimationFrame(loop)})();

  /* Series */
  const SER=[
    {k:'C',name:'Cuenta',r:.006,c:'var(--drift)',w:2},
    {k:'O',name:'Oro',r:.08,c:'var(--gold)',w:2},
    {k:'S',name:'S&P 500',r:.10,c:'var(--cream)',w:2},
    {k:'P',name:'Cartera',r:.079,c:'var(--ember)',w:4}
  ];
  function series(ini,mes,years,annual){
    const r=Math.pow(1+annual,1/12)-1; let v=ini; const out=[v];
    for(let m=1;m<=years*12;m++){ v=v*(1+r)+mes; if(m%12===0) out.push(v); }
    return out;
  }
  const NS='http://www.w3.org/2000/svg';
  function niceTick(max){ const raw=max/4; const p=Math.pow(10,Math.floor(Math.log10(raw))); const m=raw/p; return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p; }
  const kfmt=v=>v>=1e6?(v/1e6).toLocaleString('es-ES',{maximumFractionDigits:1})+' M':v>=1000?Math.round(v/1000).toLocaleString('es-ES')+'k':String(Math.round(v));
  function draw(svg,data,W,H,animate){
    const L=8,R=150,T=24,B=40; const n=data[0].vals.length-1;
    const max=Math.max(...data.flatMap(d=>d.vals),1); const tick=niceTick(max); const top=Math.ceil(max/tick)*tick;
    const x=i=>L+(W-L-R)*(n?i/n:0), y=v=>T+(H-T-B)*(1-v/top);
    let s='';
    for(let g=tick; g<=top+1e-9; g+=tick){ s+=`<line x1="${L}" x2="${W-R}" y1="${y(g)}" y2="${y(g)}" stroke="var(--cork)" stroke-dasharray="3 5"/><text x="${L}" y="${y(g)-8}">${kfmt(g)} €</text>`; }
    s+=`<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--drift)"/>`;
    const xs=n<=10?1:n<=25?5:10; for(let i=0;i<=n;i+=xs){ s+=`<text x="${x(i)}" y="${H-12}" text-anchor="${i===0?'start':'middle'}">${i===0?'Hoy':'Año '+i}</text>`; }
    const ends=[];
    data.forEach(d=>{
      const p=d.vals.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
      s+=`<path class="line" d="${p}" stroke="${d.c}" stroke-width="${d.w}" ${d.dash?'stroke-dasharray="6 6"':''}/>`;
      s+=`<circle cx="${x(n)}" cy="${y(d.vals[n])}" r="${d.w+1.5}" fill="${d.c}"/>`;
      ends.push({y:y(d.vals[n]),t:d.name+' · '+kfmt(d.vals[n])+' €',c:d.c});
    });
    ends.sort((a,b)=>a.y-b.y); for(let i=1;i<ends.length;i++){ if(ends[i].y-ends[i-1].y<20) ends[i].y=ends[i-1].y+20; }
    const over=ends.length?ends[ends.length-1].y-(H-B-4):0; if(over>0) ends.forEach(e=>e.y-=over);
    ends.forEach(e=>{ s+=`<text class="end" x="${W-R+14}" y="${e.y+4}" style="fill:${e.c}">${e.t}</text>`; });
    svg.innerHTML=s;
    if(animate&&!RM){ svg.querySelectorAll('.line').forEach(l=>{ l.style.setProperty('--len',Math.ceil(l.getTotalLength())); }); svg.classList.remove('draw'); void svg.getBBox(); svg.classList.add('draw'); }
  }

  /* Chart A: 10.000 € lump sum, 30 years */
  const svgA=document.getElementById('chartA');
  const dataA=SER.map(d=>({...d,vals:series(10000,0,30,d.r)}));
  draw(svgA,dataA,1200,460,false);

  /* Simulator */
  const ids=['ini','mes','anos']; const el={}; ids.forEach(i=>el[i]=document.getElementById(i));
  const realBtn=document.getElementById('real'); let real=false;
  const svgB=document.getElementById('chartB');
  function update(){
    const ini=+el.ini.value, mes=+el.mes.value, n=+el.anos.value;
    document.getElementById('iniO').textContent=fmt(ini);
    document.getElementById('mesO').textContent=fmt(mes);
    document.getElementById('anosO').textContent=n+(n===1?' año':' años');
    const defl=i=>real?Math.pow(1.025,i):1;
    const data=SER.map(d=>({...d,vals:series(ini,mes,n,d.r).map((v,i)=>v/defl(i))}));
    data.forEach(d=>document.getElementById('r'+d.k).textContent=fmt(d.vals[n]));
    const C=data.find(d=>d.k==='C').vals[n], P=data.find(d=>d.k==='P').vals[n];
    document.getElementById('diff').textContent=fmt(Math.max(0,P-C));
    document.getElementById('paid').textContent=fmt(ini+mes*12*n);
    document.getElementById('realNote').textContent=real?'En euros de hoy, descontando una inflación media del 2,5 % anual.':'Valores nominales. Activa la opción para descontar una inflación media del 2,5 %.';
    draw(svgB,data,1000,420,false);
  }
  ids.forEach(i=>el[i].addEventListener('input',update));
  realBtn.addEventListener('click',()=>{ real=!real; realBtn.setAttribute('aria-pressed',real); realBtn.textContent=real?'Ver en euros nominales':'Ver en euros de hoy'; update(); });
  document.getElementById('simForm').addEventListener('submit',e=>e.preventDefault());
  update();

  /* Reveal + chart draw on scroll (elements are visible at rest; they only rise into place) */
  if('IntersectionObserver' in window && !RM){
    const vh=innerHeight;
    document.querySelectorAll('.rv').forEach(e=>{ if(e.getBoundingClientRect().top>vh) e.classList.add('pre'); });
    const io=new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.remove('pre'); io.unobserve(en.target);} }),{threshold:.12});
    document.querySelectorAll('.rv.pre').forEach(e=>io.observe(e));
    let drawn=false;
    const io2=new IntersectionObserver(es=>{ if(es[0].isIntersecting&&!drawn){ drawn=true; draw(svgA,dataA,1200,460,true); io2.disconnect(); } },{threshold:.35});
    io2.observe(svgA);
    /* active nav */
    const links=[...document.querySelectorAll('.nav ul a')];
    const io3=new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+en.target.id)); } }),{rootMargin:'-45% 0px -50% 0px'});
    ['inflacion','invertir','cartera','simulador'].forEach(id=>io3.observe(document.getElementById(id)));
  }
})();
