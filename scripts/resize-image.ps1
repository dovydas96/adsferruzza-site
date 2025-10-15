param(
  [Parameter(Mandatory = $true)] [string] $Source,
  [Parameter(Mandatory = $true)] [int] $Width,
  [Parameter(Mandatory = $true)] [string] $Output,
  [int] $Quality = 85
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  $inputPath = (Resolve-Path -Path $Source).Path
} catch {
  Write-Error "Source file not found: $Source"
  exit 1
}

$outputPath = [System.IO.Path]::GetFullPath($Output)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($inputPath)
try {
  $targetWidth = [Math]::Min($Width, $img.Width)
  if ($targetWidth -lt 1) { $targetWidth = 1 }
  $scale = $targetWidth / $img.Width
  $targetHeight = [int][Math]::Round($img.Height * $scale)
  if ($targetHeight -lt 1) { $targetHeight = 1 }

  $bmp = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
  try {
    # Preserve DPI
    $bmp.SetResolution($img.HorizontalResolution, $img.VerticalResolution)

    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.DrawImage($img, 0, 0, $targetWidth, $targetHeight)
    } finally {
      $g.Dispose()
    }

    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
      New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    if (-not $codec) { Write-Error 'JPEG codec not found'; exit 2 }

    $encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
    $enc = [System.Drawing.Imaging.Encoder]::Quality
    $q = [Math]::Max(1, [Math]::Min(100, [int]$Quality))
    $encParam = New-Object System.Drawing.Imaging.EncoderParameter $enc, $q
    $encParams.Param[0] = $encParam

    $bmp.Save($outputPath, $codec, $encParams)
    Write-Host "Saved $outputPath ($targetWidth x $targetHeight, quality $q)"
    exit 0
  } finally {
    $bmp.Dispose()
  }
} finally {
  $img.Dispose()
}
