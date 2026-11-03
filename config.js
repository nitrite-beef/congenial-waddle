export const CONFIG = {
  timezone: "Asia/Manila",
  defaultSource: "openmeteo",
  locations: {
    naga: { name: "Naga City", latitude: 13.6218, longitude: 123.1948 },
    milaor: { name: "Milaor", latitude: 13.5965, longitude: 123.1798 }
  },
  sources: {
    openmeteo: { label: "Open-Meteo", historical: true, forecast: true },
    windy: { label: "Windy Point Forecast", historical: false, forecast: true },
    nasa: { label: "NASA POWER", historical: true, forecast: false }
  }
};
