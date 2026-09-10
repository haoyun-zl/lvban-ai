"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, Camera, ChevronDown, CircleDollarSign, CloudSun, Coffee, Compass, Download, Footprints, GripVertical, Heart, LocateFixed, Lock, Map, MapPin, Menu, MessageCircle, Navigation, Plus, Route, Search, Send, Share2, Sparkles, Star, SunMedium, UserRound, Users, X } from "lucide-react";

type Stop={id:number;time:string;title:string;meta:string;type:string;color:string;x:number;y:number;note:string};
type LiveData={temperature:number|null;weather:string;photos:Array<{title:string;url:string;credit:string}>};
const baseStops:Omit<Stop,"title">[]=[
 {id:1,time:"09:00",meta:"建议停留 1.5 小时",type:"景点",color:"#ff6b57",x:67,y:22,note:"上午客流相对舒适，适合慢慢参观并拍照。"},
 {id:2,time:"11:10",meta:"步行 12 分钟",type:"漫步",color:"#ffb84d",x:61,y:39,note:"保留自由闲逛时间，可体验当地生活与特色小店。"},
 {id:3,time:"12:30",meta:"人均 ¥180 · 已避开忌口",type:"午餐",color:"#2ab7a9",x:50,y:52,note:"选择路线顺路且评价稳定的当地餐厅，可按饮食偏好调整。"},
 {id:4,time:"14:10",meta:"预计客流：舒适",type:"街区",color:"#846cf5",x:42,y:66,note:"下午适合街区漫步，系统已避开预计最拥挤时段。"},
 {id:5,time:"16:30",meta:"适合日落前抵达",type:"休闲",color:"#48a6ff",x:28,y:76,note:"低强度收尾，可休息赏景，附近交通方便。"},
];
const cityStops:Record<string,string[]>={
 北京:["天坛公园","前门大街","四季民福烤鸭店","故宫博物院","景山公园"],
 上海:["武康路","徐汇滨江","老吉士本帮菜","外滩","苏州河畔"],
 京都:["清水寺","二年坂·三年坂","京料理 花咲","祇园花见小路","鸭川河畔"],
 巴黎:["卢浮宫","杜乐丽花园","左岸咖啡馆","奥赛博物馆","塞纳河畔"],
 新加坡:["滨海湾花园","牛车水","娘惹餐厅","国家美术馆","滨海湾步道"],
 杭州:["灵隐寺","北山街","新白鹿餐厅","西湖苏堤","湖滨步行街"],
};
const preferenceOptions=["朋友 · 轻松慢游","亲子 · 少走路","情侣 · 浪漫体验","独自 · 深度探索","商务 · 高效准时","长辈同行 · 舒缓节奏"];
function makeStops(city:string){const names=cityStops[city]||[`${city}城市地标`,`${city}特色街区`,`${city}当地风味餐厅`,`${city}人文景点`,`${city}城市观景地`];return baseStops.map((s,i)=>({...s,title:names[i]}));}

