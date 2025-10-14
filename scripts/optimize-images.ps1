param(
  [string]$HeroIn = "../images/family-hero.jpg",
  [string]$HeroOut = "../images/family-hero.jpg",
  [string]$GalleryIn = "../images/gallery/FD2_3265.jpg",
  [string]$GalleryOut = "../images/gallery/FD2_3265.jpg"
)

# Uses .NET GDI+ for quick resize. Avoids file locks by loading from memory and writing to a temp file.
Add-Type -AssemblyName System.Drawing

function Save-Jpeg {
  param(
    [System.Drawing.Image]$Image,
    [string]$OutputPath,
    [int]$Quality
  )
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encParam = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $Quality
  $encParams.Param[0] = $encParam
  $temp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), ([System.IO.Path]::GetRandomFileName() + ".jpg"))
  $Image.Save($temp, $codec, $encParams)
  # Replace original atomically
  Move-Item -Force -Path $temp -Destination $OutputPath
}

function Resize-Jpeg {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$MaxWidth = 1920,
    [int]$MaxHeight = 1080,
    [int]$Quality = 80
  )
  if (!(Test-Path $InputPath)) { Write-Host "Missing: $InputPath"; return }
  $bytes = [System.IO.File]::ReadAllBytes($InputPath)
  $ms = New-Object System.IO.MemoryStream(,$bytes)
  $img = [System.Drawing.Image]::FromStream($ms)
  try {
    $ratioW = $MaxWidth / $img.Width
    $ratioH = $MaxHeight / $img.Height
    $ratio = [Math]::Min(1.0, [Math]::Min($ratioW, $ratioH))
    $newW = [int]([Math]::Round($img.Width * $ratio))
    $newH = [int]([Math]::Round($img.Height * $ratio))
    if ($ratio -lt 1.0) {
      $bmp = New-Object System.Drawing.Bitmap $newW, $newH
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.DrawImage($img, 0, 0, $newW, $newH)
      $g.Dispose()
      Save-Jpeg -Image $bmp -OutputPath $OutputPath -Quality $Quality
      $bmp.Dispose()
    } else {
      # Re-encode at quality without resizing
      Save-Jpeg -Image $img -OutputPath $OutputPath -Quality $Quality
    }
  } finally {
    $img.Dispose(); $ms.Dispose()
  }
}

# Optimize hero (max 1920x1080 @ 80% quality)
Resize-Jpeg -InputPath $HeroIn -OutputPath $HeroOut -MaxWidth 1920 -MaxHeight 1080 -Quality 80

# Optimize gallery (max 1400x1000 @ 80% quality)
Resize-Jpeg -InputPath $GalleryIn -OutputPath $GalleryOut -MaxWidth 1400 -MaxHeight 1000 -Quality 80

# Print sizes
"Optimized files:" | Write-Host
Get-ChildItem ../images -Recurse -Filter *.jpg | Select-Object FullName,Length | Format-Table -AutoSize