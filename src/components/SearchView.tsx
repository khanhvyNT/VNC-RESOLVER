import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  BookmarkPlus,
  X,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Globe,
  Server,
  Monitor,
  Tag,
  Check,
  CheckCircle2,
  Zap,
  Sparkles,
  Wand2,
  ShieldAlert,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { NormalizedVnc, LiveCheckResult } from '../types';
import { vncRepo } from '../services/apiClient';
import { normalizeVncRecord } from '../utils/formatters';
import { VncCard } from './VncCard';
import { VncTable } from './VncTable';
import { getSavedSearches, saveSearch, deleteSavedSearch } from '../services/storage';
import { useI18n } from '../services/i18n';
import { parseNaturalPrompt, ParsedPromptResult } from '../utils/promptParser';

interface SearchViewProps {
  initialQuery?: string;
  onSelectVnc: (vnc: NormalizedVnc) => void;
  isSavedMap: Record<number, boolean>;
  onToggleSave: (vnc: NormalizedVnc) => void;
  compareIds: number[];
  onToggleCompare: (id: number) => void;
  liveResults: Record<number, LiveCheckResult>;
  onLiveCheckResult: (id: number, res: LiveCheckResult) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  initialQuery = '',
  onSelectVnc,
  isSavedMap,
  onToggleSave,
  compareIds,
  onToggleCompare,
  liveResults,
  onLiveCheckResult,
}) => {
  const { t, language } = useI18n();

  // Free text query & parsed API filters
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [apiDesktopName, setApiDesktopName] = useState('');
  const [apiCountry, setApiCountry] = useState('');
  const [apiAsn, setApiAsn] = useState('');
  const [apiId, setApiId] = useState('');

  // Auto-Prompt AI System State
  const [autoPromptEnabled, setAutoPromptEnabled] = useState(true);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiParsedResult, setAiParsedResult] = useState<ParsedPromptResult | null>(null);

  // Auto connection testing on search results
  const [autoTestEnabled, setAutoTestEnabled] = useState(true);
  const [autoTestProgress, setAutoTestProgress] = useState<{
    active: boolean;
    total: number;
    completed: number;
    reachable: number;
    notReachable: number;
  } | null>(null);
  const autoTestAbortRef = useRef<AbortController | null>(null);

  // Local client-side refinement filters (clearly distinguished)
  const [localResolutionFilter, setLocalResolutionFilter] = useState<'all' | '1080p' | '720p' | '480p' | 'custom'>('all');
  const [localPortFilter, setLocalPortFilter] = useState<'all' | '5900' | '5901' | 'nonstandard'>('all');
  const [localLiveFilter, setLocalLiveFilter] = useState<'all' | 'reachable' | 'not_reachable'>('all');
  const [localAuthFilter, setLocalAuthFilter] = useState<'all' | 'no_password' | 'requires_password'>('all');
  const [localHasDesktopName, setLocalHasDesktopName] = useState(false);

  // Real-time parsed prompt interpretation
  const parsedPromptResult: ParsedPromptResult = useMemo(() => {
    return parseNaturalPrompt(queryInput);
  }, [queryInput]);
  
  const effectiveParsedResult = aiParsedResult || parsedPromptResult;

  // Results & View Mode
  const [results, setResults] = useState<NormalizedVnc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedTime, setCachedTime] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState(getSavedSearches());
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchSavedToast, setSearchSavedToast] = useState(false);

  // Clean up auto-test abort on unmount
  useEffect(() => {
    return () => {
      if (autoTestAbortRef.current) {
        autoTestAbortRef.current.abort();
      }
    };
  }, []);

  // Run automatic connectivity test for all records in the result set
  const runAutoConnectivityTest = async (items: NormalizedVnc[]) => {
    if (items.length === 0) return;

    if (autoTestAbortRef.current) {
      autoTestAbortRef.current.abort();
    }
    const controller = new AbortController();
    autoTestAbortRef.current = controller;

    let completedCount = 0;
    let reachableCount = 0;
    let notReachableCount = 0;

    setAutoTestProgress({
      active: true,
      total: items.length,
      completed: 0,
      reachable: 0,
      notReachable: 0,
    });

    const chunkSize = 8;
    for (let i = 0; i < items.length; i += chunkSize) {
      if (controller.signal.aborted) break;

      const chunk = items.slice(i, i + chunkSize);
      const targets = chunk.map((item) => ({
        id: item.id,
        ip: item.ipAddress,
        port: item.port,
      }));

      const resultsMap = await vncRepo.batchCheckConnections(targets, controller.signal);
      if (controller.signal.aborted) break;

      for (const item of chunk) {
        const res = resultsMap[item.id] || {
          status: 'not_reachable',
          tcpConnected: false,
          rfbHandshake: false,
          error: 'Connection timeout',
          checkedAt: Date.now(),
        };

        onLiveCheckResult(item.id, res);

        if (res.tcpConnected) {
          reachableCount++;
        } else {
          notReachableCount++;
        }
        completedCount++;
      }

      setAutoTestProgress({
        active: completedCount < items.length,
        total: items.length,
        completed: completedCount,
        reachable: reachableCount,
        notReachable: notReachableCount,
      });
    }

    setAutoTestProgress((prev) => (prev ? { ...prev, active: false } : null));
  };

  const cancelAutoTest = () => {
    if (autoTestAbortRef.current) {
      autoTestAbortRef.current.abort();
      autoTestAbortRef.current = null;
    }
    setAutoTestProgress((prev) => (prev ? { ...prev, active: false } : null));
  };

  // Parse input string for prefix syntax
  const parseQueryString = (input: string) => {
    let desktop = '';
    let country = '';
    let asn = '';
    let id = '';
    let remaining = '';

    const tokens = input.trim().split(/\s+/);
    tokens.forEach((token) => {
      if (token.toLowerCase().startsWith('desktop:')) {
        desktop = token.substring(8);
      } else if (token.toLowerCase().startsWith('country:')) {
        country = token.substring(8).toUpperCase();
      } else if (token.toLowerCase().startsWith('asn:')) {
        asn = token.substring(4);
      } else if (token.toLowerCase().startsWith('id:')) {
        id = token.substring(3);
      } else {
        remaining += (remaining ? ' ' : '') + token;
      }
    });

    // If remaining token looks like purely numbers, assume ID search if not already set
    if (!id && /^\d+$/.test(remaining)) {
      id = remaining;
      remaining = '';
    }
    // If 2 uppercase letters and no country set, can match country
    else if (!country && /^[A-Za-z]{2}$/.test(remaining)) {
      country = remaining.toUpperCase();
      remaining = '';
    }
    // If starts with AS and numbers
    else if (!asn && /^AS\d+$/i.test(remaining)) {
      asn = remaining.toUpperCase();
      remaining = '';
    }
    // Otherwise if desktop not set, treat remaining as desktop name search
    else if (!desktop && remaining) {
      desktop = remaining;
    }

    return { desktop, country, asn, id };
  };

  // Perform Search
  const executeSearch = async (overrideParams?: {
    desktop?: string;
    country?: string;
    asn?: string;
    id?: string;
  }) => {
    const params = overrideParams || {
      desktop: apiDesktopName,
      country: apiCountry,
      asn: apiAsn,
      id: apiId,
    };

    setLoading(true);
    setError(null);
    setIsFromCache(false);

    try {
      // 1. If searching directly by ID
      if (params.id && /^\d+$/.test(params.id)) {
        const res = await vncRepo.getVncById(parseInt(params.id, 10));
        if (res.data) {
          const norm = normalizeVncRecord(res.data);
          setResults([norm]);
          setIsFromCache(res.fromCache);
          setCachedTime(res.cachedAt || null);
          if (autoTestEnabled) {
            runAutoConnectivityTest([norm]);
          }
        } else {
          setResults([]);
        }
        return;
      }

      // 2. Otherwise search with documented API parameters
      const searchRes = await vncRepo.searchVncs({
        desktop_name: params.desktop || undefined,
        country: params.country || undefined,
        asn: params.asn || undefined,
        full: true,
      });

      const list = searchRes.data?.results || [];
      const normalized = list.map(normalizeVncRecord);
      setResults(normalized);
      setIsFromCache(searchRes.fromCache);
      setCachedTime(searchRes.cachedAt || null);

      if (normalized.length === 0) {
        setError(t('search.noResults'));
      } else if (autoTestEnabled) {
        runAutoConnectivityTest(normalized);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to execute search query.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to apply parsed prompt filters to state and execute search
  const applyParsedPrompt = (parsed: ParsedPromptResult, triggerSearch = true) => {
    setApiDesktopName(parsed.apiParams.desktop || '');
    setApiCountry(parsed.apiParams.country || '');
    setApiAsn(parsed.apiParams.asn || '');
    setApiId(parsed.apiParams.id || '');

    setLocalPortFilter(parsed.localFilters.port);
    setLocalResolutionFilter(parsed.localFilters.resolution);
    setLocalAuthFilter(parsed.localFilters.auth);
    if (parsed.localFilters.live === 'reachable') {
      setLocalLiveFilter('reachable');
    }

    if (triggerSearch) {
      executeSearch(parsed.apiParams);
    }
  };

  // Handle submit from search bar with Auto-Prompt AI translation
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoPromptEnabled) {
      const parsed = parseNaturalPrompt(queryInput);
      applyParsedPrompt(parsed, true);

      // If user provided a natural language query, run AI parsing in background to refine
      if (parsed.isNaturalLanguage) {
        setAiParsing(true);
        try {
          const aiRes = await vncRepo.parsePromptAI(queryInput);
          if (aiRes?.success) {
            setAiExplanation(aiRes.explanationVi || null);
            
            const newTokens: ParsedPromptResult['tokens'] = [];
            const newParams = { desktop: '', country: '', asn: '', id: '' };
            const newLocalFilters = { resolution: 'all', port: 'all', auth: 'all', live: 'all' } as ParsedPromptResult['localFilters'];
            
            if (aiRes.country) { newParams.country = aiRes.country.toUpperCase(); newTokens.push({ type: 'country', label: 'Quốc gia (AI)', value: aiRes.country.toUpperCase() }); }
            if (aiRes.desktop) { newParams.desktop = aiRes.desktop; newTokens.push({ type: 'desktop', label: 'Máy tính (AI)', value: aiRes.desktop }); }
            if (aiRes.asn) { newParams.asn = aiRes.asn; newTokens.push({ type: 'asn', label: 'Mạng (AI)', value: aiRes.asn }); }
            if (aiRes.id) { newParams.id = aiRes.id; newTokens.push({ type: 'id', label: 'ID (AI)', value: aiRes.id }); }
            
            if (aiRes.port && aiRes.port !== 'all') { newLocalFilters.port = aiRes.port; newTokens.push({ type: 'port', label: 'Cổng', value: aiRes.port }); }
            if (aiRes.auth && aiRes.auth !== 'all') { newLocalFilters.auth = aiRes.auth; newTokens.push({ type: 'auth', label: 'Bảo mật', value: aiRes.auth }); }
            if (aiRes.live === 'reachable') { newLocalFilters.live = 'reachable'; newTokens.push({ type: 'live', label: 'Kết nối', value: 'Reachable' }); }

            const parts: string[] = [];
            if (newParams.desktop) parts.push(newParams.desktop);
            if (newParams.country) parts.push(`country:${newParams.country}`);
            if (newParams.asn) parts.push(`asn:${newParams.asn}`);
            if (newParams.id) parts.push(`id:${newParams.id}`);
            if (newLocalFilters.port !== 'all') parts.push(`port:${newLocalFilters.port}`);
            if (newLocalFilters.auth === 'no_password') parts.push('noauth:true');

            setAiParsedResult({
              rawPrompt: queryInput,
              isNaturalLanguage: true,
              convertedQueryString: parts.join(' ') || queryInput,
              apiParams: newParams,
              localFilters: newLocalFilters,
              tokens: newTokens,
              aiContext: aiRes._resolverContext
            });

            let shouldReSearch = false;
            if (aiRes.country && aiRes.country.toUpperCase() !== parsed.apiParams.country) {
              setApiCountry(aiRes.country.toUpperCase());
              shouldReSearch = true;
            }
            if (aiRes.desktop && aiRes.desktop !== parsed.apiParams.desktop) {
              setApiDesktopName(aiRes.desktop);
              shouldReSearch = true;
            }
            if (aiRes.port && aiRes.port !== 'all') setLocalPortFilter(aiRes.port);
            if (aiRes.auth && aiRes.auth !== 'all') setLocalAuthFilter(aiRes.auth);
            if (aiRes.live === 'reachable') setLocalLiveFilter('reachable');
            
            if (shouldReSearch) {
              executeSearch(newParams);
            }
          }
        } catch {
          // Keep rule-based parsing result
        } finally {
          setAiParsing(false);
        }
      }
    } else {
      const parsed = parseQueryString(queryInput);
      setApiDesktopName(parsed.desktop);
      setApiCountry(parsed.country);
      setApiAsn(parsed.asn);
      setApiId(parsed.id);
      executeSearch(parsed);
    }
  };

  // Initial query execution on mount if provided
  useEffect(() => {
    if (initialQuery) {
      const parsed = autoPromptEnabled ? parseNaturalPrompt(initialQuery) : parseQueryString(initialQuery);
      if ('apiParams' in parsed) {
        applyParsedPrompt(parsed as ParsedPromptResult, true);
      } else {
        setApiDesktopName(parsed.desktop);
        setApiCountry(parsed.country);
        setApiAsn(parsed.asn);
        setApiId(parsed.id);
        executeSearch(parsed);
      }
    } else {
      // Execute default exploratory search (e.g. recent open entries, country:RO or JP or all)
      executeSearch({ country: 'RO' });
      setApiCountry('RO');
      setQueryInput('country:RO');
    }
  }, [initialQuery]);

  // Apply local post-filters
  const filteredResults = results.filter((vnc) => {
    // Local Resolution filter
    if (localResolutionFilter === '1080p') {
      if (vnc.width !== 1920 || vnc.height !== 1080) return false;
    } else if (localResolutionFilter === '720p') {
      if (vnc.width !== 1280 || vnc.height !== 720) return false;
    } else if (localResolutionFilter === '480p') {
      if (vnc.height > 600) return false;
    } else if (localResolutionFilter === 'custom') {
      if (vnc.aspectRatio === '16:9' || vnc.aspectRatio === '4:3') return false;
    }

    // Local Port filter
    if (localPortFilter === '5900') {
      if (vnc.port !== 5900) return false;
    } else if (localPortFilter === '5901') {
      if (vnc.port !== 5901) return false;
    } else if (localPortFilter === 'nonstandard') {
      if (vnc.port === 5900 || vnc.port === 5901) return false;
    }

    // Local Auth filter
    if (localAuthFilter === 'no_password' && vnc.hasPassword) {
      return false;
    }
    if (localAuthFilter === 'requires_password' && !vnc.hasPassword) {
      return false;
    }

    // Local Desktop name present
    if (localHasDesktopName && !vnc.desktopName) {
      return false;
    }

    // Local Live Check filter
    if (localLiveFilter !== 'all') {
      const live = liveResults[vnc.id];
      if (localLiveFilter === 'reachable' && live?.status !== 'reachable') {
        return false;
      }
      if (localLiveFilter === 'not_reachable' && live?.status !== 'not_reachable') {
        return false;
      }
    }

    return true;
  });

  // Handle saving search
  const handleSaveCurrentSearch = () => {
    if (!saveSearchName.trim()) return;
    const newSearch = saveSearch(saveSearchName.trim(), queryInput, {
      desktop_name: apiDesktopName || undefined,
      country: apiCountry || undefined,
      asn: apiAsn || undefined,
      vnc_id: apiId || undefined,
    });
    setSavedSearches(getSavedSearches());
    setSaveSearchName('');
    setShowSaveDialog(false);
    setSearchSavedToast(true);
    setTimeout(() => setSearchSavedToast(false), 2500);
  };

  const handleApplySavedSearch = (s: typeof savedSearches[0]) => {
    setQueryInput(s.query);
    const parsed = parseQueryString(s.query);
    setApiDesktopName(parsed.desktop);
    setApiCountry(parsed.country);
    setApiAsn(parsed.asn);
    setApiId(parsed.id);
    executeSearch(parsed);
  };

  const handleDeleteSavedSearch = (id: string) => {
    deleteSavedSearch(id);
    setSavedSearches(getSavedSearches());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Search Bar & Primary Form */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg">
        {/* Top bar with Search Mode + Auto-Prompt AI toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400 font-medium">{t('search.pageTitle')}</span>
          </div>

          <button
            type="button"
            onClick={() => setAutoPromptEnabled(!autoPromptEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition border ${
              autoPromptEnabled
                ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Tự động dịch yêu cầu tìm kiếm bằng ngôn ngữ tự nhiên sang bộ lọc chính xác"
          >
            <Sparkles className={`w-3.5 h-3.5 ${autoPromptEnabled ? 'text-cyan-400 animate-pulse' : 'text-zinc-500'}`} />
            <span>{autoPromptEnabled ? t('autoPrompt.enabled') : t('autoPrompt.disabled')}</span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('search.inputPlaceholder')}
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value);
                setAiExplanation(null);
                setAiParsedResult(null);
              }}
              className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-semibold transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{loading ? t('search.searching') : t('search.btnSearch')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`p-2.5 rounded-xl border text-xs font-mono transition flex items-center gap-1.5 ${
                showFiltersPanel
                  ? 'bg-zinc-800 text-cyan-400 border-cyan-800'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border-zinc-750'
              }`}
              title="Toggle API & Client Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{t('search.filterTitle').split('&')[0].trim()}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-750 text-xs font-mono transition"
              title={t('search.saveSearchTitle')}
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Live Auto-Prompt Interpretation Box */}
        {autoPromptEnabled && queryInput.trim() && effectiveParsedResult.tokens.length > 0 && (
          <div className="p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-xl space-y-2 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('autoPrompt.detected')}</span>
              </div>
              <div className="flex items-center gap-2">
                {aiParsing && (
                  <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{t('autoPrompt.analyzing')}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => applyParsedPrompt(effectiveParsedResult, true)}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-medium transition shadow-sm active:scale-95"
                >
                  {t('autoPrompt.applyAndSearch')}
                </button>
              </div>
            </div>

            {/* Token Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {effectiveParsedResult.tokens.map((tok, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-900/60 border border-cyan-700/60 text-cyan-200 text-xs font-mono"
                >
                  <span className="text-cyan-400 text-[10px] font-bold uppercase">{tok.label}:</span>
                  <span className="font-semibold">{tok.value}</span>
                </span>
              ))}
            </div>

            {/* Converted Filter Syntax preview */}
            <div className="text-[11px] font-mono text-zinc-400 flex flex-wrap items-center gap-1.5 pt-0.5">
              <span>{t('autoPrompt.convertingTo')}</span>
              <code className="px-1.5 py-0.5 rounded bg-zinc-950 text-cyan-300 border border-zinc-800 font-bold">
                {effectiveParsedResult.convertedQueryString || queryInput}
              </code>
              {aiExplanation && (
                <span className="text-zinc-400 italic">({aiExplanation})</span>
              )}
            </div>
            
            {/* Semantic Candidates Details */}
            {effectiveParsedResult.aiContext?.clientname_candidates && effectiveParsedResult.aiContext.clientname_candidates.length > 0 && (
              <div className="mt-2 pt-2 border-t border-cyan-800/40 text-[10px] font-mono text-zinc-400">
                <span className="text-cyan-400 uppercase tracking-wider block mb-1">Semantic Inference (Other Candidates):</span>
                <div className="flex flex-wrap gap-1.5">
                  {effectiveParsedResult.aiContext.clientname_candidates.map((c: any, i: number) => (
                    <span key={i} className="bg-cyan-950/40 border border-cyan-900/60 px-1.5 py-0.5 rounded text-cyan-200">
                      {c.value} {c.confidence ? `(${(c.confidence * 100).toFixed(0)}%)` : ''}
                    </span>
                  ))}
                  {effectiveParsedResult.aiContext.fallback_terms?.map((f: string, i: number) => (
                    <span key={`fb-${i}`} className="bg-zinc-800/40 border border-zinc-700/60 px-1.5 py-0.5 rounded text-zinc-400">
                      {f} (fallback)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Sample Prompts (Vietnamese & English presets) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-cyan-400" />
            <span>{t('autoPrompt.samplePrompts')}</span>
          </span>
          {[
            { label: t('autoPrompt.preset.vn'), query: 'vnc ở việt nam cổng 5900' },
            { label: t('autoPrompt.preset.jp'), query: 'máy tính windows tại nhật bản' },
            { label: t('autoPrompt.preset.nopass'), query: 'không cần mật khẩu ở đức' },
            { label: t('autoPrompt.preset.hmi'), query: 'hệ thống hmi scada tại ý' },
            { label: t('autoPrompt.preset.live'), query: 'kết nối được ở mỹ' },
            { label: t('autoPrompt.preset.viettel'), query: 'mạng viettel' },
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQueryInput(preset.query);
                const parsed = parseNaturalPrompt(preset.query);
                applyParsedPrompt(parsed, true);
              }}
              className="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-cyan-300 text-[11px] font-mono transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Quick settings & Saved Searches Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-850">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-zinc-300 hover:text-zinc-100 transition py-0.5">
              <input
                type="checkbox"
                checked={autoTestEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoTestEnabled(val);
                  if (val && results.length > 0 && !autoTestProgress?.active) {
                    runAutoConnectivityTest(results);
                  } else if (!val) {
                    cancelAutoTest();
                  }
                }}
                className="w-3.5 h-3.5 rounded border-zinc-700 text-cyan-600 focus:ring-0 bg-zinc-950"
              />
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('search.autoTest')}</span>
              </span>
            </label>

            {results.length > 0 && (
              <button
                type="button"
                onClick={() => runAutoConnectivityTest(results)}
                disabled={autoTestProgress?.active}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:text-cyan-400 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${autoTestProgress?.active ? 'animate-spin' : ''}`} />
                <span>{t('search.testAll')}</span>
              </button>
            )}
          </div>

          {savedSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono text-zinc-500">{t('search.savedSearches')}</span>
              {savedSearches.map((s) => (
                <div
                  key={s.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 hover:border-zinc-700"
                >
                  <button
                    onClick={() => handleApplySavedSearch(s)}
                    className="hover:text-cyan-400 transition truncate max-w-[130px]"
                  >
                    {s.name}
                  </button>
                  <button
                    onClick={() => handleDeleteSavedSearch(s.id)}
                    className="text-zinc-600 hover:text-rose-400"
                    title="Remove saved search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Search Modal / Input Popup */}
        {showSaveDialog && (
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-750 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in duration-100">
            <input
              type="text"
              placeholder={t('search.saveSearchTitle')}
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSaveCurrentSearch}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-mono font-semibold transition"
              >
                {t('app.save')}
              </button>
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-mono"
              >
                {t('app.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {searchSavedToast && (
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800 p-2 rounded-lg">
            <Check className="w-4 h-4" />
            <span>Search successfully saved to local storage!</span>
          </div>
        )}

        {/* Expanded Filters Panel: Explicit Separation of Remote API vs Local Filters (Section 5) */}
        {showFiltersPanel && (
          <div className="p-4 bg-zinc-950/90 rounded-xl border border-zinc-800 space-y-4 animate-in fade-in duration-150">
            {/* 1. Remote API Filters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                <span>1. {t('search.filterTitle')} (Remote API)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.desktop')}</label>
                  <input
                    type="text"
                    placeholder="e.g. Windows, Ubuntu, HMI"
                    value={apiDesktopName}
                    onChange={(e) => setApiDesktopName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.country')}</label>
                  <input
                    type="text"
                    placeholder="e.g. VN, JP, US, DE, RO"
                    value={apiCountry}
                    onChange={(e) => setApiCountry(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.asn')}</label>
                  <input
                    type="text"
                    placeholder="e.g. AS16276, Viettel"
                    value={apiAsn}
                    onChange={(e) => setApiAsn(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.id')}</label>
                  <input
                    type="text"
                    placeholder="e.g. 613437"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Client-Side Post Filters */}
            <div className="space-y-2 pt-3 border-t border-zinc-850">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>2. {t('search.filterTitle')} (Local Filters)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                {/* Resolution filter */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.resolution')}</label>
                  <select
                    value={localResolutionFilter}
                    onChange={(e: any) => setLocalResolutionFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">{t('app.all')}</option>
                    <option value="1080p">1920 × 1080 (1080p)</option>
                    <option value="720p">1280 × 720 (720p)</option>
                    <option value="480p">Low Resolution (≤ 480p)</option>
                    <option value="custom">Non-standard Ratios</option>
                  </select>
                </div>

                {/* Port filter */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.port')}</label>
                  <select
                    value={localPortFilter}
                    onChange={(e: any) => setLocalPortFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">{t('app.all')}</option>
                    <option value="5900">Standard VNC (:5900)</option>
                    <option value="5901">Secondary Display (:5901)</option>
                    <option value="nonstandard">Non-standard Ports</option>
                  </select>
                </div>

                {/* Auth / Password Filter */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.auth')}</label>
                  <select
                    value={localAuthFilter}
                    onChange={(e: any) => setLocalAuthFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">{t('app.all')}</option>
                    <option value="no_password">{t('search.noPass')}</option>
                    <option value="requires_password">{t('search.hasPass')}</option>
                  </select>
                </div>

                {/* Live Check Filter */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">{t('search.liveStatus')}</label>
                  <select
                    value={localLiveFilter}
                    onChange={(e: any) => setLocalLiveFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">{t('app.all')}</option>
                    <option value="reachable">{t('search.liveReachable')}</option>
                    <option value="not_reachable">{t('search.liveOffline')}</option>
                  </select>
                </div>
              </div>

              {/* Desktop Name present toggle */}
              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-300 text-xs font-mono">
                  <input
                    type="checkbox"
                    checked={localHasDesktopName}
                    onChange={(e) => setLocalHasDesktopName(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-cyan-600 focus:ring-0"
                  />
                  <span>Require named desktop</span>
                </label>
              </div>
            </div>

            {/* Apply & Reset Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setApiDesktopName('');
                  setApiCountry('');
                  setApiAsn('');
                  setApiId('');
                  setLocalResolutionFilter('all');
                  setLocalPortFilter('all');
                  setLocalAuthFilter('all');
                  setLocalLiveFilter('all');
                  setLocalHasDesktopName(false);
                  setQueryInput('');
                  setAiExplanation(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                {t('app.clear')}
              </button>
              <button
                type="button"
                onClick={() => executeSearch()}
                className="px-4 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition"
              >
                {t('app.apply')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Header: Count, Cached Notification, View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider">
            {t('search.results')}
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-cyan-300 border border-zinc-750">
            {filteredResults.length} {filteredResults.length === 1 ? 'record' : 'records'}
            {results.length !== filteredResults.length && ` (of ${results.length} fetched)`}
          </span>

          {isFromCache && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded">
              <Info className="w-3 h-3" />
              <span>
                {t('search.cachedData')}{cachedTime ? ` ${new Date(cachedTime).toLocaleTimeString()}` : ''}
              </span>
            </span>
          )}
        </div>

        {/* Card vs Table View Mode Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-mono">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
              viewMode === 'card'
                ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{t('search.cardsView')}</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
              viewMode === 'table'
                ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>{t('search.tableView')}</span>
          </button>
        </div>
      </div>

      {/* Auto-Test Connectivity Banner */}
      {autoTestProgress && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              {autoTestProgress.active ? (
                <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-200">
                <span>
                  {autoTestProgress.active
                    ? `${t('search.testingProgress')} (${autoTestProgress.completed}/${autoTestProgress.total})`
                    : `${t('search.testDone')} (${autoTestProgress.total})`}
                </span>
                <span className="text-[11px] text-zinc-400">
                  ({autoTestProgress.completed}/{autoTestProgress.total})
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono mt-0.5">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {autoTestProgress.reachable} {t('search.liveReachable')}
                </span>
                <span className="text-zinc-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
                  {autoTestProgress.notReachable} {t('search.liveOffline')}
                </span>
              </div>
            </div>
          </div>

          {/* Controls & Progress bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Progress Bar Meter */}
            <div className="w-24 sm:w-32 h-2 bg-zinc-800 rounded-full overflow-hidden shrink-0">
              <div
                className={`h-full transition-all duration-300 ${
                  autoTestProgress.active ? 'bg-cyan-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.round((autoTestProgress.completed / Math.max(1, autoTestProgress.total)) * 100)}%`,
                }}
              />
            </div>

            {autoTestProgress.reachable > 0 && localLiveFilter !== 'reachable' && (
              <button
                type="button"
                onClick={() => setLocalLiveFilter('reachable')}
                className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5"
                title="Filter results to show only reachable VNCs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('search.showReachableOnly')} ({autoTestProgress.reachable})</span>
              </button>
            )}

            {localLiveFilter === 'reachable' && (
              <button
                type="button"
                onClick={() => setLocalLiveFilter('all')}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-800/60 rounded-lg text-xs font-mono transition"
              >
                {t('app.all')}
              </button>
            )}

            {autoTestProgress.active ? (
              <button
                type="button"
                onClick={cancelAutoTest}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={() => runAutoConnectivityTest(results)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('search.testAll')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-24 text-center space-y-3 font-mono">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Querying Computernewb VNC Resolver database...</p>
        </div>
      )}

      {/* Content Rendering: Card or Table */}
      {!loading && filteredResults.length > 0 && (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResults.map((vnc) => (
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
          ) : (
            <VncTable
              vncs={filteredResults}
              isSavedMap={isSavedMap}
              onToggleSave={onToggleSave}
              onSelect={onSelectVnc}
              compareIds={compareIds}
              onToggleCompare={onToggleCompare}
              liveResults={liveResults}
              onLiveCheckResult={onLiveCheckResult}
            />
          )}
        </>
      )}

      {!loading && !error && filteredResults.length === 0 && (
        <div className="py-16 text-center space-y-2 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40 p-6 font-mono text-xs text-zinc-500">
          <p>No records matched your query filters.</p>
          <p>Try broadening your query, for instance searching by country: <code className="text-cyan-400">country:RO</code> or <code className="text-cyan-400">country:US</code>.</p>
        </div>
      )}
    </div>
  );
};
