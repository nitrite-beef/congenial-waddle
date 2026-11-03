import csv
import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta

LOCATIONS = {
    "Naga City": (13.6218, 123.1948),
    "Milaor": (13.5933, 123.1775),
}

PHT = timezone(timedelta(hours=8))
CURRENT = "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,weather_code"
DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"


def fetch(lat, lon):
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current={CURRENT}&daily={DAILY}"
        "&forecast_days=7&timezone=Asia%2FManila"
    )
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.now(PHT).strftime("%Y-%m-%d %H:%M")
    latest = {"recorded_at_pht": now, "source": "Open-Meteo", "locations": {}}
    csv_path = "data/records.csv"
    new_file = not os.path.exists(csv_path)

    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if new_file:
            writer.writerow(["recorded_at_pht", "location", "temp_c", "humidity_pct",
                             "rain_mm", "wind_kmh", "wind_dir_deg", "pressure_hpa",
                             "cloud_pct", "weather_code"])
        for name, (lat, lon) in LOCATIONS.items():
            data = fetch(lat, lon)
            c = data["current"]
            latest["locations"][name] = {"current": c, "daily_forecast": data["daily"]}
            writer.writerow([now, name, c["temperature_2m"], c["relative_humidity_2m"],
                             c["precipitation"], c["wind_speed_10m"], c["wind_direction_10m"],
                             c["pressure_msl"], c["cloud_cover"], c["weather_code"]])

    with open("data/latest.json", "w", encoding="utf-8") as f:
        json.dump(latest, f, indent=2)


if __name__ == "__main__":
    main()
