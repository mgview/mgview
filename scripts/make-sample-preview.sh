#!/usr/bin/env bash
# Resize a Mac screenshot and write samples/<folder>/preview.webp for the gallery.
#
# Usage:
#   scripts/make-sample-preview.sh <screenshot> <sample-folder>
#
# Examples:
#   scripts/make-sample-preview.sh ~/Desktop/Screenshot.png particle_pendulum
#   scripts/make-sample-preview.sh ~/Desktop/foo.png samples/disk
#
# Requires:
#   - sips (built into macOS)
#   - cwebp (install with: brew install webp)
#
# Optional env vars:
#   PREVIEW_SIZE=160   output width/height in pixels (gallery shows 40px; 160 is sharp on Retina)
#   PREVIEW_QUALITY=82 WebP quality 0-100

set -euo pipefail

PREVIEW_SIZE="${PREVIEW_SIZE:-160}"
PREVIEW_QUALITY="${PREVIEW_QUALITY:-82}"

usage() {
  cat <<'EOF'
Usage: scripts/make-sample-preview.sh <screenshot> <sample-folder>

  screenshot      PNG/JPEG/WebP/TIFF image (e.g. a Mac screenshot)
  sample-folder   folder under samples/, such as particle_pendulum or samples/disk

Writes: samples/<sample-folder>/preview.webp

Install cwebp once with: brew install webp
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -lt 2 ]]; then
  usage
  exit "${1:-}" == "-h" || "${1:-}" == "--help" ? 0 : 1
fi

if ! command -v sips >/dev/null 2>&1; then
  echo "error: sips not found (expected on macOS)" >&2
  exit 1
fi

if ! command -v cwebp >/dev/null 2>&1; then
  echo "error: cwebp not found. Install with: brew install webp" >&2
  exit 1
fi

source_image="$1"
sample_folder="$2"

if [[ ! -f "$source_image" ]]; then
  echo "error: screenshot not found: $source_image" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
sample_folder="${sample_folder#samples/}"
sample_folder="${sample_folder%/}"
output_dir="$repo_root/samples/$sample_folder"
output_path="$output_dir/preview.webp"

mkdir -p "$output_dir"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cropped_path="$tmp_dir/cropped.png"
resized_path="$tmp_dir/resized.png"

width="$(sips -g pixelWidth "$source_image" 2>/dev/null | awk '/pixelWidth/ { print $2 }')"
height="$(sips -g pixelHeight "$source_image" 2>/dev/null | awk '/pixelHeight/ { print $2 }')"

if [[ -z "$width" || -z "$height" ]]; then
  echo "error: could not read image dimensions from $source_image" >&2
  exit 1
fi

if (( width < height )); then
  crop_size="$width"
  offset_x=0
  offset_y=$(( (height - width) / 2 ))
else
  crop_size="$height"
  offset_x=$(( (width - height) / 2 ))
  offset_y=0
fi

cp "$source_image" "$cropped_path"
sips --cropOffset "$offset_y" "$offset_x" -c "$crop_size" "$crop_size" "$cropped_path" >/dev/null
sips -z "$PREVIEW_SIZE" "$PREVIEW_SIZE" "$cropped_path" --out "$resized_path" >/dev/null
cwebp -quiet -q "$PREVIEW_QUALITY" "$resized_path" -o "$output_path"

bytes="$(wc -c < "$output_path" | tr -d ' ')"
echo "Wrote $output_path (${PREVIEW_SIZE}x${PREVIEW_SIZE}, ${bytes} bytes)"
