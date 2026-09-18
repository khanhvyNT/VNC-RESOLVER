import React, { useState, useEffect } from 'react';
import {
  Dice5,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  History,
  CheckCircle2,
  Sparkles,
  Radio,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { NormalizedVnc, LiveCheckResult } from '../types';
import { vncRepo } from '../services/apiClient';
import { normalizeVncRecord } from '../utils/formatters';
import { VncCard } from './VncCard';
import { useI18n } from '../services/i18n';

interface RandomViewProps {
  onSelectVnc: (vnc: NormalizedVnc) => void;
  isSavedMap: Record<number, boolean>;
  onToggleSave: (vnc: NormalizedVnc) => void;
  compareIds: number[];
  onToggleCompare: (id: number) => void;
  liveResults: Record<number, LiveCheckResult>;
  onLiveCheckResult: (id: number, res: LiveCheckResult) => void;
}

export const RandomView: React.FC<RandomViewProps> = ({
  onSelectVnc,
  isSavedMap,
  onToggleSave,
  compareIds,
  onToggleCompare,
  liveResults,
  onLiveCheckResult,
}) => {
  const { t } = useI18n();
  const [currentVnc, setCurrentVnc] = useState<NormalizedVnc | null>(null);
  const [randomHistory, setRandomHistory] = useState<NormalizedVnc[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectableOnly, setConnectableOnly] = useState(true);

  const fetchNextRandom = async (forceConnectable?: boolean) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const requireConnectable = forceConnectable !== undefined ? forceConnectable : connectableOnly;

    try {
      const res = await vncRepo.getRandomVnc({ connectable: requireConnectable });
      const normalized = normalizeVncRecord(res.data);

      if (res.data.liveCheck) {
        onLiveCheckResult(res.data.id, res.data.liveCheck);
      }

      setCurrentVnc(normalized);
      setRandomHistory((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)]);
      setHistoryIndex(0);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch connectable random VNC server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (historyIndex < randomHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCurrentVnc(randomHistory[nextIdx]);
    }
  };

  const handleNextInHistory = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setCurrentVnc(randomHistory[prevIdx]);
    } else {
      fetchNextRandom();
    }
  };

  useEffect(() => {
    if (!currentVnc && randomHistory.length === 0) {
      fetchNextRandom(true);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/60 text-xs font-mono text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Random Discovery Mode</span>
            </div>

            {connectableOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('random.connectableOnly')}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold font-mono text-zinc-100">
            {t('random.title')}
          </h2>
          <p className="text-xs text-zinc-400">
            {t('random.desc')}
          </p>

          <div className="pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-zinc-300 hover:text-zinc-100 transition">
              <input
                type="checkbox"
                checked={connectableOnly}
                onChange={(e) => {
                  const val = e.target.checked;
                  setConnectableOnly(val);
                  fetchNextRandom(val);
                }}
                className="w-3.5 h-3.5 rounded border-zinc-700 text-purple-500 focus:ring-0 bg-zinc-800"
              />
              <span>{t('random.connectableOnly')}</span>
            </label>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {randomHistory.length > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handlePrev}
                disabled={historyIndex >= randomHistory.length - 1}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
                title="Previous in random history"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-zinc-500 px-1">
                {historyIndex + 1} / {randomHistory.length}
              </span>
              <button
                onClick={handleNextInHistory}
                disabled={historyIndex === 0}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
                title="Next in history"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => fetchNextRandom()}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-semibold transition shadow-lg shadow-purple-950/40 active:scale-95 disabled:opacity-50"
          >
            <Dice5 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? t('random.finding') : t('random.btnNext')}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            onClick={() => fetchNextRandom()}
            className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-white rounded-lg text-xs font-mono transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-20 text-center space-y-4 font-mono bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8">
          <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
            <Radio className="w-4 h-4 text-emerald-400 absolute animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-200">
              Scanning for live connectable VNC server...
            </p>
            <p className="text-xs text-zinc-400">
              Probing random candidate records with non-intrusive TCP socket handshake
            </p>
          </div>
        </div>
      )}

      {/* Primary Random Card */}
      {!loading && currentVnc && (
        <div className="max-w-md mx-auto">
          <VncCard
            vnc={currentVnc}
            isSaved={Boolean(isSavedMap[currentVnc.id])}
            onToggleSave={onToggleSave}
            onSelect={onSelectVnc}
            isCompared={compareIds.includes(currentVnc.id)}
            onToggleCompare={onToggleCompare}
            liveCheckResult={liveResults[currentVnc.id]}
            onLiveCheckResult={onLiveCheckResult}
          />
        </div>
      )}

      {/* Session History Trail */}
      {randomHistory.length > 1 && (
        <div className="space-y-3 pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <History className="w-4 h-4 text-cyan-400" />
            <span className="uppercase tracking-wider">Discovered Connectable Trail</span>
            <span className="text-[11px] text-zinc-600">({randomHistory.length} verified records)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {randomHistory.map((item, idx) => {
              const isCurrent = item.id === currentVnc?.id;
              const live = liveResults[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setCurrentVnc(item);
                    setHistoryIndex(idx);
                  }}
                  className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition ${
                    isCurrent
                      ? 'bg-zinc-800/90 border-purple-500/50 shadow-md'
                      : 'bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-cyan-400">#{item.id}</span>
                    <div className="flex items-center gap-1.5">
                      {live?.tcpConnected && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{live.latencyMs ? `${live.latencyMs}ms` : 'Live'}</span>
                        </span>
                      )}
                      <span className="text-sm">{item.countryFlag}</span>
                    </div>
                  </div>
                  <div className="text-zinc-300 truncate">{item.desktopName || 'Unnamed'}</div>
                  <div className="text-[11px] text-zinc-500 mt-1 flex justify-between">
                    <span>{item.resolution}</span>
                    <span>:{item.port}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
