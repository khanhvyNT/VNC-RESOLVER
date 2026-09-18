import React, { useState } from 'react';
import {
  Compass,
  Search,
  Dice5,
  Bookmark,
  Clock,
  Database,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { NormalizedVnc, ApiStatsResponse, LiveCheckResult } from '../types';
import { VncCard } from './VncCard';

interface ExploreViewProps {
  stats: ApiStatsResponse | null;
  statsLoading: boolean;
  onNavigateSearch: (initialQuery?: string) => void;
  onNavigateRandom: () => void;
  onNavigateSaved: () => void;
  recentlyViewed: NormalizedVnc[];
  savedRecords: NormalizedVnc[];
  onSelectVnc: (vnc: NormalizedVnc) => void;
  isSavedMap: Record<number, boolean>;
  onToggleSave: (vnc: NormalizedVnc) => void;
  compareIds: number[];
  onToggleCompare: (id: number) => void;
  liveResults: Record<number, LiveCheckResult>;
  onLiveCheckResult: (id: number, res: LiveCheckResult) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  stats,
  statsLoading,
  onNavigateSearch,
  onNavigateRandom,
  onNavigateSaved,
  recentlyViewed,
  savedRecords,
  onSelectVnc,
  isSavedMap,
  onToggleSave,
  compareIds,
  onToggleCompare,
  liveResults,
  onLiveCheckResult,
}) => {
  const [quickSearchInput, setQuickSearchInput] = useState('');

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchInput.trim()) {
      onNavigateSearch(quickSearchInput.trim());
    }
  };

  const sampleQueries = [
    { label: 'Romania (RO)', query: 'country:RO' },
    { label: 'Japan (JP)', query: 'country:JP' },
    { label: 'JDownloader Desktops', query: 'desktop:JDownloader' },
    { label: 'OVH Network (AS16276)', query: 'asn:AS16276' },
    { label: 'German Servers (DE)', query: 'country:DE' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero / Overview Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/80 to-zinc-950 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-xs font-mono text-cyan-300">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>VNC Resolver Metadata & Research Explorer</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-tight font-mono">
            Explore Open VNC Telemetry & Desktop Metadata
          </h2>

          <p className="text-sm text-zinc-400 leading-relaxed">
            Query indexed VNC server metadata discovered by Computernewb Resolver. Perform non-intrusive TCP socket reachability checks, compare historical records, and analyze desktop resolutions across global autonomous systems.
          </p>

          {/* Quick Search Form */}
          <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by desktop, country:RO, asn:AS12345, or VNC ID..."
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono shadow-inner transition"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold rounded-xl transition shadow-lg shadow-cyan-950/40 active:scale-95"
            >
              <span>Explore Database</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Preset quick filter tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-mono text-zinc-500 mr-1">Quick syntax:</span>
            {sampleQueries.map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigateSearch(item.query)}
                className="px-2 py-0.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-cyan-300 text-[11px] font-mono border border-zinc-750 transition"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dataset Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Records */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="uppercase tracking-wider">Indexed Database</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {statsLoading ? (
              <span className="text-zinc-600 animate-pulse">Loading...</span>
            ) : stats ? (
              <span>{stats.nr_vncs.toLocaleString()}</span>
            ) : (
              <span>4,000+</span>
            )}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Verified VNC records currently indexed
          </div>
        </div>

        {/* Metric 2: API & Probe Status */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="uppercase tracking-wider">Resolver API</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Online</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Proxy with in-memory TTL caching
          </div>
        </div>

        {/* Metric 3: Random Discovery Button */}
        <div
          onClick={onNavigateRandom}
          className="group bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-purple-800/60 rounded-xl p-5 space-y-2 cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center justify-between text-xs font-mono text-purple-400">
            <span className="uppercase tracking-wider">Discovery Mode</span>
            <Dice5 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
            <span>Random VNC</span>
            <ArrowRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Inspect arbitrary entries one by one
          </div>
        </div>

        {/* Metric 4: Saved / Research Tray */}
        <div
          onClick={onNavigateSaved}
          className="group bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-800/60 rounded-xl p-5 space-y-2 cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center justify-between text-xs font-mono text-amber-400">
            <span className="uppercase tracking-wider">Saved Records</span>
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 group-hover:text-amber-300 transition-colors">
            {savedRecords.length}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Locally pinned records and collections
          </div>
        </div>
      </div>

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider">
                Recently Viewed Records
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {recentlyViewed.length} in local session
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentlyViewed.slice(0, 6).map((vnc) => (
              <VncCard
                key={vnc.id}
                vnc={vnc}
                isSaved={Boolean(isSavedMap[vnc.id])}
                onToggleSave={onToggleSave}
                onSelect={onSelectVnc}
                isCompared={compareIds.includes(vnc.id)}
                onToggleCompare={onToggleCompare}
                liveCheckResult={liveResults[vnc.id]}
                onLiveCheckResult={onLiveCheckResult}
              />
            ))}
          </div>
        </div>
      )}

      {/* Saved Records Section (if any) */}
      {savedRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider">
                Saved & Pinned Records
              </h3>
            </div>
            <button
              onClick={onNavigateSaved}
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Collections</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedRecords.slice(0, 3).map((vnc) => (
              <VncCard
                key={vnc.id}
                vnc={vnc}
                isSaved={true}
                onToggleSave={onToggleSave}
                onSelect={onSelectVnc}
                isCompared={compareIds.includes(vnc.id)}
                onToggleCompare={onToggleCompare}
                liveCheckResult={liveResults[vnc.id]}
                onLiveCheckResult={onLiveCheckResult}
              />
            ))}
          </div>
        </div>
      )}

      {/* Security & Research Charter Banner */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5 flex flex-col sm:flex-row items-start gap-4">
        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-mono font-bold text-zinc-200">
            Safe Research Policy & Non-Intrusive Protocol Standards
          </h4>
          <p className="text-zinc-400 leading-relaxed">
            VNC Resolver Explorer strictly functions as an index and metadata research tool. It never attempts authentication, password brute-forcing, exploitation, remote keyboard/mouse injection, or graphical desktop streaming. Connectivity verification is limited to standard TCP reachability and safe RFB banner queries that terminate immediately upon receipt.
          </p>
        </div>
      </div>
    </div>
  );
};
