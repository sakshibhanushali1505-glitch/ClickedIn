Add-Type -AssemblyName System.Drawing

$src = "C:\Users\Jatinder\.gemini\antigravity-ide\brain\da3a8324-1ccc-4dd2-ad7b-74be15464e71\media__1785237915235.png"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$outBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $c = $bmp.GetPixel($x, $y)
        $avg = ($c.R + $c.G + $c.B) / 3.0
        
        # If white background (> 228), make 100% transparent
        if ($avg -gt 228) {
            $outBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } elseif ($avg -gt 190) {
            $alpha = [int]((228 - $avg) / 38.0 * 255)
            if ($alpha -lt 0) { $alpha = 0 }
            if ($alpha -gt 255) { $alpha = 255 }
            $outBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B))
        } else {
            # Check if this pixel is dark grey text at the bottom (y > Height * 0.7)
            if ($y -gt ($bmp.Height * 0.70) -and $c.R -lt 160 -and $c.G -lt 160 -and $c.B -lt 160) {
                # Convert dark grey text to bright white/cyan for dark mode contrast
                $outBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 203, 213, 225))
            } else {
                $outBmp.SetPixel($x, $y, $c)
            }
        }
    }
}

New-Item -ItemType Directory -Force -Path "frontend/public" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/assets" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/public" | Out-Null

$outBmp.Save("frontend/public/logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$outBmp.Save("frontend/src/assets/logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$outBmp.Save("backend/public/logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp.Dispose()
$outBmp.Dispose()
Write-Host "Logo background removed and dark mode colors optimized!"
