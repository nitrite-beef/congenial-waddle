import { CONFIG } from "./config.js";
import { loadBundle,loadHistory,loadRecords,loadSchedule,sourceLabel } from "./api.js";
import { drawCharts } from "./charts.js";
const $=id=>document.getElementById(id);
const state={location:"naga",source:CONFIG.defaultSource,view:"forecast"};
$("dateInput").value=new Date().toISOString().slice(0,10);
$("themeButton").onclick=()=>document.body.classList.toggle("dark");
$("locationSelect").onchange=e=>{state.location=e.target.value;render();};
$("sourceSelect").onchange=e=>{state.source=e.target.value;render();};
$("viewSelect").onchange=e=>{state.view=e.target.value;render();};
$("refreshButton").onclick=()=>render(true);
const fmt=(v,u="")=>v===null||v===undefined||Number.isNaN(Number(v))?"N/A":`${Number(v).toFixed(1)}${u}`;
function card(title,big,lines,source){return `<article class="weather-card"><div class="day">${title}</div><div class="big">${big}</div>${lines.map(x=>`<p>${x}</p>`).join("")}<p class="source-note">${source}</p></article>`;}
function mapOpenMeteo(d){return (d?.time||[]).map((date,i)=>({date,temp_max:d.temperature_2m_max?.[i],temp_min:d.temperature_2m_min?.[i],rain:d.precipitation_sum?.[i],chance:d.precipitation_probability_max?.[i],humidity:d.relative_humidity_2m_mean?.[i],wind:d.wind_speed_10m_max?.[i],direction:d.wind_direction_10m_dominant?.[i],pressure:null,cloud:null,code:d.weather_code?.[i]}));}
function renderHourly(h,src){
  const rows=(h?.time||[]).slice(0,48).map((t,i)=>`<tr><td>${new Date(t).toLocaleString("en-PH",{timeZone:CONFIG.timezone,month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td><td>${h.weather_code?.[i]??"N/A"}</td><td>${fmt(h.temperature_2m?.[i]," °C")}</td><td>${fmt(h.precipitation?.[i]," mm")}</td><td>${fmt(h.precipitation_probability?.[i]," %")}</td><td>${fmt(h.relative_humidity_2m?.[i]," %")}</td><td>${fmt(h.wind_speed_10m?.[i]," km/h")} · ${fmt(h.wind_direction_10m?.[i],"°")}</td><td>${fmt(h.surface_pressure?.[i]," hPa")}</td><td>${fmt(h.cloud_cover?.[i]," %")}</td></tr>`).join("");
  $("hourlyRows").innerHTML=rows||'<tr><td colspan="9">Hourly forecast is unavailable for this source.</td></tr>';$("hourlySource").textContent=src;
}
async function render(force=false){
  $("status").className="status";$("status").textContent="Loading saved weather data…";
  $("pageHeading").textContent=state.view==="forecast"?"7-day forecast":state.view==="historical"?"Historical weather":"Source comparison";
  try{
    const [bundle,history,records,schedule]=await Promise.all([loadBundle(state.location),loadHistory(state.location),loadRecords(),loadSchedule()]);
    const selected=state.source;
    let actual=selected, warning="";
    if(state.view==="forecast" && !bundle.sources?.[selected]?.daily){actual="openmeteo";warning=`${sourceLabel(selected)} forecast unavailable. Showing Open-Meteo fallback.`;}
    let daily=[],hourly=null,stamp="";
    if(state.view==="historical"||selected==="nasa"){
      const src=history.sources?.[selected]||history.sources?.openmeteo;
      daily=src?.daily||[];actual=src?.source||selected;stamp=src?.updated_at||"";
    }else{
      const src=bundle.sources?.[actual]||bundle.sources?.openmeteo;
      daily=src?.daily||[];hourly=src?.hourly;stamp=src?.updated_at||bundle.updated_at||"";
    }
    if(state.view==="compare"){
      const series=["openmeteo","windy"].filter(k=>bundle.sources?.[k]?.daily);
      const labels=series.length?bundle.sources[series[0]].daily.map(x=>x.date):[];
      const mk=(field,label)=>series.map(k=>({label:`${sourceLabel(k)} · ${label}`,data:bundle.sources[k].daily.map(x=>x[field]),borderWidth:2,tension:.2}));
      drawCharts(labels.map((date,i)=>({date})), "comparison",{temperature:mk("temp_max","°C"),rain:mk("rain","mm"),wind:mk("wind","km/h")});
      $("cards").innerHTML=card("Comparison sources",`${series.length} available`,series.map(s=>sourceLabel(s)),`Updated ${bundle.updated_at||"unknown"}`);
    }else{
      const dateStart=$("dateInput").value;
      if(state.view==="historical"&&dateStart)daily=daily.filter(x=>x.date===dateStart||x.date?.slice(0,7)===dateStart.slice(0,7));
      $("cards").innerHTML=daily.slice(0,7).map(d=>card(d.date,`${fmt(d.temp_max,"°")} / ${fmt(d.temp_min,"°")}`,[
        `Rain: ${fmt(d.rain," mm")} · Chance: ${fmt(d.chance,"%")}`,
        `Humidity: ${fmt(d.humidity,"%")}`,
        `Wind: ${fmt(d.wind," km/h")} · ${fmt(d.direction,"°")}`,
        `Pressure: ${fmt(d.pressure," hPa")} · Cloud: ${fmt(d.cloud,"%")}`
      ],`${sourceLabel(actual)} · Updated ${stamp||"unknown"}`)).join("")||card("No data","N/A",["No data available for this source and date."],sourceLabel(actual));
      drawCharts(daily.slice(0,14),sourceLabel(actual));
    }
    $("tempSource").textContent=`Source: ${sourceLabel(actual)} · Updated ${stamp||"unknown"}`;
    $("rainSource").textContent=$("tempSource").textContent;$("windSource").textContent=$("tempSource").textContent;
    renderHourly(hourly,sourceLabel(actual));
    $("updatedLabel").textContent=`Last update: ${stamp||bundle.updated_at||"unknown"}`;
    $("recordRows").innerHTML=(records.records||[]).slice(-30).reverse().map(r=>`<tr><td>${r.recorded_at_pht||r.recorded_at||""}</td><td>${r.location_name||r.location}</td><td>${sourceLabel(r.source)}</td><td>${fmt(r.temperature," °C")}</td><td>${fmt(r.rainfall," mm")}</td><td>${fmt(r.humidity," %")}</td></tr>`).join("")||'<tr><td colspan="6">No observations recorded yet.</td></tr>';
    $("scheduleText").textContent=JSON.stringify(schedule,null,2);
    $("status").textContent=warning||`Showing ${state.view} data for ${CONFIG.locations[state.location].name}. ${force?"Refreshed from saved repository data.":"Data loaded."}`;
    if(warning)$("status").classList.add("error");
  }catch(err){$("status").textContent=`Could not load weather JSON: ${err.message}. Check that the GitHub Actions collector has run and that the data files exist.`;$("status").classList.add("error");}
}
render();
