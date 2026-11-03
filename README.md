# Bicol Weather Monitor

A static GitHub Pages dashboard for Naga City and Milaor, Camarines Sur. It displays saved Open-Meteo and Windy forecasts, Open-Meteo and NASA POWER historical data, source comparisons, and scheduled observations.

## Files
- `index.html`, `styles.css`, `app.js`, `api.js`, `charts.js`: browser dashboard.
- `config.js`: coordinates and source configuration.
- `scripts/collect.mjs`: fetches forecast and historical JSON.
- `scripts/record.mjs`: checks the Philippine-time recording schedule.
- `data/schedule.json`: editable days, times, source, and locations.
- `.github/workflows/`: collection, recording, and Pages deployment workflows.

## Deploy
1. Create a GitHub repository and upload the complete contents of this folder to its root.
2. In Settings > Pages, set Build and deployment to **GitHub Actions**.
3. In Settings > Secrets and variables > Actions, create a repository secret named `WINDY_API_KEY`.
4. In Settings > Actions > General, enable **Read and write permissions** so the collection and recorder workflows can commit JSON files.
5. Open Actions and manually run **Collect weather data** once. Then run **Record scheduled observations** if you want to test it.
6. Push to `main`. The Deploy GitHub Pages workflow publishes the site. Open Settings > Pages to see its URL.

## Windy API key
Create an account and request a Point Forecast API key at https://api.windy.com/. Follow Windy's current account and API product approval process. In the repository, open Settings > Secrets and variables > Actions > New repository secret. Name it exactly `WINDY_API_KEY`, paste the key as the value, and save. The key is used only by GitHub Actions and is never embedded in browser JavaScript. Windy access may require an eligible API plan.

## Schedule
Edit `data/schedule.json`. Days use JavaScript numbering: 0 Sunday, 1 Monday, ... 6 Saturday. Times use 24-hour Philippine Time. Example Wednesday and Friday at 9 AM and 3 PM:

```json
{
  "enabled": true,
  "timezone": "Asia/Manila",
  "days": [3, 5],
  "times": ["09:00", "15:00"],
  "source": "openmeteo",
  "locations": ["naga", "milaor"]
}
```

The recording workflow checks every 15 minutes. GitHub cron is UTC, but the script evaluates the schedule in UTC+8. GitHub scheduled workflows can be delayed and are not guaranteed to start at the exact minute. The recorder uses the most recent matching hourly forecast value in the saved JSON. It is a model value, not a physical station observation.

## Data sources, limits, and attribution
- **Open-Meteo**: forecast API supports up to 16 forecast days. Historical Archive API provides model-based historical/reanalysis data. Free access has usage and licensing terms. Attribution: Open-Meteo, https://open-meteo.com/en/docs and https://open-meteo.com/en/docs/historical-weather-api.
- **NASA POWER**: daily point data is satellite/model-based and can have a delay of several days. It is not a live observation or forecast service. Time standard is explicitly requested as UTC in this collector. Attribution: NASA POWER, https://power.larc.nasa.gov/.
- **Windy Point Forecast API**: model availability, parameters, forecast horizon, quotas, and commercial-use terms depend on the API product and account. The collector currently requests the global `gfs` model. Verify current terms in https://api.windy.com/point-forecast/docs. Attribution: Windy.

## Important limitations
- Windy humidity, pressure, and cloud field names can vary by supported model. Missing values remain blank. Confirm requested parameters against Windy's current Swagger documentation and your API entitlement.
- Windy precipitation values are forecast accumulation fields, not guaranteed daily totals. This starter groups returned 3-hour accumulations by date.
- NASA POWER historical daily records do not provide a 7-day forecast or precipitation probability.
- Open-Meteo is the browser display fallback when the selected forecast source is missing. Collection failures are logged in the Actions run.
- The website reads committed JSON files. It does not call Windy from the browser.
- The existing Open-Meteo historical integration is retained as the Open-Meteo historical source option.
