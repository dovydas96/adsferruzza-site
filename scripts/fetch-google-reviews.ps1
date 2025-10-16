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

  # Try to capture the raw response body/status using Invoke-WebRequest for debugging
  $rawStatus = $null
  $rawContent = $null
  try {
    $raw = Invoke-WebRequest -Method GET -Uri $uri -Headers $headers -ErrorAction Stop
    if ($raw -and $raw.StatusCode) { $rawStatus = $raw.StatusCode.value__ }
    if ($raw -and $raw.Content) { $rawContent = $raw.Content }
  } catch {
    # If the direct web request failed, try to extract message
    if ($_.Exception -and $_.Exception.Message) { $rawContent = $_.Exception.Message }
  }

  if ($rawStatus) { Write-Host "Places API status code (raw): $rawStatus" }
  if ($env:DEBUG_REVIEWS -and $rawContent) {
    $max = 2000
    $len = $rawContent.Length
    $take = if ($len -gt $max) { $rawContent.Substring(0,$max) + "...(truncated)" } else { $rawContent }
    Write-Host "Places API response body (truncated):`n$take"
  }

  # Infer status code from raw content or error message if the raw status isn't available
  $inferredStatus = $rawStatus
  if (-not $inferredStatus) {
    if ($rawContent -and $rawContent -match '\b400\b') { $inferredStatus = 400 }
    elseif ($errMsg -and $errMsg -match '\b400\b') { $inferredStatus = 400 }
    elseif ($rawContent -and $rawContent -match '\b403\b') { $inferredStatus = 403 }
    elseif ($errMsg -and $errMsg -match '\b403\b') { $inferredStatus = 403 }
    elseif ($rawContent -and $rawContent -match '\b401\b') { $inferredStatus = 401 }
    elseif ($errMsg -and $errMsg -match '\b401\b') { $inferredStatus = 401 }
  }

  # If we inferred a 400, attempt legacy fallback
  if ($inferredStatus -and $inferredStatus -eq 400) {
    Write-Host "Places v1 returned or indicated 400; attempting legacy Place Details fallback..."
    try {
      $legacyUri = "https://maps.googleapis.com/maps/api/place/details/json?place_id=$PlaceId&key=$ApiKey&language=$Language&fields=name,rating,user_ratings_total,website,url,opening_hours,formatted_phone_number,reviews,geometry"
      $legacy = Invoke-RestMethod -Method GET -Uri $legacyUri -ErrorAction Stop
      if ($legacy -and $legacy.status -and $legacy.status -eq 'OK' -and $legacy.result) {
        $old = $legacy.result
        $place = [PSCustomObject]@{
          name = $old.name
          place_id = $PlaceId
          rating = $old.rating
          user_ratings_total = $old.user_ratings_total
          url = if ($old.url) { $old.url } else { $null }
          regularOpeningHours = if ($old.opening_hours) { $old.opening_hours } else { $null }
          specialOpeningHours = $null
        }

        $reviews = @()
        if ($old.reviews) {
          $take = $old.reviews | Select-Object -First $Max
          foreach ($r in $take) {
            $reviews += [PSCustomObject]@{
              author_name = $r.author_name
              rating = $r.rating
              text = $r.text
              relative_time_description = $r.relative_time_description
              profile_photo_url = $r.profile_photo_url
              time = if ($r.time) { $r.time } else { $null }
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
        Write-Host "Legacy fallback saved $($reviews.Count) reviews to $OutputPath" -ForegroundColor Green
        exit 0
      } else {
        Write-Warning "Legacy Place Details returned status: $($legacy.status)"
      }
    } catch {
      Write-Warning "Legacy Place Details fallback failed: $($_.Exception.Message)"
    }
  }

  if ($inferredStatus -and ($inferredStatus -eq 403 -or $inferredStatus -eq 401)) {
    Write-Warning "Places API returned $inferredStatus. Skipping reviews fetch to avoid failing CI. Ensure API key and permissions are correct.";
    # Write an empty reviews result to keep downstream code working
    $empty = [PSCustomObject]@{ place = $null; lastFetched = (Get-Date).ToString("s"); reviews = @() }
    $dir = Split-Path -Path $OutputPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $empty | ConvertTo-Json -Depth 6 | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Host "Wrote empty reviews to $OutputPath" -ForegroundColor Yellow
    exit 0
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
