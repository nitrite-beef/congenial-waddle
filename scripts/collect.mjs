import fs from "node:fs/promises";
import path from "node:path";
const ROOT=process.cwd(), OUT=path.join(ROOT,"data");
const locations={naga:{name:"Naga City",lat:13.6218,lon:123.1948},milaor:{name:"Milaor",lat:13.5965,lon:123.1798}};
const now=new Date(), iso=now.toISOString();
async function json(url,options){const r=await fetch(url,options);if(!r.ok)throw new Error(`${r.status} ${r.statusText} ${url}`);return r.json();}
async function save(file,obj){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(obj,null,2));}
function dailyOpen(d){return (d.time||[]).map((date,i)=>({date,temp_max:d.temperature_2m_max?.[i]??null,temp_min:d.temperature_2m_min?.[i]??null,rain:d.precipitation_sum?.[i]??null,chance:d.precipitation_probability_max?.[i]??null,humidity:d.relative_humidity_2m_mean?.[i]??null,wind:d.wind_speed_10m_max?.[i]??null,direction:d.wind_direction_10m_dominant?.[i]??null,pressure:null,cloud:null,code:d.weather_code?.[i]??null}));}
for(const [id,l] of Object.entries(locations)){
 const q=new URLSearchParams({latitude:l.lat,longitude:l.lon,timezone:"Asia/Manila",forecast_days:"16",daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant",hourly:"temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m"});
 const sources={};
 try{const d=await json(`https://api.open-meteo.com/v1/forecast?${q}`);sources.openmeteo={source:"openmeteo",updated_at:iso,daily:dailyOpen(d.daily),hourly:d.hourly};}
 catch(e){console.error("Open-Meteo failed",id,e.message);}
 const key=process.env.WINDY_API_KEY;
 if(key){try{
   const d=await json("https://api.windy.com/api/point-forecast/v2",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat:l.lat,lon:l.lon,model:"gfs",parameters:["temp","rh","wind","precip","pressure","clouds"],levels:["surface"],key})});
   const ts=d.ts||[],temp=d["temp-surface"]||[],rh=d["rh-surface"]||[],u=d["wind_u-surface"]||[],v=d["wind_v-surface"]||[],p=d["past3hprecip-surface"]||[],pressure=d["pressure-surface"]||[],cloud=d["lclouds-surface"]||[];
   const hourly=ts.map((t,i)=>({time:new Date(t+8*3600000).toISOString().slice(0,16),temperature_2m:temp[i],relative_humidity_2m:rh[i],precipitation:p[i],surface_pressure:pressure[i],cloud_cover:cloud[i],wind_speed_10m:Math.hypot(u[i]||0,v[i]||0)*3.6,wind_direction_10m:(Math.atan2(-(u[i]||0),-(v[i]||0))*180/Math.PI+360)%360}));
   const byDay={};for(const h of hourly){const date=h.time.slice(0,10);(byDay[date]??=[]).push(h);}
   const daily=Object.entries(byDay).map(([date,a])=>({date,temp_max:Math.max(...a.map(x=>x.temperature_2m).filter(Number.isFinite)),temp_min:Math.min(...a.map(x=>x.temperature_2m).filter(Number.isFinite)),rain:a.reduce((s,x)=>s+(x.precipitation||0),0),chance:null,humidity:a.reduce((s,x)=>s+(x.relative_humidity_2m||0),0)/a.length,wind:Math.max(...a.map(x=>x.wind_speed_10m).filter(Number.isFinite)),direction:a[0].wind_direction_10m,pressure:a[0].surface_pressure,cloud:a[0].cloud_cover}));
   sources.windy={source:"windy",updated_at:iso,daily,hourly:hourly.map(x=>({time:x.time,temperature_2m:x.temperature_2m,relative_humidity_2m:x.relative_humidity_2m,precipitation:x.precipitation,precipitation_probability:null,weather_code:null,surface_pressure:x.surface_pressure,cloud_cover:x.cloud_cover,wind_speed_10m:x.wind_speed_10m,wind_direction_10m:x.wind_direction_10m}))};
 }catch(e){console.error("Windy failed",id,e.message);}}
 await save(path.join(OUT,"forecast",`${id}.json`),{location:id,updated_at:iso,sources});
 const end=new Date(Date.now()-4*86400000),start=new Date(end);start.setDate(start.getDate()-45);
 const ymd=d=>d.toISOString().slice(0,10).replaceAll("-","");
 const hist={};
 try{const u=new URL("https://archive-api.open-meteo.com/v1/archive");Object.entries({latitude:l.lat,longitude:l.lon,start_date:ymd(start),end_date:ymd(end),timezone:"Asia/Manila",daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant"}).forEach(([k,v])=>u.searchParams.set(k,v));const d=await json(u);hist.openmeteo={source:"openmeteo",updated_at:iso,daily:dailyOpen(d.daily)};}catch(e){console.error("Historical Open-Meteo failed",e.message);}
 try{const u=new URL("https://power.larc.nasa.gov/api/temporal/daily/point");Object.entries({parameters:"T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS10M,PS",community:"RE",longitude:l.lon,latitude:l.lat,start:ymd(start),end:ymd(end),format:"JSON","time-standard":"UTC"}).forEach(([k,v])=>u.searchParams.set(k,v));const d=await json(u);const p=d.properties.parameter,keys=Object.keys(p.T2M||{});hist.nasa={source:"nasa",updated_at:iso,daily:keys.map(date=>({date:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,temp_max:p.T2M_MAX?.[date]??null,temp_min:p.T2M_MIN?.[date]??null,rain:p.PRECTOTCORR?.[date]??null,chance:null,humidity:p.RH2M?.[date]??null,wind:p.WS10M?.[date]??null,direction:null,pressure:p.PS?.[date]??null,cloud:null,code:null}))};}catch(e){console.error("NASA POWER failed",id,e.message);}
 await save(path.join(OUT,"historical",`${id}.json`),{location:id,updated_at:iso,sources:hist});
 const comparison={location:id,updated_at:iso,sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,{updated_at:v.updated_at,daily:v.daily}]))};
 await save(path.join(OUT,"comparison",`${id}.json`),comparison);
}
