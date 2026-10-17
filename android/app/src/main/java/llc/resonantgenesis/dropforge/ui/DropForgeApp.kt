package llc.resonantgenesis.dropforge.ui

import android.Manifest
import android.content.Intent
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import llc.resonantgenesis.dropforge.data.Fit
import llc.resonantgenesis.dropforge.data.QuantMath
import llc.resonantgenesis.dropforge.work.Jobs

@Composable
fun DropForgeApp() {
    val state by Jobs.ui.collectAsState()
    var tab by remember { mutableIntStateOf(0) }
    val context = LocalContext.current
    val notify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val tree = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
            )
            Jobs.setTree(uri)
        }
    }
    fun ensureNotif() {
        if (Build.VERSION.SDK_INT >= 33) notify.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    Scaffold(
        containerColor = ForgeBg,
        bottomBar = {
            NavigationBar(containerColor = ForgeSurface) {
                val items = listOf("Models" to Icons.Filled.Search, "Quant" to Icons.Filled.Build, "Pack" to Icons.Filled.Build, "Push" to Icons.Filled.Send, "Train" to Icons.Filled.Info)
                items.forEachIndexed { index, item ->
                    NavigationBarItem(
                        selected = tab == index,
                        onClick = { tab = index },
                        icon = { Icon(item.second, contentDescription = item.first) },
                        label = { Text(item.first, fontSize = 11.sp) },
                    )
                }
            }
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .background(ForgeBg)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("DROP FORGE", color = ForgeBrass, fontFamily = FontFamily.Monospace, fontSize = 12.sp)
            if (state.busy != null) {
                Text(state.busy ?: "", color = ForgeFg)
                LinearProgressIndicator(progress = { state.progress ?: 0f }, modifier = Modifier.fillMaxWidth(), color = ForgeBrass)
            }
            state.error?.let { Text(it, color = ForgeWarn) }
            state.note?.let { Text(it, color = ForgeMuted, fontSize = 13.sp) }
            when (tab) {
                0 -> ModelsTab(onRun = { ensureNotif() })
                1 -> QuantTab(onRun = { ensureNotif(); Jobs.quantize() })
                2 -> PackTab(onRun = { ensureNotif() })
                3 -> PushTab(onGrant = { tree.launch(null) }, onRun = { ensureNotif() })
                else -> TrainTab()
            }
        }
    }
}

