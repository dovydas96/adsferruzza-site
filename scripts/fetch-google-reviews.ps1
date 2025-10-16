param(
  [Parameter(Mandatory=$true)][string]$ApiKey,
  [Parameter(Mandatory=$true)][string]$PlaceId,
  [string]$OutputPath = "..\data\reviews.json",
  [string]$Language = "it",
  [int]$Max = 5
)

# Use Places API (New) v1 endpoint
$base = "https://places.googleapis.com/v1/places/$PlaceId"
$query = "?languageCode=$Language"
$uri = "$base$query"
$headers = @{
  "X-Goog-Api-Key" = $ApiKey
  # Include opening + special hours in the field mask so we can surface them client-side
  "X-Goog-FieldMask" = "reviews,displayName,googleMapsUri,rating,userRatingCount,regularOpeningHours,regularOpeningHours.weekdayDescriptions,regularOpeningHours.periods,specialOpeningHours,specialOpeningHours.specialHourPeriods"
}

Write-Host "Fetching reviews (Places API v1) for place: $PlaceId..."
try {
  $resp = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers -ErrorAction Stop
} catch {
  # Gracefully handle authorization or quota errors from Google Places API
  $errMsg = $_.Exception.Message
  Write-Warning "HTTP request failed: $errMsg"
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
    $code = [int]$_.Exception.Response.StatusCode
    if ($code -eq 403 -or $code -eq 401) {
      Write-Warning "Places API returned $code. Skipping reviews fetch to avoid failing CI. Ensure API key and permissions are correct.";
      # Write an empty reviews result to keep downstream code working
      $empty = [PSCustomObject]@{ place = $null; lastFetched = (Get-Date).ToString("s"); reviews = @() }
      $dir = Split-Path -Path $OutputPath -Parent
      if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
      $empty | ConvertTo-Json -Depth 6 | Out-File -FilePath $OutputPath -Encoding UTF8
      Write-Host "Wrote empty reviews to $OutputPath" -ForegroundColor Yellow
      exit 0
    }
  }
  # For other errors, fail so the issue can be investigated
  Write-Error "HTTP request failed (non-auth error): $errMsg"
  exit 1
}

if (-not $resp) {
  Write-Error "Empty response from Places API v1"
  exit 1
}

$place = [PSCustomObject]@{
  name = $resp.displayName.text
  place_id = $PlaceId
  rating = $resp.rating
  user_ratings_total = $resp.userRatingCount
  url = $resp.googleMapsUri
  regularOpeningHours = $resp.regularOpeningHours  # Contains weekdayDescriptions (localized) & periods
  specialOpeningHours = $resp.specialOpeningHours  # Contains specialHourPeriods with dates and open/close status
}

$reviews = @()
if ($resp.reviews) {
  # Sort by publishTime desc if present
  $sorted = $resp.reviews | Sort-Object -Property publishTime -Descending
  $take = $sorted | Select-Object -First $Max
  foreach ($r in $take) {
    $reviews += [PSCustomObject]@{
      author_name = $r.authorAttribution.displayName
      rating = $r.rating
      text = $r.text.text
      relative_time_description = $r.relativePublishTimeDescription
      profile_photo_url = $r.authorAttribution.photoUri
  time = if ($r.publishTime) { [int]([DateTimeOffset]::Parse($r.publishTime).ToUnixTimeSeconds()) } else { $null }
      language = $Language
    }
  }
}

$result = [PSCustomObject]@{
  place = $place
  lastFetched = (Get-Date).ToString("s")
  reviews = $reviews
}

$dir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$result | ConvertTo-Json -Depth 6 | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Host "Saved $($reviews.Count) reviews to $OutputPath" -ForegroundColor Green
