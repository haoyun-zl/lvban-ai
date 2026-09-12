type Poi={id:string;name:string;lat:number;lon:number;category:string;tags:Record<string,string>};
const headers={"user-agent":"LvbanAI/2.0 contact: site-owner","accept-language":"zh-CN,zh;q=0.9,en;q=0.6"};

export async function POST(request:Request){
 try{
  const body=await request.json() as {city?:string;days?:number;startDate?:string;people?:number;budget?:string;preference?:string};
  const city=(body.city||"").trim(),days=Math.min(Math.max(body.days||3,1),7),people=Math.min(Math.max(body.people||1,1),12);
  if(!city)return Response.json({error:"请输入目的地"},{status:400});
  const geo=await geocode(city);if(!geo)return Response.json({error:`暂未找到“${city}”，请尝试输入城市和国家`},{status:404});
  const pois=(curatedPlaces(city)||await places(geo.lat,geo.lon)).filter(p=>!isTransit(p));
  if(pois.length<3)return Response.json({error:"该地区开放地图地标数据不足，请尝试附近城市"},{status:422});
  const count=Math.min(Math.max(days*4,8),pois.length),chosen=pois.slice(0,count),groups=groupByDay(chosen,days,geo.lat,geo.lon);
  const plans=Array.from({length:days},(_,d)=>{
   const daily=nearestRoute(groups[d]||[],geo.lat,geo.lon).slice(0,4);
   return {day:d+1,date:addDays(body.startDate||new Date().toISOString().slice(0,10),d),theme:theme(d,daily),stops:daily.map((p,i)=>({...p,time:["09:00","11:15","14:00","16:30"][i],duration:i===0?90:75,cost:placeCost(p.category,geo.countryCode,body.budget),note:describe(p)})),route:[] as [number,number][]};
  });
  await Promise.all(plans.map(async p=>{p.route=await route(p.stops.map(s=>[s.lon,s.lat] as [number,number]))}));
  const weather=await weatherFor(geo.lat,geo.lon,plans.map(p=>p.date));
  const factor=geo.countryCode==="cn"?1:geo.countryCode==="th"?1.1:geo.countryCode==="jp"?1.8:geo.countryCode==="fr"?2.4:1.55;
  const level=body.budget==="经济"?.72:body.budget==="舒适"?1:1.65;
  const estimate=Math.round((days*people*520*factor*level+people*900*factor)/10)*10;
  return Response.json({requestedCity:city,city:geo.name,countryCode:geo.countryCode,center:[geo.lat,geo.lon],plans,weather,estimate,currency:"CNY",source:"OpenStreetMap · OSRM · Open-Meteo"},{headers:{"cache-control":"no-store"}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"规划服务暂不可用"},{status:503})}
}

