import React from 'react';
import {
  Compass,
  Search,
  Dice5,
  BarChart3,
  Bookmark,
  Columns3,
  Activity,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { NavigationSection } from '../types';
import { useI18n } from '../services/i18n';

interface SidebarProps {
  currentSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  compareCount: number;
  onOpenCompare: () => void;
  onOpenDiagnostics: () => void;
  savedCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  compareCount,
  onOpenCompare,
  onOpenDiagnostics,
  savedCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { t } = useI18n();

  const navItems = [
    {
      id: 'explore' as NavigationSection,
      label: t('nav.explore'),
      icon: <Compass className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'search' as NavigationSection,
      label: t('nav.search'),
      icon: <Search className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'random' as NavigationSection,
      label: t('nav.random'),
      icon: <Dice5 className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'analytics' as NavigationSection,
      label: t('nav.analytics'),
      icon: <BarChart3 className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'saved' as NavigationSection,
      label: t('nav.saved'),
      icon: <Bookmark className="w-4 h-4" />,
      badge: savedCount > 0 ? savedCount : null,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-850 text-zinc-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-850/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm shadow-sm">
            VR
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-1.5">
              <span>{t('app.title')}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                v1.0
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">{t('app.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 pb-2 font-semibold">
          {t('nav.explore')}
        </div>
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition ${
                isActive
                  ? 'bg-zinc-850 text-cyan-300 font-semibold border border-zinc-750 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-cyan-400' : 'text-zinc-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-amber-400 font-mono">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Compare quick button */}
        <div className="pt-4 mt-4 border-t border-zinc-850/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 pb-2 font-semibold">
            {t('nav.compare')}
          </div>
          <button
            onClick={() => {
              onOpenCompare();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition ${
              compareCount > 0
                ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Columns3 className="w-4 h-4 text-cyan-400" />
              <span>{t('nav.compare')}</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                compareCount > 0 ? 'bg-cyan-900/80 text-cyan-200' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {compareCount} / 4
            </span>
          </button>
        </div>
      </div>

      {/* Bottom info & Telemetry */}
      <div className="p-3 border-t border-zinc-850/80 space-y-2 text-xs font-mono">
        <button
          onClick={() => {
            onOpenDiagnostics();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/70 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 transition"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('nav.diagnostics')}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 text-[10px] text-zinc-400 space-y-1">
          <div className="flex items-center gap-1 text-zinc-300 font-semibold">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>{t('app.researchOnly')}</span>
          </div>
          <p className="leading-tight">
            {t('app.researchNotice')}
          </p>
        </div>

        <div className="px-2 pt-1 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>computernewb API</span>
          <a
            href="https://computernewb.com/vncresolver/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-0.5"
          >
            {t('app.sourceApi')} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-full h-full z-50 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
