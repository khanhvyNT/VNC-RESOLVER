import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  CheckSquare,
  Square,
  ArrowRight,
} from 'lucide-react';
import { NormalizedVnc, LiveCheckResult } from '../types';
import { LiveConnectionCheck } from './LiveConnectionCheck';
import { useI18n } from '../services/i18n';

interface VncTableProps {
  vncs: NormalizedVnc[];
  isSavedMap: Record<number, boolean>;
  onToggleSave: (vnc: NormalizedVnc) => void;
  onSelect: (vnc: NormalizedVnc) => void;
  compareIds: number[];
  onToggleCompare: (id: number) => void;
  liveResults: Record<number, LiveCheckResult>;
  onLiveCheckResult: (id: number, res: LiveCheckResult) => void;
}

type SortField = 'id' | 'country' | 'state' | 'city' | 'asn' | 'port' | 'desktop' | 'resolution' | 'scanDate';
type SortOrder = 'asc' | 'desc';

export const VncTable: React.FC<VncTableProps> = ({
  vncs,
  isSavedMap,
  onToggleSave,
  onSelect,
  compareIds,
  onToggleCompare,
  liveResults,
  onLiveCheckResult,
}) => {
  const { t } = useI18n();
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedVncs = [...vncs].sort((a, b) => {
    let comp = 0;
    switch (sortField) {
      case 'id':
        comp = a.id - b.id;
        break;
      case 'country':
        comp = a.countryName.localeCompare(b.countryName);
        break;
      case 'state':
        comp = a.state.localeCompare(b.state);
        break;
      case 'city':
        comp = a.city.localeCompare(b.city);
        break;
      case 'asn':
        comp = a.asnCode.localeCompare(b.asnCode);
        break;
      case 'port':
        comp = a.port - b.port;
        break;
      case 'desktop':
        comp = (a.desktopName || '').localeCompare(b.desktopName || '');
        break;
      case 'resolution':
        comp = a.width * a.height - b.width * b.height;
        break;
      case 'scanDate':
        comp = a.scannedTimestamp - b.scannedTimestamp;
        break;
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-500 opacity-60 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400" />
    );
  };

  return (
    <div className="w-full overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-900/60 shadow-lg">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/80 font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
            <th className="py-3 px-3 w-10 text-center">{t('table.fav')}</th>
            <th className="py-3 px-3 w-12 text-center">{t('table.cmp')}</th>
            <th
              onClick={() => handleSort('id')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.id')}</span>
                {renderSortIcon('id')}
              </div>
            </th>
            <th
              onClick={() => handleSort('country')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.country')}</span>
                {renderSortIcon('country')}
              </div>
            </th>
            <th
              onClick={() => handleSort('state')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.state')}</span>
                {renderSortIcon('state')}
              </div>
            </th>
            <th
              onClick={() => handleSort('city')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.city')}</span>
                {renderSortIcon('city')}
              </div>
            </th>
            <th
              onClick={() => handleSort('asn')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.asn')}</span>
                {renderSortIcon('asn')}
              </div>
            </th>
            <th
              onClick={() => handleSort('port')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.port')}</span>
                {renderSortIcon('port')}
              </div>
            </th>
            <th
              onClick={() => handleSort('desktop')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.desktop')}</span>
                {renderSortIcon('desktop')}
              </div>
            </th>
            <th
              onClick={() => handleSort('resolution')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.resolution')}</span>
                {renderSortIcon('resolution')}
              </div>
            </th>
            <th
              onClick={() => handleSort('scanDate')}
              className="py-3 px-3 cursor-pointer select-none group hover:text-zinc-200"
            >
              <div className="flex items-center gap-1">
                <span>{t('table.scanDate')}</span>
                {renderSortIcon('scanDate')}
              </div>
            </th>
            <th className="py-3 px-3">{t('table.liveStatus')}</th>
            <th className="py-3 px-3 text-right">{t('table.action')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 font-mono">
          {sortedVncs.map((vnc) => {
            const isSaved = Boolean(isSavedMap[vnc.id]);
            const isCompared = compareIds.includes(vnc.id);
            const liveResult = liveResults[vnc.id];

            return (
              <tr
                key={vnc.id}
                onClick={() => onSelect(vnc)}
                className="hover:bg-zinc-800/50 transition-colors cursor-pointer group"
              >
                {/* Favorite */}
                <td
                  className="py-2.5 px-3 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(vnc);
                  }}
                >
                  <button
                    className={`p-1 rounded transition-colors ${
                      isSaved ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-400'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400' : ''}`} />
                  </button>
                </td>

                {/* Compare */}
                <td
                  className="py-2.5 px-3 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompare(vnc.id);
                  }}
                >
                  <button
                    className={`p-1 rounded transition-colors ${
                      isCompared ? 'text-cyan-400' : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {isCompared ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                </td>

                {/* ID */}
                <td className="py-2.5 px-3 font-semibold text-cyan-400 whitespace-nowrap">
                  #{vnc.id}
                </td>

                {/* Country */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className="mr-1.5 text-sm leading-none">{vnc.countryFlag}</span>
                  <span className="text-zinc-200">{vnc.countryCode}</span>
                </td>

                {/* State */}
                <td className="py-2.5 px-3 text-zinc-400 max-w-[120px] truncate" title={vnc.state}>
                  {vnc.state || '—'}
                </td>

                {/* City */}
                <td className="py-2.5 px-3 text-zinc-400 max-w-[120px] truncate" title={vnc.city}>
                  {vnc.city || '—'}
                </td>

                {/* ASN */}
                <td className="py-2.5 px-3 text-zinc-300 whitespace-nowrap" title={vnc.asn}>
                  {vnc.asnCode}
                </td>

                {/* Port */}
                <td className="py-2.5 px-3 text-cyan-300 whitespace-nowrap">
                  {vnc.port}
                </td>

                {/* Desktop */}
                <td className="py-2.5 px-3 text-zinc-200 max-w-[140px] truncate" title={vnc.desktopName || 'Unnamed'}>
                  {vnc.desktopName || <span className="text-zinc-600 italic">Unnamed</span>}
                </td>

                {/* Resolution */}
                <td className="py-2.5 px-3 text-zinc-300 whitespace-nowrap">
                  {vnc.resolution}
                </td>

                {/* Scan Date */}
                <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap text-[11px]" title={vnc.formattedDate}>
                  {vnc.scanAgeHuman}
                </td>

                {/* Live Status */}
                <td
                  className="py-2.5 px-3 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LiveConnectionCheck
                    ip={vnc.ipAddress}
                    port={vnc.port}
                    compact={true}
                    initialResult={liveResult}
                    onResultChange={(res) => onLiveCheckResult(vnc.id, res)}
                  />
                </td>

                {/* View Action */}
                <td className="py-2.5 px-3 text-right">
                  <span className="inline-flex items-center text-zinc-500 group-hover:text-cyan-400 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
