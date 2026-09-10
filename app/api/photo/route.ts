const headers={"user-agent":"LvbanAI/2.1 (verified landmark image)","accept-language":"zh-CN,zh;q=0.9,en;q=0.7"};

export async function GET(request:Request){
 const u=new URL(request.url),query=(u.searchParams.get("query")||"").trim().slice(0,100),index=Math.max(0,Math.min(Number(u.searchParams.get("index")||0),8));
 if(!query)return placeholder("暂无地标图片");
 const candidates=[...await exactWiki("zh.wikipedia.org",query),...await exactWiki("en.wikipedia.org",query),...await exactCommons(query)];
 const target=[...new Set(candidates)][index%Math.max(candidates.length,1)];
 if(!target)return placeholder(`${query} 暂无可核实图片`);
 try{const image=await fetch(target,{headers});if(!image.ok||!image.headers.get("content-type")?.startsWith("image/"))throw new Error();return new Response(image.body,{headers:{"content-type":image.headers.get("content-type")||"image/jpeg","cache-control":"public, max-age=3600","x-image-match":"exact-landmark"}})}catch{return placeholder(`${query} 图片暂不可用`)}
}

async function exactWiki(host:string,title:string){try{const api=`https://${host}/w/api.php?action=query&redirects=1&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=thumbnail&pithumbsize=1400&format=json&origin=*`;const r=await fetch(api,{headers});if(!r.ok)return[];const data=await r.json() as {query?:{pages?:Record<string,{missing?:string;thumbnail?:{source?:string}}>} };return Object.values(data.query?.pages??{}).flatMap(p=>!p.missing&&p.thumbnail?.source?[p.thumbnail.source]:[])}catch{return[]}}
async function exactCommons(title:string){try{const api=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`intitle:"${title}"`)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=1400&format=json&origin=*`;const r=await fetch(api,{headers});if(!r.ok)return[];const data=await r.json() as {query?:{pages?:Record<string,{title:string;imageinfo?:Array<{thumburl?:string}>}>}};return Object.values(data.query?.pages??{}).filter(p=>normalize(p.title).includes(normalize(title))).flatMap(p=>p.imageinfo?.[0]?.thumburl?[p.imageinfo[0].thumburl]:[])}catch{return[]}}
function normalize(s:string){return s.toLowerCase().replace(/^file:/,"").replace(/[^\p{L}\p{N}]/gu,"")}
function placeholder(message:string){const safe=message.replace(/[<>&"']/g,"");const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="#e9eee9"/><path d="M390 430l145-155 92 91 70-72 125 136H390z" fill="#bac9c1"/><circle cx="730" cy="230" r="42" fill="#d6a958"/><text x="600" y="540" text-anchor="middle" font-size="30" font-family="sans-serif" fill="#51635b">${safe}</text><text x="600" y="585" text-anchor="middle" font-size="20" font-family="sans-serif" fill="#7b8a83">为避免图文不符，不展示通用旅行图片</text></svg>`;return new Response(svg,{headers:{"content-type":"image/svg+xml; charset=utf-8","cache-control":"public, max-age=900","x-image-match":"unavailable"}})}