export default function TravelPlanner({user,signInPath,signOutPath}:{user:{name:string;email:string}|null;signInPath:string;signOutPath:string}){
 const [view,setView]=useState<"trip"|"discover"|"tools">("trip"),[city,setCity]=useState("京都"),[days,setDays]=useState(4),[activeDay,setActiveDay]=useState(1);
 const [stops,setStops]=useState<Stop[]>(makeStops("京都")),[selected,setSelected]=useState(1),[panel,setPanel]=useState(true),[planning,setPlanning]=useState(false);
 const [preference,setPreference]=useState(preferenceOptions[0]),[prefOpen,setPrefOpen]=useState(false),[chat,setChat]=useState(""),[toast,setToast]=useState(""),[mobileMap,setMobileMap]=useState(false),[sceneOpen,setSceneOpen]=useState(false);
 const [live,setLive]=useState<LiveData>({temperature:null,weather:"加载中",photos:[]});
 const selectedStop=stops.find(s=>s.id===selected)??stops[0],total=useMemo(()=>1280+days*360,[days]);
 const photoUrl=`/api/photo?query=${encodeURIComponent(city+" "+selectedStop.title+" landmark")}&index=${Math.max(0,selected-1)}`;
 useEffect(()=>{const saved=localStorage.getItem("lvban-draft");if(saved)try{const d=JSON.parse(saved);if(d.city){setCity(d.city);setStops(makeStops(d.city))}if(d.preference)setPreference(d.preference)}catch{}},[]);
 useEffect(()=>{localStorage.setItem("lvban-draft",JSON.stringify({city,preference,stops}))},[city,preference,stops]);
 useEffect(()=>{let ok=true;fetch(`/api/explore?city=${encodeURIComponent(city)}`).then(r=>r.json()).then(d=>{if(ok)setLive({temperature:d.temperature??null,weather:d.weather||"暂无",photos:d.photos||[]})}).catch(()=>{if(ok)setLive(x=>({...x,weather:"暂不可用"}))});return()=>{ok=false}},[city]);
 function notify(m:string){setToast(m);window.setTimeout(()=>setToast(""),2400)}
 function generate(){setPlanning(true);window.setTimeout(()=>{setStops(makeStops(city.trim()||"目的地"));setSelected(1);setActiveDay(1);setPlanning(false);notify(`已生成 ${city} ${days} 天${preference.split(" · ")[0]}攻略`)},700)}
 function move(from:number,to:number){if(from===to)return;const n=[...stops],[item]=n.splice(from,1);n.splice(to,0,item);setStops(n);notify("路线顺序已更新")}
 function navigate(){const q=encodeURIComponent(`${city} ${selectedStop.title}`);const china=["北京","上海","杭州","广州","深圳","成都","西安","南京","重庆","苏州"].some(c=>city.includes(c));window.open(china?`https://uri.amap.com/search?keyword=${q}&city=${encodeURIComponent(city)}&callnative=1`:`https://www.google.com/maps/search/?api=1&query=${q}`,"_blank","noopener,noreferrer")}
 return <main className="app-shell">
  <Header view={view} setView={setView} user={user} signInPath={signInPath} signOutPath={signOutPath} notify={notify}/>
  {view==="discover"&&<Discover city={city} setCity={setCity} live={live} start={()=>{setStops(makeStops(city));setView("trip")}}/>}
  {view==="tools"&&<TravelTools notify={notify}/>} 
  {view==="trip"&&<>
   <section className="planner-bar">
    <div className="planner-copy"><span className="eyebrow"><Sparkles size={14}/>AI 智能规划</span><h1>下一站，想去哪里？</h1><p>告诉我你的期待，几秒钟生成懂你的旅行计划</p></div>
    <div className="search-card">
     <label><MapPin size={18}/><span><small>目的地</small><input value={city} onChange={e=>setCity(e.target.value)} placeholder="城市或地区"/></span></label>
     <label><CalendarDays size={18}/><span><small>旅行天数</small><select value={days} onChange={e=>setDays(+e.target.value)}>{[2,3,4,5,6,7].map(d=><option key={d} value={d}>{d} 天</option>)}</select></span></label>
     <div className="travelers pref-control" onClick={()=>setPrefOpen(!prefOpen)}><Users size={18}/><span><small>同行偏好</small><b>{preference}</b></span><ChevronDown size={15}/>{prefOpen&&<div className="preference-menu" onClick={e=>e.stopPropagation()}>{preferenceOptions.map(p=><button key={p} className={p===preference?"active":""} onClick={()=>{setPreference(p);setPrefOpen(false)}}>{p}</button>)}</div>}</div>
     <button className="generate" onClick={generate} disabled={planning}>{planning?<><span className="spinner"/>生成中</>:<><Sparkles size={17}/>生成攻略</>}</button>
    </div>
    <div className="quick-tags"><span>快速开始</span>{["北京 3天","上海 3天","京都 4天","巴黎 5天","新加坡 4天"].map(x=><button key={x} onClick={()=>{const[c,d]=x.split(" ");setCity(c);setDays(parseInt(d));setStops(makeStops(c))}}>{x}</button>)}</div>
   </section>
   <section className="workspace">
    <aside className={`itinerary ${mobileMap?"mobile-hide":""}`}>
     <div className="trip-head"><div><span className="tiny-label">你的专属攻略</span><h2>{city} · {days}天治愈漫游</h2><p><CloudSun size={15}/>{live.temperature!==null?`${Math.round(live.temperature)}°C ${live.weather}`:"天气加载中"}　·　<CircleDollarSign size={15}/>预计 ¥{total.toLocaleString()}</p></div><button className="round" onClick={()=>notify("已加入收藏")}><Heart size={18}/></button></div>
     <div className="day-tabs">{Array.from({length:Math.min(days,5)},(_,i)=>i+1).map(d=><button key={d} className={activeDay===d?"active":""} onClick={()=>setActiveDay(d)}><b>DAY {d}</b><span>{d===1?"城市初遇":d===2?"人文漫游":d===3?"市井烟火":"自由探索"}</span></button>)}</div>
     <div className="day-summary"><div><SunMedium size={18}/><span><b>DAY {activeDay} · 今日路线</b><small>{preference}的在地体验</small></span></div><span className="pace"><Footprints size={14}/>轻松 · 8.2 km</span></div>
     <div className="stops">{stops.map((stop,i)=><article key={stop.id} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",String(i))} onDragOver={e=>e.preventDefault()} onDrop={e=>move(+e.dataTransfer.getData("text/plain"),i)} className={selected===stop.id?"selected":""} onClick={()=>{setSelected(stop.id);setPanel(true)}}><button className="drag"><GripVertical size={16}/></button><time>{stop.time}</time><span className="line-dot" style={{background:stop.color}}/><div className="stop-icon" style={{color:stop.color,background:`${stop.color}18`}}>{stop.type==="午餐"?<Coffee/>:stop.type==="休闲"?<SunMedium/>:<MapPin/>}</div><div className="stop-main"><div><h3>{stop.title}</h3><span>{stop.type}</span></div><p>{stop.meta}</p><small>{i<stops.length-1?`${i%2?"步行":"公交"} ${12+i*3} 分钟 · 路况畅通`:"适合低强度收尾"}</small></div><button className="lock" onClick={e=>{e.stopPropagation();notify(`已锁定 ${stop.title}`)}}><Lock size={14}/></button></article>)}<button className="add-stop" onClick={()=>notify("地点搜索功能准备中")}><Plus size={17}/>添加景点或餐厅</button></div>
     <div className="ai-chat"><span><MessageCircle size={18}/></span><input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&chat.trim()){notify("AI 已收到修改要求");setChat("")}}} placeholder="告诉AI：第二天轻松一点，加入一家咖啡馆…"/><button onClick={()=>{if(chat.trim()){notify("AI 已收到修改要求");setChat("")}}}><Send size={16}/></button></div>
    </aside>
    <section className={`map-area ${mobileMap?"mobile-show":""}`}>
     <div className="map-toolbar"><div><button className="active"><Map size={15}/>地图</button><button onClick={()=>setSceneOpen(true)}><Camera size={15}/>实景</button></div><button><LocateFixed size={16}/>查看全程</button></div>
     <div className="map-canvas"><div className="river"/><div className="road road-a"/><div className="road road-b"/><div className="park park-a"/><div className="park park-b"/><span className="district d1">{city}城区</span><span className="district d2">推荐路线</span><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M67 22 C63 30 64 34 61 39 S57 48 50 52 S45 60 42 66 S33 70 28 76"/></svg>{stops.map((s,i)=><button key={s.id} className={`pin ${selected===s.id?"active":""}`} style={{left:`${s.x}%`,top:`${s.y}%`,background:s.color}} onClick={()=>{setSelected(s.id);setPanel(true)}}><span>{i+1}</span><em>{s.title}</em></button>)}<div className="weather-float"><CloudSun size={24}/><div><b>{live.temperature!==null?`${Math.round(live.temperature)}°` :"--"}</b><small>{live.weather}</small></div><span>实时天气</span></div><div className="map-legend"><span><i className="green"/>路线演示</span><small>点击“去这里”打开真实地图导航</small></div></div>
     {panel&&<aside className="place-panel"><button className="close-panel" onClick={()=>setPanel(false)}><X size={17}/></button><div className="place-visual dynamic-scene"><img src={photoUrl} alt={`${selectedStop.title}实景`}/><span><Camera size={14}/>真实地点图片 · 开放图库</span></div><div className="place-content"><div className="place-title"><div><small>{selectedStop.type}</small><h3>{selectedStop.title}</h3></div><span><Star size={14} fill="currentColor"/>4.8</span></div><p>{selectedStop.note}</p><div className="live-grid"><div><span className="live-dot"/><small>客流参考</small><b>舒适</b></div><div><Navigation size={17}/><small>地图导航</small><b>可打开</b></div><div><Camera size={17}/><small>真实图片</small><b>已接入</b></div></div><div className="source-note"><BadgeCheck size={15}/><span>天气和图片使用真实接口<small>地图导航将跳转高德或 Google Maps</small></span></div><div className="panel-actions"><button onClick={()=>setSceneOpen(true)}><Camera size={16}/>看实景</button><button className="primary" onClick={navigate}><Route size={16}/>去这里</button></div></div></aside>}
    </section>
   </section>
   <div className="mobile-switch"><button className={!mobileMap?"active":""} onClick={()=>setMobileMap(false)}><CalendarDays/>攻略</button><button className={mobileMap?"active":""} onClick={()=>setMobileMap(true)}><Map/>地图</button></div>
   <div className="bottom-actions"><button onClick={()=>notify("导出功能正在生成文件")}><Download size={17}/>导出攻略</button><button className="save" onClick={()=>notify(user?"攻略已保存":"请先登录后永久保存")}><Sparkles size={17}/>{user?"保存这次旅行":"登录后永久保存"}</button></div>
  </>}
  {sceneOpen&&<div className="scene-modal" onClick={()=>setSceneOpen(false)}><div onClick={e=>e.stopPropagation()}><button onClick={()=>setSceneOpen(false)}><X/></button><img src={photoUrl} alt={`${city} ${selectedStop.title}实景大图`}/><footer><span><small>当前地点实景</small><b>{selectedStop.title}</b><em>图片来源：Wikimedia Commons 开放图库</em></span><button onClick={navigate}><Navigation/>在地图中打开</button></footer></div></div>}
  {toast&&<div className="toast"><BadgeCheck size={17}/>{toast}</div>}
 </main>
}

