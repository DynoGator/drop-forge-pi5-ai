//#region node_modules/.nitro/vite/services/ssr/assets/deploy-C1Ot8-dU.js
var LLAMA_TAG = "b11706";
var LLAMA_ASSET = `llama-${LLAMA_TAG}-bin-ubuntu-arm64.tar.gz`;
var LLAMA_URL = `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/${LLAMA_ASSET}`;
var enc = new TextEncoder();
function shQuote(value) {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
function modelUrl(repo, path) {
	return `https://huggingface.co/${repo.split("/").map(encodeURIComponent).join("/")}/resolve/main/${path.split("/").map(encodeURIComponent).join("/")}`;
}
function installScript(spec) {
	const url = modelUrl(spec.repo, spec.path);
	const quant = spec.quant;
	return `#!/bin/sh
# Drop Forge — Raspberry Pi OS 64-bit desktop.
# Bookworm (Debian 12) and Trixie (Debian 13). Pi 5 and CM5 (both Cortex-A76).
# sudo sh install.sh
set -eu
cd "$(dirname "$0")"
ROOT=$(pwd)
PREFIX=\${PREFIX:-/opt/dropforge}
PORT=${spec.port}
CTX=${spec.ctx}
SERVICE_USER=${shQuote(spec.piUser)}
QUANT=${shQuote(quant)}
MODEL_URL=${shQuote(url)}
TAG=${LLAMA_TAG}
ASSET=${LLAMA_ASSET}

if [ "$(id -u)" -ne 0 ]; then
  echo "Re-run as root: sudo sh install.sh" >&2
  exit 1
fi
if [ "$(uname -m)" != "aarch64" ]; then
  echo "This kit is aarch64 only. This machine is $(uname -m)." >&2
  exit 1
fi

MODEL=$(tr -d '\\0' < /proc/device-tree/model 2>/dev/null || true)
echo "Board: \${MODEL:-unknown}"
case "$MODEL" in
  *"Compute Module 5"*) echo "CM5 — BCM2712, Cortex-A76 x4. Same llama.cpp build as a Pi 5." ;;
  *"Raspberry Pi 5"*) echo "Pi 5 — BCM2712, Cortex-A76 x4." ;;
  *) echo "Not a Pi 5 or CM5. The native build still targets Cortex-A76 and may SIGILL here." ;;
esac

if [ -r /etc/os-release ]; then
  . /etc/os-release
fi
case "\${VERSION_CODENAME:-}" in
  bookworm) echo "Raspberry Pi OS Bookworm (Debian 12, glibc 2.36)." ;;
  trixie) echo "Raspberry Pi OS Trixie (Debian 13)." ;;
  *) echo "Expected Bookworm or Trixie. Found \${VERSION_CODENAME:-unknown}. Continuing." ;;
esac

mkdir -p "$PREFIX/models" "$PREFIX/bin"
LLAMA="$PREFIX/bin"

place_prebuilt() {
  if [ -f "$ROOT/vendor/$ASSET" ]; then
    tar -xzf "$ROOT/vendor/$ASSET" -C "$PREFIX"
  else
    echo "Downloading llama.cpp $TAG (aarch64)..."
    curl -fL --retry 3 -o "$PREFIX/$ASSET" ${shQuote(LLAMA_URL)}
    tar -xzf "$PREFIX/$ASSET" -C "$PREFIX"
    rm -f "$PREFIX/$ASSET"
  fi
  SRC=$(find "$PREFIX" -type f -name llama-server | head -n 1 || true)
  if [ -z "$SRC" ]; then
    return 1
  fi
  mkdir -p "$LLAMA"
  DIR=$(dirname "$SRC")
  cp -a "$DIR"/. "$LLAMA"/
  chmod -R a+rX "$LLAMA" || true
  find "$LLAMA" -type f -name 'llama-*' -exec chmod a+x {} +
}

build_native() {
  echo "Prebuilt llama.cpp will not start on this glibc. Building $TAG on this board."
  echo "Pi 5 / CM5, four Cortex-A76 threads. Usually 10 to 20 minutes."
  apt-get update
  apt-get install -y build-essential cmake git libcurl4-openssl-dev libgomp1
  rm -rf "$PREFIX/src"
  git clone --depth 1 --branch "$TAG" https://github.com/ggml-org/llama.cpp "$PREFIX/src"
  cmake -S "$PREFIX/src" -B "$PREFIX/src/build" \\
    -DCMAKE_BUILD_TYPE=Release \\
    -DGGML_NATIVE=ON \\
    -DBUILD_SHARED_LIBS=OFF \\
    -DLLAMA_BUILD_TESTS=OFF \\
    -DLLAMA_BUILD_EXAMPLES=OFF \\
    -DLLAMA_CURL=ON
  cmake --build "$PREFIX/src/build" --config Release -j 4 -t llama-server llama-quantize
  mkdir -p "$LLAMA"
  find "$PREFIX/src/build" -type f \\( -name llama-server -o -name llama-quantize \\) -exec cp -f {} "$LLAMA"/ \\;
  chmod a+x "$LLAMA"/llama-server "$LLAMA"/llama-quantize
}

if ! place_prebuilt || ! "$LLAMA/llama-server" --version >/dev/null 2>&1; then
  build_native
fi
if ! "$LLAMA/llama-server" --version >/dev/null 2>&1; then
  echo "llama-server still will not start." >&2
  exit 1
fi

if [ -f "$ROOT/model.gguf" ]; then
  cp -f "$ROOT/model.gguf" "$PREFIX/models/model.gguf"
elif [ "$QUANT" = "keep" ]; then
  echo "Fetching GGUF..."
  curl -fL --retry 3 -C - -o "$PREFIX/models/model.gguf" "$MODEL_URL"
else
  case "$MODEL_URL" in
    *.safetensors|*.safetensors?*)
      echo "llama-quantize does not read safetensors. Pack a GGUF." >&2
      exit 2
      ;;
  esac
  echo "Fetching source weights, then quantizing on this Pi..."
  curl -fL --retry 3 -C - -o "$PREFIX/models/source.gguf" "$MODEL_URL"
  "$LLAMA/llama-quantize" -t 4 "$PREFIX/models/source.gguf" "$PREFIX/models/model.gguf" "$QUANT"
  rm -f "$PREFIX/models/source.gguf"
fi

if id "$SERVICE_USER" >/dev/null 2>&1; then
  chown -R "$SERVICE_USER" "$PREFIX"
  USER_LINE="User=$SERVICE_USER"
else
  echo "User $SERVICE_USER does not exist. Service will run as root." >&2
  USER_LINE=""
fi

cat > /etc/systemd/system/dropforge.service << EOF
[Unit]
Description=Drop Forge llama-server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
\$USER_LINE
Environment=LD_LIBRARY_PATH=\$LLAMA
ExecStart=\$LLAMA/llama-server -m \$PREFIX/models/model.gguf --host 0.0.0.0 --port \$PORT -c \$CTX -t 4 --jinja
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now dropforge.service
echo "llama-server is up on 0.0.0.0:\${PORT}"
echo "Health: curl -sS http://127.0.0.1:\${PORT}/health"
`;
}
function readme(spec) {
	return `Drop Forge kit
================
Repo:   ${spec.repo}
File:   ${spec.path}
Quant:  ${spec.quant}
Target: Raspberry Pi OS 64-bit desktop — Bookworm or Trixie, Pi 5 or CM5
llama.cpp ${LLAMA_TAG}, four Cortex-A76 threads

Install, from the directory this tarball extracted into:

  sudo sh install.sh

The script reads /proc/device-tree/model and /etc/os-release.
If the prebuilt Ubuntu arm64 binary needs a newer glibc than Bookworm,
it compiles ${LLAMA_TAG} on the board with GGML_NATIVE (A76 + dotprod + fp16, no i8mm).
Trixie usually runs the prebuilt. Pi 5 and CM5 take the same path.

What the tarball contains
- install.sh
- README.txt
${spec.embedBinary ? `- vendor/${LLAMA_ASSET}` : `- (no embedded binary — install.sh downloads ${LLAMA_URL})`}
- model.gguf only when the phone packed a file it already had

Quantize on the Pixel when you can. A full F16 quantize on an 8 GB desktop
Pi can run out of RAM. If model.gguf is in the tarball, the Pi does not quantize.

llama-server listens on 0.0.0.0:${spec.port}.

Planned output size: ${spec.outputBytes} bytes
Source size:         ${spec.bytes} bytes
`;
}
function textEntries(spec) {
	return [
		{
			name: "dropforge-kit/install.sh",
			data: enc.encode(installScript(spec)),
			mode: 493
		},
		{
			name: "dropforge-kit/README.txt",
			data: enc.encode(readme(spec)),
			mode: 420
		},
		{
			name: "dropforge-kit/MODEL.json",
			data: enc.encode(JSON.stringify({
				repo: spec.repo,
				path: spec.path,
				quant: spec.quant,
				sourceBytes: spec.bytes,
				plannedOutputBytes: spec.outputBytes,
				params: spec.params,
				llamaTag: LLAMA_TAG,
				url: modelUrl(spec.repo, spec.path),
				targets: ["rpi-os-bookworm-arm64", "rpi-os-trixie-arm64"],
				boards: ["pi5", "cm5"]
			}, null, 2)),
			mode: 420
		}
	];
}
//#endregion
export { LLAMA_URL as n, textEntries as r, LLAMA_ASSET as t };
