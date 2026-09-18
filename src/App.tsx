import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ExploreView } from './components/ExploreView';
import { SearchView } from './components/SearchView';
import { RandomView } from './components/RandomView';
import { AnalyticsView } from './components/AnalyticsView';
import { SavedView } from './components/SavedView';
import { VncDetail } from './components/VncDetail';
import { CompareModal } from './components/CompareModal';
import { ApiDiagnosticsModal } from './components/ApiDiagnosticsModal';
import { CommandPalette } from './components/CommandPalette';
import {
  NormalizedVnc,
  NavigationSection,
  ApiStatsResponse,
  LiveCheckResult,
} from './types';
import { vncRepo } from './services/apiClient';
import {
  getRecentlyViewed,
  addRecentlyViewed,
  getSavedVncList,
  toggleSavedVnc,
  getSavedVncMetadata,
} from './services/storage';
import { normalizeVncRecord } from './utils/formatters';

export function App() {
  // Navigation & View state
  const [currentSection, setCurrentSection] = useState<NavigationSection>('explore');
  const [activeVnc, setActiveVnc] = useState<NormalizedVnc | null>(null);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');

  // Stats state
  const [stats, setStats] = useState<ApiStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Local storage state
  const [recentlyViewed, setRecentlyViewed] = useState<NormalizedVnc[]>([]);
  const [savedRecords, setSavedRecords] = useState<NormalizedVnc[]>([]);
  const [isSavedMap, setIsSavedMap] = useState<Record<number, boolean>>({});

  // Comparison tray state (up to 4 items)
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareVncs, setCompareVncs] = useState<NormalizedVnc[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Live check results shared cache (by id)
  const [liveResults, setLiveResults] = useState<Record<number, LiveCheckResult>>({});

  // Modals state
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sample dataset for Analytics view
  const [analyticsDataset, setAnalyticsDataset] = useState<NormalizedVnc[]>([]);
  const [loadingAnalyticsSample, setLoadingAnalyticsSample] = useState(false);

  // Load initial stats & local storage records
  useEffect(() => {
    // 1. Load cached records from local storage
    const recent = getRecentlyViewed();
    const saved = getSavedVncList();
    setRecentlyViewed(recent);
    setSavedRecords(saved);

    const map: Record<number, boolean> = {};
    saved.forEach((item) => {
      map[item.id] = true;
    });
    setIsSavedMap(map);

    // 2. Fetch backend stats
    vncRepo
      .getStats()
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.error('Failed to load initial stats', err);
      })
      .finally(() => {
        setStatsLoading(false);
      });

    // 3. Populate initial analytics sample with exploratory search
    fetchAnalyticsSample();

    // 4. Handle initial URL hash routing (e.g. #/vnc/123, #/search?q=...)
    handleHashRouting();
    window.addEventListener('hashchange', handleHashRouting);
    return () => window.removeEventListener('hashchange', handleHashRouting);
  }, []);

  // Sync hash routing
  const handleHashRouting = async () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/vnc/')) {
      const idStr = hash.replace('#/vnc/', '');
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) {
        try {
          const res = await vncRepo.getVncById(id);
          if (res.data) {
            const norm = normalizeVncRecord(res.data);
            setActiveVnc(norm);
            setCurrentSection('detail');
          }
        } catch {}
      }
    } else if (hash.startsWith('#/search')) {
      const queryParams = new URLSearchParams(hash.split('?')[1] || '');
      const q = queryParams.get('q') || '';
      setSearchInitialQuery(q);
      setCurrentSection('search');
    } else if (hash === '#/random') {
      setCurrentSection('random');
    } else if (hash === '#/analytics') {
      setCurrentSection('analytics');
    } else if (hash === '#/saved') {
      setCurrentSection('saved');
    }
  };

  const fetchAnalyticsSample = async () => {
    setLoadingAnalyticsSample(true);
    try {
      // Gather representative records across countries
      const [resRO, resJP, resDE] = await Promise.allSettled([
        vncRepo.searchVncs({ country: 'RO', full: true }),
        vncRepo.searchVncs({ country: 'JP', full: true }),
        vncRepo.searchVncs({ country: 'DE', full: true }),
      ]);

      const gathered: NormalizedVnc[] = [];
      if (resRO.status === 'fulfilled' && resRO.value.data?.results) {
        gathered.push(...resRO.value.data.results.map(normalizeVncRecord));
      }
      if (resJP.status === 'fulfilled' && resJP.value.data?.results) {
        gathered.push(...resJP.value.data.results.map(normalizeVncRecord));
      }
      if (resDE.status === 'fulfilled' && resDE.value.data?.results) {
        gathered.push(...resDE.value.data.results.map(normalizeVncRecord));
      }

      setAnalyticsDataset(gathered);
    } catch (err) {
      console.error('Failed to build analytics sample', err);
    } finally {
      setLoadingAnalyticsSample(false);
    }
  };

  // Select a VNC and open detail view
  const handleSelectVnc = useCallback((vnc: NormalizedVnc) => {
    setActiveVnc(vnc);
    setCurrentSection('detail');
    window.location.hash = `#/vnc/${vnc.id}`;

    // Add to recently viewed
    const updatedRecent = addRecentlyViewed(vnc);
    setRecentlyViewed(updatedRecent);
  }, []);

  // Toggle Save (favorite)
  const handleToggleSave = useCallback((vnc: NormalizedVnc) => {
    const isNowSaved = toggleSavedVnc(vnc);
    const updatedSaved = getSavedVncList();
    setSavedRecords(updatedSaved);

    setIsSavedMap((prev) => ({
      ...prev,
      [vnc.id]: isNowSaved,
    }));
  }, []);

  // Toggle Compare
  const handleToggleCompare = useCallback(
    (id: number) => {
      setCompareIds((prev) => {
        if (prev.includes(id)) {
          setCompareVncs((current) => current.filter((item) => item.id !== id));
          return prev.filter((item) => item !== id);
        } else {
          if (prev.length >= 4) {
            alert('You can compare up to 4 VNC records simultaneously.');
            return prev;
          }
          // Find object
          let target =
            recentlyViewed.find((v) => v.id === id) ||
            savedRecords.find((v) => v.id === id) ||
            analyticsDataset.find((v) => v.id === id);

          if (activeVnc?.id === id) {
            target = activeVnc;
          }

          if (target) {
            setCompareVncs((current) => [...current, target!]);
          } else {
            // Fetch if missing
            vncRepo.getVncById(id).then((res) => {
              if (res.data) {
                setCompareVncs((current) => [...current, normalizeVncRecord(res.data)]);
              }
            });
          }

          return [...prev, id];
        }
      });
    },
    [recentlyViewed, savedRecords, analyticsDataset, activeVnc]
  );

  const handleLiveCheckResult = useCallback((id: number, res: LiveCheckResult) => {
    setLiveResults((prev) => ({
      ...prev,
      [id]: res,
    }));
  }, []);

  // Keyboard Shortcuts (Section 21)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // 1. Focus Search with /
      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        const searchEl = document.getElementById('global-search-input');
        if (searchEl) {
          searchEl.focus();
        } else {
          setCurrentSection('search');
        }
      }

      // 2. Command palette with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }

      // 3. Random VNC with R (when not typing in an input)
      if ((e.key === 'r' || e.key === 'R') && !isInputActive && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setCurrentSection('random');
        window.location.hash = '#/random';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (section: NavigationSection) => {
    setCurrentSection(section);
    if (section === 'explore') window.location.hash = '#/';
    if (section === 'search') window.location.hash = '#/search';
    if (section === 'random') window.location.hash = '#/random';
    if (section === 'analytics') window.location.hash = '#/analytics';
    if (section === 'saved') window.location.hash = '#/saved';
  };

  const handleQuickSearch = (query: string) => {
    setSearchInitialQuery(query);
    setCurrentSection('search');
    window.location.hash = `#/search?q=${encodeURIComponent(query)}`;
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Persistent Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={handleNavigate}
        compareCount={compareIds.length}
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        savedCount={savedRecords.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          currentSection={currentSection}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          onQuickSearch={handleQuickSearch}
          onRandomVnc={() => handleNavigate('random')}
          stats={stats}
          statsLoading={statsLoading}
        />

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {currentSection === 'explore' && (
            <ExploreView
              stats={stats}
              statsLoading={statsLoading}
              onNavigateSearch={(q) => (q ? handleQuickSearch(q) : handleNavigate('search'))}
              onNavigateRandom={() => handleNavigate('random')}
              onNavigateSaved={() => handleNavigate('saved')}
              recentlyViewed={recentlyViewed}
              savedRecords={savedRecords}
              onSelectVnc={handleSelectVnc}
              isSavedMap={isSavedMap}
              onToggleSave={handleToggleSave}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              liveResults={liveResults}
              onLiveCheckResult={handleLiveCheckResult}
            />
          )}

          {currentSection === 'search' && (
            <SearchView
              key={searchInitialQuery}
              initialQuery={searchInitialQuery}
              onSelectVnc={handleSelectVnc}
              isSavedMap={isSavedMap}
              onToggleSave={handleToggleSave}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              liveResults={liveResults}
              onLiveCheckResult={handleLiveCheckResult}
            />
          )}

          {currentSection === 'random' && (
            <RandomView
              onSelectVnc={handleSelectVnc}
              isSavedMap={isSavedMap}
              onToggleSave={handleToggleSave}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              liveResults={liveResults}
              onLiveCheckResult={handleLiveCheckResult}
            />
          )}

          {currentSection === 'analytics' && (
            <AnalyticsView
              stats={stats}
              dataset={analyticsDataset}
              onRefreshSample={fetchAnalyticsSample}
              loadingSample={loadingAnalyticsSample}
            />
          )}

          {currentSection === 'saved' && (
            <SavedView
              savedRecords={savedRecords}
              onSelectVnc={handleSelectVnc}
              onToggleSave={handleToggleSave}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              liveResults={liveResults}
              onLiveCheckResult={handleLiveCheckResult}
            />
          )}

          {currentSection === 'detail' && activeVnc && (
            <VncDetail
              vnc={activeVnc}
              onBack={() => handleNavigate('explore')}
              isSaved={Boolean(isSavedMap[activeVnc.id])}
              onToggleSave={handleToggleSave}
              savedMetadata={getSavedVncMetadata(activeVnc.id)}
              isCompared={compareIds.includes(activeVnc.id)}
              onToggleCompare={handleToggleCompare}
              liveCheckResult={liveResults[activeVnc.id]}
              onLiveCheckResult={handleLiveCheckResult}
            />
          )}
        </main>
      </div>

      {/* Compare Modal */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        vncs={compareVncs}
        onRemove={(id) => handleToggleCompare(id)}
        onClearAll={() => {
          setCompareIds([]);
          setCompareVncs([]);
        }}
        onSelectVnc={handleSelectVnc}
        liveResults={liveResults}
        onLiveCheckResult={handleLiveCheckResult}
      />

      {/* Diagnostics Modal */}
      <ApiDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onRandomVnc={() => handleNavigate('random')}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
        onTriggerSearchFilter={(type) => {
          if (type === 'country') handleQuickSearch('country:');
          else if (type === 'asn') handleQuickSearch('asn:');
          else if (type === 'desktop') handleQuickSearch('desktop:');
          else if (type === 'id') handleQuickSearch('id:');
        }}
      />
    </div>
  );
}
export default App;