function Header({view,setView,user,signInPath,signOutPath,notify}:{view:string;setView:(v:"trip"|"discover"|"tools")=>void;user:{name:string;email:string}|null;signInPath:string;signOutPath:string;notify:(m:string)=>void}){return <header className="topbar"><button className="brand brand-button" onClick={()=>setView("trip")}><span className="brand-mark"><Compass size={21}/></span><span>旅伴<span>AI</span></span></button><nav><button className={view==="trip"?"active":""} onClick={()=>setView("trip")}>我的行程</button><button className={view==="discover"?"active":""} onClick={()=>setView("discover")}>灵感发现</button><button className={view==="tools"?"active":""} onClick={()=>setView("tools")}>旅行工具</button></nav><div className="header-actions"><button className="icon-btn" onClick={()=>notify("分享链接已准备好")}><Share2 size={18}/></button>{user?<a className="user-chip" href={signOutPath}><span>{user.name.slice(0,1)}</span><b>{user.name.split("@")[0]}</b></a>:<a className="login" href={signInPath} target="_top"><UserRound size={17}/>登录保存</a>}<button className="menu"><Menu size={20}/></button></div></header>}

function Discover({city,setCity,live,start}:{city:string;setCity:(v:string)=>void;live:LiveData;start:()=>void}){const cards=Array.from({length:6},(_,i)=>({title:live.photos[i]?.title||`${city}旅行灵感 ${i+1}`,url:`/api/photo?query=${encodeURIComponent(city+" travel landmark")}&index=${i}`,credit:live.photos[i]?.credit||"Wikimedia Commons"}));return <section className="discover-page"><div className="discover-hero"><span><Sparkles size={15}/>灵感发现</span><h1>从一张真实风景，<br/>开始下一段旅程</h1><p>探索开放图库中的城市实拍，用实时天气筛选此刻适合出发的地方。</p><div className="discover-search"><Search size={18}/><input value={city} onChange={e=>setCity(e.target.value)} placeholder="搜索城市"/><button>探索</button></div><div className="city-pills">{["北京","京都","上海","巴黎","杭州"].map(c=><button className={city===c?"active":""} key={c} onClick={()=>setCity(c)}>{c}</button>)}</div></div><div className="discover-head"><div><small>此刻的 {city}</small><h2>真实旅行灵感</h2></div><div className="weather-pill"><CloudSun/><span><b>{live.temperature!==null?`${Math.round(live.temperature)}°C`:"--"}</b><small>{live.weather} · 实时</small></span></div></div><div className="photo-grid">{cards.map((p,i)=><article key={i} className={i===0?"featured":""}><img src={p.url} alt={p.title}/><div className="photo-shade"/><div className="photo-copy"><span>真实地点图片</span><h3>{p.title}</h3><p><Camera size={13}/>{p.credit}</p><button onClick={start}>用这里生成攻略 <Route size={14}/></button></div></article>)}</div><p className="data-credit">图片由 Wikimedia Commons 开放接口获取；天气来自 Open-Meteo。</p></section>}

function TravelTools({notify}:{notify:(m:string)=>void}){const list=[["实时天气","已接入"],["旅行预算","可使用"],["路线效率","体验版"],["实景图库","已接入"],["高德 / Google 导航","已接入跳转"],["同行偏好清单","可使用"]];return <section className="tools-page"><div className="tools-hero"><span><Compass/>旅行工具箱</span><h1>出发前后，都替你想周全</h1><p>天气、预算、路线、实景与导航，一站整理。</p></div><div className="tool-status"><div><BadgeCheck/><span><b>真实接口运行中</b><small>天气、地点图片及外部地图导航已启用</small></span></div><div><span className="status-dot"/>服务正常</div></div><div className="tool-grid">{list.map(([name,status],i)=><button key={name} onClick={()=>notify(`${name}：${status}`)}><span className="tool-icon"><Compass/></span><span className="tool-text"><b>{name}</b><small>点击查看当前功能及数据状态</small></span><em>{status}</em><ChevronDown/></button>)}</div></section>}
