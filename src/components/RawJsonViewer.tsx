import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { ApiVncRecord } from '../types';

interface RawJsonViewerProps {
  data: ApiVncRecord;
}

export const RawJsonViewer: React.FC<RawJsonViewerProps> = ({ data }) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyField = (key: string, value: any) => {
    const valString = typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'null');
    navigator.clipboard.writeText(valString);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Basic syntax highlighter for JSON
  const highlightJson = (json: string) => {
    const escaped = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'text-amber-300'; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-cyan-400 font-semibold'; // key
          } else {
            cls = 'text-emerald-300'; // string
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-400 font-semibold'; // boolean
        } else if (/null/.test(match)) {
          cls = 'text-zinc-500 italic'; // null
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/80 px-4 py-2.5 rounded-lg border border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Original Resolver API Payload (computernewb schema)</span>
        </div>

        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 transition active:scale-95"
        >
          {copiedAll ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied JSON</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy Full JSON</span>
            </>
          )}
        </button>
      </div>

      {/* Copy Individual Fields Toolbar */}
      <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80">
        <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
          Quick Copy Field Values:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(data).map(([k, v]) => (
            <button
              key={k}
              onClick={() => handleCopyField(k, v)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/70 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 border border-zinc-700/60 transition"
              title={`Copy ${k}: ${String(v)}`}
            >
              <span className="text-cyan-400">{k}</span>
              {copiedField === k ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-zinc-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs overflow-x-auto shadow-inner">
        <pre
          className="leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightJson(jsonString) }}
        />
      </div>
    </div>
  );
};
