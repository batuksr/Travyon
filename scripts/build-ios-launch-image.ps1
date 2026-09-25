param(
    [string]$OutputDirectory = "mobile/ios/Runner/Assets.xcassets/LaunchImage.imageset"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$target = Join-Path $root $OutputDirectory
$sizes = @{
    "LaunchImage.png" = 200
    "LaunchImage@2x.png" = 400
    "LaunchImage@3x.png" = 600
}

foreach ($entry in $sizes.GetEnumerator()) {
    $side = [int]$entry.Value
    $bitmap = [System.Drawing.Bitmap]::new(
        $side,
        $side,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $paper = $null
    $shadow = $null
    $paperBrush = $null
    $shadowBrush = $null
    $linePen = $null
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)

        $point = {
            param([double]$x, [double]$y)
            [System.Drawing.PointF]::new(
                [single]($x * $side / 100),
                [single]($y * $side / 100)
            )
        }
        $left = & $point 16 46
        $tip = & $point 84 19
        $lower = & $point 64 82
        $fold = & $point 47 59

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
            (& $point 56 63),
            $tip
        ))
        $shadowBrush = [System.Drawing.SolidBrush]::new(
            [System.Drawing.ColorTranslator]::FromHtml("#E8D8C0")
        )
        $graphics.FillPath($shadowBrush, $shadow)

        $linePen = [System.Drawing.Pen]::new(
            [System.Drawing.ColorTranslator]::FromHtml("#315142"),
            [single]($side * 0.018)
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
        if ($paperBrush) { $paperBrush.Dispose() }
        if ($shadow) { $shadow.Dispose() }
        if ($paper) { $paper.Dispose() }
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

Write-Output "Generated $($sizes.Count) transparent Travyon iOS launch images in $target"
