package llc.resonantgenesis.dropforge.work

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object Offload {
    private val http = OkHttpClient.Builder().callTimeout(45, TimeUnit.SECONDS).build()

    suspend fun run(key: String, model: String, params: Long?, sample: String): String = withContext(Dispatchers.IO) {
        if (key.isBlank()) error("Paste a remote API key. It is stored with the keystore, not in the APK.")
        val clipped = sample.take(3500)
        val prompt = buildString {
            append("Pixel 9 Pro XL, 16 GB, no CUDA. LoRA plan only. Do not claim the phone trained anything.\n")
            append("Model: $model parameters=${params ?: "unknown"}\n")
            append("Sample jsonl:\n")
            append(clipped)
            append("\nHeadings: Verdict, LoRA config, Unsloth snippet. Under 450 words.")
        }
        val payload = JSONObject()
            .put("model", "grok-4.5")
            .put("max_tokens", 700)
            .put("temperature", 0.2)
            .put("messages", org.json.JSONArray().put(JSONObject().put("role", "user").put("content", prompt)))
        val body = payload.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("https://api.x.ai/v1/chat/completions")
            .header("Authorization", "Bearer $key")
            .post(body)
            .build()
        val response = http.newCall(request).execute()
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) error("Remote API HTTP ${response.code}")
        val json = JSONObject(text)
        json.optJSONArray("choices")
            ?.optJSONObject(0)
            ?.optJSONObject("message")
            ?.optString("content")
            ?.ifBlank { null }
            ?: error("Empty remote plan")
    }
}
