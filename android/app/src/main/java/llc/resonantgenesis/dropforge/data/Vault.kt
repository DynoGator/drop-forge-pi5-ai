package llc.resonantgenesis.dropforge.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** HF token and pinned Pi host keys. Passwords are never written. */
class Vault(context: Context) {
    private val prefs: SharedPreferences = open(context)

    var hfToken: String
        get() = prefs.getString("hf", "") ?: ""
        set(value) { prefs.edit().putString("hf", value.trim()).apply() }

    fun pin(host: String, fingerprint: String) {
        prefs.edit().putString("pin:$host", fingerprint).apply()
    }

    fun pinFor(host: String): String? = prefs.getString("pin:$host", null)

    var savedKey: String
        get() = prefs.getString("key", "") ?: ""
        set(value) { prefs.edit().putString("key", value).apply() }

    var apiKey: String
        get() = prefs.getString("api", "") ?: ""
        set(value) { prefs.edit().putString("api", value.trim()).apply() }

    companion object {
        private fun open(context: Context): SharedPreferences {
            return try {
                val master = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
                EncryptedSharedPreferences.create(
                    context,
                    "dropforge-vault",
                    master,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
                )
            } catch (_: Exception) {
                context.getSharedPreferences("dropforge-vault-plain", Context.MODE_PRIVATE)
            }
        }
    }
}
