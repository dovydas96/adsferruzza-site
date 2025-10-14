param(
  [Parameter(Mandatory=$true)][string]$ApiKey,
  [Parameter(Mandatory=$true)][string]$MapsUrl,
  [string]$OutputPath = "..\data\reviews.json",
  [string]$Language = "it",
  [int]$BiasRadiusMeters = 2500
)

function Resolve-FinalUrl {
  param([string]$Url)
  try {
    $resp = Invoke-WebRequest -Uri $Url -MaximumRedirection 10 -ErrorAction Stop
    if ($resp.BaseResponse -and $resp.BaseResponse.ResponseUri) {
      return $resp.BaseResponse.ResponseUri.AbsoluteUri
    }
    return $resp.Links[0].href
  } catch {
    Write-Warning "Could not resolve redirect: $_"
    return $Url
  }
}

function Get-NameAndCoordsFromMapsUrl {
  param([string]$Url)
  $decoded = [System.Web.HttpUtility]::UrlDecode($Url)
  $name = $null
  $lat = $null
  $lng = $null

  # Try extracting name from /maps/place/<name>/
  if ($decoded -match "/maps/plac[e|a]/([^/]+)/") {
    $nameEnc = $matches[1]
    $name = ($nameEnc -replace "\+", " ")
  }
  # Try extracting @lat,lng from the URL
  if ($decoded -match "@(-?\d+\.\d+),(-?\d+\.\d+)") {
    $lat = [double]$matches[1]
    $lng = [double]$matches[2]
  }
  return [PSCustomObject]@{ Name = $name; Lat = $lat; Lng = $lng }
}

function Find-PlaceId {
  param(
    [string]$ApiKey,
    [string]$Query,
    [double]$Lat,
    [double]$Lng,
    [string]$Language
  )
  $queryEsc = [System.Web.HttpUtility]::UrlEncode($Query)
  $bias = if ($Lat -and $Lng) { "&locationbias=circle:$BiasRadiusMeters@$Lat,$Lng" } else { "" }
  $url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=$queryEsc&inputtype=textquery&fields=place_id&language=$Language$bias&key=$ApiKey"
  $resp = Invoke-RestMethod -Method GET -Uri $url -ErrorAction Stop
  if ($resp.status -ne 'OK' -or -not $resp.candidates -or -not $resp.candidates[0].place_id) {
    throw "Find Place failed: $($resp.status) $($resp.error_message)"
  }
  return $resp.candidates[0].place_id
}

# 1) Resolve short link to a fuller Maps URL
$finalUrl = Resolve-FinalUrl -Url $MapsUrl
Write-Host "Resolved URL:" $finalUrl

# 2) Parse probable name and coordinates
$info = Get-NameAndCoordsFromMapsUrl -Url $finalUrl
if (-not $info.Name) {
  Write-Warning "Could not parse a place name from URL. Provide a name or Place ID manually if this fails."
}

# 3) Find Place ID using Places API
$placeId = Find-PlaceId -ApiKey $ApiKey -Query $info.Name -Lat $info.Lat -Lng $info.Lng -Language $Language
Write-Host "Found Place ID:" $placeId -ForegroundColor Green

# 4) Fetch reviews using the existing helper
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$fetchScript = Join-Path $here 'fetch-google-reviews.ps1'
& $fetchScript -ApiKey $ApiKey -PlaceId $placeId -OutputPath $OutputPath -Language $Language
