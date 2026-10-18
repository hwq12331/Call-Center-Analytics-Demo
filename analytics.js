/* Call-center analytical model. The browser demo preserves the original fact grains. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.ContactCenterAnalytics = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthOf = date => Number(date.slice(5,7));
  const quarterOf = date => Math.floor((monthOf(date)-1)/3)+1;
  const weekdayOf = date => new Date(date+'T00:00:00Z').getUTCDay();
  const sum = (values) => values.reduce((total,value)=>total+value,0);
  const divide = (a,b) => b>0 ? a/b : null;
  const mean = values => values.length ? sum(values)/values.length : null;
  function normalizeState(state={}) {
    const month=Number(state.month);
    return {month:Number.isInteger(month)&&month>=0&&month<=12?month:0,
      language:['AR','ENG'].includes(state.language)?state.language:'all',
      skill:['Complain','Inquiry'].includes(state.skill)?state.skill:'all'};
  }
  function summarize(rows) {
    const totals={offered:0,answered:0,within:0,hold:0,acw:0,talk:0};
    for(const row of rows)for(const field of Object.keys(totals))totals[field]+=row[field];
    totals.tht=totals.hold+totals.acw+totals.talk;
    totals.aht=divide(totals.tht,totals.answered);
    if(totals.aht!==null)totals.aht/=60;
    totals.pca=divide(totals.answered,totals.offered);
    totals.sla=divide(totals.within,totals.offered);
    return totals;
  }
  function summarizeSurveys(rows) {
    const csat=rows.map(r=>r.csat).filter(v=>v!==null&&Number.isFinite(v));
    const fcr=rows.map(r=>r.fcr).filter(v=>v!==null&&Number.isFinite(v));
    return {surveys:rows.length,csat:mean(csat),fcr:mean(fcr)};
  }
  function percentile(values,p) {
    if(!values.length)return null;
    const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*p;
    const lo=Math.floor(index),hi=Math.ceil(index);
    return sorted[lo]+(sorted[hi]-sorted[lo])*(index-lo);
  }
  function distribution(values) {
    const v=values.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!v.length)return {n:0,min:null,q1:null,median:null,q3:null,max:null,low:null,high:null,outliers:[],values:[]};
    const q1=percentile(v,.25),median=percentile(v,.5),q3=percentile(v,.75),iqr=q3-q1;
    const inside=v.filter(x=>x>=q1-1.5*iqr&&x<=q3+1.5*iqr);
    return {n:v.length,min:v[0],q1,median,q3,max:v[v.length-1],low:inside[0],high:inside[inside.length-1],
      outliers:v.filter(x=>x<q1-1.5*iqr||x>q3+1.5*iqr),values:v};
  }
  function relationship(points) {
    const pairs=points.filter(p=>Number.isFinite(p.fcr)&&Number.isFinite(p.csat));
    if(pairs.length<2)return {n:pairs.length,r:null,r2:null,slope:null,intercept:null};
    const mx=mean(pairs.map(p=>p.fcr)),my=mean(pairs.map(p=>p.csat));
    const xx=sum(pairs.map(p=>(p.fcr-mx)**2)),yy=sum(pairs.map(p=>(p.csat-my)**2));
    const xy=sum(pairs.map(p=>(p.fcr-mx)*(p.csat-my)));
    if(xx<1e-14||yy<1e-14)return {n:pairs.length,r:null,r2:null,slope:null,intercept:null};
    const r=Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy)));
    return {n:pairs.length,r,r2:r*r,slope:xy/xx,intercept:my-(xy/xx)*mx};
  }
  function compute(data,inputState) {
    const state=normalizeState(inputState);
    const dates=data.calendar.filter(d=>!state.month||monthOf(d)===state.month);
    const dateSet=new Set(dates);
    const callsByDate=data.calls.filter(row=>dateSet.has(row.date));
    const surveys=data.surveys.filter(row=>dateSet.has(row.date));
    const languageMatch=row=>state.language==='all'||row.language===state.language;
    const skillMatch=row=>state.skill==='all'||row.skill===state.skill;
    const calls=callsByDate.filter(row=>languageMatch(row)&&skillMatch(row));
    const skillCalls=callsByDate.filter(languageMatch); // retain both skills
    const teamCalls=callsByDate.filter(skillMatch); // retain both languages
    const overall={...summarize(calls),...summarizeSurveys(surveys),days:dates.length};
    overall.dailyAverage=divide(overall.offered,overall.days);
    overall.lateShare=overall.pca===null?null:overall.pca-overall.sla;
    const monthNumbers=state.month?[state.month]:Array.from({length:12},(_,i)=>i+1);
    const monthly=monthNumbers.map(number=>{
      const days=dates.filter(d=>monthOf(d)===number).length;
      const selected=calls.filter(r=>monthOf(r.date)===number);
      const survey=surveys.filter(r=>monthOf(r.date)===number);
      const result={number,label:MONTHS[number-1],days,...summarize(selected),...summarizeSurveys(survey)};
      result.dailyAverage=divide(result.offered,days);
      result.Complain=summarize(skillCalls.filter(r=>monthOf(r.date)===number&&r.skill==='Complain')).offered;
      result.Inquiry=summarize(skillCalls.filter(r=>monthOf(r.date)===number&&r.skill==='Inquiry')).offered;
      result.skillTotal=result.Complain+result.Inquiry;
      return result;
    });
    const daily=dates.map(date=>({date,...summarize(calls.filter(r=>r.date===date))}));
    const weekdays=WEEKDAYS.map((label,number)=>{
      const selected=daily.filter(row=>weekdayOf(row.date)===number);
      return {label,days:selected.length,offered:sum(selected.map(row=>row.offered)),
        value:divide(sum(selected.map(row=>row.offered)),selected.length)};
    });
    const quarterNumbers=state.month?[Math.floor((state.month-1)/3)+1]:[1,2,3,4];
    const quarterly=quarterNumbers.map(number=>({number,label:'Q'+number,
      AR:summarize(teamCalls.filter(r=>quarterOf(r.date)===number&&r.language==='AR')).aht,
      ENG:summarize(teamCalls.filter(r=>quarterOf(r.date)===number&&r.language==='ENG')).aht}));
    const skills=['Complain','Inquiry'].map(label=>({label,...summarize(skillCalls.filter(r=>r.skill===label))}));
    const teams=['AR','ENG'].map(language=>{
      const rows=teamCalls.filter(r=>r.language===language);
      const valid=dates.map(date=>summarize(rows.filter(r=>r.date===date))).filter(row=>row.answered>0).map(row=>row.aht);
      return {language,...distribution(valid),annual:summarize(rows)};
    });
    const peak=daily.length?daily.reduce((a,b)=>a.offered>=b.offered?a:b):null;
    return {state,dates,overall,monthly,daily,weekdays,quarterly,skills,teams,peak,association:relationship(monthly)};
  }
  return {MONTHS,WEEKDAYS,normalizeState,summarize,summarizeSurveys,percentile,distribution,relationship,compute};
});
