package com.vncresolver.nativeapp.data.api

import com.vncresolver.nativeapp.data.model.SearchResponse
import com.vncresolver.nativeapp.data.model.StatsResponse
import com.vncresolver.nativeapp.data.model.VncRecord
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface VncApiService {

    @GET("api/v1/search")
    suspend fun search(
        @Query("desktop_name") desktopName: String? = null,
        @Query("country") country: String? = null,
        @Query("asn") asn: String? = null,
        @Query("full") full: Boolean = true
    ): SearchResponse

    @GET("api/v1/random")
    suspend fun getRandom(): VncRecord

    @GET("api/v1/id/{id}")
    suspend fun getById(@Path("id") id: Long): VncRecord

    @GET("api/v1/stats")
    suspend fun getStats(): StatsResponse

    companion object {
        private const val BASE_URL = "https://computernewb.com/vncresolver/"

        fun create(): VncApiService {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .build()

            return Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(VncApiService::class.java)
        }
    }
}
