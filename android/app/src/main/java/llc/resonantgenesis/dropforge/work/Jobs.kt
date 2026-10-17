package llc.resonantgenesis.dropforge.work

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.documentfile.provider.DocumentFile
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import llc.resonantgenesis.dropforge.data.Fit
import llc.resonantgenesis.dropforge.data.ModelHit
import llc.resonantgenesis.dropforge.data.QuantMath
import llc.resonantgenesis.dropforge.data.RemoteFile
import llc.resonantgenesis.dropforge.data.StagedFile
import llc.resonantgenesis.dropforge.data.Vault
import llc.resonantgenesis.dropforge.net.HfClient
import java.io.File

data class ForgeUi(
    val files: List<StagedFile> = emptyList(),
    val selectedId: String? = null,
    val quant: String = "Q4_K_M",
    val models: List<ModelHit> = emptyList(),
    val remoteFiles: List<RemoteFile> = emptyList(),
    val openRepo: String? = null,
    val log: List<String> = emptyList(),
    val busy: String? = null,
    val progress: Float? = null,
    val error: String? = null,
    val note: String? = null,
    val pendingFingerprint: String? = null,
    val piRamGiB: Int = 8,
    val board: String = "pi5",
    val os: String = "bookworm",
    val useCase: String = "chat",
    val guard: String = "uncensored",
    val ctx: Int = 4096,
    val listenPort: Int = 8080,
    val pixelFreeGiB: Int = 12,
)

object Jobs {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val json = Json { ignoreUnknownKeys = true; prettyPrint = true }
    private val _ui = MutableStateFlow(ForgeUi())
    val ui: StateFlow<ForgeUi> = _ui

    private lateinit var app: Context
    private lateinit var vault: Vault
    private var treeUri: Uri? = null

    fun attach(context: Context) {
        if (::app.isInitialized) return
        app = context.applicationContext
        vault = Vault(app)
        val file = File(app.filesDir, "library.json")
        if (file.exists()) {
            runCatching {
                val files = json.decodeFromString<List<StagedFile>>(file.readText())
                _ui.update { it.copy(files = files, selectedId = files.firstOrNull()?.id) }
            }
        }
    }

    fun select(id: String) = _ui.update { it.copy(selectedId = id, error = null) }
    fun setQuant(id: String) = _ui.update { it.copy(quant = id) }
    fun setRig(board: String? = null, ram: Int? = null, os: String? = null, use: String? = null, guard: String? = null) {
        _ui.update { cur ->
            val nextBoard = board ?: cur.board
            val nextRam = Fit.coerceRam(nextBoard, ram ?: cur.piRamGiB)
            val nextUse = use ?: cur.useCase
            cur.copy(
                board = nextBoard,
                piRamGiB = nextRam,
                os = os ?: cur.os,
                useCase = nextUse,
                guard = guard ?: cur.guard,
                ctx = if (use != null) Fit.useCtx(nextUse) else cur.ctx,
            )
        }
    }
    fun clearError() = _ui.update { it.copy(error = null, note = null) }
    fun token(): String = if (::vault.isInitialized) vault.hfToken else ""
    fun setToken(value: String) { vault.hfToken = value }
    fun setTree(uri: Uri) { treeUri = uri }
    fun setApiKey(value: String) { vault.apiKey = value }
    fun apiKey(): String = if (::vault.isInitialized) vault.apiKey else ""

    fun search(query: String, bucket: String, license: String, kind: String) {
        val rig = _ui.value
        launch("Searching") {
            val hits = HfClient(vault.hfToken).search(query, bucket, license, kind, rig.guard, rig.piRamGiB, rig.os, rig.useCase)
            _ui.update { it.copy(models = hits, note = "${hits.size} repos") }
        }
    }

    fun list(repo: String) {
        launch("Reading files") {
            val files = HfClient(vault.hfToken).files(repo)
            _ui.update { it.copy(remoteFiles = files, openRepo = repo) }
        }
    }

