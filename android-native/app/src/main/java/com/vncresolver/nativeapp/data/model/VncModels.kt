package com.vncresolver.nativeapp.data.model

import com.google.gson.annotations.SerializedName

data class VncRecord(
    val id: Long,
    @SerializedName("ip_address") val ipAddress: String,
    val port: Int,
    @SerializedName("desktop_name") val desktopName: String?,
    @SerializedName("screen_width") val screenWidth: Int,
    @SerializedName("screen_height") val screenHeight: Int,
    val security: String?,
    val country: String?,
    @SerializedName("country_name") val countryName: String?,
    val city: String?,
    val asn: Long?,
    @SerializedName("as_organization") val asOrganization: String?,
    val latitude: Double?,
    val longitude: Double?,
    val timestamp: String?,
    @SerializedName("image_url") val imageUrl: String? = null
)

data class SearchResponse(
    val results: List<VncRecord>,
    val total: Int? = null,
    val query: String? = null
)

data class StatsResponse(
    @SerializedName("total_records") val totalRecords: Long,
    @SerializedName("top_countries") val topCountries: Map<String, Long>?,
    @SerializedName("top_ports") val topPorts: Map<String, Long>?,
    @SerializedName("security_types") val securityTypes: Map<String, Long>?
)

data class LiveCheckResult(
    val status: String,
    val tcpConnected: Boolean,
    val rfbHandshake: Boolean,
    val banner: String? = null,
    val latencyMs: Long? = null,
    val error: String? = null
)
