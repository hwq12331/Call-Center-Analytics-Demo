(function () {
  'use strict';
  const A=window.ContactCenterAnalytics;
  const DATA=window.CALL_CENTER_DATA;
  const C={navy:'#142d4e',blue:'#357abd',teal:'#168c82',amber:'#d49a32',muted:'#7e8fa2',grid:'#e5ebf2'};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=(v,d=0)=>v===null||!Number.isFinite(v)?'—':v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(v,d=2)=>v===null||!Number.isFinite(v)?'—':num(v*100,d)+'%';
  const dateLabel=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
  const line=(x1,y1,x2,y2,attributes='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attributes}/>`;
  const rect=(x,y,w,h,fill,rx=0)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="${rx}" fill="${fill}"/>`;
  const txt=(x,y,text,attrs='')=>`<text x="${x}" y="${y}" ${attrs}>${esc(text)}</text>`;
  const circle=(x,y,r,fill,attrs='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${attrs}/>`;
  const interactive=(body,title)=>`<g class="interactive" tabindex="0" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</g>`;
  function svg(title,body,height=255){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 ${height}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;}
  function ceiling(value){
    if(!value||value<0)return 1;
    const scale=10**Math.floor(Math.log10(value));
    return [1,1.25,1.5,2,2.5,3,4,5,6,8,10].map(v=>v*scale).find(v=>v>=value)||10*scale;
  }
  function plot(max,min=0){
    const p={left:48,right:625,top:22,bottom:207,min,max};
    p.width=p.right-p.left;p.height=p.bottom-p.top;
    p.y=value=>p.bottom-(value-min)/(max-min)*p.height;
    p.x=(i,n)=>p.left+(i+.5)*p.width/n;
    return p;
  }
  function axes(p,formatter=value=>num(value),unit=''){
    let out='';
    for(let i=0;i<=4;i++){
      const value=p.min+(p.max-p.min)*i/4,y=p.y(value);
      out+=line(p.left,y,p.right,y,'class="grid"')+txt(p.left-10,y+3,formatter(value),'text-anchor="end" class="tick-label"');
    }
    if(unit)out+=txt(p.left,10,unit,'class="axis-title"');
    return out;
  }
  function categories(p,labels){return labels.map((label,i)=>txt(p.x(i,labels.length),p.bottom+23,label,'text-anchor="middle" class="tick-label"')).join('');}
  function bars(rows,key,title,options={}){
    const values=rows.map(r=>r[key]||0),max=ceiling(Math.max(...values,0)*1.2);
    const p=plot(max),width=Math.min(36,p.width/rows.length*.58);
    let out=axes(p,v=>v>=10000?num(v/1000)+'k':num(v),options.unit||'');
    out+=categories(p,rows.map(r=>r.label));
    rows.forEach((r,i)=>{
      const value=r[key],x=p.x(i,rows.length),color=options.color||C.blue;
      if(value===null)return;
      out+=interactive(rect(x-width/2,p.y(value),width,p.bottom-p.y(value),color,2),`${r.label}: ${num(value,options.decimals||0)} ${options.tooltipUnit||''}`);
      out+=txt(x,p.y(value)-9,num(value,options.decimals||0),'text-anchor="middle" class="value-label"');
    });
    return svg(title,out);
  }
  function lineChart(rows,series,title,options={}){
    const all=series.flatMap(s=>rows.map(r=>r[s.key])).filter(v=>v!==null&&Number.isFinite(v));
    const max=options.max!==undefined?options.max:ceiling(Math.max(...all,0)*1.13);
    const min=options.min||0,p=plot(max,min);
    let out=axes(p,options.format||num,options.unit||'')+categories(p,rows.map(r=>r.label));
    series.forEach(s=>{
      const points=rows.map((r,i)=>r[s.key]===null?null:{x:p.x(i,rows.length),y:p.y(r[s.key]),r});
      let path='',open=false;
      points.forEach(point=>{if(!point){open=false;return;}path+=(open?'L':'M')+point.x+','+point.y+' ';open=true;});
      out+=`<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      points.forEach(point=>{if(point)out+=interactive(circle(point.x,point.y,3.8,s.color,'class="dot"'),`${point.r.label} · ${s.label}: ${(options.tooltipFormat||num)(point.r[s.key])}`);});
    });
    return svg(title,out);
  }
  function quarterlyChart(model){
    const rows=model.quarterly,max=ceiling(Math.max(...rows.flatMap(r=>[r.AR||0,r.ENG||0]))*1.2),p=plot(max);
    const width=Math.min(38,p.width/rows.length*.23);
    let out=axes(p,v=>num(v,0),'AHT · minutes')+categories(p,rows.map(r=>r.label));
    for(const [i,row] of rows.entries())for(const [offset,lang,color] of [[-.58,'AR',C.teal],[.58,'ENG',C.blue]]){
      if(row[lang]===null)continue;
      const x=p.x(i,rows.length)+width*offset,value=row[lang];
      out+=interactive(rect(x-width/2,p.y(value),width,p.bottom-p.y(value),color,2),`${row.label} · ${lang}: ${num(value,2)} min, weighted by answered volume`);
      out+=txt(x,p.y(value)-9,num(value,2),'text-anchor="middle" class="value-label"');
    }
    return svg('Quarterly weighted AHT for AR and ENG. Month and Skill apply; both languages retained.',out);
  }
  function scatterChart(model){
    const rows=model.monthly.filter(r=>r.csat!==null&&r.fcr!==null);
    if(!rows.length)return '<p class="empty-chart">No survey responses for this period.</p>';
    const xs=rows.map(r=>r.fcr),ys=rows.map(r=>r.csat);
    const xlo=Math.max(0,Math.floor((Math.min(...xs)-.015)*100)/100),xhi=Math.min(1,Math.ceil((Math.max(...xs)+.015)*100)/100);
    const ylo=Math.max(1,Math.floor((Math.min(...ys)-.10)*10)/10),yhi=Math.min(5,Math.ceil((Math.max(...ys)+.10)*10)/10);
    const p=plot(yhi>ylo?yhi:ylo+.2,ylo),x=v=>p.left+(v-xlo)/(xhi-xlo)*p.width;
    let out=axes(p,v=>num(v,1),'CSAT · mean rating / 5');
    for(let i=0;i<=4;i++){
      const value=xlo+(xhi-xlo)*i/4;
      out+=txt(x(value),p.bottom+23,pct(value,0),'text-anchor="middle" class="tick-label"');
    }
    out+=txt((p.left+p.right)/2,250,'FCR · first-call resolution %','text-anchor="middle" class="axis-title"');
    const r=model.association;
    if(r.slope!==null){
      const xa=Math.min(...xs),xb=Math.max(...xs);
      out+=line(x(xa),p.y(r.intercept+r.slope*xa),x(xb),p.y(r.intercept+r.slope*xb),`stroke="${C.blue}" stroke-width="1.7" stroke-dasharray="5 4" opacity=".6"`);
    }
    const offsets={Jan:[7,16],Feb:[8,15],Mar:[6,-10],Apr:[7,16],May:[-29,-10],Jun:[-30,-10],Jul:[-26,16],Aug:[7,-9],Sep:[7,-10],Oct:[-28,-10],Nov:[-30,-9],Dec:[8,16]};
    for(const row of rows){
      const xx=x(row.fcr),yy=p.y(row.csat),offset=offsets[row.label]||[7,-8];
      out+=interactive(circle(xx,yy,5.5,C.teal,'class="dot"'),`${row.label} · FCR ${pct(row.fcr)} · CSAT ${num(row.csat,2)}/5 · ${row.surveys} survey responses`);
      out+=txt(Math.max(p.left+2,Math.min(p.right-20,xx+offset[0])),Math.max(p.top+4,Math.min(p.bottom+12,yy+offset[1])),row.label,'class="tick-label"');
    }
    return svg('Monthly FCR versus CSAT, one point per surveyed month. Descriptive linear association.',out);
  }
  function dailyChart(model){
    const rows=model.daily,p=plot(ceiling(Math.max(...rows.map(r=>r.offered))*1.1));
    const x=i=>p.left+(rows.length===1?.5:i/(rows.length-1))*p.width;
    let out=axes(p,v=>num(v),'Offered calls'),path=rows.map((r,i)=>(i?'L':'M')+x(i)+','+p.y(r.offered)).join(' ');
    if(rows.length)out+=`<path d="${path} L${x(rows.length-1)},${p.bottom} L${x(0)},${p.bottom} Z" fill="${C.blue}" opacity=".055"/><path d="${path}" fill="none" stroke="${C.blue}" stroke-width="1.65" stroke-linejoin="round"/>`;
    const average=model.overall.dailyAverage||0;
    out+=line(p.left,p.y(average),p.right,p.y(average),'class="reference"')+txt(p.left+5,p.y(average)-9,'Period average '+num(average),'fill="#b6892d" class="value-label"');
    const ticks=[...new Set(Array.from({length:6},(_,i)=>Math.round(i*(rows.length-1)/5)))];
    ticks.forEach(i=>{if(rows[i])out+=txt(x(i),p.bottom+24,dateLabel(rows[i].date),'text-anchor="middle" class="tick-label"');});
    if(model.peak){const i=rows.indexOf(model.peak);out+=interactive(circle(x(i),p.y(model.peak.offered),3.5,C.blue,'class="dot"'),`${dateLabel(model.peak.date)} · Peak ${num(model.peak.offered)} offered · PCA ${pct(model.peak.pca)} · SLA ${pct(model.peak.sla)}`);}
    return svg('Daily offered call volume and selected-period daily average, including Calendar dates with zero selected-segment volume.',out);
  }
  function skillsChart(model){
    const rows=model.monthly,p=plot(ceiling(Math.max(...rows.map(r=>r.skillTotal))*1.15)),width=Math.min(35,p.width/rows.length*.58);
    let out=axes(p,v=>num(v/1000)+'k','Offered calls')+categories(p,rows.map(r=>r.label));
    rows.forEach((r,i)=>{
      const x=p.x(i,rows.length);
      out+=interactive(rect(x-width/2,p.y(r.Complain),width,p.bottom-p.y(r.Complain),C.blue),`${r.label} · Complain ${num(r.Complain)} offered`);
      out+=interactive(rect(x-width/2,p.y(r.skillTotal),width,p.y(r.Complain)-p.y(r.skillTotal),C.teal),`${r.label} · Inquiry ${num(r.Inquiry)} offered · Both skills ${num(r.skillTotal)}`);
    });
    return svg('Monthly offered call volume stacked by skill. Month and Language apply; both skills retained.',out);
  }
  function answerChart(model){
    const p=plot(1),left=110,right=616,width=right-left;
    let out='';
    for(let i=0;i<=5;i++){const x=left+i*width/5;out+=line(x,32,x,180,'class="grid"')+txt(x,213,(i*20)+'%','text-anchor="middle" class="tick-label"');}
    model.skills.forEach((r,i)=>{
      const y=60+i*76,color=i===0?C.blue:C.teal,value=r.pca||0;
      out+=txt(left-12,y+7,r.label,'text-anchor="end" class="value-label"')+rect(left,y-11,width,29,'#f1f5fa',3);
      out+=interactive(rect(left,y-11,width*value,29,color,3),`${r.label} · ${num(r.answered)} answered / ${num(r.offered)} offered · PCA ${pct(r.pca)}`);
      if(r.pca!==null)out+=txt(left+width*value-9,y+8,pct(r.pca),'text-anchor="end" style="fill:white;font-weight:700;font-size:12px"');
    });
    out+=txt((left+right)/2,248,'Answered / offered within each skill','text-anchor="middle" class="axis-title"');
    return svg('Answered percentage within each skill on a zero-to-one-hundred percent axis.',out);
  }
  function boxChart(model){
    const valid=model.teams.filter(t=>t.n);
    if(!valid.length)return '<p class="empty-chart">No answered-call days for this selection.</p>';
    const p=plot(ceiling(Math.max(...valid.map(t=>t.max))*1.12));
    let out=axes(p,v=>num(v,0),'Weighted daily AHT · min');
    model.teams.forEach((t,i)=>{
      const x=p.x(i,2),width=92,color=i===0?C.teal:C.blue;
      out+=txt(x,p.bottom+24,t.language,'text-anchor="middle" class="value-label"');
      if(!t.n)return;
      let body=line(x,p.y(t.low),x,p.y(t.high),`stroke="${C.muted}" stroke-width="1.5"`);
      body+=line(x-24,p.y(t.low),x+24,p.y(t.low),`stroke="${C.muted}" stroke-width="1.5"`)+line(x-24,p.y(t.high),x+24,p.y(t.high),`stroke="${C.muted}" stroke-width="1.5"`);
      body+=rect(x-width/2,p.y(t.q3),width,p.y(t.q1)-p.y(t.q3),color,2).replace('fill="'+color+'"','fill="'+color+'" fill-opacity=".25" stroke="'+color+'"');
      body+=line(x-width/2,p.y(t.median),x+width/2,p.y(t.median),`stroke="${C.navy}" stroke-width="2.5"`);
      body+=t.outliers.map((value,j)=>circle(x+(j%3-1)*4,p.y(value),3,'#91a2b4')).join('');
      out+=interactive(body,`${t.language} · ${t.n} valid daily observations · Q1 ${num(t.q1,2)} · median ${num(t.median,2)} · Q3 ${num(t.q3,2)} min`);
      out+=txt(x+width/2+10,p.y(t.median)+3,num(t.median,2),'class="value-label"');
    });
    return svg('Daily AHT Boxplots by language, standard 1.5 times interquartile-range whiskers and visible outliers.',out);
  }
  const settings={overview:{title:'Service at a glance',subtitle:'Demand, service delivery and the customer experience.'},operations:{title:'Inside the operation',subtitle:'Find the peaks, understand the mix, align coverage.'},teams:{title:'Teams & handle time',subtitle:'Compare daily distributions and investigate the time drivers.'}};
  const query=new URLSearchParams(location.search);
  let state=A.normalizeState({month:query.get('month'),language:query.get('language'),skill:query.get('skill')});
  let model;
  function setText(id,text){$(id).textContent=text;}
  function renderKpis(m){
    const o=m.overall;
    const cards=[['Offered calls',num(o.offered),'Call volume',C.blue],['Handle time',num(o.aht,2)+'<span class="suffix">min</span>','Volume-weighted AHT',C.amber],['Answer rate',pct(o.pca),'Answered / offered',C.blue],['Service level',pct(o.sla),'Within SL / offered',C.teal],['Satisfaction',num(o.csat,2)+'<span class="suffix">/ 5</span>',num(o.surveys)+' surveys · date only',C.blue],['First-call resolution',pct(o.fcr),'Valid responses · date only',C.teal]];
    $('kpis').innerHTML=cards.map(([label,value,unit,color])=>`<article class="kpi" style="--accent:${color}"><p>${label}</p><strong>${value}</strong><small>${unit}</small></article>`).join('');
  }
  function render(){
    model=A.compute(DATA,state);const m=model,o=m.overall;
    $('month').value=String(state.month);$('language').value=state.language;$('skill').value=state.skill;
    const selection=`2021 · ${state.month?A.MONTHS[state.month-1]:'All months'} · ${state.language==='all'?'All languages':state.language} · ${state.skill==='all'?'All skills':state.skill}`;
    setText('selection-context',selection);setText('coverage',num(o.days)+' days · '+num(o.surveys)+' surveys');
    renderKpis(m);
    $('chart-demand').innerHTML=bars(m.monthly,'dailyAverage','Average offered calls per Calendar day by month',{unit:'Calls / Calendar day'});
    $('chart-service').innerHTML=lineChart(m.monthly,[{key:'pca',label:'PCA',color:C.blue},{key:'sla',label:'SLA',color:C.teal}],'Monthly answered and service-level percentages',{max:1,format:v=>pct(v,0),tooltipFormat:pct});
    $('chart-quarter').innerHTML=quarterlyChart(m);$('chart-scatter').innerHTML=scatterChart(m);
    $('chart-daily').innerHTML=dailyChart(m);$('chart-weekday').innerHTML=bars(m.weekdays,'value','Average offered calls by weekday',{unit:'Calls / Calendar day'});
    $('chart-skills').innerHTML=skillsChart(m);$('chart-answer').innerHTML=answerChart(m);$('chart-box').innerHTML=boxChart(m);
    $('chart-aht').innerHTML=lineChart(m.monthly,[{key:'aht',label:'Weighted AHT',color:C.amber}],'Monthly weighted average handle time in minutes',{unit:'Weighted AHT · min',tooltipFormat:v=>num(v,2)+' min'});
    const byDemand=[...m.monthly].sort((a,b)=>b.dailyAverage-a.dailyAverage),busy=byDemand[0],quiet=byDemand[byDemand.length-1];
    setText('insight-demand',`${busy.label} averages ${num(busy.dailyAverage)} calls/day${m.monthly.length>1?`, versus ${num(quiet.dailyAverage)} in ${quiet.label}`:''}. Allow for Calendar-day demand when planning coverage.`);
    setText('insight-service',`Selected PCA is ${pct(o.pca)} and SLA ${pct(o.sla)}. Their ${num(o.lateShare===null?null:o.lateShare*100,2)} percentage-point gap represents calls answered after service level.`);
    const lastQuarter=m.quarterly[m.quarterly.length-1];
    setText('insight-quarter',`${lastQuarter.label} weighted AHT: AR ${num(lastQuarter.AR,2)} min / ENG ${num(lastQuarter.ENG,2)} min. Both teams are retained; review shared process and case-mix drivers.`);
    const r=m.association;
    setText('insight-scatter',r.r===null?'Correlation requires at least two monthly pairs with variation. Survey results use Month only.':`Across ${r.n} monthly pairs, Pearson r = ${num(r.r,3)} and R-squared = ${num(r.r2,3)}. The association is descriptive, not causal.`);
    setText('insight-daily',`Selected demand averages ${num(o.dailyAverage)} calls/day. The peak is ${num(m.peak.offered)} on ${dateLabel(m.peak.date)}; peak-date PCA ${pct(m.peak.pca)}, SLA ${pct(m.peak.sla)}.`);
    const week=[...m.weekdays].filter(d=>d.value!==null).sort((a,b)=>b.value-a.value);
    setText('insight-weekday',`${week[0].label} averages ${num(week[0].value)} calls/day, versus ${num(week[week.length-1].value)} on ${week[week.length-1].label}. Use actual weekday Calendar-day counts to compare coverage needs.`);
    setText('insight-skills',`Complain receives ${num(m.skills[0].offered)} offered calls and Inquiry ${num(m.skills[1].offered)}. Both skills are retained; inspect monthly skill mix alongside total demand.`);
    setText('insight-answer',`Inquiry PCA is ${pct(m.skills[1].pca)} versus ${pct(m.skills[0].pca)} for Complain. Compare within-skill rates and review demand, queue conditions and coverage.`);
    setText('insight-box',`Daily medians: AR ${num(m.teams[0].median,2)} min (${m.teams[0].n} valid days), ENG ${num(m.teams[1].median,2)} min (${m.teams[1].n} days). Daily aggregates do not establish individual-call differences.`);
    const ahts=m.monthly.map(row=>row.aht).filter(v=>v!==null);
    setText('insight-aht',ahts.length?`Monthly weighted AHT ranges from ${num(Math.min(...ahts),2)} to ${num(Math.max(...ahts),2)} minutes. Examine Talk, Hold and ACW before interpreting longer handling as lower efficiency.`:'There are no answered calls in this segment; AHT is undefined rather than zero.');
    $('distribution-table').innerHTML=m.teams.map(t=>`<tr><th scope="row" class="team-name ${t.language==='ENG'?'eng':''}">${t.language}</th><td>${num(t.n)}</td>${['min','q1','median','q3','max'].map(key=>`<td>${num(t[key],2)}</td>`).join('')}</tr>`).join('');
    $('components').innerHTML=[['TALK TIME','talk'],['HOLD TIME','hold'],['AFTER-CALL WORK','acw']].map(([label,key])=>`<article class="component"><p>${label}</p><strong>${num(o.answered?o[key]/o.answered/60:null,2)}</strong><small>min / answered call</small></article>`).join('')+'<aside class="distribution-note"><h3>READ THE DISTRIBUTION CORRECTLY</h3><p>Each observation is one team’s weighted AHT on one date. Whiskers use 1.5 × IQR; outliers remain visible. Survey Language and Skill are unknown, so survey results remain date scoped.</p></aside>';
    $('monthly-table').innerHTML=m.monthly.map(row=>`<tr><th scope="row">${row.label}</th><td>${row.days}</td><td>${num(row.offered)}</td><td>${num(row.answered)}</td><td>${num(row.dailyAverage)}</td><td>${num(row.aht,2)}</td><td>${pct(row.pca)}</td><td>${pct(row.sla)}</td><td>${row.surveys}</td><td>${num(row.csat,2)}</td><td>${pct(row.fcr)}</td></tr>`).join('');
    updateUrl();
  }
  function activePage(){const page=location.hash.replace('#','');return Object.hasOwn(settings,page)?page:'overview';}
  function navigate(){
    const page=activePage();
    for(const section of document.querySelectorAll('.report-page'))section.hidden=section.id!==page;
    for(const link of document.querySelectorAll('[data-page]')){
      if(link.dataset.page===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    setText('page-title',settings[page].title);setText('page-subtitle',settings[page].subtitle);
    document.title=settings[page].title+' — Contact Center Intelligence';
  }
  function updateUrl(){
    const url=new URL(location.href);
    for(const key of ['month','language','skill']){
      const value=state[key];
      if(value===0||value==='all')url.searchParams.delete(key);else url.searchParams.set(key,value);
    }
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  function toast(message){setText('toast',message);$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
  $('filters').addEventListener('change',()=>{state=A.normalizeState({month:$('month').value,language:$('language').value,skill:$('skill').value});render();});
  document.querySelectorAll('[data-page]').forEach(link=>link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    const url=new URL(location.href);url.hash=link.dataset.page;history.pushState(null,'',url);
    navigate();window.scrollTo({top:0,behavior:'instant'});link.focus({preventScroll:true});
  }));
  $('reset').addEventListener('click',()=>{state=A.normalizeState();render();toast('Selections reset to the full-year baseline.');});
  window.addEventListener('hashchange',navigate);
  $('methods-open').addEventListener('click',()=>$('methods').showModal());
  $('methods-close').addEventListener('click',()=>$('methods').close());
  $('methods').addEventListener('click',event=>{if(event.target===$('methods')){const r=$('methods').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('methods').close();}});
  $('share').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Report link copied, including your selections.');}catch{toast('Copy the address bar URL to share this selection.');}});
  $('export').addEventListener('click',()=>{
    const headers=['Month','Calendar Days','Offered Calls','Answered Calls','Average Offered Per Day','AHT Minutes','PCA Percent','SLA Percent','Survey Responses','CSAT Score 1-5','FCR Percent'];
    const rows=model.monthly.map(r=>[r.label,r.days,r.offered,r.answered,r.dailyAverage,r.aht,r.pca===null?'':r.pca*100,r.sla===null?'':r.sla*100,r.surveys,r.csat,r.fcr===null?'':r.fcr*100]);
    const csv='\ufeff'+[headers,...rows].map(row=>row.map(v=>v===null?'':String(v)).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download=`contact-center-2021-month-${state.month||'all'}-${state.language}-${state.skill}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Monthly summary exported.');
  });
  if(!DATA){$('kpis').innerHTML='<p>Unable to load the source snapshot. Please refresh the page.</p>';return;}
  render();navigate();
  window.ContactCenterDemo={get state(){return {...state};},get model(){return model;},setState(input){state=A.normalizeState(input);render();}};
})();