    fun download(repo: String, file: RemoteFile, license: String?, params: Long?, gated: Boolean) {
        if (gated) {
            _ui.update { it.copy(error = "Gated repo. Put an HF token in Rig.") }
            return
        }
        launch("Downloading ${file.path}") {
            val safe = file.path.substringAfterLast('/').replace(Regex("[^A-Za-z0-9._-]"), "_")
            val dest = File(app.filesDir, "models/$safe")
            HfClient(vault.hfToken).download(repo, file.path, dest) { got, total ->
                val denom = if (total > 0) total else file.bytes
                if (denom > 0) _ui.update { it.copy(progress = got.toFloat() / denom) }
            }
            val staged = StagedFile(
                id = "$repo::${file.path}",
                repo = repo,
                path = file.path,
                bytes = dest.length(),
                kind = file.kind,
                license = license,
                params = params,
                detectedQuant = if (file.kind == "gguf") QuantMath.detect(file.path) else null,
                localName = dest.name,
                stagedAt = System.currentTimeMillis(),
            )
            _ui.update {
                it.copy(
                    files = listOf(staged) + it.files.filter { f -> f.id != staged.id },
                    selectedId = staged.id,
                    note = "Saved in app-private storage (${QuantMath.formatBytes(dest.length())})",
                    progress = null,
                )
            }
            persist()
        }
    }

    fun quantize() {
        val state = _ui.value
        val file = state.files.find { it.id == state.selectedId } ?: run {
            _ui.update { it.copy(error = "Stage a file first.") }
            return
        }
        if (file.kind != "gguf") {
            _ui.update { it.copy(error = "llama-quantize does not read safetensors.") }
            return
        }
        val local = localFile(file) ?: run {
            _ui.update { it.copy(error = "The file is not in private storage yet.") }
            return
        }
        val detected = file.detectedQuant
        if (!QuantMath.quantizable(detected)) {
            _ui.update { it.copy(error = "Already ${detected ?: "quantized"}. Pack it as-is. Requantize needs F16 or BF16.") }
            return
        }
        val srcBpw = QuantMath.sourceBpw("gguf", detected) ?: 16.0
        val dst = QuantMath.byId(state.quant) ?: return
        val outBytes = QuantMath.outputBytes(local.length(), srcBpw, dst.bpw)
        val peak = QuantMath.peakRam(local.length(), outBytes)
        val avail = availableRam()
        if (peak > avail * 0.9) {
            _ui.update {
                it.copy(error = "Peak RAM ${QuantMath.formatBytes(peak)} is over free ${QuantMath.formatBytes(avail)}. Quantize on the Pi, or use Termux after exporting the file.")
            }
            return
        }
        launch("Quantizing ${state.quant}") {
            val bin = ensureQuantizeBinary()
            val out = File(app.filesDir, "models/${local.nameWithoutExtension}-${state.quant}.gguf")
            if (bin == null) {
                termuxQuantize(local, out, state.quant)
                return@launch
            }
            val log = mutableListOf(
                "Tensor G4 · 4 threads · X4 + A720 · i8mm/dotprod",
                "A520s left for the UI. NPU unused.",
                "exec ${bin.absolutePath} -t 4",
            )
            _ui.update { it.copy(log = log) }
            val cmd = mutableListOf(bin.absolutePath, "-t", "4", local.absolutePath, out.absolutePath, state.quant)
            val proc = try {
                ProcessBuilder(cmd)
                    .directory(bin.parentFile)
                    .apply {
                        environment()["LD_LIBRARY_PATH"] = bin.parent
                        environment()["OMP_NUM_THREADS"] = "4"
                    }
                    .redirectErrorStream(true)
                    .start()
            } catch (err: Exception) {
                log += "exec failed: ${err.message}"
                log += "Android blocks executing a writable app-private binary (W^X) on this targetSdk. Falling back to Termux."
                _ui.update { it.copy(log = log.toList()) }
                termuxQuantize(local, out, state.quant)
                return@launch
            }
            proc.inputStream.bufferedReader().useLines { lines ->
                lines.forEach { line ->
                    log += line
                    if (log.size > 80) log.removeAt(0)
                    val match = Regex("\\[\\s*(\\d+)\\s*/\\s*(\\d+)\\s*]").find(line)
                    val progress = match?.let { m ->
                        val a = m.groupValues[1].toFloat()
                        val b = m.groupValues[2].toFloat().coerceAtLeast(1f)
                        a / b
                    }
                    _ui.update { it.copy(log = log.toList(), progress = progress) }
                }
            }
            val code = proc.waitFor()
            if (code != 0 || !out.exists()) {
                _ui.update { it.copy(error = "llama-quantize exited $code", log = log.toList()) }
                return@launch
            }
            val staged = file.copy(
                id = "${file.repo}::${out.name}",
                path = out.name,
                bytes = out.length(),
                detectedQuant = state.quant,
                localName = out.name,
                stagedAt = System.currentTimeMillis(),
            )
            log += "wrote ${QuantMath.formatBytes(out.length())} (estimate was ${QuantMath.formatBytes(outBytes)})"
            _ui.update {
                it.copy(
                    files = listOf(staged) + it.files,
                    selectedId = staged.id,
                    log = log.toList(),
                    note = "Output ${QuantMath.formatBytes(out.length())}",
                    progress = null,
                )
            }
            persist()
        }
    }

