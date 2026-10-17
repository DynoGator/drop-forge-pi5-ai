package llc.resonantgenesis.dropforge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import llc.resonantgenesis.dropforge.ui.DropForgeTheme
import llc.resonantgenesis.dropforge.ui.DropForgeApp
import llc.resonantgenesis.dropforge.work.Jobs

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Jobs.attach(applicationContext)
        enableEdgeToEdge()
        setContent {
            DropForgeTheme {
                DropForgeApp()
            }
        }
    }
}
