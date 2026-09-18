import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Dice5,
  BarChart3,
  Bookmark,
  Activity,
  Globe,
  Server,
  Monitor,
  Columns3,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { NavigationSection } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: NavigationSection) => void;
  onRandomVnc: () => void;
  onOpenDiagnostics: () => void;
  onOpenCompare: () => void;
  onTriggerSearchFilter: (type: 'country' | 'asn' | 'desktop' | 'id') => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onRandomVnc,
  onOpenDiagnostics,
  onOpenCompare,
  onTriggerSearchFilter,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    {
      id: 'search-vnc',
      title: 'Search VNC Records',
      category: 'Navigation',
      icon: <Search className="w-4 h-4 text-cyan-400" />,
      shortcut: '/',
      action: () => {
        onNavigate('search');
        onClose();
      },
    },
    {
      id: 'random-vnc',
      title: 'Fetch Random VNC Server',
      category: 'Discovery',
      icon: <Dice5 className="w-4 h-4 text-purple-400" />,
      shortcut: 'R',
      action: () => {
        onRandomVnc();
        onClose();
      },
    },
    {
      id: 'open-analytics',
      title: 'Open Analytics Dashboard',
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onNavigate('analytics');
        onClose();
      },
    },
    {
      id: 'open-saved',
      title: 'Open Saved Records & Collections',
      category: 'Navigation',
      icon: <Bookmark className="w-4 h-4 text-amber-400" />,
      action: () => {
        onNavigate('saved');
        onClose();
      },
    },
    {
      id: 'filter-country',
      title: 'Search by Country Code (country:XX)',
      category: 'Search Filter',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      action: () => {
        onTriggerSearchFilter('country');
        onClose();
      },
    },
    {
      id: 'filter-asn',
      title: 'Search by ASN (asn:ASXXXXX)',
      category: 'Search Filter',
      icon: <Server className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onTriggerSearchFilter('asn');
        onClose();
      },
    },
    {
      id: 'filter-desktop',
      title: 'Search by Desktop Name (desktop:...)',
      category: 'Search Filter',
      icon: <Monitor className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onTriggerSearchFilter('desktop');
        onClose();
      },
    },
    {
      id: 'open-compare',
      title: 'Open Comparison Matrix',
      category: 'Research Tools',
      icon: <Columns3 className="w-4 h-4 text-cyan-300" />,
      action: () => {
        onOpenCompare();
        onClose();
      },
    },
    {
      id: 'open-diagnostics',
      title: 'Open API Diagnostics & Cache Telemetry',
      category: 'System',
      icon: <Activity className="w-4 h-4 text-rose-400" />,
      action: () => {
        onOpenDiagnostics();
        onClose();
      },
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950/80">
          <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, query, or filter..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-zinc-800/40">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-mono transition-colors ${
                    isSelected
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-300 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      {cmd.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-100">{cmd.title}</div>
                      <div className="text-[11px] text-zinc-400">{cmd.category}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cmd.shortcut && (
                      <span className="text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                        {cmd.shortcut}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/90 border-t border-zinc-800 text-[11px] font-mono text-zinc-500">
          <span>Navigate with ↑ ↓ keys</span>
          <span>Select with Enter</span>
        </div>
      </div>
    </div>
  );
};
