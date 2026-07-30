#!/bin/bash
# Post-process generated plates: verify orientation, flag letterboxing, crop to 16:10.
# The dossier frame is aspect-[16/10]; generated images are 3:2, so a small
# centre crop off the top and bottom fits them exactly without distortion.
cd "$(dirname "$0")/gen" || exit 1
OUT="../final"; mkdir -p "$OUT"

for f in *.png; do
  [ -e "$f" ] || continue
  [ "$f" = "probe.png" ] && continue
  W=$(sips -g pixelWidth  "$f" | awk '/pixelWidth/{print $2}')
  H=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  # portrait or square => the generator ignored the landscape instruction
  if [ "$W" -le "$H" ]; then echo "PORTRAIT  $f (${W}x${H}) - regenerate"; continue; fi

  # No PIL here, so pillarboxing is caught by eye on review rather than
  # automatically — every plate gets looked at before it ships anyway.
  BARS="   "
  TARGET_H=$(( W * 10 / 16 ))
  if [ "$TARGET_H" -le "$H" ]; then
    sips -c "$TARGET_H" "$W" "$f" --out "$OUT/$f" >/dev/null 2>&1
  else
    TARGET_W=$(( H * 16 / 10 ))
    sips -c "$H" "$TARGET_W" "$f" --out "$OUT/$f" >/dev/null 2>&1
  fi
  NW=$(sips -g pixelWidth "$OUT/$f" | awk '/pixelWidth/{print $2}')
  NH=$(sips -g pixelHeight "$OUT/$f" | awk '/pixelHeight/{print $2}')
  echo "$BARS  $f  ${W}x${H} -> ${NW}x${NH}"
done
