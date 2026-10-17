package llc.resonantgenesis.dropforge.data

/** Keep the numbers in sync with src/lib/fit.ts. */
object Fit {
    const val threads = 4
    private const val scratch = 192L * 1024 * 1024
    private const val kernel = 192L * 1024 * 1024
    private const val quantBytesPerSec = 2.2e9

    private val strong = Regex("abliterat|uncensor|unfilter|de-?censor|heretic|no[-_ ]?guard|jailbreak", RegexOption.IGNORE_CASE)
    private val relaxed = Regex("dolphin|noromaid|openhermes|mythomax|wizardlm|nous-hermes|godzilla", RegexOption.IGNORE_CASE)

    fun guardOf(text: String): String = when {
        strong.containsMatchIn(text) -> "uncensored"
        relaxed.containsMatchIn(text) -> "reduced"
        else -> "standard"
    }

    fun passes(filter: String, kind: String) = when (filter) {
        "any" -> true
        "uncensored" -> kind == "uncensored"
        else -> kind == "uncensored" || kind == "reduced"
    }

    fun queries(q: String, filter: String): List<String> {
        val base = q.trim()
        return when (filter) {
            "any" -> listOf(base)
            "uncensored" -> if (base.isEmpty()) {
                listOf("abliterated", "uncensored", "heretic")
            } else {
                listOf("$base abliterated", "$base uncensored", "$base heretic")
            }
            else -> if (base.isEmpty()) {
                listOf("abliterated", "dolphin", "uncensored")
            } else {
                listOf(base, "$base abliterated", "$base dolphin")
            }
        }
    }

    fun rams(board: String) = if (board == "cm5") listOf(2, 4, 8, 16) else listOf(4, 8, 16)

    fun coerceRam(board: String, ram: Int) = rams(board).minBy { kotlin.math.abs(it - ram) }

    fun usable(ramGiB: Int, os: String): Long {
        val reserveGb = if (os == "trixie") 1.25 else 1.15
        return (ramGiB.toDouble() * 1024 * 1024 * 1024 - reserveGb * 1024 * 1024 * 1024 - kernel).toLong()
            .coerceAtLeast(256L * 1024 * 1024)
    }

    fun useCtx(use: String) = when (use) {
        "code" -> 8192
        "notes" -> 16384
        "always" -> 2048
        else -> 4096
    }

    fun minTps(use: String) = when (use) {
        "code" -> 8.0
        "notes" -> 6.0
        "always" -> 25.0
        else -> 12.0
    }

    fun quantizeSeconds(input: Long, output: Long) =
        ((input + output) / quantBytesPerSec).toInt().coerceAtLeast(8)

    data class Plan(
        val quant: String,
        val ctx: Int,
        val modelBytes: Long,
        val totalBytes: Long,
        val usableBytes: Long,
        val verdict: String,
        val tps: Double,
        val note: String,
    )

    fun recommend(params: Long?, bytes: Long?, kind: String, detected: String?, ramGiB: Int, os: String, use: String): Plan? {
        val order = when (use) {
            "code" -> listOf("Q5_K_M", "Q8_0", "Q4_K_M", "IQ3_XS", "IQ2_M")
            "notes" -> listOf("Q4_K_M", "Q5_K_M", "IQ3_XS", "IQ2_M", "Q8_0")
            "always" -> listOf("Q4_K_M", "IQ3_XS", "IQ2_M", "Q5_K_M", "Q8_0")
            else -> listOf("Q5_K_M", "Q4_K_M", "Q8_0", "IQ3_XS", "IQ2_M")
        }
        val keep = kind != "gguf" || !QuantMath.quantizable(detected)
        if (keep) return score(params, bytes, kind, detected, "keep", ramGiB, os, use, useCtx(use))
        var slow: Plan? = null
        var worst: Plan? = null
        for (quant in order) {
            val hit = score(params, bytes, kind, detected, quant, ramGiB, os, use, useCtx(use)) ?: continue
            if (worst == null) worst = hit
            if (hit.verdict == "no") continue
            if (use == "always" && hit.tps < minTps(use)) {
                if (slow == null) slow = hit
                continue
            }
            return hit
        }
        return slow ?: worst
    }

    fun score(
        params: Long?,
        bytes: Long?,
        kind: String,
        detected: String?,
        quant: String,
        ramGiB: Int,
        os: String,
        use: String,
        ctx: Int,
    ): Plan? {
        val budget = usable(ramGiB, os)
        val keep = kind != "gguf" || !QuantMath.quantizable(detected) || quant == "keep"
        val modelBytes: Long
        val paramCount: Double
        if (keep) {
            if (bytes == null || bytes <= 0) return null
            modelBytes = bytes
            val bpw = QuantMath.sourceBpw(kind, detected) ?: 4.85
            paramCount = if (params != null && params > 0) params.toDouble() else bytes * 8.0 / bpw
        } else {
            val dst = QuantMath.byId(quant) ?: return null
            val src = QuantMath.sourceBpw(kind, detected)
            if (bytes != null && bytes > 0 && src != null) {
                modelBytes = QuantMath.outputBytes(bytes, src, dst.bpw)
                paramCount = if (params != null && params > 0) params.toDouble() else bytes * 8.0 / src
            } else if (params != null && params > 0) {
                modelBytes = (params.toDouble() * dst.bpw / 8.0 + 12.0 * 1024 * 1024).toLong()
                paramCount = params.toDouble()
            } else return null
        }
        val kv = ctx * 140_000.0 * (paramCount / 7e9)
        val total = (modelBytes * 1.08 + kv + scratch).toLong()
        val verdict = when {
            total < budget * 0.72 -> "fits"
            total < budget * 0.92 -> "tight"
            else -> "no"
        }
        val gb = modelBytes / 1024.0 / 1024 / 1024
        var tps = if (gb > 0.05) 26.0 / gb else 0.0
        if (kv > modelBytes) tps *= 0.75
        tps = tps.coerceIn(1.5, 90.0)
        val label = if (keep) detected ?: "keep" else quant
        val note = when (verdict) {
            "no" -> "Over the RAM left after the desktop."
            "tight" -> "Fits, with little room left for a browser."
            else -> "Comfortable next to the desktop."
        }
        return Plan(label, ctx, modelBytes, total, budget, verdict, tps, note)
    }

    fun maxParams(ramGiB: Int, os: String, use: String): Long {
        val steps = listOf(0.3, 0.5, 0.8, 1.0, 1.5, 3.0, 4.0, 7.0, 8.0, 12.0, 14.0).map { (it * 1e9).toLong() }
        var best = steps.first()
        for (params in steps) {
            val hit = score(params, null, "gguf", "F16", "IQ2_M", ramGiB, os, use, useCtx(use))
            if (hit != null && hit.verdict != "no") best = params
        }
        return best
    }

    fun hfCap(params: Long): String {
        val b = params / 1e9
        return if (b >= 1) "min:0,max:${"%.1f".format(kotlin.math.ceil(b * 10) / 10)}B"
        else "min:0,max:${(params / 1_000_000).coerceAtLeast(50)}M"
    }
}
