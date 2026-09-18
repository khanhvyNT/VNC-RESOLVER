import React, { useState } from 'react';
import {
  Bookmark,
  Tag,
  Plus,
  Trash2,
  Download,
  Search,
  Filter,
  Layers,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { NormalizedVnc, LiveCheckResult, SavedVncMetadata } from '../types';
import { VncCard } from './VncCard';
import {
  getCollections,
  addCollection,
  deleteCollection,
  getSavedVncMetadata,
} from '../services/storage';

interface SavedViewProps {
  savedRecords: NormalizedVnc[];
  onSelectVnc: (vnc: NormalizedVnc) => void;
  onToggleSave: (vnc: NormalizedVnc) => void;
  compareIds: number[];
  onToggleCompare: (id: number) => void;
  liveResults: Record<number, LiveCheckResult>;
  onLiveCheckResult: (id: number, res: LiveCheckResult) => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  savedRecords,
  onSelectVnc,
  onToggleSave,
  compareIds,
  onToggleCompare,
  liveResults,
  onLiveCheckResult,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [collections, setCollections] = useState<string[]>(getCollections());
  const [newCollectionInput, setNewCollectionInput] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);

  const handleAddCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionInput.trim()) return;
    const updated = addCollection(newCollectionInput.trim());
    setCollections(updated);
    setNewCollectionInput('');
    setShowAddCollection(false);
  };

  const handleDeleteCollection = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCollection(name);
    setCollections(updated);
    if (selectedCollection === name) {
      setSelectedCollection('all');
    }
  };

  // Filter records
  const filteredRecords = savedRecords.filter((vnc) => {
    const meta = getSavedVncMetadata(vnc.id);

    // Collection filter
    if (selectedCollection !== 'all') {
      if (!meta?.collections || !meta.collections.includes(selectedCollection)) {
        return false;
      }
    }

    // Text search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchText = `${vnc.id} ${vnc.ipAddress} ${vnc.desktopName || ''} ${vnc.countryName} ${vnc.countryCode} ${vnc.asnCode} ${meta?.notes || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    return true;
  });

  // Export to JSON
  const handleExportJson = () => {
    const dataToExport = savedRecords.map((vnc) => ({
      ...vnc,
      metadata: getSavedVncMetadata(vnc.id),
    }));
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vnc_resolver_saved_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'IP Address', 'Port', 'Country', 'City', 'ASN', 'Desktop Name', 'Resolution', 'Scan Date', 'Notes'];
    const rows = savedRecords.map((vnc) => {
      const meta = getSavedVncMetadata(vnc.id);
      return [
        vnc.id,
        vnc.ipAddress,
        vnc.port,
        `"${vnc.countryName} (${vnc.countryCode})"`,
        `"${vnc.city || ''}"`,
        `"${vnc.asnCode}"`,
        `"${(vnc.desktopName || '').replace(/"/g, '""')}"`,
        vnc.resolution,
        `"${vnc.formattedDate}"`,
        `"${(meta?.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vnc_resolver_saved_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-mono">
      {/* Top Banner */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-xs text-amber-300">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Saved Records & Research Collections</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100">
            Local Workspace & Pinned Servers
          </h2>
          <p className="text-xs text-zinc-400">
            Group discovered endpoints by research classification, tag unusual configurations, and record findings.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {savedRecords.length > 0 && (
            <>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition"
                title="Export saved records to JSON"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition"
                title="Export saved records to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collections Bar & Filters */}
      <div className="space-y-3 bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Collections</span>
          </div>

          <button
            onClick={() => setShowAddCollection(!showAddCollection)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Collection</span>
          </button>
        </div>

        {showAddCollection && (
          <form onSubmit={handleAddCollection} className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="e.g. High-res displays, Industrial..."
              value={newCollectionInput}
              onChange={(e) => setNewCollectionInput(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
            >
              Add
            </button>
          </form>
        )}

        {/* Collection Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setSelectedCollection('all')}
            className={`px-3 py-1 rounded-full text-xs transition ${
              selectedCollection === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
            }`}
          >
            All Saved ({savedRecords.length})
          </button>

          {collections.map((col) => (
            <div
              key={col}
              onClick={() => setSelectedCollection(col)}
              className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs cursor-pointer transition ${
                selectedCollection === col
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              <span>{col}</span>
              <button
                type="button"
                onClick={(e) => handleDeleteCollection(col, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition"
                title="Delete collection tag"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Filter search within saved */}
        <div className="pt-2">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter saved items by keyword, note, or IP..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of Saved Records */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((vnc) => (
            <VncCard
              key={vnc.id}
              vnc={vnc}
              isSaved={true}
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
        <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40 p-8 space-y-2 text-xs text-zinc-500">
          <Bookmark className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-zinc-300 font-bold">No saved VNC records in this view</p>
          <p>
            Browse the <strong>Search</strong> or <strong>Explore</strong> tab and click the star icon on any card to save it for your research.
          </p>
        </div>
      )}
    </div>
  );
};
