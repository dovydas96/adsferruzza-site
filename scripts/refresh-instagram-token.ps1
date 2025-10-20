param(
    [string]$AccessToken = $env:IG_ACCESS_TOKEN
)

if (-not $AccessToken) {
    Write-Error "Missing IG_ACCESS_TOKEN"
    exit 1
}

# Refresh long-lived token (extends by 60 days)
$uri = "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$AccessToken"

try {
    Write-Host "Refreshing Instagram access token..."
    $response = Invoke-RestMethod -Method GET -Uri $uri -ErrorAction Stop
    
    Write-Host "✓ Token refreshed successfully"
    Write-Host "New token: $($response.access_token)"
    Write-Host "Expires in: $($response.expires_in) seconds (~$([math]::Round($response.expires_in / 86400)) days)"
    Write-Host ""
    Write-Host "ACTION REQUIRED: Update GitHub secret IG_ACCESS_TOKEN with the new token above"
    
} catch {
    Write-Error "Failed to refresh token: $($_.Exception.Message)"
    exit 1
}