@Composable
private fun ModelsTab(onRun: () -> Unit) {
    val state by Jobs.ui.collectAsState()
    var query by remember { mutableStateOf("") }
    var bucket by remember { mutableStateOf("fits") }
    var kind by remember { mutableStateOf("gguf") }
    var token by remember { mutableStateOf(Jobs.token()) }
    Text("Hub", color = ForgeFg, fontSize = 24.sp)
    Text("Search runs on the phone. The GGUF is written into app-private storage. Nothing else leaves the device.", color = ForgeMuted, fontSize = 14.sp)
    Text(
        "${if (state.board == "cm5") "CM5" else "Pi 5"} · ${state.piRamGiB} GB · ${state.os} · ${QuantMath.formatBytes(Fit.usable(state.piRamGiB, state.os))} free",
        color = ForgeBrass,
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
    )
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = state.board == "pi5", onClick = { Jobs.setRig(board = "pi5") }, label = { Text("Pi 5") })
        FilterChip(selected = state.board == "cm5", onClick = { Jobs.setRig(board = "cm5") }, label = { Text("CM5") })
        Fit.rams(state.board).forEach { ram ->
            FilterChip(selected = state.piRamGiB == ram, onClick = { Jobs.setRig(ram = ram) }, label = { Text("$ram GB") })
        }
    }
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = state.os == "bookworm", onClick = { Jobs.setRig(os = "bookworm") }, label = { Text("Bookworm") })
        FilterChip(selected = state.os == "trixie", onClick = { Jobs.setRig(os = "trixie") }, label = { Text("Trixie") })
        listOf("chat" to "Chat", "code" to "Code", "notes" to "Notes", "always" to "Always-on").forEach { (id, label) ->
            FilterChip(selected = state.useCase == id, onClick = { Jobs.setRig(use = id) }, label = { Text(label) })
        }
    }
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = state.guard == "uncensored", onClick = { Jobs.setRig(guard = "uncensored") }, label = { Text("Uncensored") })
        FilterChip(selected = state.guard == "reduced", onClick = { Jobs.setRig(guard = "reduced") }, label = { Text("Reduced") })
        FilterChip(selected = state.guard == "any", onClick = { Jobs.setRig(guard = "any") }, label = { Text("Any") })
    }
    Text("Uncensored matches the repo name (abliterated, heretic, uncensored). It does not read the weights.", color = ForgeMuted, fontSize = 12.sp)
    OutlinedTextField(query, { query = it }, label = { Text("Search") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(token, { token = it; Jobs.setToken(it) }, label = { Text("HF token, gated repos only") }, modifier = Modifier.fillMaxWidth())
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("fits" to "Fits rig", "sub1" to "Under 1B", "1-4" to "1–4B", "any" to "Any").forEach { (id, label) ->
            FilterChip(selected = bucket == id, onClick = { bucket = id }, label = { Text(label) })
        }
        FilterChip(selected = kind == "gguf", onClick = { kind = "gguf" }, label = { Text("GGUF") })
        FilterChip(selected = kind == "safetensors", onClick = { kind = "safetensors" }, label = { Text("Safetensors") })
    }
    Button(onClick = { onRun(); Jobs.search(query, bucket, "", kind) }, colors = ButtonDefaults.buttonColors(containerColor = ForgeBrass, contentColor = ForgeInk)) {
        Text("Search")
    }
    state.models.forEach { model ->
        val plan = Fit.recommend(model.params, null, kind, "F16", state.piRamGiB, state.os, state.useCase)
        val guard = Fit.guardOf(model.id)
        Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            Text(model.id, color = ForgeFg)
            Text(
                "${guard} · ${model.license ?: "license ?"} · ${model.downloads} downloads${if (model.gated) " · gated" else ""}",
                color = if (guard == "uncensored") ForgeBrass else ForgeMuted,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
            )
            if (plan != null) {
                Text(
                    "${plan.verdict} · ${plan.quant} · ${QuantMath.formatBytes(plan.modelBytes)} · ~${plan.tps.toInt()} t/s",
                    color = if (plan.verdict == "no") ForgeWarn else ForgeFg,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                )
            }
            OutlinedButton(onClick = { Jobs.list(model.id) }) { Text("Files") }
            if (state.openRepo == model.id) {
                state.remoteFiles.filter { it.kind == kind }.forEach { file ->
                    val filePlan = Fit.score(model.params, file.bytes, file.kind, QuantMath.detect(file.path), "keep", state.piRamGiB, state.os, state.useCase, Fit.useCtx(state.useCase))
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(file.path, color = ForgeFg, fontSize = 13.sp)
                            Text(
                                "${QuantMath.formatBytes(file.bytes)}${filePlan?.let { " · ${it.verdict} · ~${it.tps.toInt()} t/s" } ?: ""}",
                                color = ForgeMuted,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                            )
                        }
                        Button(
                            onClick = { onRun(); Jobs.download(model.id, file, model.license, model.params, model.gated) },
                            enabled = !model.gated,
                            colors = ButtonDefaults.buttonColors(containerColor = ForgeSurface, contentColor = ForgeFg),
                        ) { Text("Save") }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuantTab(onRun: () -> Unit) {
    val state by Jobs.ui.collectAsState()
    val file = state.files.find { it.id == state.selectedId }
    Text("Quantize", color = ForgeFg, fontSize = 24.sp)
    Text("llama-quantize, 4 threads, Tensor G4 big cores. If Android blocks exec, Termux runs the same binary.", color = ForgeMuted, fontSize = 14.sp)
    if (file == null) {
        Text("Stage a file first.", color = ForgeMuted)
        return
    }
    Text(file.path, color = ForgeFg)
    Text("${QuantMath.formatBytes(file.bytes)} · ${file.detectedQuant ?: file.kind}", color = ForgeMuted, fontFamily = FontFamily.Monospace)
    QuantMath.quants.forEach { q ->
        FilterChip(selected = state.quant == q.id, onClick = { Jobs.setQuant(q.id) }, label = { Text("${q.id}  ${q.bpw}") })
        Text(q.blurb, color = ForgeMuted, fontSize = 13.sp)
    }
    val detected = file.detectedQuant
    val src = QuantMath.sourceBpw(file.kind, detected)
    val dst = QuantMath.byId(state.quant)
    if (src != null && dst != null && QuantMath.quantizable(detected) && file.kind == "gguf") {
        val out = QuantMath.outputBytes(file.bytes, src, dst.bpw)
        val peak = QuantMath.peakRam(file.bytes, out)
        Text("Before ${QuantMath.formatBytes(file.bytes)}", color = ForgeFg, fontFamily = FontFamily.Monospace)
        Text("After  ${QuantMath.formatBytes(out)} estimate", color = ForgeFg, fontFamily = FontFamily.Monospace)
        Text("RAM    ${QuantMath.formatBytes(peak)}", color = ForgeFg, fontFamily = FontFamily.Monospace)
    }
    Button(onClick = onRun, colors = ButtonDefaults.buttonColors(containerColor = ForgeBrass, contentColor = ForgeInk)) { Text("Run quantize") }
    if (state.log.isNotEmpty()) {
        Text(state.log.takeLast(12).joinToString("\n"), color = ForgeFg, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
    }
}

@Composable
private fun PackTab(onRun: () -> Unit) {
    val state by Jobs.ui.collectAsState()
    var embed by remember { mutableStateOf(true) }
    Text("Pack", color = ForgeFg, fontSize = 24.sp)
    Text("Tarball for Raspberry Pi OS Bookworm or Trixie, Pi 5 or CM5. The GGUF in private storage is packed in. install.sh compiles llama.cpp on the Pi if the Ubuntu binary's glibc is too new.", color = ForgeMuted, fontSize = 14.sp)
    state.files.filter { it.kind == "gguf" }.forEach { file ->
        FilterChip(selected = state.selectedId == file.id, onClick = { Jobs.select(file.id) }, label = { Text(file.path.substringAfterLast('/')) })
    }
    FilterChip(selected = embed, onClick = { embed = !embed }, label = { Text(if (embed) "Embed llama-server" else "Download llama-server on the Pi") })
    Button(onClick = { onRun(); Jobs.pack(embed) }, colors = ButtonDefaults.buttonColors(containerColor = ForgeBrass, contentColor = ForgeInk)) { Text("Build tarball") }
    Text("On the Pi: tar -xf dropforge-kit.tar && sudo sh dropforge-kit/install.sh", color = ForgeFg, fontFamily = FontFamily.Monospace, fontSize = 12.sp)
}

@Composable
private fun PushTab(onGrant: () -> Unit, onRun: () -> Unit) {
    val state by Jobs.ui.collectAsState()
    var host by remember { mutableStateOf("") }
    var user by remember { mutableStateOf("pi") }
    var port by remember { mutableStateOf("22") }
    var secret by remember { mutableStateOf("") }
    var useKey by remember { mutableStateOf(true) }
    val context = LocalContext.current
    val keyPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            context.contentResolver.openInputStream(uri)?.use { secret = it.readBytes().decodeToString() }
        }
    }
    Text("Push", color = ForgeFg, fontSize = 24.sp)
    Text("SSH from this phone. Host key is pinned. Password is not saved.", color = ForgeMuted, fontSize = 14.sp)
    OutlinedTextField(host, { host = it }, label = { Text("Pi IP") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(user, { user = it }, label = { Text("User") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(port, { port = it }, label = { Text("Port") }, modifier = Modifier.fillMaxWidth())
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = useKey, onClick = { useKey = true }, label = { Text("Key") })
        FilterChip(selected = !useKey, onClick = { useKey = false }, label = { Text("Password") })
    }
    if (useKey) {
        OutlinedButton(onClick = { keyPicker.launch(arrayOf("*/*")) }) { Text("Import private key") }
        if (secret.contains("PRIVATE KEY")) Text("Key loaded. Not written unless you leave this screen; it stays in memory.", color = ForgeMuted, fontSize = 12.sp)
    } else {
        OutlinedTextField(secret, { secret = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth())
    }
    state.pendingFingerprint?.let {
        Text(it, color = ForgeBrass, fontFamily = FontFamily.Monospace, fontSize = 12.sp)
        Button(onClick = { Jobs.rememberFingerprint(host); onRun(); Jobs.push(host, port.toIntOrNull() ?: 22, user, if (useKey) null else secret, if (useKey) secret else null, true, it) }) {
            Text("Trust this key and push")
        }
    }
    Button(
        onClick = {
            onRun()
            Jobs.push(host, port.toIntOrNull() ?: 22, user, if (useKey) null else secret, if (useKey) secret.ifBlank { null } else null, true, state.pendingFingerprint)
        },
        colors = ButtonDefaults.buttonColors(containerColor = ForgeBrass, contentColor = ForgeInk),
    ) { Text("SCP and install") }
    OutlinedButton(onClick = onGrant) { Text("Grant Termux shared folder") }
}

@Composable
private fun TrainTab() {
    var model by remember { mutableStateOf("") }
    var params by remember { mutableStateOf("") }
    var sample by remember { mutableStateOf("{\"text\": \"hello\"}") }
    var result by remember { mutableStateOf("") }
    Text("Train", color = ForgeFg, fontSize = 24.sp)
    Text("experimental", color = ForgeWarn, fontFamily = FontFamily.Monospace)
    Text(
        "Full training does not fit a Tensor G4. AdamW is about 8 bytes of optimizer state per parameter before gradients and activations. A 1B model is already ~12 GB. This phone has 16 GB, no CUDA, and will thermal-throttle a backward pass. The NPU is not open for this. Nothing is sent to a cloud trainer.",
        color = ForgeFg,
        fontSize = 14.sp,
    )
    OutlinedTextField(model, { model = it }, label = { Text("Base model") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(params, { params = it }, label = { Text("Parameter count") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(sample, { sample = it }, label = { Text("jsonl") }, modifier = Modifier.fillMaxWidth())
    val n = params.toLongOrNull()
    val gate = when {
        n == null -> "Parameter count unknown. On-device gate stays shut."
        n >= 1_000_000_000L -> "At or above 1B. Refused on this phone."
        else -> "Under 1B. A rank-8 LoRA is a GPU-box job. Still not started here."
    }
    Text(gate, color = if (n != null && n < 1_000_000_000L) ForgeFg else ForgeWarn)
    OutlinedButton(onClick = {
        val rows = sample.lines().count { it.isNotBlank() }
        result = "$rows jsonl rows. No optimizer. Model $model."
    }) { Text("Check dataset") }
    if (result.isNotEmpty()) Text(result, color = ForgeFg, fontSize = 13.sp)
}
