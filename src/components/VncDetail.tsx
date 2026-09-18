import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Share2,
  Copy,
  Check,
  Globe,
  Server,
  Monitor,
  Database,
  CheckCircle2,
  CircleDashed,
  Tag,
  Plus,
  X,
  FileText,
  Sliders,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';
import { NormalizedVnc, LiveCheckResult, SavedVncMetadata } from '../types';
import { LiveConnectionCheck } from './LiveConnectionCheck';
import { RawJsonViewer } from './RawJsonViewer';
import { VncScreenshot } from './VncScreenshot';
import {
  getCollections,
  addCollection,
  updateSavedVncMetadata,
} from '../services/storage';

interface VncDetailProps {
  vnc: NormalizedVnc;
  onBack: () => void;
  isSaved: boolean;
  onToggleSave: (vnc: NormalizedVnc) => void;
  savedMetadata?: SavedVncMetadata;
  onUpdateMetadata?: (metadata: Partial<SavedVncMetadata>) => void;
  isCompared: boolean;
  onToggleCompare: (id: number) => void;
  liveCheckResult?: LiveCheckResult;
  onLiveCheckResult: (id: number, res: LiveCheckResult) => void;
}

export const VncDetail: React.FC<VncDetailProps> = ({
  vnc,
  onBack,
  isSaved,
  onToggleSave,
  savedMetadata,
  onUpdateMetadata,
  isCompared,
  onToggleCompare,
  liveCheckResult,
  onLiveCheckResult,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'raw_json'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Local metadata editing states
  const [notes, setNotes] = useState<string>(savedMetadata?.notes || '');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [availableCollections, setAvailableCollections] = useState<string[]>(getCollections());
  const selectedCollections = savedMetadata?.collections || [];

  const copyText = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyDeepLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/vnc/${vnc.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNotesBlur = () => {
    if (savedMetadata) {
      updateSavedVncMetadata(vnc.id, { notes });
      onUpdateMetadata?.({ notes });
    }
  };

  const handleToggleCollection = (col: string) => {
    if (!savedMetadata) return;
    const current = savedMetadata.collections || [];
    const next = current.includes(col) ? current.filter((c) => c !== col) : [...current, col];
    updateSavedVncMetadata(vnc.id, { collections: next });
    onUpdateMetadata?.({ collections: next });
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const updated = addCollection(newCollectionName.trim());
    setAvailableCollections(updated);
    if (savedMetadata) {
      const next = [...(savedMetadata.collections || []), newCollectionName.trim()];
      updateSavedVncMetadata(vnc.id, { collections: next });
      onUpdateMetadata?.({ collections: next });
    }
    setNewCollectionName('');
    setShowAddCollection(false);
  };

  // Data completeness items (Section 15)
  const completenessItems = [
    { label: 'IP address', present: Boolean(vnc.ipAddress), val: vnc.ipAddress },
    { label: 'Port', present: Boolean(vnc.port), val: String(vnc.port) },
    { label: 'ASN identifier', present: Boolean(vnc.asnCode && vnc.asnCode !== 'Unknown'), val: vnc.asnCode },
    { label: 'Country code', present: Boolean(vnc.countryCode), val: vnc.countryCode },
    { label: 'City location', present: Boolean(vnc.city), val: vnc.city || 'Not provided' },
    { label: 'Display resolution', present: Boolean(vnc.width && vnc.height), val: vnc.resolution },
    { label: 'Scan timestamp', present: Boolean(vnc.scannedTimestamp), val: vnc.formattedDate },
    {
      label: 'Reverse DNS (rDNS)',
      present: Boolean(vnc.rdnsHostname),
      val: vnc.rdnsHostname || 'Unavailable (Normal for many public IP allocations)',
      optional: true,
    },
    {
      label: 'Desktop name',
      present: Boolean(vnc.desktopName),
      val: vnc.desktopName || 'Unadvertised in protocol handshake',
      optional: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Navigation & Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Explorer</span>
          </button>

          <div className="h-4 w-px bg-zinc-700" />

          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-zinc-100">
              VNC #{vnc.id}
            </span>
            <span className="text-sm">{vnc.countryFlag}</span>
            <span className="text-xs font-medium text-zinc-300">
              {vnc.countryName}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Compare toggle */}
          <button
            onClick={() => onToggleCompare(vnc.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              isCompared
                ? 'bg-cyan-950/70 border border-cyan-800 text-cyan-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
            }`}
          >
            {isCompared ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> : <Square className="w-3.5 h-3.5" />}
            <span>{isCompared ? 'In Compare' : 'Add to Compare'}</span>
          </button>

          {/* Favorite */}
          <button
            onClick={() => onToggleSave(vnc)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              isSaved
                ? 'bg-amber-950/60 border border-amber-800 text-amber-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Deep link share */}
          <button
            onClick={copyDeepLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-mono transition"
            title="Copy deep link (/vnc/[id])"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Tabs: Overview vs Raw JSON */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition ${
            activeTab === 'overview'
              ? 'bg-zinc-800 text-cyan-400 font-semibold border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Overview & Metadata</span>
        </button>
        <button
          onClick={() => setActiveTab('raw_json')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition ${
            activeTab === 'raw_json'
              ? 'bg-zinc-800 text-cyan-400 font-semibold border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Raw JSON View</span>
        </button>
      </div>

      {activeTab === 'raw_json' ? (
        <RawJsonViewer data={vnc.raw} />
      ) : (
        <div className="space-y-6">
          {/* Section 8 & 9: Live Connection Check (Strictly separated from Historical scan) */}
          <LiveConnectionCheck
            ip={vnc.ipAddress}
            port={vnc.port}
            initialResult={liveCheckResult}
            onResultChange={(res) => onLiveCheckResult(vnc.id, res)}
          />

          {/* Historical vs Live status explicit highlight box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Historical Resolver Box */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Historical Resolver Record
              </div>
              <div className="text-base font-semibold text-zinc-100 font-mono">
                {vnc.scanAgeHuman}
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                Scan timestamp: {vnc.formattedDate}
              </div>
              <p className="text-[11px] text-zinc-500 pt-1">
                Data recorded when computernewb.com scanner originally logged this entry.
              </p>
            </div>

            {/* Current Observation Box */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400/90 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Real-Time Observation
              </div>
              <div className="text-base font-semibold font-mono">
                {liveCheckResult?.status === 'reachable' ? (
                  <span className="text-emerald-400">Reachable ({liveCheckResult.latencyMs}ms)</span>
                ) : liveCheckResult?.status === 'port_reachable' ? (
                  <span className="text-amber-400">Port Open (Handshake Failed)</span>
                ) : liveCheckResult?.status === 'not_reachable' ? (
                  <span className="text-rose-400">Not Reachable</span>
                ) : (
                  <span className="text-zinc-400">Not Checked Yet</span>
                )}
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                Target: {vnc.ipAddress}:{vnc.port}
              </div>
              <p className="text-[11px] text-zinc-500 pt-1">
                Instant non-intrusive probe. Historical age and live status are distinct.
              </p>
            </div>
          </div>

          {/* Primary Metadata 3-Column Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Network */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Network</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>IP Address</span>
                    <button
                      onClick={() => copyText('ip', vnc.ipAddress)}
                      className="text-zinc-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedField === 'ip' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-zinc-100 bg-zinc-950 p-2 rounded border border-zinc-800/80">
                    {vnc.ipAddress}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Port</span>
                    <button
                      onClick={() => copyText('port', String(vnc.port))}
                      className="text-zinc-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedField === 'port' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-cyan-400 bg-zinc-950 p-2 rounded border border-zinc-800/80">
                    {vnc.port}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                    <span>Autonomous System (ASN)</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 space-y-1">
                    <div className="text-xs font-bold text-zinc-200">{vnc.asnCode}</div>
                    <div className="text-[11px] text-zinc-400 truncate" title={vnc.asnOrg}>
                      {vnc.asnOrg}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>rDNS Hostname</span>
                    {vnc.rdnsHostname && (
                      <button
                        onClick={() => copyText('rdns', vnc.rdnsHostname!)}
                        className="text-zinc-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {copiedField === 'rdns' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 text-[11px] break-all">
                    {vnc.rdnsHostname || (
                      <span className="text-zinc-500 italic">No reverse DNS record</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Geographic Information */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Geographic Information</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                    Country
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex items-center gap-2">
                    <span className="text-2xl leading-none">{vnc.countryFlag}</span>
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {vnc.countryName}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        ISO Code: {vnc.countryCode}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                    State / Region
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 text-zinc-200">
                    {vnc.state || <span className="text-zinc-500 italic">Not reported</span>}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                    City
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 text-zinc-200">
                    {vnc.city || <span className="text-zinc-500 italic">Not reported</span>}
                  </div>
                </div>

                <div className="flex items-start gap-1.5 p-2 rounded bg-zinc-950/40 border border-zinc-800/60 text-[10px] text-zinc-400">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Notice:</strong> Geolocation coordinates and city names are approximate IP-based estimates and do not represent precise physical equipment addresses.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Display Information */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
                <Monitor className="w-4 h-4 text-purple-400" />
                <span>Display & Frame</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                    Desktop Name
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 text-zinc-100 font-semibold truncate">
                    {vnc.desktopName || (
                      <span className="text-zinc-500 italic font-normal">Unspecified / Blank</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                    Resolution & Aspect Ratio
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 space-y-1">
                    <div className="text-sm font-bold text-zinc-100">
                      {vnc.resolution}
                    </div>
                    <div className="text-[11px] text-cyan-400">
                      Aspect Ratio: {vnc.aspectRatio}
                    </div>
                  </div>
                </div>

                {/* Screenshot Preview */}
                <div className="pt-2">
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                    Screenshot Preview
                  </div>
                  <VncScreenshot id={vnc.id} className="min-h-[120px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 15: Data Completeness Matrix */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-zinc-200 font-mono">
                  Data Completeness Verification
                </h4>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {completenessItems.filter((i) => i.present).length} / {completenessItems.length} attributes documented
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {completenessItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded bg-zinc-950/60 border border-zinc-800/70 text-xs font-mono"
                >
                  {item.present ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <CircleDashed className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-zinc-200 font-medium truncate">{item.label}</div>
                    <div className="text-[11px] text-zinc-400 truncate" title={item.val}>
                      {item.val}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-zinc-500 pt-1">
              Note: Fields like <code className="text-zinc-400">rdns_hostname</code> and <code className="text-zinc-400">desktop_name</code> can legitimately be null under RFB specification standards when not configured by server operators.
            </p>
          </div>

          {/* Section 11: Local User Metadata (Collections, Notes, Saved Status) */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-zinc-200 font-mono">
                  Local Metadata & Research Notes
                </h4>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                Stored purely in local browser storage (never sent to remote server)
              </span>
            </div>

            {isSaved ? (
              <div className="space-y-4">
                {/* Collections / Tags */}
                <div>
                  <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Assigned Collections</span>
                    <button
                      onClick={() => setShowAddCollection(!showAddCollection)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Collection</span>
                    </button>
                  </div>

                  {showAddCollection && (
                    <form onSubmit={handleCreateCollection} className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Collection name (e.g. Unusual ports)"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono transition"
                      >
                        Add
                      </button>
                    </form>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {availableCollections.map((col) => {
                      const isSelected = selectedCollections.includes(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => handleToggleCollection(col)}
                          className={`px-2.5 py-1 rounded-full text-xs font-mono transition flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${isSelected ? 'fill-amber-400' : ''}`} />
                          <span>{col}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Research Notes Editor */}
                <div>
                  <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Researcher Notes
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Add research observations, environment characteristics, or investigation notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <div className="text-[11px] text-zinc-500 flex justify-between mt-1">
                    <span>Changes automatically save on blur</span>
                    <button
                      onClick={handleNotesBlur}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      Save note
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950/60 p-4 rounded-lg border border-dashed border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Save this VNC record to organize it into custom research collections and attach local notes.
                </span>
                <button
                  onClick={() => onToggleSave(vnc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono transition shrink-0 ml-3"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  <span>Save Record</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