    fun pack(embedBinary: Boolean) {
        val state = _ui.value
        val file = state.files.find { it.id == state.selectedId } ?: run {
            _ui.update { it.copy(error = "Nothing selected.") }
            return
        }
        if (file.kind != "gguf") {
            _ui.update { it.copy(error = "Pack a GGUF. Safetensors cannot be served by llama-server.") }
            return
        }
        launch("Packing kit") {
            val tag = "b11706"
            val asset = "llama-$tag-bin-ubuntu-arm64.tar.gz"
            val vendor = File(app.filesDir, "vendor/$asset")
            if (embedBinary && (!vendor.exists() || vendor.length() < 1_000_000)) {
                HfClient().fetchBytes(
                    "https://github.com/ggml-org/llama.cpp/releases/download/$tag/$asset",
                    vendor,
                ) { got, total ->
                    if (total > 0) _ui.update { it.copy(progress = got.toFloat() / total) }
                }
            }
            val out = File(app.cacheDir, "dropforge-kit.tar")
            out.outputStream().use { stream ->
                val tar = TarWriter(stream)
                tar.file("dropforge-kit/install.sh", installScript(file, state).encodeToByteArray(), 493)
                tar.file("dropforge-kit/README.txt", readme(file, embedBinary).encodeToByteArray())
                val local = localFile(file)
                if (local != null && local.exists()) {
                    tar.file("dropforge-kit/model.gguf", local)
                }
                if (embedBinary && vendor.exists()) {
                    tar.file("dropforge-kit/vendor/$asset", vendor)
                }
                tar.close()
            }
            val saved = File(app.filesDir, "kits/dropforge-kit.tar")
            saved.parentFile?.mkdirs()
            out.copyTo(saved, overwrite = true)
            _ui.update {
                it.copy(
                    note = "Kit ${QuantMath.formatBytes(saved.length())} in app-private kits/. ${if (localFile(file) != null) "GGUF is inside." else "No local GGUF, install.sh will fetch it."}",
                    progress = null,
                    log = listOf(saved.absolutePath),
                )
            }
        }
    }

    fun push(host: String, port: Int, user: String, password: String?, keyPem: String?, runInstall: Boolean, trust: String?) {
        val tar = File(app.filesDir, "kits/dropforge-kit.tar")
        if (!tar.exists()) {
            _ui.update { it.copy(error = "Build a kit first.") }
            return
        }
        launch("Pushing to $host") {
            try {
                val known = trust ?: vault.pinFor(host)
                val text = SshPush().push(
                    host = host.trim(),
                    port = port,
                    user = user.trim().ifBlank { "pi" },
                    password = password,
                    privateKey = keyPem?.encodeToByteArray(),
                    knownFingerprint = known,
                    localTar = tar,
                    runInstall = runInstall,
                ) { got, total ->
                    if (total > 0) _ui.update { it.copy(progress = got.toFloat() / total) }
                }
                if (trust != null) vault.pin(host.trim(), trust)
                _ui.update { it.copy(note = text, pendingFingerprint = null, progress = null, log = text.lines().takeLast(40)) }
            } catch (err: NeedTrust) {
                _ui.update {
                    it.copy(
                        pendingFingerprint = err.fingerprint,
                        error = "Unknown host key ${err.fingerprint}. Confirm it, then push again.",
                        progress = null,
                    )
                }
            }
        }
    }

    fun rememberFingerprint(host: String) {
        val fp = _ui.value.pendingFingerprint ?: return
        vault.pin(host.trim(), fp)
        _ui.update { it.copy(note = "Pinned $fp", error = null) }
    }

    private fun termuxQuantize(local: File, out: File, quant: String) {
        val shared = exportForTermux(local)
        val script = TermuxBridge.quantizeScript(shared, shared.substringBeforeLast('/') + "/" + out.name, quant, null)
        val where = TermuxBridge.writeScript(app, "dropforge-quantize.sh", script)
        val msg = if (TermuxBridge.installed(app)) TermuxBridge.run(app, script) else "Termux is not installed. Script written to $where"
        _ui.update { it.copy(note = msg, log = script.lines()) }
    }

