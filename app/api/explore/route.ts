type Photo={title:string;url:string;page:string;credit:string};

export async function GET(request:Request){
  const city=new URL(request.url).searchParams.get("city")?.trim()||"京都";
  const output:{city:string;temperature:number|null;weather:string;photos:Photo[];source:string}={city,temperature:null,weather:"暂无实时天气",photos:[],source:"Wikimedia Commons · Open-Meteo"};
  try{
    const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,{headers:{"user-agent":"LvbanAI/1.0"}}).then(r=>r.json()) as {results?:Array<{latitude:number;longitude:number}>};
    const loc=geo.results?.[0];
    if(loc){const weather=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&timezone=auto`).then(r=>r.json()) as {current?:{temperature_2m:number;weather_code:number}};output.temperature=weather.current?.temperature_2m??null;output.weather=weatherText(weather.current?.weather_code)}
  }catch{}
  try{
    const api=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(city+" travel landmark")}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*`;
    const data=await fetch(api,{headers:{"user-agent":"LvbanAI/1.0 (travel discovery demo)"}}).then(r=>r.json()) as {query?:{pages?:Record<string,{title:string;imageinfo?:Array<{thumburl?:string;descriptionurl?:string;extmetadata?:Record<string,{value?:string}>}>}>}};
    output.photos=Object.values(data.query?.pages??{}).flatMap(p=>{const i=p.imageinfo?.[0];return i?.thumburl?[{title:p.title.replace(/^File:/,"").replace(/\.[^.]+$/,"").replace(/_/g," "),url:i.thumburl,page:i.descriptionurl||"https://commons.wikimedia.org",credit:clean(i.extmetadata?.Artist?.value)||"Wikimedia Commons"}]:[]}).slice(0,6);
  }catch{}
  return Response.json(output,{headers:{"cache-control":"public, max-age=900"}});
}
function clean(v?:string){return v?.replace(/<[^>]*>/g,"").replace(/&[^;]+;/g," ").trim().slice(0,60)||""}
function weatherText(code?:number){if(code===undefined)return"暂无实时天气";if(code===0)return"晴朗";if(code<=3)return"多云";if(code<=48)return"有雾";if(code<=67)return"有雨";if(code<=77)return"有雪";if(code<=82)return"阵雨";return"雷雨"}
