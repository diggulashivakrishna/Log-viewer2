/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { Search, Upload, RotateCcw, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogEntry {
  message?: string;
  context?: string;
  level?: string;
  level_name?: string;
  channel?: string;
  record_datetime?: string;
  remote_addr?: string;
  user_agent?: string;
  created_at?: string;
  formatted?: string;
  [key: string]: any;
}

const COLUMNS = [
  { id: 'message', label: 'Message', width: '180px' },
  { id: 'context', label: 'Context', width: '180px' },
  { id: 'level', label: 'Level', width: '60px' },
  { id: 'level_name', label: 'Level Name', width: '80px' },
  { id: 'channel', label: 'Channel', width: '80px' },
  { id: 'record_datetime', label: 'Record DateTime', width: '120px' },
  { id: 'remote_addr', label: 'Remote Address', width: '100px' },
  { id: 'user_agent', label: 'User Agent', width: '120px' },
  { id: 'created_at', label: 'Created At', width: '120px' },
  { id: 'formatted', label: 'Formatted', width: '180px' },
];

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [deferredFilters, setDeferredFilters] = useState<Record<string, string>>({});
  const [deferredGlobalSearch, setDeferredGlobalSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce filters to prevent lag
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDeferredFilters(filters);
      setDeferredGlobalSearch(globalSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters, globalSearch]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    
    const allRows: LogEntry[] = [];
    
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      delimiter: '^',
      worker: true,
      chunk: (results) => {
        const rows = results.data as string[][];
        const processedRows = rows.map(row => {
          const newRow: LogEntry = {};
          COLUMNS.forEach((col, index) => {
            let val = row[index];
            if (val !== undefined && val !== null) {
              val = val.trim();
              newRow[col.id] = val;
            }
          });
          return newRow;
        });
        allRows.push(...processedRows);
        
        const percent = Math.round((results.meta.cursor / file.size) * 100);
        setProgress(percent);
      },
      complete: () => {
        setLogs(allRows);
        setCurrentPage(1);
        setIsProcessing(false);
        setProgress(100);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setIsProcessing(false);
      }
    });
  };

  const handleReset = () => {
    setLogs([]);
    setFilters({});
    setGlobalSearch('');
    setDeferredFilters({});
    setDeferredGlobalSearch('');
    setCurrentPage(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredLogs = useMemo(() => {
    let result = logs;

    // Apply Global Search
    if (deferredGlobalSearch) {
      const searchLower = deferredGlobalSearch.toLowerCase();
      result = result.filter(log => 
        Object.values(log).some(val => String(val).toLowerCase().includes(searchLower))
      );
    }

    // Apply Column Filters
    if (Object.keys(deferredFilters).length > 0) {
      result = result.filter((log) => {
        return Object.entries(deferredFilters).every(([key, value]) => {
          if (!value) return true;
          const logValue = String(log[key] ?? '').toLowerCase();
          const searchTerm = String(value).toLowerCase();
          return logValue.includes(searchTerm);
        });
      });
    }

    return result;
  }, [logs, deferredFilters, deferredGlobalSearch]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleFilterChange = (columnId: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnId]: value }));
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 border-b border-white/10 py-10 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <h1 className="relative text-center text-6xl font-black tracking-[0.2em] uppercase italic font-serif text-white drop-shadow-2xl">
          Log Viewer
        </h1>
        <p className="relative text-center text-indigo-100/60 text-xs mt-2 font-mono tracking-widest uppercase">High Performance Analysis Engine</p>
      </header>

      <main className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all active:scale-95 font-bold text-sm uppercase tracking-wider"
            >
              <Upload size={18} />
              Select Log File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg shadow-sm transition-all active:scale-95 font-bold text-sm uppercase tracking-wider"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>

          {/* Global Search */}
          <div className="flex-1 max-w-md relative group">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Global search across all columns..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase tracking-tighter">
              <span className="text-slate-500">Pages: <span className="text-indigo-600 font-bold">{totalPages}</span></span>
              <span className="text-slate-500">Logs: <span className="text-indigo-600 font-bold">{filteredLogs.length}</span></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2 px-4 py-1.5 border border-slate-200 rounded-lg bg-white font-bold shadow-sm">
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setCurrentPage(val);
                    }
                  }}
                  className="w-12 text-center outline-none bg-transparent"
                />
              </div>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
          <div className="overflow-auto relative flex-1">
            <table className="w-full border-collapse text-[13px] leading-tight table-fixed">
              <thead className="sticky top-0 z-20 shadow-sm">
                {/* Search Row */}
                <tr className="bg-slate-50">
                  {COLUMNS.map((col) => (
                    <th key={`search-${col.id}`} className="p-2 border-b border-r border-slate-100" style={{ width: col.width }}>
                      <div className="relative group">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="text"
                          placeholder={`${col.label}...`}
                          value={filters[col.id] || ''}
                          onChange={(e) => handleFilterChange(col.id, e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:italic placeholder:text-slate-300"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
                {/* Header Row */}
                <tr className="bg-slate-100/90 backdrop-blur-md">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.id}
                      className="p-4 border-b border-r border-slate-200 text-left font-black uppercase tracking-wider text-slate-600 text-xs"
                      style={{ width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isProcessing ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="p-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="relative w-24 h-24">
                          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                          <div 
                            className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" 
                            style={{ animationDuration: '0.8s' }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-black text-indigo-600 font-mono">{progress}%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-2xl font-serif italic text-slate-800">Analyzing Log Stream...</p>
                          <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-slate-400 font-mono text-xs animate-pulse">Processing 120,000+ entries</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {COLUMNS.map((col) => (
                        <td
                          key={`${idx}-${col.id}`}
                          className="p-0 border-r border-slate-50 align-top"
                          style={{ width: col.width }}
                        >
                          <div 
                            className={cn(
                              "p-4 h-[100px] overflow-y-auto break-words scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-indigo-200 transition-colors",
                              col.id === 'formatted' && "font-mono text-[11px] text-slate-400",
                              col.id === 'level' && "font-bold text-indigo-600",
                              col.id === 'level_name' && "font-bold text-rose-600"
                            )}
                            title={log[col.id] || ''}
                          >
                            {log[col.id] || '-'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={COLUMNS.length} className="p-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-10">
                        <FileText size={80} />
                        <p className="text-2xl font-serif italic">No log entries matched your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="text-center py-12 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-slate-400">
          Log Insight Viewer v2.0
        </div>
        <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
          Created by <span className="text-indigo-600">Shiva Krishna</span>
        </div>
      </footer>
    </div>
  );
}
