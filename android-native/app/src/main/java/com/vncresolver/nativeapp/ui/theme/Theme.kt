package com.vncresolver.nativeapp.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DarkZinc950 = Color(0xFF09090B)
val DarkZinc900 = Color(0xFF18181B)
val DarkZinc800 = Color(0xFF27272A)
val CyanAccent = Color(0xFF06B6D4)
val CyanDark = Color(0xFF0891B2)
val EmeraldAccent = Color(0xFF10B981)
val TextPrimary = Color(0xFFF4F4F5)
val TextSecondary = Color(0xFFA1A1AA)

private val ColorScheme = darkColorScheme(
    primary = CyanAccent,
    secondary = EmeraldAccent,
    background = DarkZinc950,
    surface = DarkZinc900,
    onPrimary = Color.Black,
    onBackground = TextPrimary,
    onSurface = TextPrimary
)

@Composable
fun VncResolverTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ColorScheme,
        content = content
    )
}
