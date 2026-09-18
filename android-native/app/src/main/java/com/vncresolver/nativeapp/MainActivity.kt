package com.vncresolver.nativeapp

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vncresolver.nativeapp.ui.screens.HomeScreen
import com.vncresolver.nativeapp.ui.theme.VncResolverTheme
import com.vncresolver.nativeapp.ui.viewmodel.VncViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VncResolverTheme {
                val viewModel: VncViewModel = viewModel()
                HomeScreen(
                    viewModel = viewModel,
                    onRecordClick = { record ->
                        // Copy VNC connection string to clipboard
                        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("VNC Endpoint", "${record.ipAddress}:${record.port}")
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(this, "Copied ${record.ipAddress}:${record.port}", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }
}
