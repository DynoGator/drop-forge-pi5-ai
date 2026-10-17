# Drop Forge

Android app for a Pixel 9 Pro XL on GrapheneOS. No root. No Play Services.

It searches Hugging Face on the phone, downloads GGUF into app-private storage, quantizes with llama-quantize on the Tensor G4's four performance cores (i8mm and dotprod, UI left on the A520s), and packs a tarball for Raspberry Pi OS 64-bit desktop.

Targets: Pi 5 and CM5 (both BCM2712, Cortex-A76 ×4), Bookworm and Trixie. `install.sh` runs the prebuilt aarch64 binary when glibc allows it. On Bookworm that binary is usually too new, so the script compiles llama.cpp b11706 on the board with `GGML_NATIVE=ON`.

The Hub filters by what fits that rig (desktop RAM reserved), by use (chat, code, notes, always-on), and by guardrails. Uncensored / reduced is a repo-name filter (abliterated, heretic, dolphin, uncensored), not a weight scan. Default is uncensored.

No cloud trainer. Hugging Face is contacted only to search and download. SSH to the Pi is direct from the phone.

## Open

Android Studio (Ladybug or newer), SDK 35, JDK 17. Open this directory. Let it generate the Gradle wrapper. Run on the Pixel, or:

```
adb install app/build/outputs/apk/debug/app-debug.apk
```

`minSdk` 26, `targetSdk` 35, `arm64-v8a` only.

## Quantize binary

`targetSdk` 35 cannot execute a binary you just wrote into the app's private files directory. Android's W^X policy blocks it. Two paths:

1. **Bundled JNI.** Run `scripts/fetch-quantize-jni.sh`, then rebuild. The script downloads the official `llama-b11706-bin-android-arm64` release and places `libllama-quantize.so` plus the libraries it needs under `app/src/main/jniLibs/arm64-v8a/`. Those land in `nativeLibraryDir`, which is executable. The app sets `LD_LIBRARY_PATH` to that directory.

2. **Termux fallback.** If exec returns EACCES, the app writes `Download/DropForge/dropforge-quantize.sh` and fires `com.termux.RUN_COMMAND`. In Termux: Settings → Allow external apps, and grant Drop Forge the run-command permission. Termux also needs storage access so it can read the GGUF. Grant the shared folder from the Push screen (Document tree). The script downloads the same official Android ARM64 build into Termux's home and runs it.

Safetensors are stored, not quantized. `llama-quantize` does not read them. Convert with `convert_hf_to_gguf.py` first.

IQ3_XS and IQ2_M want an imatrix. Without one the binary still runs and the model looks worse.

## Pack

The tarball contains:

- `install.sh` — one command, `sudo sh install.sh`
- `model.gguf` when the weights are already in private storage
- `vendor/llama-b11706-bin-ubuntu-arm64.tar.gz` — official llama-server and its libs for Raspberry Pi OS aarch64

The installer writes `/etc/systemd/system/dropforge.service` and enables it. llama-server listens on `0.0.0.0:8080`.

## SSH

JSch. Password auth or an imported OpenSSH private key. The first connection shows the SHA256 host key and does not continue until you pin it. The password is not written to disk. The key can stay in memory for the session.

`sudo -n` needs passwordless sudo, which Raspberry Pi OS gives the default user.

## Train

Experimental, and it says so. Full fine-tunes do not fit in 16 GB with no CUDA. The screen checks a sub-1B LoRA plan (PEFT, rank 8, `q_proj`/`v_proj`) and will not start an optimizer. A remote API key, if you paste one, is stored with the Android keystore via EncryptedSharedPreferences.

## Permissions

- `INTERNET`, `ACCESS_NETWORK_STATE` — Hub, binary fetch, SSH
- `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE_DATA_SYNC` — long downloads
- `com.termux.permission.RUN_COMMAND` — ignored if Termux is not installed

No `MANAGE_EXTERNAL_STORAGE`. No root.
