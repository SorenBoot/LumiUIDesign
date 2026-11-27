import React,{useEffect,useState} from 'react';
import {ThunderboltOutlined} from '@ant-design/icons';
import './chat-panel.css';

// Right-hand panel slot on the Chat page. Lumi-made panels land here later;
// with none, it shows a short greeting plus the live date and time.
const zone='Asia/Shanghai';
const fmt=opts=>new Intl.DateTimeFormat('zh-CN',{timeZone:zone,...opts});
const weekdayFmt=fmt({weekday:'short'}),dateFmt=fmt({month:'long',day:'numeric'}),timeFmt=fmt({hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const partsFmt=fmt({month:'numeric',day:'numeric',hour:'numeric',hourCycle:'h23',weekday:'short'});

// Fixed-date holidays only; lunar ones (春节, 中秋) need a calendar table and are left to the real app.
const holidays={'1-1':['元旦','新年快乐','新的一年，先别急着开工。'],'2-14':['情人节','情人节快乐','今天早点收工吧。'],'5-1':['劳动节','节日快乐','劳动节，记得也休息一下。'],'10-1':['国庆节','国庆快乐','假期愉快，工作我先帮你看着。'],'12-25':['圣诞节','圣诞快乐','今天适合慢一点。'],'12-31':['跨年夜','今年辛苦了','最后一天，收个尾就去跨年。']};
const slots=[
 {from:5,to:11,title:'早上好',lines:['咖啡先喝着，今天慢慢来。','新的一天，从最重要的那件开始。']},
 {from:11,to:14,title:'中午好',lines:['先吃饭，工作不会跑。','上午的进度我都记着。']},
 {from:14,to:18,title:'下午好',lines:['状态还行吗？','适合把难的那件推一推。']},
 {from:18,to:23,title:'晚上好',lines:['今天辛苦了。','收个尾就去休息吧。']},
 {from:23,to:29,title:'夜深了',lines:['今天就到这儿也不错。','剩下的明天我帮你接上。']}
];
const weekendLines=['今天不安排工作也可以。','周末愉快，想聊什么都行。'];

function useNow(){
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{let interval;const tick=()=>setNow(new Date());const timeout=setTimeout(()=>{tick();interval=setInterval(tick,60000);},60000-Date.now()%60000);return()=>{clearTimeout(timeout);clearInterval(interval);};},[]);
 return now;
}
function pick(list,key){
 // Stable for the session and slot, never the same line twice in a row.
 const store='lumi-greeting-last',last=sessionStorage.getItem(store);
 const seedKey=`lumi-greeting:${key}`,saved=sessionStorage.getItem(seedKey);
 if(saved&&list.includes(saved))return saved;
 const options=list.length>1?list.filter(line=>line!==last):list;
 const line=options[Math.floor(Math.random()*options.length)];
 sessionStorage.setItem(seedKey,line);sessionStorage.setItem(store,line);
 return line;
}
export function greetingFor(now,name='Tony'){
 const p=Object.fromEntries(partsFmt.formatToParts(now).map(x=>[x.type,x.value]));
 const hour=Number(p.hour),key=`${Number(p.month)}-${Number(p.day)}`,weekend=/六|日/.test(p.weekday);
 const holiday=holidays[key];
 if(holiday)return {title:`${holiday[1]}，${name}。`,line:holiday[2],holiday:holiday[0]};
 const h=hour<5?hour+24:hour,slot=slots.find(s=>h>=s.from&&h<s.to)||slots[0];
 const useWeekend=weekend&&slot.from>=11&&slot.from<18;
 return {title:`${useWeekend?'周末好':slot.title}，${name}。`,line:pick(useWeekend?weekendLines:slot.lines,`${key}-${useWeekend?'weekend':slot.from}`)};
}

export default function ChatPanel({panels=[]}){
 const now=useNow();
 const greet=greetingFor(now);
 const weekday=weekdayFmt.format(now).replace('星期','周');
 if(panels.length)return <aside className="cp54-panel has-panels" aria-label="面板">
  {panels.map(panel=><section key={panel.id} className="cp54-card">{panel.render()}</section>)}
  <footer className="cp54-foot"><span>{weekday} {dateFmt.format(now)} · {timeFmt.format(now)}</span></footer>
 </aside>;
 return <aside className="cp54-panel" aria-label="问候与时间">
  <div className="cp54-greet"><h2>{greet.title}</h2><p>{greet.line}</p></div>
  <time className="cp54-clock" dateTime={now.toISOString()} aria-label={`${dateFmt.format(now)} ${weekday} ${timeFmt.format(now)}`}>
   <span className="cp54-weekday">{weekday}{greet.holiday?` · ${greet.holiday}`:''}</span>
   <strong className="cp54-date">{dateFmt.format(now)}</strong>
   <span className="cp54-time">{timeFmt.format(now)}</span>
  </time>
  <p className="cp54-hint"><ThunderboltOutlined/>让 Lumi 生成一个面板，它会出现在这里</p>
 </aside>;
}