    private fun exportForTermux(local: File): String {
        val tree = treeUri
        if (tree != null) {
            val doc = DocumentFile.fromTreeUri(app, tree)
            val created = doc?.createFile("application/octet-stream", local.name)
            if (created != null) {
                app.contentResolver.openOutputStream(created.uri)?.use { output ->
                    local.inputStream().use { it.copyTo(output) }
                }
                return "/storage/emulated/0/Download/DropForge/${local.name}"
            }
        }
        val path = TermuxBridge.writeScript(app, local.name, "")
        // writeScript is for text. Copy bytes via MediaStore in TermuxBridge path is text-only.
        // Fall back to telling the user the private path cannot be read by Termux.
        return local.absolutePath.also {
            _ui.update { s -> s.copy(note = "Grant a shared folder (Download/DropForge) so Termux can read the GGUF. Private path: $it. Stub: $path") }
        }
    }

    private suspend fun ensureQuantizeBinary(): File? {
        val native = File(app.applicationInfo.nativeLibraryDir, "libllama-quantize.so")
        if (native.exists()) return native
        val destDir = File(app.filesDir, "bin")
        val bin = File(destDir, "llama-quantize")
        if (bin.exists() && bin.length() > 100_000) {
            bin.setExecutable(true)
            return bin
        }
        val tag = "b11706"
        val tar = File(app.cacheDir, "llama-android.tar.gz")
        HfClient().fetchBytes(
            "https://github.com/ggml-org/llama.cpp/releases/download/$tag/llama-$tag-bin-android-arm64.tar.gz",
            tar,
        ) { got, total ->
            if (total > 0) _ui.update { it.copy(progress = got.toFloat() / total, note = "Fetching official Android quantize binary") }
        }
        destDir.mkdirs()
        val unpack = ProcessBuilder("tar", "-xzf", tar.absolutePath, "-C", destDir.absolutePath)
            .redirectErrorStream(true)
            .start()
        val tarLog = unpack.inputStream.bufferedReader().readText()
        if (unpack.waitFor() != 0) {
            _ui.update { it.copy(log = listOf("tar failed", tarLog)) }
            return null
        }
        val found = destDir.walkTopDown().firstOrNull { it.name == "llama-quantize" && it.isFile } ?: return null
        if (found.absolutePath != bin.absolutePath) found.copyTo(bin, overwrite = true)
        bin.setExecutable(true)
        destDir.walkTopDown().filter { it.isFile && it.name.startsWith("lib") }.forEach { it.setReadable(true, false) }
        return bin
    }

    private fun localFile(file: StagedFile): File? {
        val name = file.localName ?: return null
        val f = File(app.filesDir, "models/$name")
        return f.takeIf { it.exists() }
    }

    private fun availableRam(): Long {
        val info = ActivityManager.MemoryInfo()
        val am = app.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        am.getMemoryInfo(info)
        return info.availMem
    }

    private fun persist() {
        File(app.filesDir, "library.json").writeText(json.encodeToString(_ui.value.files))
    }

    private fun launch(label: String, block: suspend () -> Unit) {
        if (_ui.value.busy != null) {
            _ui.update { it.copy(error = "A job is already running.") }
            return
        }
        _ui.update { it.copy(busy = label, error = null, progress = 0f) }
        scope.launch {
            foreground(label)
            try {
                block()
            } catch (err: Exception) {
                _ui.update { it.copy(error = err.message ?: "Job failed") }
            } finally {
                _ui.update { it.copy(busy = null, progress = null) }
                app.stopService(Intent(app, TransferService::class.java))
            }
        }
    }

    private fun foreground(text: String) {
        val intent = Intent(app, TransferService::class.java).putExtra("text", text)
        try {
            ContextCompat.startForegroundService(app, intent)
        } catch (_: Exception) {
            // Notification permission not granted yet. The job still runs.
        }
    }
}

