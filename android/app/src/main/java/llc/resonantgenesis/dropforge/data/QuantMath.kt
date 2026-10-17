package llc.resonantgenesis.dropforge.data

/** Keep the bpw table in sync with src/lib/quants.ts in the console. */
object QuantMath {
    val quants = listOf(
        Quant("Q4_K_M", 4.85, "Default for a Pi 5.", false),
        Quant("Q5_K_M", 5.69, "Cleaner than Q4. 7B still fits an 8 GB Pi if you are careful.", false),
        Quant("Q8_0", 8.50, "Near F16. 8B-class wants a 16 GB Pi.", false),
        Quant("IQ3_XS", 3.30, "3-bit. Bring an imatrix or quality falls off.", true),
        Quant("IQ2_M", 2.70, "Aggressive. Only when Q4 will not fit.", true),
    )

    private val extra = mapOf(
        "Q6_K" to 6.56, "Q5_K_S" to 5.54, "Q5_0" to 5.5, "Q4_K_S" to 4.58,
        "Q4_0" to 4.5, "Q3_K_M" to 3.91, "Q2_K" to 3.35,
    )

    fun byId(id: String) = quants.find { it.id == id }

    fun detect(filename: String): String? {
        val base = filename.substringAfterLast('/').uppercase()
        val order = listOf(
            "IQ3_XS", "IQ2_XXS", "IQ2_XS", "IQ2_M", "Q8_0", "Q6_K", "Q5_K_M", "Q5_K_S",
            "Q5_0", "Q4_K_M", "Q4_K_S", "Q4_0", "Q3_K_M", "Q2_K", "BF16", "FP16", "F16", "F32",
        )
        return order.firstOrNull { q ->
            val token = q.replace("_", "[_-]?")
            Regex("(?:^|[^A-Z0-9])$token(?:[^A-Z0-9]|$)").containsMatchIn(base)
        }?.let { if (it == "FP16") "F16" else it }
    }

    fun sourceBpw(kind: String, quant: String?): Double? = when {
        kind == "safetensors" -> 16.0
        quant == null || quant == "F16" || quant == "BF16" -> 16.0
        quant == "F32" -> 32.0
        else -> byId(quant)?.bpw ?: extra[quant]
    }

    fun quantizable(detected: String?) = detected == null || detected == "F16" || detected == "BF16" || detected == "F32"

    fun outputBytes(input: Long, srcBpw: Double, dstBpw: Double): Long {
        val overhead = minOf(48L * 1024 * 1024, maxOf(8L * 1024 * 1024, (input * 0.04).toLong()))
        val weights = maxOf(input - overhead, (input * 0.8).toLong())
        return (weights.toDouble() * (dstBpw / srcBpw) + overhead).toLong()
    }

    fun peakRam(input: Long, output: Long): Long =
        (input.toDouble() * 1.05 + output.toDouble() * 0.15 + 640.0 * 1024 * 1024).toLong()

    fun inferenceRam(modelBytes: Long, params: Long?, ctx: Int): Long {
        val bytes = modelBytes.toDouble()
        val p = if (params != null && params > 0) params.toDouble() else {
            val overhead = minOf(48.0 * 1024 * 1024, bytes * 0.04)
            ((bytes - overhead) * 8.0 / 4.85).coerceAtLeast(0.0)
        }
        val kv = ctx * 140_000.0 * (p / 7e9)
        return (bytes * 1.1 + kv + 256.0 * 1024 * 1024).toLong()
    }

    fun formatBytes(n: Long): String {
        val units = arrayOf("B", "KB", "MB", "GB", "TB")
        var v = kotlin.math.abs(n.toDouble())
        var u = 0
        while (v >= 1024 && u < units.lastIndex) {
            v /= 1024
            u++
        }
        val digits = if (u == 0 || v >= 100) 0 else if (v >= 10) 1 else 2
        return "%.${digits}f %s".format(v, units[u])
    }
}

data class Quant(val id: String, val bpw: Double, val blurb: String, val imatrix: Boolean)
