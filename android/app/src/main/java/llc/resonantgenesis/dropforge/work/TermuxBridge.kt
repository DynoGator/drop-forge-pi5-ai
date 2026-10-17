package llc.resonantgenesis.dropforge.work

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.MediaStore

object TermuxBridge {
    fun installed(context: Context): Boolean = try {
        context.packageManager.getPackageInfo("com.termux", 0)
        true
    } catch (_: Exception) {
        false
    }

    fun writeScript(context: Context, name: String, script: String): String {
        if (Build.VERSION.SDK_INT < 29) {
            val dir = context.getExternalFilesDir("DropForge") ?: context.filesDir
            dir.mkdirs()
            val file = dir.resolve(name)
            file.writeText(script)
            return file.absolutePath
        }
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, name)
            put(MediaStore.Downloads.MIME_TYPE, "text/x-shellscript")
            put(MediaStore.Downloads.RELATIVE_PATH, "Download/DropForge")
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: return "Could not write Download/DropForge/$name"
        context.contentResolver.openOutputStream(uri)?.use { it.write(script.encodeToByteArray()) }
        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        context.contentResolver.update(uri, values, null, null)
        return "Download/DropForge/$name"
    }

    /** Termux must have this app toggled under Allow external apps. No root. */
    fun run(context: Context, script: String): String {
        val intent = Intent("com.termux.RUN_COMMAND").apply {
            setClassName("com.termux", "com.termux.app.RunCommandService")
            putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash")
            putExtra("com.termux.RUN_COMMAND_ARGUMENTS", arrayOf("-lc", script))
            putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home")
            putExtra("com.termux.RUN_COMMAND_BACKGROUND", false)
        }
        return try {
            context.startService(intent)
            "Handed to Termux. If nothing happens, open Termux → Settings → Allow external apps, and grant Drop Forge the run-command permission."
        } catch (err: Exception) {
            "Termux refused the intent (${err.message}). The script is still in Download/DropForge. Run it by hand."
        }
    }

    fun quantizeScript(src: String, dst: String, quant: String, imatrix: String?): String {
        val im = if (imatrix.isNullOrBlank()) "" else "--imatrix ${shellQuote(imatrix)} "
        return """
            set -eu
            TAG=b11706
            ROOT="${'$'}HOME/dropforge-llama"
            mkdir -p "${'$'}ROOT"
            if [ ! -x "${'$'}ROOT/llama-quantize" ]; then
              curl -fL --retry 3 -o "${'$'}ROOT/android.tar.gz" \
                "https://github.com/ggml-org/llama.cpp/releases/download/${'$'}TAG/llama-${'$'}TAG-bin-android-arm64.tar.gz"
              tar -xzf "${'$'}ROOT/android.tar.gz" -C "${'$'}ROOT" --strip-components=1
              chmod -R a+rX "${'$'}ROOT" || true
            fi
            export LD_LIBRARY_PATH="${'$'}ROOT"
            export OMP_NUM_THREADS=4
            "${'$'}ROOT/llama-quantize" -t 4 $im${shellQuote(src)} ${shellQuote(dst)} ${shellQuote(quant)}
        """.trimIndent()
    }

    private fun shellQuote(value: String) = "'" + value.replace("'", "'\\''") + "'"
}
