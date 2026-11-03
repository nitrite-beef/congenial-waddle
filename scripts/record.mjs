import fs from "node:fs/promises";
import path from "node:path";
const root=process.cwd(), file=path.join(root,"data/records.json"), schedule=JSON.parse(await fs.readFile(path.join(root,"data/schedule.json"),"utf8"));
const now=new Date(), pht=new Date(now.getTime()+8*3600000), day=pht.getUTCDay(), hh=String(pht.getUTCHours()).padStart(2,"0"), mm=String(pht.getUTCMinutes()).padStart(2,"0"), date=pht.toISOString().slice(0,10), clock=`${hh}:${mm}`;
if(!schedule.enabled){console.log("Recording disabled.");process.exit(0);}
if(!(schedule.days||[]).includes(day)||!(schedule.times||[]).includes(clock)){console.log(`No recording due at ${date} ${clock} PHT.`);process.exit(0);}
let data={records:[]};try{data=JSON.parse(await fs.readFile(file,"utf8"));}catch{}
const locations=schedule.locations||["naga","milaor"];
for(const id of locations){
 const bundle=JSON.parse(await fs.readFile(path.join(root,`data/forecast/${id}.json`),"utf8"));
 const source=schedule.source||"openmeteo", src=bundle.sources?.[source]||bundle.sources?.openmeteo;
 if(!src?.hourly?.time?.length){console.log(`No hourly data for ${id} / ${source}`);continue;}
 const idx=src.hourly.time.findIndex(t=>t.slice(0,16)===`${date}T${clock}`);
 const i=idx>=0?idx:src.hourly.time.findIndex(t=>t.slice(0,10)===date);
 if(i<0)continue;
 const h=src.hourly;
 data.records.push({recorded_at:now.toISOString(),recorded_at_pht:`${date} ${clock}`,location:id,location_name:id==="naga"?"Naga City":"Milaor",source:src.source,temperature:h.temperature_2m?.[i]??null,rainfall:h.precipitation?.[i]??null,humidity:h.relative_humidity_2m?.[i]??null,wind_speed:h.wind_speed_10m?.[i]??null});
}
data.records=data.records.slice(-5000);
await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(data,null,2));
console.log("Scheduled records checked and saved.");
