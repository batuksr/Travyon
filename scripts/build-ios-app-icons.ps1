param(
    [string]$OutputDirectory = "mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sizes = @{
    "Icon-App-20x20@1x.png" = 20
    "Icon-App-20x20@2x.png" = 40
    "Icon-App-20x20@3x.png" = 60
    "Icon-App-29x29@1x.png" = 29
    "Icon-App-29x29@2x.png" = 58
    "Icon-App-29x29@3x.png" = 87
    "Icon-App-40x40@1x.png" = 40
    "Icon-App-40x40@2x.png" = 80
    "Icon-App-40x40@3x.png" = 120
    "Icon-App-60x60@2x.png" = 120
    "Icon-App-60x60@3x.png" = 180
    "Icon-App-76x76@1x.png" = 76
    "Icon-App-76x76@2x.png" = 152
    "Icon-App-83.5x83.5@2x.png" = 167
    "Icon-App-1024x1024@1x.png" = 1024
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$target = Join-Path $root $OutputDirectory

foreach ($entry in $sizes.GetEnumerator()) {
    $paper = $null
    $paperBrush = $null
    $shadow = $null
    $shadowBrush = $null
    $linePen = $null
    $side = [int]$entry.Value
    $bitmap = [System.Drawing.Bitmap]::new($side, $side)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#CE7137"))

        $point = {
            param([double]$x, [double]$y)
            [System.Drawing.PointF]::new([single]($x * $side), [single]($y * $side))
        }
        $left = & $point 0.16 0.46
        $tip = & $point 0.84 0.19
        $lower = & $point 0.64 0.82
        $fold = & $point 0.47 0.59

        $paper = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $paper.AddPolygon([System.Drawing.PointF[]]@($left, $tip, $lower, $fold))
        $paperBrush = [System.Drawing.SolidBrush]::new(
            [System.Drawing.ColorTranslator]::FromHtml("#FFF7EA")
        )
        $graphics.FillPath($paperBrush, $paper)

        $shadow = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $shadow.AddPolygon([System.Drawing.PointF[]]@(
            $fold,
            $lower,
            (& $point 0.56 0.63),
            $tip
        ))
        $shadowBrush = [System.Drawing.SolidBrush]::new(
            [System.Drawing.ColorTranslator]::FromHtml("#E8D8C0")
        )
        $graphics.FillPath($shadowBrush, $shadow)

        $lineWidth = [Math]::Max(1.0, $side * 0.018)
        $linePen = [System.Drawing.Pen]::new(
            [System.Drawing.ColorTranslator]::FromHtml("#315142"),
            [single]$lineWidth
        )
        $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $graphics.DrawLine($linePen, $fold, $tip)
        $graphics.DrawPath($linePen, $paper)

        $destination = Join-Path $target $entry.Key
        $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        if ($linePen) { $linePen.Dispose() }
        if ($shadowBrush) { $shadowBrush.Dispose() }
        if ($shadow) { $shadow.Dispose() }
        if ($paperBrush) { $paperBrush.Dispose() }
        if ($paper) { $paper.Dispose() }
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

Write-Output "Generated $($sizes.Count) opaque Travyon iOS app icons in $target"
