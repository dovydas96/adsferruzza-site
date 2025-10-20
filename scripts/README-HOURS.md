# Opening Hours Automation

This setup automatically fetches opening hours from Google Places API and updates the website weekly.

## Setup

1. **Get Google Places API Key** (if you don't have one):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable "Places API"
   - Create an API key under "Credentials"

2. **Get Place ID** (if you don't have it):
   - Already in your `data/reviews.json`: `ChIJMfJik-07FxMRjvcULlZm3M8`

3. **Add GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add two secrets:
     - `GOOGLE_PLACES_API_KEY`: Your API key
     - `GOOGLE_PLACE_ID`: `ChIJMfJik-07FxMRjvcULlZm3M8`

## How It Works

- **Schedule**: Runs every Monday at 6 AM UTC
- **Manual**: Can be triggered manually from Actions tab
- **Updates**: Merges opening hours into `data/reviews.json`
- **Display**: `hours.js` reads and displays the hours on the website

## Cost

Google Places API charges approximately $0.017 per request.
- Weekly runs = ~52 requests/year
- Annual cost = ~$0.88/year

## Testing Locally

```powershell
$env:GOOGLE_PLACES_API_KEY = "your-key"
$env:GOOGLE_PLACE_ID = "ChIJMfJik-07FxMRjvcULlZm3M8"
./scripts/fetch-opening-hours.ps1
```

## Data Structure

The script updates `data/reviews.json` with:
```json
{
  "place": {
    "regularOpeningHours": {
      "open_now": true,
      "periods": [...],
      "weekdayDescriptions": [...]
    },
    "specialOpeningHours": {
      "specialHourPeriods": [...]
    }
  }
}
```
