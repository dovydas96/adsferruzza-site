param(
    [string]$ApiKey = $env:GOOGLE_PLACES_API_KEY,
    [string]$PlaceId = $env:GOOGLE_PLACE_ID
)

if (-not $ApiKey -or -not $PlaceId) {
    Write-Error "Missing GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID"
    exit 1
}

$uri = "https://maps.googleapis.com/maps/api/place/details/json?place_id=$PlaceId&fields=opening_hours,current_opening_hours&key=$ApiKey"
$response = Invoke-RestMethod -Uri $uri

if ($response.status -ne "OK") {
    Write-Error "API error: $($response.status)"
    exit 1
}

$reviewsPath = "data/reviews.json"
$existing = Get-Content $reviewsPath -Raw | ConvertFrom-Json

$hours = $response.result.opening_hours
$current = $response.result.current_opening_hours

$existing.place.regularOpeningHours = @{
    open_now = $hours.open_now
    periods = $hours.periods
    weekdayDescriptions = $hours.weekday_text
}

if ($current) {
    $existing.place.specialOpeningHours = @{
        specialHourPeriods = $current.special_days
    }
}

$existing | ConvertTo-Json -Depth 10 | Out-File -FilePath $reviewsPath -Encoding utf8
Write-Host "Opening hours updated in reviews.json"
