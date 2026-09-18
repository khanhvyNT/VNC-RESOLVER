import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Zap, Clock, Terminal } from 'lucide-react';
import { LiveCheckResult } from '../types';
import { vncRepo } from '../services/apiClient';
import { useI18n } from '../services/i18n';

interface LiveConnectionCheckProps {
  ip: string;
  port: number;
  initialResult?: LiveCheckResult | null;
  onResultChange?: (result: LiveCheckResult) => void;
  compact?: boolean;
}

export const LiveConnectionCheck: React.FC<LiveConnectionCheckProps> = ({
  ip,
  port,
  initialResult,
  onResultChange,
  compact = false,
}) => {
  const { t } = useI18n();
  const [result, setResult] = useState<LiveCheckResult | null>(initialResult || null);
  const [checking, setChecking] = useState(false);

  React.useEffect(() => {
    if (initialResult) {
      setResult(initialResult);
    }
  }, [initialResult]);

  const runCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await vncRepo.checkLiveConnection(ip, port);
      setResult(res);
      onResultChange?.(res);
    } catch {
      const fallback: LiveCheckResult = {
        status: 'unavailable',
        tcpConnected: false,
        rfbHandshake: false,
        error: 'Live probe service unavailable',
        checkedAt: Date.now(),
      };
      setResult(fallback);
      onResultChange?.(fallback);
    } finally {
      setChecking(false);
    }
  };

  const getStatusBadge = () => {
    if (checking) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {t('liveCheck.badge.probing')}
        </span>
      );
    }

    if (!result || result.status === 'idle') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
          <HelpCircle className="w-3 h-3" />
          {t('liveCheck.badge.unchecked')}
        </span>
      );
    }

    switch (result.status) {
      case 'reachable':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            title={result.banner ? `Banner: ${result.banner}` : 'RFB Handshake confirmed'}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{t('liveCheck.badge.reachable')}{result.latencyMs ? ` (${result.latencyMs}ms)` : ''}</span>
          </span>
        );
      case 'port_reachable':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{t('liveCheck.badge.portReachable')}{result.latencyMs ? ` (${result.latencyMs}ms)` : ''}</span>
          </span>
        );
      case 'not_reachable':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30"
            title={result.error || 'Connection failed/offline'}
          >
            <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{t('liveCheck.badge.offline')}</span>
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <HelpCircle className="w-3 h-3 text-zinc-400 shrink-0" />
            <span>{t('liveCheck.badge.unchecked')}</span>
          </span>
        );
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {getStatusBadge()}
        <button
          onClick={(e) => {
            e.stopPropagation();
            runCheck();
          }}
          disabled={checking}
          className="p-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title={result ? "Re-test live connection" : "Run non-intrusive live check"}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">
              Live Connection Observation
            </h4>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
              Port : {port}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Instantaneous TCP socket reachability and RFB handshake probe
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button
            onClick={runCheck}
            disabled={checking}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-zinc-700 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-blue-400' : ''}`} />
            {result ? 'Re-check Now' : 'Run Live Check'}
          </button>
        </div>
      </div>

      {/* Result Breakdown */}
      {result ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* TCP Status */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              TCP Transport
            </div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              {result.tcpConnected ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Connection established
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Connection failed
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1 font-mono">
              Target: {ip}:{port}
            </div>
          </div>

          {/* RFB Protocol Handshake */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              VNC / RFB Handshake
            </div>
            <div className="text-sm font-semibold">
              {result.rfbHandshake ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Banner identified
                </span>
              ) : result.tcpConnected ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Handshake failed / Timed out
                </span>
              ) : (
                <span className="text-zinc-500">Unreached</span>
              )}
            </div>
            {result.banner && (
              <div className="text-xs font-mono text-cyan-400 bg-zinc-900 px-2 py-0.5 mt-1 rounded border border-zinc-800 truncate">
                {result.banner}
              </div>
            )}
          </div>

          {/* Latency & Checked Timestamp */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Latency & Time
            </div>
            <div className="text-sm font-semibold text-zinc-200">
              {result.latencyMs !== undefined ? (
                <span className="font-mono text-emerald-300">{result.latencyMs} ms roundtrip</span>
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Checked {new Date(result.checkedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-lg p-4 text-center">
          <p className="text-xs text-zinc-400">
            Click <strong className="text-zinc-200">Run Live Check</strong> to determine whether{' '}
            <code className="text-cyan-400 font-mono">{ip}:{port}</code> currently answers TCP connections and broadcasts RFB protocol banners.
          </p>
        </div>
      )}

      {/* Error Message if any */}
      {result?.error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs font-mono">
          <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>Diagnostic detail: {result.error}</span>
        </div>
      )}

      {/* Safety & Non-Intrusive Notice */}
      <div className="flex items-start gap-2 text-[11px] text-zinc-500 bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-800/40">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p>
          <strong className="text-zinc-400">Non-intrusive protocol check:</strong> Terminates immediately after TCP connect or RFB banner read. No credentials transmitted, no authentication attempted, no keyboard/mouse injection, no remote session established.
        </p>
      </div>
    </div>
  );
};
