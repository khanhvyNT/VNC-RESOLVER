package com.vncresolver.nativeapp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vncresolver.nativeapp.data.model.StatsResponse
import com.vncresolver.nativeapp.data.model.VncRecord
import com.vncresolver.nativeapp.data.repository.VncRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VncUiState(
    val isLoading: Boolean = false,
    val results: List<VncRecord> = emptyList(),
    val randomRecord: VncRecord? = null,
    val stats: StatsResponse? = null,
    val errorMessage: String? = null,
    val probeStatus: Map<Long, Pair<Boolean, String?>> = emptyMap()
)

class VncViewModel(private val repository: VncRepository = VncRepository()) : ViewModel() {

    private val _uiState = MutableStateFlow(VncUiState())
    val uiState: StateFlow<VncUiState> = _uiState.asStateFlow()

    init {
        loadStats()
    }

    fun search(desktop: String?, country: String?, asn: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            repository.search(desktop, country, asn).fold(
                onSuccess = { response ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        results = response.results
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Search failed"
                    )
                }
            )
        }
    }

    fun getRandom() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            repository.getRandom().fold(
                onSuccess = { record ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        randomRecord = record,
                        results = listOf(record)
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Failed to get random record"
                    )
                }
            )
        }
    }

    fun probeServer(id: Long, ip: String, port: Int) {
        viewModelScope.launch {
            repository.probeVnc(ip, port).fold(
                onSuccess = { (isRfb, banner) ->
                    val updated = _uiState.value.probeStatus.toMutableMap()
                    updated[id] = Pair(isRfb, banner)
                    _uiState.value = _uiState.value.copy(probeStatus = updated)
                },
                onFailure = {
                    val updated = _uiState.value.probeStatus.toMutableMap()
                    updated[id] = Pair(false, "Connection error")
                    _uiState.value = _uiState.value.copy(probeStatus = updated)
                }
            )
        }
    }

    fun loadStats() {
        viewModelScope.launch {
            repository.getStats().onSuccess { stats ->
                _uiState.value = _uiState.value.copy(stats = stats)
            }
        }
    }
}
