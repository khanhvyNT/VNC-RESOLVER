import React, { useState } from 'react';
import {
  Menu,
  Search,
  Dice5,
  Activity,
  Command,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Globe,
} from 'lucide-react';
import { NavigationSection, ApiStatsResponse } from '../types';
import { useI18n } from '../services/i18n';

interface HeaderProps {
  currentSection: NavigationSection;
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
  onOpenDiagnostics: () => void;
  onQuickSearch: (query: string) => void;
  onRandomVnc: () => void;
  stats: ApiStatsResponse | null;
  statsLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  onOpenMobileMenu,
  onOpenCommandPalette,
  onOpenDiagnostics,
  onQuickSearch,
  onRandomVnc,
  stats,
  statsLoading,
}) => {
  const { language, setLanguage, t } = useI18n();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onQuickSearch(searchValue.trim());
    }
  };

  const sectionTitles: Record<NavigationSection, string> = {
    explore: t('nav.explore'),
    search: t('nav.search'),
    random: t('nav.random'),
    analytics: t('nav.analytics'),
    saved: t('nav.saved'),
    detail: t('nav.detail'),
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-850 px-4 py-3">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Mobile Menu button + Section Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-wider">
              {sectionTitles[currentSection] || 'Explorer'}
            </h2>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span>Computernewb Resolver</span>
              {stats && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-cyan-400 font-semibold">
                    {stats.nr_vncs.toLocaleString()} {t('app.recordsIndexed')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Global Search Input */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden sm:flex flex-1 max-w-md mx-4 items-center relative"
        >
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            placeholder={t('header.searchPlaceholder')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-14 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono transition"
          />
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="absolute right-2 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400 hover:text-zinc-200"
            title="Open Command Palette (⌘K)"
          >
            ⌘K
          </button>
        </form>

        {/* Right Actions: Language Switcher + Random Button + API Status Badge + Diagnostics */}
        <div className="flex items-center gap-2">
          {/* Language Switcher Toggle */}
          <button
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-mono transition shadow-sm active:scale-95"
            title="Chuyển ngôn ngữ / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
          </button>

          {/* Quick Random VNC Button */}
          <button
            onClick={onRandomVnc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-mono transition shadow-sm active:scale-95"
            title="Fetch a random VNC record (R)"
          >
            <Dice5 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">{t('header.randomButton')}</span>
            <kbd className="hidden lg:inline text-[9px] px-1 rounded bg-zinc-800 text-zinc-400">R</kbd>
          </button>

          {/* Backend Status Pill */}
          <div
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 text-xs font-mono transition"
            title="API Backend Status (Click for Diagnostics)"
          >
            {statsLoading ? (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            ) : stats?.status === 'ok' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-400" />
            )}
            <span className="text-[11px] text-zinc-300 hidden sm:inline">
              {statsLoading ? t('app.checking') : stats?.status === 'ok' ? t('app.apiOnline') : t('app.apiOffline')}
            </span>
          </div>

          {/* Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Command Palette (Ctrl/Cmd + K)"
          >
            <Command className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
