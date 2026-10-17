#!/bin/sh
# Pull the official llama.cpp Android ARM64 build and stage it as jniLibs
# so the package manager extracts it into nativeLibraryDir (executable).
set -eu
TAG=b11706
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
DEST="$ROOT/app/src/main/jniLibs/arm64-v8a"
TMP=$(mktemp -d)
URL="https://github.com/ggml-org/llama.cpp/releases/download/${TAG}/llama-${TAG}-bin-android-arm64.tar.gz"
echo "Fetching $URL"
curl -fL --retry 3 -o "$TMP/android.tar.gz" "$URL"
tar -xzf "$TMP/android.tar.gz" -C "$TMP"
mkdir -p "$DEST"
find "$TMP" -type f \( -name 'lib*.so*' -o -name 'llama-quantize' \) | while read -r f; do
  base=$(basename "$f")
  case "$base" in
    llama-quantize) cp -L "$f" "$DEST/libllama-quantize.so" ;;
    *.so|*.so.*) cp -L "$f" "$DEST/$base" ;;
  esac
done
echo "Staged into $DEST"
echo "Android only packages files named lib*.so. Versioned sonames (libfoo.so.0) may be dropped."
echo "If the dynamic linker cannot find them, use the Termux fallback in the app."
rm -rf "$TMP"
