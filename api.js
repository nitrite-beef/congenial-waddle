import { CONFIG } from "./config.js";
const cache = new Map();
async function getJSON(url, ttl=10*60*1000) {
  const key=url.toString(), cached=cache.get(key);
  if(cached && Date.now()-cached.time<ttl) return cached.value;
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  const value=await response.json(); cache.set(key,{time:Date.now(),value}); return value;
}
export async function loadBundle(location) {
  const base=`data/forecast/${location}.json`;
  return getJSON(base,5*60*1000);
}
export async function loadHistory(location) {
  return getJSON(`data/historical/${location}.json`,30*60*1000);
}
export async function loadRecords() { return getJSON("data/records.json",60*1000).catch(()=>({records:[]})); }
export async function loadSchedule() { return getJSON("data/schedule.json",60*1000).catch(()=>({enabled:false})); }
export function sourceLabel(id){return CONFIG.sources[id]?.label||id||"Unknown source";}
