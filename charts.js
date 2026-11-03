let charts=[];
export function clearCharts(){charts.forEach(c=>c.destroy());charts=[];}
export function drawCharts(daily, source, compare=null){
  clearCharts();
  const labels=daily.map(x=>x.date);
  const make=(id,type,datasets)=>{const el=document.getElementById(id);if(!el)return;charts.push(new Chart(el,{type,data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:datasets.length>1}},scales:{y:{beginAtZero:type==="bar"}}}}));};
  const ds=(label,data)=>({label,data,borderWidth:2,tension:.25,fill:false});
  make("temperatureChart","line",compare?.temperature||[ds(`${source} · °C`,daily.map(x=>x.temp_max))]);
  make("rainChart","bar",compare?.rain||[ds(`${source} · mm`,daily.map(x=>x.rain))]);
  make("windChart","line",compare?.wind||[ds(`${source} · km/h`,daily.map(x=>x.wind))]);
}
