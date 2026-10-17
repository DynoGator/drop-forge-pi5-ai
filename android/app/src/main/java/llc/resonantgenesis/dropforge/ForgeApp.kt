package llc.resonantgenesis.dropforge

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class ForgeApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel(CHANNEL, "Drop Forge jobs", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Downloads, quantize, and the push to the Pi"
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL = "dropforge"
    }
}
