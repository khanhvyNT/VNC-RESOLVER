import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Globe,
  Server,
  Monitor,
  Calendar,
  Layers,
  Info,
  Layers3,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { NormalizedVnc, ApiStatsResponse } from '../types';

interface AnalyticsViewProps {
  stats: ApiStatsResponse | null;
  dataset: NormalizedVnc[];
  onRefreshSample: () => void;
  loadingSample: boolean;
}

const COLORS = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  dataset,
  onRefreshSample,
  loadingSample,
}) => {
  const [activeTab, setActiveTab] = useState<'sample' | 'global'>('sample');

  // Compute stats on dataset
  const analyticsData = useMemo(() => {
    if (!dataset.length) return null;

    // 1. Records by Country
    const countryCount: Record<string, number> = {};
    // 2. Records by ASN
    const asnCount: Record<string, number> = {};
    // 3. Records by Desktop Name
    const desktopCount: Record<string, number> = {};
    // 4. Records by Port
    const portCount: Record<string, number> = {};
    // 5. Records by Resolution
    const resCount: Record<string, number> = {};
    // 6. Aspect ratios
    const aspectCount: Record<string, number> = {};
    // 7. Scan-age distribution (<7d, 7-30d, 1-3m, 3-6m, >6m)
    const ageBinned = {
      '< 7 days': 0,
      '7–30 days': 0,
      '1–3 months': 0,
      '3–6 months': 0,
      '> 6 months': 0,
    };

    const nowSec = Math.floor(Date.now() / 1000);

    dataset.forEach((v) => {
      // Country
      const c = v.countryName || v.countryCode || 'Unknown';
      countryCount[c] = (countryCount[c] || 0) + 1;

      // ASN
      const a = v.asnCode || 'Unknown';
      asnCount[a] = (asnCount[a] || 0) + 1;

      // Desktop name
      const d = v.desktopName || 'Unnamed';
      desktopCount[d] = (desktopCount[d] || 0) + 1;

      // Port
      const p = String(v.port);
      portCount[p] = (portCount[p] || 0) + 1;

      // Resolution
      const r = v.resolution || 'Unknown';
      resCount[r] = (resCount[r] || 0) + 1;

      // Aspect ratio
      const ar = v.aspectRatio || 'Unknown';
      aspectCount[ar] = (aspectCount[ar] || 0) + 1;

      // Scan age
      const diffSec = nowSec - v.scannedTimestamp;
      const days = diffSec / 86400;
      if (days < 7) ageBinned['< 7 days']++;
      else if (days < 30) ageBinned['7–30 days']++;
      else if (days < 90) ageBinned['1–3 months']++;
      else if (days < 180) ageBinned['3–6 months']++;
      else ageBinned['> 6 months']++;
    });

    const toTopList = (record: Record<string, number>, max = 7) =>
      Object.entries(record)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, max);

    return {
      topCountries: toTopList(countryCount, 8),
      topAsns: toTopList(asnCount, 8),
      topDesktops: toTopList(desktopCount, 8),
      topPorts: toTopList(portCount, 6),
      topResolutions: toTopList(resCount, 7),
      aspectRatios: Object.entries(aspectCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      scanAges: Object.entries(ageBinned).map(([name, count]) => ({ name, count })),
      sampleSize: dataset.length,
    };
  }, [dataset]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-mono">
      {/* Scope Disclaimer Banner (Section 14 Critical Requirement) */}
      <div className="p-4 rounded-xl border border-cyan-800/80 bg-cyan-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-zinc-100 uppercase tracking-wider">
              Dataset Scope Distinction
            </h4>
            <p className="text-zinc-300">
              The statistics below reflect the{' '}
              <strong className="text-cyan-300">currently retrieved sample of {analyticsData?.sampleSize || 0} records</strong>.
              They are never represented as global distribution metrics for the entire Resolver database of{' '}
              <strong className="text-zinc-100">{stats?.nr_vncs.toLocaleString() || '4,000+'}</strong> records.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshSample}
          disabled={loadingSample}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs transition active:scale-95 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingSample ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Expand Sample</span>
        </button>
      </div>

      {/* Global Dataset Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Entire Resolver Dataset</span>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {stats ? stats.nr_vncs.toLocaleString() : '4,064'}
          </div>
          <div className="text-[11px] text-zinc-500">
            Total active entries documented in backend
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Analyzed Sample Records</span>
            <Layers3 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">
            {analyticsData?.sampleSize || 0}
          </div>
          <div className="text-[11px] text-zinc-500">
            Retrieved objects evaluated in this view
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Coverage Sample Ratio</span>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {stats && analyticsData
              ? `${((analyticsData.sampleSize / stats.nr_vncs) * 100).toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="text-[11px] text-zinc-500">
            Sampling coefficient of local calculations
          </div>
        </div>
      </div>

      {analyticsData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Records by Country */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Records by Country (Sample)</span>
              </div>
              <span className="text-[10px] text-zinc-500">Top Geo Locations</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.topCountries} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Records by ASN */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <Server className="w-4 h-4 text-purple-400" />
                <span>Autonomous Systems (Sample)</span>
              </div>
              <span className="text-[10px] text-zinc-500">Top AS Networks</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.topAsns} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Records by Desktop Name */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <span>Reported Desktop Names</span>
              </div>
              <span className="text-[10px] text-zinc-500">Desktop Banner Labels</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.topDesktops} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Display Resolutions */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Resolution Breakdown</span>
              </div>
              <span className="text-[10px] text-zinc-500">Pixel Dimensions</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.topResolutions} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} width={95} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Aspect Ratio Distribution (Pie Chart) */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <PieIcon className="w-4 h-4 text-pink-400" />
                <span>Aspect Ratios Share</span>
              </div>
              <span className="text-[10px] text-zinc-500">Proportions</span>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.aspectRatios}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.name} (${entry.value ?? entry.count})`}
                    labelLine={false}
                  >
                    {analyticsData.aspectRatios.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 6: Scan-Age Distribution */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Scan Age Distribution (Histogram)</span>
              </div>
              <span className="text-[10px] text-zinc-500">Database Entry Age</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.scanAges} margin={{ left: 10, right: 10, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} angle={-25} textAnchor="end" />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
          No records currently in local sample. Perform a search or click Expand Sample above to visualize telemetry.
        </div>
      )}
    </div>
  );
};