async function geocode(city:string){const domestic=isChinaRegion(city),query=domestic?`${city} 中国`:city,url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1${domestic?'&countrycodes=cn':''}&q=${encodeURIComponent(query)}`;const rows=await fetchJson(url,{headers},"地点查询暂时繁忙") as Array<{lat:string;lon:string;display_name:string;address?:{country_code?:string;city?:string;state?:string;country?:string}}> ;const r=rows[0];if(!r)return null;if(domestic&&r.address?.country_code!=="cn")throw new Error(`“${city}”地点校验失败，请输入更具体的城市`);return{lat:+r.lat,lon:+r.lon,name:r.address?.city||r.address?.state||city,countryCode:r.address?.country_code||""}}
async function places(lat:number,lon:number){const q=`[out:json][timeout:14];(nwr(around:18000,${lat},${lon})[tourism~"attraction|museum|gallery|viewpoint|zoo|theme_park"][name];nwr(around:18000,${lat},${lon})[historic][name];nwr(around:14000,${lat},${lon})[leisure~"park|garden"][name];);out center tags 80;`;const endpoints=["https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.nchc.org.tw/api/interpreter"];let data:{elements:Array<{id:number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>}>}|null=null;for(const endpoint of endpoints){try{data=await fetchJson(endpoint,{method:"POST",headers:{...headers,"content-type":"application/x-www-form-urlencoded"},body:`data=${encodeURIComponent(q)}`},"地标服务繁忙");if(data?.elements?.length)break}catch{data=null}}if(!data?.elements?.length)return wikipediaPlaces(lat,lon);const seen=new Set<string>();return data.elements.flatMap(e=>{const t=e.tags||{},name=t["name:zh"]||t["name:en"]||t.name,lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;if(!name||lat===undefined||lon===undefined||seen.has(name))return[];seen.add(name);return[{id:String(e.id),name,lat,lon,category:t.tourism||t.historic||t.leisure||"landmark",tags:t}] as Poi[]}).sort((a,b)=>score(b)-score(a))}
async function wikipediaPlaces(lat:number,lon:number){for(const host of ["zh.wikipedia.org","en.wikipedia.org"]){try{const url=`https://${host}/w/api.php?action=query&generator=geosearch&ggsprimary=all&ggsnamespace=0&ggsradius=10000&ggslimit=40&ggscoord=${lat}%7C${lon}&prop=coordinates&format=json&origin=*`;const data=await fetchJson<{query?:{pages?:Record<string,{pageid:number;title:string;coordinates?:Array<{lat:number;lon:number}>}>}}>(url,{headers},"备用地标服务繁忙");const points=Object.values(data.query?.pages??{}).flatMap(p=>{const c=p.coordinates?.[0];return c?[{id:`wiki-${p.pageid}`,name:p.title,lat:c.lat,lon:c.lon,category:"attraction",tags:{wikipedia:p.title}} as Poi]:[]});if(points.length>=3)return points}catch{}}throw new Error("真实地标服务暂时繁忙，请稍后重试")}
function score(p:Poi){return(p.tags.wikipedia?5:0)+(p.tags.wikidata?3:0)+(p.tags.website?1:0)+(p.category==="attraction"?2:0)}
function isTransit(p:Poi){const text=`${p.name} ${p.category} ${p.tags.aeroway||""} ${p.tags.railway||""} ${p.tags.public_transport||""}`.toLowerCase();return/(机场|航空港|车站|客运站|\S+站(?:\s|\(|$)|airport|airfield|aerodrome|railway station|train station|bus station|terminal)/.test(text)}
function groupByDay(items:Poi[],days:number,lat:number,lon:number){const groups=Array.from({length:days},()=>[] as Poi[]),centers=Array.from({length:days},(_,i)=>{const p=items[Math.floor(i*items.length/days)]||items[0];return p?[p.lat,p.lon] as [number,number]:[lat,lon] as [number,number]});for(const p of items){let best=0,value=Infinity;centers.forEach((c,i)=>{if(groups[i].length>=4)return;const distance=(p.lat-c[0])**2+(p.lon-c[1])**2,sizePenalty=groups[i].length*.00008;if(distance+sizePenalty<value){value=distance+sizePenalty;best=i}});groups[best].push(p);const g=groups[best];centers[best]=[g.reduce((s,x)=>s+x.lat,0)/g.length,g.reduce((s,x)=>s+x.lon,0)/g.length]}return groups}
function nearestRoute(items:Poi[],lat:number,lon:number){const left=[...items],out:Poi[]=[];let a=lat,b=lon;while(left.length){let at=0,best=Infinity;left.forEach((p,i)=>{const d=(p.lat-a)**2+(p.lon-b)**2;if(d<best){best=d;at=i}});const[p]=left.splice(at,1);out.push(p);a=p.lat;b=p.lon}return out}
async function route(coords:[number,number][]){if(coords.length<2)return coords.map(([lon,lat])=>[lat,lon] as [number,number]);try{const s=coords.map(c=>c.join(",")).join(";"),spread=Math.max(...coords.map(a=>Math.max(...coords.map(b=>Math.hypot(a[0]-b[0],a[1]-b[1]))))),profile=spread>.25?"driving":"foot";const d=await fetch(`https://router.project-osrm.org/route/v1/${profile}/${s}?overview=full&geometries=geojson`,{headers}).then(r=>r.json()) as {routes?:Array<{geometry:{coordinates:[number,number][]}}>};return(d.routes?.[0]?.geometry.coordinates||coords).map(([lon,lat])=>[lat,lon] as [number,number])}catch{return coords.map(([lon,lat])=>[lat,lon] as [number,number])}}
async function weatherFor(lat:number,lon:number,dates:string[]){const today=new Date(),start=new Date(dates[0]),diff=(start.getTime()-today.getTime())/86400000;try{if(diff>=-1&&diff<=15){const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&start_date=${dates[0]}&end_date=${dates.at(-1)}&timezone=auto`;const d=await fetch(u).then(r=>r.json()) as any;return dates.map((date,i)=>({date,max:d.daily?.temperature_2m_max?.[i]??null,min:d.daily?.temperature_2m_min?.[i]??null,rain:d.daily?.precipitation_probability_max?.[i]??null,code:d.daily?.weather_code?.[i]??null,label:"天气预报"}))}const y=String(Math.min(new Date().getUTCFullYear()-1,start.getUTCFullYear()-1));const mapped=dates.map(x=>y+x.slice(4));const u=`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${mapped[0]}&end_date=${mapped.at(-1)}&timezone=auto`;const d=await fetch(u).then(r=>r.json()) as any;return dates.map((date,i)=>({date,max:d.daily?.temperature_2m_max?.[i]??null,min:d.daily?.temperature_2m_min?.[i]??null,rain:d.daily?.precipitation_sum?.[i]??null,code:d.daily?.weather_code?.[i]??null,label:`${y}年同期参考`}))}catch{return dates.map(date=>({date,max:null,min:null,rain:null,code:null,label:"天气暂不可用"}))}}
function addDays(s:string,n:number){const d=new Date(`${s}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function theme(day:number,p:Poi[]){return["城市初见","历史与人文","自然慢游","街巷生活","经典深度游","自由探索","悠闲收尾"][day]+(p[0]?` · ${p[0].name}`:"")}
function describe(p:Poi){const kind:Record<string,string>={museum:"博物馆",gallery:"美术馆",viewpoint:"观景地",park:"公园",garden:"花园",attraction:"热门景点"},source=p.tags.source==="province-core"?"省级核心景区库":p.tags.wikipedia?"Wikipedia 地理数据":"OpenStreetMap";return`${kind[p.category]||"当地地标"}，数据来自${source}。建议出发前核对开放时间。`}
function placeCost(c:string,country:string,b?:string){const base=["park","garden","viewpoint"].includes(c)?20:c==="museum"?80:55;return Math.round(base*(country==="cn"?1:1.7)*(b==="精品"?1.5:b==="经济"?.8:1))}
const chinaRegions=new Set("北京 上海 天津 重庆 河北 山西 辽宁 吉林 黑龙江 江苏 浙江 安徽 福建 江西 山东 河南 湖北 湖南 广东 海南 四川 贵州 云南 陕西 甘肃 青海 台湾 内蒙古 广西 西藏 宁夏 新疆 香港 澳门".split(" "));
function isChinaRegion(city:string){return chinaRegions.has(city.replace(/[省市]$/,""))}
function provincePlaces(city:string){const key=city.replace(/省$/,"");const data:Record<string,Array<[string,number,number,string]>>={贵州:[["青岩古镇",26.33,106.68,"贵阳历史古镇"],["甲秀楼",26.57,106.72,"贵阳人文地标"],["黔灵山公园",26.60,106.69,"贵阳城市公园"],["黄果树瀑布",25.992,105.666,"安顺瀑布景区"],["天星桥景区",25.97,105.68,"安顺喀斯特景区"],["陡坡塘瀑布",26.006,105.69,"安顺瀑布景区"],["西江千户苗寨",26.49658,108.16987,"黔东南苗族村寨"],["朗德上寨",26.38,108.08,"黔东南苗族村寨"],["镇远古城",27.05,108.42,"黔东南历史古城"]],云南:[["石林风景区",24.814,103.323,"昆明世界自然遗产"],["滇池",24.85,102.68,"昆明高原湖泊"],["云南民族村",24.82,102.66,"昆明民族文化景区"],["大理古城",25.696,100.165,"大理历史古城"],["洱海",25.82,100.19,"大理高原湖泊"],["崇圣寺三塔",25.70,100.14,"大理历史地标"],["丽江古城",26.8721,100.238,"丽江世界文化遗产"],["玉龙雪山",27.098,100.175,"丽江雪山景区"],["束河古镇",26.92,100.20,"丽江历史古镇"]]};return data[key]?.map(([name,lat,lon,label],i)=>({id:`province-${key}-${i}`,name,lat,lon,category:"attraction",tags:{source:"province-core",label}}))||null}
function curatedPlaces(city:string){
 const key=city.trim().toLowerCase().replace(/[省市]$/g,"");
 if(["泰国","thailand","ประเทศไทย"].includes(key)){
  const thai:Array<[string,string,number,number,string]>=[
   ["曼谷大皇宫","พระบรมมหาราชวัง",13.7500,100.4913,"历史宫殿"],
   ["玉佛寺","วัดพระศรีรัตนศาสดาราม",13.7516,100.4927,"佛教寺院"],
   ["卧佛寺","วัดพระเชตุพนวิมลมังคลาราม",13.7465,100.4930,"佛教寺院"],
   ["郑王庙","วัดอรุณราชวราราม",13.7437,100.4889,"河畔寺院"],
   ["吉姆·汤普森之家","พิพิธภัณฑ์บ้าน จิม ทอมป์สัน",13.7492,100.5283,"文化博物馆"],
   ["曼谷艺术文化中心","หอศิลปวัฒนธรรมแห่งกรุงเทพมหานคร",13.7467,100.5300,"艺术中心"],
   ["伦披尼公园","สวนลุมพินี",13.7306,100.5418,"城市公园"],
   ["唐人街耀华力路","ถนนเยาวราช",13.7408,100.5097,"特色街区"],
   ["乍都乍周末市场","ตลาดนัดจตุจักร",13.7999,100.5501,"周末市场"],
   ["暹罗博物馆","มิวเซียมสยาม",13.7441,100.4940,"历史博物馆"],
   ["四面佛","ศาลท้าวมหาพรหม",13.7442,100.5404,"城市地标"],
   ["河城曼谷艺术古董中心","ริเวอร์ ซิตี้ แบงค็อก",13.7294,100.5131,"河畔文化空间"]
  ];
  return thai.map(([zh,local,lat,lon,label],i)=>({id:`thailand-${i}`,name:`${zh}（${local}）`,lat,lon,category:"attraction",tags:{source:"country-core",label}}));
 }
 return provincePlaces(city);
}

async function fetchJson<T>(url:string,init:RequestInit,message:string):Promise<T>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);try{const response=await fetch(url,{...init,signal:controller.signal});const type=response.headers.get("content-type")||"";if(!response.ok||!type.includes("json"))throw new Error(message);return await response.json() as T}finally{clearTimeout(timer)}}
