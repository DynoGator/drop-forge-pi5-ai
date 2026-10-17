package llc.resonantgenesis.dropforge.net

import llc.resonantgenesis.dropforge.data.Fit
import llc.resonantgenesis.dropforge.data.ModelHit
import llc.resonantgenesis.dropforge.data.RemoteFile
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class HfClient(private val token: String = "") {
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .build()

    private fun request(url: String): Request.Builder {
        val b = Request.Builder().url(url).header("User-Agent", "DropForge/1.0")
        if (token.startsWith("hf_")) b.header("Authorization", "Bearer $token")
        return b
    }

    fun search(query: String, bucket: String, license: String, kind: String, guard: String, ramGiB: Int, os: String, use: String): List<ModelHit> {
        val cap = if (bucket == "fits") Fit.hfCap(Fit.maxParams(ramGiB, os, use)) else ""
        val seen = linkedSetOf<String>()
        val out = mutableListOf<ModelHit>()
        for (q in Fit.queries(query, guard)) {
            for (hit in oneSearch(q, bucket, license, kind, cap)) {
                if (!seen.add(hit.id)) continue
                val g = Fit.guardOf(hit.id)
                if (!Fit.passes(guard, g)) continue
                val capParams = when (bucket) {
                    "fits" -> Fit.maxParams(ramGiB, os, use)
                    "sub1" -> 1_000_000_000L
                    "1-4" -> 4_000_000_000L
                    "4-8" -> 8_000_000_000L
                    "8-14" -> 14_000_000_000L
                    else -> 0L
                }
                val params = hit.params
                if (capParams > 0 && params != null && params > (capParams * 1.05).toLong()) continue
                out += hit
            }
        }
        return out.sortedWith(compareBy<ModelHit> {
            when (Fit.guardOf(it.id)) {
                "uncensored" -> 0
                "reduced" -> 1
                else -> 2
            }
        }.thenByDescending { it.downloads })
    }

    private fun oneSearch(query: String, bucket: String, license: String, kind: String, cap: String): List<ModelHit> {
        val url = buildString {
            append("https://huggingface.co/api/models?limit=20&sort=downloads&direction=-1&full=true")
            append("&pipeline_tag=text-generation")
            append("&filter=").append(kind)
            if (query.isNotBlank()) append("&search=").append(java.net.URLEncoder.encode(query, "UTF-8"))
            if (license.isNotBlank()) append("&filter=license:").append(license)
            val num = when {
                cap.isNotEmpty() -> cap
                bucket == "sub1" -> "min:0,max:1B"
                bucket == "1-4" -> "min:1B,max:4B"
                bucket == "4-8" -> "min:4B,max:8B"
                bucket == "8-14" -> "min:8B,max:14B"
                else -> ""
            }
            if (num.isNotEmpty()) append("&num_parameters=").append(num)
        }
        val body = get(url)
        val arr = JSONArray(body)
        return buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val id = o.optString("id")
                if (!id.contains("/")) continue
                val tags = o.optJSONArray("tags")
                var lic: String? = null
                if (tags != null) {
                    for (t in 0 until tags.length()) {
                        val tag = tags.getString(t)
                        if (tag.startsWith("license:")) lic = tag.removePrefix("license:")
                    }
                }
                val gated = when (val g = o.opt("gated")) {
                    is Boolean -> g
                    is String -> g.isNotEmpty()
                    else -> false
                }
                val params = o.optJSONObject("safetensors")?.optLong("total")?.takeIf { it > 0 }
                    ?: paramsFromName(id)
                add(
                    ModelHit(
                        id = id,
                        downloads = o.optLong("downloads"),
                        license = lic,
                        params = params,
                        gated = gated,
                        pipeline = o.optString("pipeline_tag").ifBlank { null },
                    ),
                )
            }
        }
    }

    fun files(repo: String): List<RemoteFile> {
        val url = "https://huggingface.co/api/models/${encPath(repo)}/tree/main?recursive=1"
        val arr = JSONArray(get(url))
        return buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val path = o.optString("path")
                val kind = when {
                    path.endsWith(".gguf", true) -> "gguf"
                    path.endsWith(".safetensors", true) -> "safetensors"
                    else -> null
                } ?: continue
                add(RemoteFile(path, o.optLong("size"), kind))
            }
        }.sortedBy { it.bytes }
    }

    fun download(repo: String, path: String, dest: File, onProgress: (Long, Long) -> Unit) {
        dest.parentFile?.mkdirs()
        val url = "https://huggingface.co/${encPath(repo)}/resolve/main/${encPath(path)}"
        val call = http.newCall(request(url).build())
        val response = call.execute()
        if (!response.isSuccessful) {
            response.close()
            error("Download failed: HTTP ${response.code}")
        }
        val body = response.body ?: error("Empty download")
        val total = body.contentLength()
        body.byteStream().use { input ->
            dest.outputStream().use { output ->
                val buf = ByteArray(1024 * 256)
                var readTotal = 0L
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    output.write(buf, 0, n)
                    readTotal += n
                    onProgress(readTotal, total)
                }
            }
        }
    }

    fun fetchBytes(url: String, dest: File, onProgress: (Long, Long) -> Unit) {
        dest.parentFile?.mkdirs()
        val response = http.newCall(Request.Builder().url(url).header("User-Agent", "DropForge/1.0").build()).execute()
        if (!response.isSuccessful) {
            response.close()
            error("Fetch failed: HTTP ${response.code}")
        }
        val body = response.body ?: error("Empty fetch")
        val total = body.contentLength()
        body.byteStream().use { input ->
            dest.outputStream().use { output ->
                val buf = ByteArray(1024 * 256)
                var got = 0L
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    output.write(buf, 0, n)
                    got += n
                    onProgress(got, total)
                }
            }
        }
    }

    private fun get(url: String): String {
        val response = http.newCall(request(url).build()).execute()
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) error("Hugging Face HTTP ${response.code}: ${text.take(180)}")
        return text
    }

    private fun encPath(path: String) = path.split("/").joinToString("/") { java.net.URLEncoder.encode(it, "UTF-8") }

    private fun paramsFromName(id: String): Long? {
        val m = Regex("(\\d+(?:\\.\\d+)?)\\s*[Bb]\\b").find(id) ?: return null
        return (m.groupValues[1].toDouble() * 1_000_000_000.0).toLong()
    }
}

fun JSONObject.optLongSafe(name: String): Long = if (has(name)) optLong(name) else 0L
