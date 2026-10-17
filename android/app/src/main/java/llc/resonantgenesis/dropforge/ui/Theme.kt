package llc.resonantgenesis.dropforge.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily

val ForgeBg = Color(0xFF141311)
val ForgeSurface = Color(0xFF211F1B)
val ForgeFg = Color(0xFFF2ECE3)
val ForgeMuted = Color(0xFF9C9488)
val ForgeBrass = Color(0xFFE39A3C)
val ForgeInk = Color(0xFF1A1206)
val ForgeLine = Color(0xFF3A362E)
val ForgeWarn = Color(0xFFC45C3E)

private val scheme = darkColorScheme(
    background = ForgeBg,
    surface = ForgeSurface,
    surfaceVariant = Color(0xFF2C2923),
    primary = ForgeBrass,
    onPrimary = ForgeInk,
    onBackground = ForgeFg,
    onSurface = ForgeFg,
    onSurfaceVariant = ForgeMuted,
    outline = ForgeLine,
    error = ForgeWarn,
    onError = ForgeFg,
)

val Mono = FontFamily.Monospace

@Composable
fun DropForgeTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = scheme, content = content)
}