private fun installScript(file: StagedFile, state: ForgeUi): String {
    val quant = if (QuantMath.quantizable(file.detectedQuant)) state.quant else "keep"
    val url = "https://huggingface.co/${file.repo}/resolve/main/${file.path}"
    return """
        #!/bin/sh
        # Raspberry Pi OS 64-bit desktop: Bookworm or Trixie, Pi 5 or CM5.
        set -eu
        cd "$(dirname "$0")"
        ROOT=$(pwd)
        PREFIX=${'$'}{PREFIX:-/opt/dropforge}
        PORT=${state.listenPort}
        CTX=${state.ctx}
        QUANT='$quant'
        MODEL_URL='$url'
        TAG=b11706
        ASSET=llama-${'$'}TAG-bin-ubuntu-arm64.tar.gz
        if [ "$(id -u)" -ne 0 ]; then echo "sudo sh install.sh" >&2; exit 1; fi
        if [ "$(uname -m)" != "aarch64" ]; then echo "need aarch64" >&2; exit 1; fi
        MODEL=$(tr -d '\0' < /proc/device-tree/model 2>/dev/null || true)
        echo "Board: ${'$'}{MODEL:-unknown}"
        if [ -r /etc/os-release ]; then . /etc/os-release; fi
        echo "OS: ${'$'}{VERSION_CODENAME:-unknown}"
        mkdir -p "${'$'}PREFIX/models" "${'$'}PREFIX/bin"
        LLAMA="${'$'}PREFIX/bin"
        place_prebuilt() {
          if [ -f "${'$'}ROOT/vendor/${'$'}ASSET" ]; then
            tar -xzf "${'$'}ROOT/vendor/${'$'}ASSET" -C "${'$'}PREFIX"
          else
            curl -fL --retry 3 -o "${'$'}PREFIX/${'$'}ASSET" "https://github.com/ggml-org/llama.cpp/releases/download/${'$'}TAG/${'$'}ASSET"
            tar -xzf "${'$'}PREFIX/${'$'}ASSET" -C "${'$'}PREFIX"
          fi
          SRC=$(find "${'$'}PREFIX" -type f -name llama-server | head -n 1 || true)
          [ -n "${'$'}SRC" ] || return 1
          DIR=$(dirname "${'$'}SRC")
          cp -a "${'$'}DIR"/. "${'$'}LLAMA"/
          chmod -R a+rX "${'$'}LLAMA" || true
        }
        build_native() {
          echo "Prebuilt glibc is too new. Building ${'$'}TAG for Cortex-A76."
          apt-get update
          apt-get install -y build-essential cmake git libcurl4-openssl-dev libgomp1
          rm -rf "${'$'}PREFIX/src"
          git clone --depth 1 --branch "${'$'}TAG" https://github.com/ggml-org/llama.cpp "${'$'}PREFIX/src"
          cmake -S "${'$'}PREFIX/src" -B "${'$'}PREFIX/src/build" -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=ON -DBUILD_SHARED_LIBS=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_CURL=ON
          cmake --build "${'$'}PREFIX/src/build" -j 4 -t llama-server llama-quantize
          find "${'$'}PREFIX/src/build" -type f \( -name llama-server -o -name llama-quantize \) -exec cp -f {} "${'$'}LLAMA"/ \;
          chmod a+x "${'$'}LLAMA"/llama-server "${'$'}LLAMA"/llama-quantize
        }
        if ! place_prebuilt || ! "${'$'}LLAMA/llama-server" --version >/dev/null 2>&1; then
          build_native
        fi
        if [ -f "${'$'}ROOT/model.gguf" ]; then
          cp -f "${'$'}ROOT/model.gguf" "${'$'}PREFIX/models/model.gguf"
        elif [ "${'$'}QUANT" = "keep" ]; then
          curl -fL --retry 3 -C - -o "${'$'}PREFIX/models/model.gguf" "${'$'}MODEL_URL"
        else
          curl -fL --retry 3 -C - -o "${'$'}PREFIX/models/source.gguf" "${'$'}MODEL_URL"
          "${'$'}LLAMA/llama-quantize" -t 4 "${'$'}PREFIX/models/source.gguf" "${'$'}PREFIX/models/model.gguf" "${'$'}QUANT"
          rm -f "${'$'}PREFIX/models/source.gguf"
        fi
        cat > /etc/systemd/system/dropforge.service << EOF
        [Unit]
        Description=Drop Forge llama-server
        After=network-online.target
        [Service]
        Type=simple
        Environment=LD_LIBRARY_PATH=${'$'}LLAMA
        ExecStart=${'$'}LLAMA/llama-server -m ${'$'}PREFIX/models/model.gguf --host 0.0.0.0 --port ${'$'}PORT -c ${'$'}CTX -t 4 --jinja
        Restart=on-failure
        [Install]
        WantedBy=multi-user.target
        EOF
        systemctl daemon-reload
        systemctl enable --now dropforge.service
        echo "up on ${'$'}PORT"
    """.trimIndent()
}

private fun readme(file: StagedFile, embed: Boolean) = """
    Drop Forge kit
    ${file.repo} / ${file.path}
    Embedded llama.cpp binary: $embed
    sudo sh install.sh
    Model is bundled when it was already in app-private storage.
""".trimIndent()

@Suppress("unused")
private suspend fun idle() = withContext(Dispatchers.IO) { }
