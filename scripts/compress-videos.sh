#!/bin/bash
set -uo pipefail

FFMPEG="/c/Users/batuk/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe"
VIDEOS_DIR="public/videos"
BACKUP_DIR="public/videos_originals"

declare -A widths=( [start.mp4]=1280 [onboarding.mp4]=1280 [travyon.mp4]=1280 \
                     [roma.mp4]=960 [paris.mp4]=960 [tokyo.mp4]=960 \
                     [istanbul.mp4]=960 [barselona.mp4]=960 [newyork.mp4]=960 )
declare -A crfs=( [start.mp4]=26 [onboarding.mp4]=26 [travyon.mp4]=26 \
                   [roma.mp4]=28 [paris.mp4]=28 [tokyo.mp4]=28 \
                   [istanbul.mp4]=28 [barselona.mp4]=28 [newyork.mp4]=28 )

echo "=== Step 1: backing up originals ==="
for f in "${!widths[@]}"; do
  if [ -f "$VIDEOS_DIR/$f" ] && [ ! -f "$BACKUP_DIR/$f" ]; then
    mv "$VIDEOS_DIR/$f" "$BACKUP_DIR/$f"
    echo "Backed up: $f"
  else
    echo "Backup skipped (already exists or missing source): $f"
  fi
done

echo "=== Step 2: compressing ==="
for f in "${!widths[@]}"; do
  w=${widths[$f]}
  crf=${crfs[$f]}
  src="$BACKUP_DIR/$f"
  out="$VIDEOS_DIR/$f"

  if [ ! -f "$src" ]; then
    echo "!!! No backup source for $f, skipping"
    continue
  fi

  origSize=$(stat -c%s "$src")
  echo "--- Compressing $f (orig $((origSize/1024/1024)) MB, width=$w crf=$crf) ---"

  "$FFMPEG" -y -i "$src" -vf "scale=${w}:-2" -c:v libx264 -preset medium -crf "$crf" \
    -an -movflags +faststart -pix_fmt yuv420p "$out" >/dev/null 2>&1

  if [ -f "$out" ]; then
    newSize=$(stat -c%s "$out")
    echo "OK $f: $((origSize/1024/1024)) MB -> $((newSize/1024/1024)) MB"
  else
    echo "!!! FAILED: $f"
  fi
done

echo "ALL_DONE"
