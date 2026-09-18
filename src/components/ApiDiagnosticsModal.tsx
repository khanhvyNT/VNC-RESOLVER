import React, { useState, useEffect } from 'react';
import {
  Activity,
  X,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  HardDrive,
  Server,
  Globe,
  Check,
} from 'lucide-react';
import { ApiDiagnosticEntry } from '../types';
import { vncRepo, isNativeMobile } from '../services/apiClient';

interface ApiDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDiagnosticsModal: React.FC<ApiDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ApiDiagnosticEntry[]>([]);
  const [cacheStats, setCacheStats] = useState<{ size: number; keys: string[] }>({ size: 0, keys: [] });
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [serverSaved, setServerSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const savedUrl = localStorage.getItem('vnc_custom_server_url') || '';
    setCustomServerUrl(savedUrl);

    setCacheStats(vncRepo.getCacheStats());
    const unsubscribe = vncRepo.subscribeDiagnostics((newLogs) => {
      setLogs(newLogs);
      setCacheStats(vncRepo.getCacheStats());
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (customServerUrl.trim()) {
      localStorage.setItem('vnc_custom_server_url', customServerUrl.trim());
    } else {
      localStorage.removeItem('vnc_custom_server_url');
    }
    setServerSaved(true);
    setTimeout(() => setServerSaved(false), 2000);
  };

  const handleResetServer = () => {
    localStorage.removeItem('vnc_custom_server_url');
    setCustomServerUrl('');
    setServerSaved(true);
    setTimeout(() => setServerSaved(false), 2000);
  };

  const handleClearCache = () => {
    vncRepo.clearCache();
    setCacheStats(vncRepo.getCacheStats());
  };

  const handlePingStats = async () => {
    try {
      await vncRepo.getStats();
      setCacheStats(vncRepo.getCacheStats());
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold font-mono text-zinc-100">
                API Diagnostics & Telemetry
              </h3>
              <p className="text-xs text-zinc-400">
                Live monitoring of computernewb.com API requests, cache hits, latencies, and rates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePingStats}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-zinc-700 transition"
              title="Trigger test stats request"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Test API</span>
            </button>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-rose-400 hover:text-rose-300 border border-zinc-700 transition"
              title="Clear client in-memory cache"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Cache</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Connection Mode & Server Settings */}
        <div className="px-6 py-3 bg-zinc-950/60 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-400">Mode:</span>
            {isNativeMobile() ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
                Android APK (Direct computernewb.com CORS)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold">
                Web Server & Backend Proxy
              </span>
            )}
          </div>

          <form onSubmit={handleSaveServer} className="flex items-center gap-2">
            <span className="text-zinc-400 hidden sm:inline">Bridge URL:</span>
            <input
              type="text"
              value={customServerUrl}
              onChange={(e) => setCustomServerUrl(e.target.value)}
              placeholder="https://... (optional)"
              className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-zinc-100 text-xs focus:outline-none focus:border-cyan-500 w-48 placeholder:text-zinc-600 font-mono"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition flex items-center gap-1"
            >
              {serverSaved ? <Check className="w-3 h-3" /> : null}
              {serverSaved ? 'Saved' : 'Save'}
            </button>
            {customServerUrl && (
              <button
                type="button"
                onClick={handleResetServer}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition"
              >
                Reset
              </button>
            )}
          </form>
        </div>

        {/* Cache Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-zinc-950/40 border-b border-zinc-800 text-xs font-mono">
          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Active Cache Items
              </span>
              <div className="text-lg font-bold text-zinc-100">{cacheStats.size} entries</div>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Deduplication State
              </span>
              <div className="text-sm font-semibold text-emerald-400">Active & Enforced</div>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                Logged Transactions
              </span>
              <div className="text-lg font-bold text-zinc-100">{logs.length} calls</div>
            </div>
          </div>
        </div>

        {/* Telemetry Log Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-950">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Endpoint</th>
                  <th className="py-2.5 px-3">HTTP Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Cache</th>
                  <th className="py-2.5 px-3">Records</th>
                  <th className="py-2.5 px-3">Error / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-500">
                      No API telemetry recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => {
                    const isOk = item.status === 200 || item.status === '200';
                    const timeStr = new Date(item.timestamp).toLocaleTimeString();

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/50">
                        <td className="py-2 px-3 text-zinc-500 whitespace-nowrap">{timeStr}</td>
                        <td className="py-2 px-3 text-zinc-200 font-semibold max-w-[240px] truncate" title={item.endpoint}>
                          {item.endpoint}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isOk ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              200 OK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-zinc-400 whitespace-nowrap">
                          {item.durationMs} ms
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {item.cacheHit ? (
                            <span className="text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 text-[10px]">
                              HIT
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[10px]">MISS</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-zinc-300">
                          {item.resultCount !== undefined ? item.resultCount : '—'}
                        </td>
                        <td className="py-2 px-3 text-rose-400 truncate max-w-[200px]" title={item.error || ''}>
                          {item.error || <span className="text-zinc-600">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
