#!/usr/bin/env bash
# Builds the looping hero video (public/hero/hero.mp4 + poster) from the AI-generated demo photos.
# Sequence: 4×3 mosaic → slow push-in → 8 Ken Burns close-ups → back to the mosaic (seamless loop).
# Requires ffmpeg. Usage: bash scripts/build-hero-video.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" # node resolves sharp from the project
SRC="$ROOT/public/demo"
OUT="$ROOT/public/hero"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

W=960 H=600 FPS=25 BG=0x0f2a44 XF=0.5 # brand primary as background, 0.5 s transitions

MOSAIC=(bmw-118i-2018 vw-golf-vii-1-6-tdi-2016 audi-q5-2-0-tdi-quattro-2016 fiat-500-1-2-2016
  ford-kuga-2-0-tdci-2017 tesla-model-3-long-range-2021 renault-clio-v-tce-90-2020 volvo-xc60-d4-2018
  mercedes-benz-c-220-d-2018 seat-ateca-1-5-tsi-2019 citroen-berlingo-1-6-bluehdi-2017 bmw-x5-xdrive30d-2017)
SLIDES=(mercedes-benz-glc-220-d-2019 vw-golf-vii-variant-1-5-tsi-2019 toyota-rav4-2-5-hybrid-2020 bmw-x3-xdrive20d-2019
  ford-fiesta-1-0-ecoboost-2018 audi-a4-avant-2-0-tdi-2018 skoda-octavia-combi-2-0-tdi-2015 vw-passat-variant-2-0-tdi-2016)

enc=(-c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r "$FPS" -an)

# 1. Mosaic still: 4 columns × 3 rows of 232×192 tiles with 8 px brand-coloured gutters (= 960×600).
inputs=() stack="" layout=""
for i in "${!MOSAIC[@]}"; do
  inputs+=(-i "$SRC/${MOSAIC[$i]}.webp")
  stack+="[$i:v]scale=256:192,crop=232:192,setsar=1[t$i];"
  layout+="$((8 + (i % 4) * 240))_$((8 + (i / 4) * 200))|"
done
labels=$(printf '[t%d]' $(seq 0 11))
ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex \
  "${stack}color=c=$BG:s=${W}x${H}[bg];${labels}xstack=inputs=12:layout=${layout%|}:fill=$BG[g];[bg][g]overlay=0:0:shortest=1" \
  -frames:v 1 "$TMP/mosaic.png"

# Zoom helper: upscale first so zoompan moves smoothly instead of in whole-pixel steps.
kenburns() { # src out seconds zoom-expr x-expr y-expr
  ffmpeg -y -loglevel error -loop 1 -i "$1" -vf \
    "scale=$((W * 4)):$((H * 4)):force_original_aspect_ratio=increase,crop=$((W * 4)):$((H * 4)),zoompan=z='$4':x='$5':y='$6':d=$(($3 * FPS)):s=${W}x${H}:fps=$FPS" \
    -t "$3" "${enc[@]}" "$2"
}

# 2. Mosaic push-in (3 s), then the static mosaic used as the loop's closing frame.
kenburns "$TMP/mosaic.png" "$TMP/s00.mp4" 3 '1+0.12*on/75' 'iw/2-(iw/zoom/2)' 'ih/2-(ih/zoom/2)'
ffmpeg -y -loglevel error -loop 1 -i "$TMP/mosaic.png" -vf "scale=${W}:${H},fps=$FPS" -t 1 "${enc[@]}" "$TMP/s99.mp4"

# 3. Close-ups (2 s each), alternating pan direction.
for i in "${!SLIDES[@]}"; do
  if ((i % 2)); then x='iw-(iw/zoom)-(iw-(iw/zoom))*on/50'; else x='(iw-(iw/zoom))*on/50'; fi
  kenburns "$SRC/${SLIDES[$i]}.webp" "$TMP/s$(printf %02d $((i + 1))).mp4" 2 '1.04+0.1*on/50' "$x" 'ih/2-(ih/zoom/2)'
done

# 4. Chain everything with crossfades.
clips=("$TMP"/s*.mp4)
inputs=() filter="" prev="[0:v]" offset=0
transitions=(fadeblack slideleft fade smoothleft fade slideleft circleopen fade fadeblack)
for i in "${!clips[@]}"; do inputs+=(-i "${clips[$i]}"); done
for ((i = 1; i < ${#clips[@]}; i++)); do
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${clips[$((i - 1))]}")
  offset=$(echo "$offset + $dur - $XF" | bc)
  filter+="${prev}[$i:v]xfade=transition=${transitions[$(((i - 1) % ${#transitions[@]}))]}:duration=$XF:offset=$offset[v$i];"
  prev="[v$i]"
done

# 5. Permanent "DEMO · KI-Bild" label (the close-ups crop the per-photo watermark), rendered with sharp.
node -e "require('sharp')(Buffer.from(process.argv[1])).png().toFile(process.argv[2])" \
  '<svg xmlns="http://www.w3.org/2000/svg" width="176" height="36"><rect width="176" height="36" rx="8" fill="#0f2a44" fill-opacity="0.85"/><text x="88" y="24" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="17" fill="#fff">DEMO · KI-Bild</text></svg>' \
  "$TMP/badge.png"
filter+="${prev}[${#clips[@]}:v]overlay=W-w-16:16[out]"

mkdir -p "$OUT"
ffmpeg -y -loglevel error "${inputs[@]}" -i "$TMP/badge.png" -filter_complex "$filter" -map "[out]" \
  -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -movflags +faststart -an "$OUT/hero.mp4"
ffmpeg -y -loglevel error -i "$OUT/hero.mp4" -frames:v 1 -q:v 4 "$OUT/hero-poster.jpg"
ls -l "$OUT"
