package com.vncresolver.nativeapp.data.repository

import com.vncresolver.nativeapp.data.api.VncApiService
import com.vncresolver.nativeapp.data.model.SearchResponse
import com.vncresolver.nativeapp.data.model.StatsResponse
import com.vncresolver.nativeapp.data.model.VncRecord
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.InetSocketAddress
import java.net.Socket

class VncRepository(private val apiService: VncApiService = VncApiService.create()) {

    suspend fun search(desktop: String?, country: String?, asn: String?): Result<SearchResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                apiService.search(
                    desktopName = desktop?.takeIf { it.isNotBlank() },
                    country = country?.takeIf { it.isNotBlank() }?.uppercase(),
                    asn = asn?.takeIf { it.isNotBlank() }
                )
            }
        }

    suspend fun getRandom(): Result<VncRecord> = withContext(Dispatchers.IO) {
        runCatching { apiService.getRandom() }
    }

    suspend fun getById(id: Long): Result<VncRecord> = withContext(Dispatchers.IO) {
        runCatching { apiService.getById(id) }
    }

    suspend fun getStats(): Result<StatsResponse> = withContext(Dispatchers.IO) {
        runCatching { apiService.getStats() }
    }

    /**
     * Native TCP probe to test if VNC port is live and responds with RFB banner
     */
    suspend fun probeVnc(ip: String, port: Int, timeoutMs: Int = 3000): Result<Pair<Boolean, String?>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val socket = Socket()
                val startTime = System.currentTimeMillis()
                socket.connect(InetSocketAddress(ip, port), timeoutMs)
                socket.soTimeout = timeoutMs

                val buffer = ByteArray(64)
                val bytesRead = socket.getInputStream().read(buffer)
                val banner = if (bytesRead > 0) String(buffer, 0, bytesRead).trim() else null
                socket.close()

                val isRfb = banner?.startsWith("RFB ") == true
                Pair(isRfb, banner)
            }
        }
}
