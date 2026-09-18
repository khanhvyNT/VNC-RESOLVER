import React from 'react';
import { Star, Monitor, Layers, Calendar, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { NormalizedVnc, LiveCheckResult } from '../types';
import { LiveConnectionCheck } from './LiveConnectionCheck';
import { VncScreenshot } from './VncScreenshot';
import { useI18n } from '../services/i18n';

interface VncCardProps {
  vnc: NormalizedVnc;
  isSaved: boolean;
  onToggleSave: (vnc: NormalizedVnc) => void;
  onSelect: (vnc: NormalizedVnc) => void;
  isCompared?: boolean;
  onToggleCompare?: (id: number) => void;
  liveCheckResult?: LiveCheckResult;
  onLiveCheckResult?: (id: number, result: LiveCheckResult) => void;
}

export const VncCard: React.FC<VncCardProps> = ({
  vnc,
  isSaved,
  onToggleSave,
  onSelect,
  isCompared = false,
  onToggleCompare,
  liveCheckResult,
  onLiveCheckResult,
}) => {
  const { t } = useI18n();

  return (
    <div
      onClick={() => onSelect(vnc)}
      className="group relative bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-black/40 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Header Row: ID + Country Flag/Name + Favorite / Compare */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
                VNC #{vnc.id}
              </span>
              {onToggleCompare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompare(vnc.id);
                  }}
                  className={`p-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                    isCompared
                      ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-800'
                      : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/50'
                  }`}
                  title={isCompared ? 'Remove from compare' : 'Add to compare (2-4 items)'}
                >
                  {isCompared ? <CheckSquare className="w-3 h-3 text-cyan-400" /> : <Square className="w-3 h-3" />}
                  <span className="text-[10px]">{t('compare.title')}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-zinc-200">
              <span className="text-lg leading-none" title={vnc.countryCode}>
                {vnc.countryFlag}
              </span>
              <span className="truncate max-w-[180px]">
                {vnc.countryName}
              </span>
              {vnc.city && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-xs text-zinc-400 truncate max-w-[130px]">
                    {vnc.city}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(vnc);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              isSaved
                ? 'text-amber-400 bg-amber-950/40 border border-amber-800/50'
                : 'text-zinc-500 hover:text-amber-300 hover:bg-zinc-800'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save record'}
          >
            <Star className={`w-4 h-4 ${isSaved ? 'fill-amber-400' : ''}`} />
          </button>
        </div>

        {/* Screenshot Thumbnail */}
        <div className="mb-3">
          <VncScreenshot id={vnc.id} className="min-h-[110px] h-[110px] rounded-lg bg-zinc-950 border-zinc-800" />
        </div>

        {/* Network info: ASN + Port */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-3 bg-zinc-950/50 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
          <span className="text-zinc-300 font-semibold truncate" title={vnc.asn}>
            {vnc.asnCode}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-cyan-400">:{vnc.port}</span>
          {vnc.asnOrg && (
            <span className="text-zinc-500 truncate text-[11px] ml-auto" title={vnc.asnOrg}>
              {vnc.asnOrg}
            </span>
          )}
        </div>

        {/* Display info: Desktop Name + Resolution */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <Monitor className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-zinc-200 font-medium truncate" title={vnc.desktopName || 'Unnamed'}>
              {vnc.desktopName || <span className="text-zinc-500 italic">{t('details.unnamed')}</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Layers className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-300">{vnc.resolution}</span>
            {vnc.aspectRatio !== 'Unknown' && (
              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                {vnc.aspectRatio}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Scan Age (Historical) + Live Check (Live) */}
      <div className="pt-3 border-t border-zinc-800/70 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1.5" title={vnc.formattedDate}>
            <Calendar className="w-3 h-3 text-zinc-500" />
            {vnc.scanAgeHuman}
          </span>

          {/* Quick link arrow on hover */}
          <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-xs">
            {t('app.details')} <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Live Check Status Pill */}
        <div
          className="pt-1 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <LiveConnectionCheck
            ip={vnc.ipAddress}
            port={vnc.port}
            compact={true}
            initialResult={liveCheckResult}
            onResultChange={(res) => onLiveCheckResult?.(vnc.id, res)}
          />
        </div>
      </div>
    </div>
  );
};
