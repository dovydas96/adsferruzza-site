param(
  [Parameter(Mandatory=$true)][string]$AccessToken,
  [Parameter(Mandatory=$true)][string]$UserId,
  [string]$OutputPath = "..\data\instagram.json",
  [int]$Limit = 12
)

# Instagram Graph API (Basic Display-like fields via Graph API)
# If using a Business/Creator account linked to a Facebook Page, use the Graph API:
# GET https://graph.instagram.com/{user-id}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&access_token=...

$base = "https://graph.instagram.com/$UserId/media"
$fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username"
$url = "$base?fields=$fields&access_token=$AccessToken&limit=$Limit"

try {
  Write-Host "Fetching Instagram media for user $UserId..."
  $resp = Invoke-RestMethod -Method GET -Uri $url -ErrorAction Stop
} catch {
  Write-Error "HTTP request failed: $($_.Exception.Message)"
  exit 1
}

if (-not $resp -or -not $resp.data) {
  Write-Error "No media returned from Instagram API."
  exit 1
}

# Map to a compact JSON the site can consume easily
$items = @()
foreach ($m in $resp.data) {
  $items += [PSCustomObject]@{
    id = $m.id
    type = $m.media_type
    url = $m.media_url
    thumbnail = if ($m.thumbnail_url) { $m.thumbnail_url } else { $m.media_url }
    permalink = $m.permalink
    caption = $m.caption
    username = $m.username
    timestamp = $m.timestamp
  }
}

$result = [PSCustomObject]@{
  lastFetched = (Get-Date).ToString("s")
  count = $items.Count
  media = $items
}

$dir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$result | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Host "Saved $($items.Count) media items to $OutputPath" -ForegroundColor Green
