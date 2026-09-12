type Photo={title:string;url:string;page:string;credit:string};

export async function GET(request:Request){
  const city=new URL(request.url).searchParams.get("city")?.trim()||"京都";
  const output:{city:string;temperature:number|null;weather:string;photos:Photo[];source:string}={city,temperature:null,weather:"暂无实时天气",photos:[],source:"Wikimedia Commons · Open-Meteo"};
  let loc:{latitude:number;longitude:number}|undefined;
  try{
    const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,{headers:{"user-agent":"LvbanAI/1.0"}}).then(r=>r.json()) as {results?:Array<{latitude:number;longitude:number}>};
    loc=geo.results?.[0];
    if(loc){const weather=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&timezone=auto`).then(r=>r.json()) as {current?:{temperature_2m:number;weather_code:number}};output.temperature=weather.current?.temperature_2m??null;output.weather=weatherText(weather.current?.weather_code)}
  }catch{}
  try{
    if(!loc)return Response.json(output,{headers:{"cache-control":"public, max-age=300"}});
    const api=`https://zh.wikipedia.org/w/api.php?action=query&generator=geosearch&ggsprimary=all&ggsnamespace=0&ggsradius=10000&ggslimit=30&ggscoord=${loc.latitude}%7C${loc.longitude}&prop=pageimages%7Cinfo&piprop=thumbnail&pithumbsize=1000&inprop=url&format=json&origin=*`;
    const data=await fetch(api,{headers:{"user-agent":"LvbanAI/2.2 (coordinate verified discovery)"}}).then(r=>r.json()) as {query?:{pages?:Record<string,{title:string;fullurl?:string;thumbnail?:{source?:string}}>} };
    output.photos=Object.values(data.query?.pages??{}).flatMap(p=>p.thumbnail?.source?[{title:p.title,url:p.thumbnail.source,page:p.fullurl||"https://zh.wikipedia.org",credit:"Wikipedia / Wikimedia Commons"}]:[]).slice(0,8);
  }catch{}
  return Response.json(output,{headers:{"cache-control":"public, max-age=900"}});
}
function weatherText(code?:number){if(code===undefined)return"暂无实时天气";if(code===0)return"晴朗";if(code<=3)return"多云";if(code<=48)return"有雾";if(code<=67)return"有雨";if(code<=77)return"有雪";if(code<=82)return"阵雨";return"雷雨"}
