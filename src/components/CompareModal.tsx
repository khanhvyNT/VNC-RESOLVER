import React from 'react';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { NormalizedVnc, LiveCheckResult } from '../types';
import { LiveConnectionCheck } from './LiveConnectionCheck';
import { VncScreenshot } from './VncScreenshot';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  vncs: NormalizedVnc[];
  onRemove: (id: number) => void;
  onClearAll: () => void;
  onSelectVnc: (vnc: NormalizedVnc) => void;
  liveResults: Record<number, LiveCheckResult>;
  onLiveCheckResult: (id: number, res: LiveCheckResult) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  vncs,
  onRemove,
  onClearAll,
  onSelectVnc,
  liveResults,
  onLiveCheckResult,
}) => {
  if (!isOpen) return null;

  const compareRows = [
    { label: 'Screenshot', render: (v: NormalizedVnc) => <VncScreenshot id={v.id} className="min-h-[100px] max-h-[150px]" /> },
    { label: 'Country', render: (v: NormalizedVnc) => `${v.countryFlag} ${v.countryName} (${v.countryCode})` },
    { label: 'State / Region', render: (v: NormalizedVnc) => v.state || '—' },
    { label: 'City', render: (v: NormalizedVnc) => v.city || '—' },
    { label: 'ASN Code', render: (v: NormalizedVnc) => v.asnCode },
    { label: 'ASN Organization', render: (v: NormalizedVnc) => v.asnOrg },
    { label: 'IP Address', render: (v: NormalizedVnc) => v.ipAddress },
    { label: 'Port', render: (v: NormalizedVnc) => `:${v.port}` },
    { label: 'rDNS Hostname', render: (v: NormalizedVnc) => v.rdnsHostname || <span className="text-zinc-500 italic">None</span> },
    { label: 'Desktop Name', render: (v: NormalizedVnc) => v.desktopName || <span className="text-zinc-500 italic">Unnamed</span> },
    { label: 'Resolution', render: (v: NormalizedVnc) => v.resolution },
    { label: 'Aspect Ratio', render: (v: NormalizedVnc) => v.aspectRatio },
    { label: 'Scan Date', render: (v: NormalizedVnc) => v.formattedDate },
    { label: 'Record Age', render: (v: NormalizedVnc) => v.scanAgeHuman },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div>
            <h3 className="text-base font-bold font-mono text-zinc-100 flex items-center gap-2">
              <span>VNC Record Comparison Matrix</span>
              <span className="text-xs font-normal text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                {vncs.length} of 4 selected
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Side-by-side technical attribute comparison. Records are evaluated objectively without scoring.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {vncs.length > 0 && (
              <button
                onClick={onClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-6">
          {vncs.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 font-mono text-sm space-y-2">
              <p>No VNC records selected for comparison.</p>
              <p className="text-xs text-zinc-500">
                Click the <strong>Compare</strong> toggle on any VNC card or table row to select up to 4 items.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-950/60">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950">
                    <th className="p-3.5 w-48 text-zinc-400 uppercase tracking-wider text-[11px] border-r border-zinc-800">
                      Attribute
                    </th>
                    {vncs.map((vnc) => (
                      <th
                        key={vnc.id}
                        className="p-3.5 min-w-[200px] border-r border-zinc-800 last:border-r-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-cyan-400">
                            VNC #{vnc.id}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onSelectVnc(vnc);
                                onClose();
                              }}
                              className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800"
                              title="Open detail"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onRemove(vnc.id)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Live Check cell in header */}
                        <div className="pt-1">
                          <LiveConnectionCheck
                            ip={vnc.ipAddress}
                            port={vnc.port}
                            compact={true}
                            initialResult={liveResults[vnc.id]}
                            onResultChange={(res) => onLiveCheckResult(vnc.id, res)}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {compareRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="p-3 text-zinc-400 font-semibold border-r border-zinc-800 bg-zinc-950/40">
                        {row.label}
                      </td>
                      {vncs.map((vnc) => (
                        <td
                          key={vnc.id}
                          className="p-3 text-zinc-200 border-r border-zinc-800 last:border-r-0 break-words"
                        >
                          {row.render(vnc)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
