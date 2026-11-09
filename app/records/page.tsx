'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { APPS_SCRIPT_URL, SHEET_URL, WORKFLOW_STATUSES } from '@/lib/data';
import { standaloneDB, RecordItem } from '@/lib/standalone-db';
import Papa from 'papaparse';
import { CheckSquare, Square, Download, Upload, Filter, BarChart3, RefreshCw, X, ChevronRight, Layers } from 'lucide-react';

// Highlight search query matches in text
function HighlightText({ text, query }: { text?: string | number | null; query: string }) {
  if (text === undefined || text === null || text === '') return <span>—</span>;
  const str = String(text);
  if (!query || !query.trim()) return <>{str}</>;
  const q = query.trim();
  const escaped = q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const parts = str.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="bg-[#FFE066] text-[#0C0C0C] font-bold px-0.5 rounded-[2px] border border-[#0C0C0C]"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function RecordsPage() {
  const [allRecords, setAllRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'mark' | 'status'>('date-desc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCharts, setShowCharts] = useState(true);

  // Bulk Selection & Update
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('IN REVIEW');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  // Single Record Edit Modal
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'history' | 'docs'>('details');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [associatedDocs, setAssociatedDocs] = useState<any[]>([]);
  const [modalMsg, setModalMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  // File input for JSON import
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllRecords();
  }, []);

  const loadAllRecords = async () => {
    setLoading(true);
    try {
      // 1. Instant load from Standalone DB (zero latency, offline resilient)
      const dbRecords = standaloneDB.getRecords();

      // 2. Optional background sync from Google Apps Script if reachable
      let sheetRecords: RecordItem[] = [];
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getRecords&_=${Date.now()}`, {
          method: 'GET',
          redirect: 'follow',
        });
        const text = await res.text();
        const data = JSON.parse(text);
        if (data.ok && Array.isArray(data.records)) {
          sheetRecords = data.records.map((r: any) => ({
            date: r.date || '',
            folder: r.folder || '',
            tm: r.tm || '',
            classNo: r.classNo || '',
            appName: r.appName || '',
            appTrade: r.appTrade || '',
            year: r.year || '',
            conName: r.conName || '',
            img: r.img || '',
            noImg: r.noImg || '',
            status: r.status || 'PENDING',
            filingProcess: r.filingProcess || '',
            trackingId: r.trackingId || '',
          }));
        }
      } catch {}

      // Combine and deduplicate
      const map = new Map<string, RecordItem>();
      sheetRecords.forEach(r => {
        const key = `${r.folder}__${r.tm || ''}`;
        map.set(key, r);
      });
      dbRecords.forEach(r => {
        const key = `${r.folder}__${r.tm || ''}`;
        map.set(key, { ...(map.get(key) || {}), ...r });
      });

      setAllRecords(Array.from(map.values()));
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (d: string) => {
    if (!d) return 0;
    const months: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const parts = String(d).toUpperCase().trim().split(/[-\/\s]+/);
    if (parts.length < 3) return 0;
    const day = parseInt(parts[0], 10) || 1;
    const mon = months[parts[1]?.substring(0, 3)] ?? 0;
    let year = parseInt(parts[2], 10) || 0;
    if (year < 100) year += 2000;
    return new Date(year, mon, day).getTime();
  };

  const parseMonthKey = (d: string) => {
    if (!d || !String(d).trim()) return null;
    const s = String(d).toUpperCase().trim();
    const m1 = s.match(/(\d{1,2})[-\/]([A-Z]{3})[-\/](\d{2,4})/);
    if (m1) {
      let y = parseInt(m1[3], 10);
      if (y < 100) y += 2000;
      return `${m1[2]} ${y}`;
    }
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
    }
    return null;
  };

  const statusBadgeClass = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('DELIVERED')) return 'bg-[#0D9970] text-white';
    if (s.includes('DISPATCHED')) return 'bg-[#7EB8DA] text-[#0C0C0C]';
    if (s.includes('APPROVED')) return 'bg-[#0D9970] text-white';
    if (s.includes('REJECT')) return 'bg-[#fee2e2] text-[#991b1b]';
    if (s.includes('REVIEW')) return 'bg-[#FFE066] text-[#0C0C0C]';
    return 'bg-[#FAF6EE] text-[#0C0C0C]';
  };

  const yearsList = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.year) set.add(String(r.year).trim());
    });
    return Array.from(set).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [allRecords]);

  const filteredAndSortedRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const st = filterStatus.toUpperCase();
    const y = filterYear.trim();

    const filtered = allRecords.filter(r => {
      if (st && !String(r.status || '').toUpperCase().includes(st)) return false;
      if (y && String(r.year || '').trim() !== y) return false;
      if (!q) return true;
      return [r.folder, r.tm, r.appName, r.appTrade, r.conName, r.classNo, r.status, r.trackingId, r.clientCode, r.caseNo, r.date]
        .some(v => String(v || '').toLowerCase().includes(q));
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'date-desc') return parseDate(b.date) - parseDate(a.date);
      if (sortBy === 'date-asc') return parseDate(a.date) - parseDate(b.date);
      if (sortBy === 'mark') return a.folder.localeCompare(b.folder);
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return 0;
    });
  }, [allRecords, searchQuery, filterStatus, filterYear, sortBy]);

  const stats = useMemo(() => {
    let delivered = 0;
    let dispatched = 0;
    let pending = 0;
    let inReview = 0;
    const byMonth: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    filteredAndSortedRecords.forEach(r => {
      const st = String(r.status || '').toUpperCase();
      if (st.includes('DELIVERED')) delivered++;
      if (st.includes('DISPATCHED')) dispatched++;
      if (st.includes('REVIEW')) inReview++;
      if (st.includes('PENDING')) pending++;

      const mk = parseMonthKey(r.date);
      if (mk) byMonth[mk] = (byMonth[mk] || 0) + 1;

      byStatus[st || 'PENDING'] = (byStatus[st || 'PENDING'] || 0) + 1;
    });

    return {
      total: filteredAndSortedRecords.length,
      delivered,
      dispatched,
      inReview,
      pending,
      byMonth: Object.entries(byMonth).sort((a, b) => b[1] - a[1]),
      byStatus: Object.entries(byStatus).sort((a, b) => b[1] - a[1]),
    };
  }, [filteredAndSortedRecords]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / pageSize));
  const pageRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  // Record Unique Key for bulk selection
  const getRecordKey = (r: RecordItem) => String(r.id || `${r.folder}__${r.tm || ''}`);

  const isAllCurrentSelected = pageRecords.length > 0 && pageRecords.every(r => selectedKeys.includes(getRecordKey(r)));

  const toggleSelectAll = () => {
    if (isAllCurrentSelected) {
      const pageKeys = new Set(pageRecords.map(getRecordKey));
      setSelectedKeys(prev => prev.filter(k => !pageKeys.has(k)));
    } else {
      const newKeys = new Set([...selectedKeys, ...pageRecords.map(getRecordKey)]);
      setSelectedKeys(Array.from(newKeys));
    }
  };

  const toggleSelectRow = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Bulk Update Workflow Status
  const handleBulkStatusUpdate = () => {
    if (selectedKeys.length === 0 || !bulkStatus) return;
    setBulkUpdating(true);
    try {
      const keySet = new Set(selectedKeys);
      const updated = allRecords.map(r => {
        const k = getRecordKey(r);
        if (keySet.has(k)) {
          const updatedRec = { ...r, status: bulkStatus };
          if (r.id) {
            standaloneDB.updateRecord(r.id, { status: bulkStatus });
            standaloneDB.addHistory(r.id, 'BULK_UPDATE', `Bulk updated status to ${bulkStatus}`);
          }
          return updatedRec;
        }
        return r;
      });
      setAllRecords(updated);
      setBulkNotice(`Updated ${selectedKeys.length} cases to "${bulkStatus}"!`);
      setSelectedKeys([]);
      setTimeout(() => setBulkNotice(null), 4000);
    } catch (err: any) {
      setBulkNotice(`Error during bulk update: ${err.message}`);
    } finally {
      setBulkUpdating(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csv = Papa.unparse(filteredAndSortedRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `brandex_cases_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const jsonStr = standaloneDB.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `brandex_standalone_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const res = standaloneDB.importBackupJSON(content);
        if (res.success) {
          loadAllRecords();
          setBulkNotice(`Backup successfully restored (${res.count} cases loaded)!`);
          setTimeout(() => setBulkNotice(null), 4000);
        } else {
          alert('Import failed: ' + res.message);
        }
      } catch (err: any) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open Edit Modal
  const openEditModal = async (r: RecordItem) => {
    setEditingRecord(r);
    setActiveModalTab('details');
    setModalMsg(null);
    setHistoryLogs([]);
    setAssociatedDocs([]);

    if (r.id) {
      try {
        const hData = standaloneDB.getHistory(r.id);
        setHistoryLogs(hData);
        const dData = standaloneDB.getDocuments(r.id);
        setAssociatedDocs(dData);
      } catch (err) {
        console.warn('Error loading record details:', err);
      }
    }
  };

  // Save Modal Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSavingRecord(true);
    setModalMsg(null);
    try {
      let saved: RecordItem;
      if (editingRecord.id) {
        const res = standaloneDB.updateRecord(editingRecord.id, editingRecord);
        saved = res || editingRecord;
      } else {
        saved = standaloneDB.addRecord(editingRecord);
      }

      // Add timeline history entry
      standaloneDB.addHistory(
        saved.id,
        saved.status,
        `Stage updated to ${saved.status}${saved.trackingId ? ` · Tracking ID: ${saved.trackingId}` : ''}`
      );

      // Refresh history in modal
      setHistoryLogs(standaloneDB.getHistory(saved.id));
      setEditingRecord(saved);

      // Instant state update
      setAllRecords(prev =>
        prev.map(item =>
          item.id === saved.id || (item.folder === saved.folder && item.tm === saved.tm)
            ? saved
            : item
        )
      );

      setModalMsg({
        text: 'Record details & status timeline saved to Standalone DB!',
        type: 'success',
      });
    } catch (err: any) {
      setModalMsg({
        text: 'Error saving record: ' + (err.message || 'database error'),
        type: 'error',
      });
    } finally {
      setSavingRecord(false);
    }
  };

  const renderBars = (entries: [string, number][], colorClass: string) => {
    if (!entries.length) return <div className="text-[0.68rem] text-[#666]">No data</div>;
    const max = Math.max(...entries.map(e => e[1]), 1);
    return entries.slice(0, 6).map(([label, count], idx) => {
      const pct = Math.round((count / max) * 100);
      return (
        <div key={idx} className="flex items-center gap-2 mb-1.5 text-[0.68rem]">
          <span className="w-[100px] shrink-0 truncate font-['DM_Mono',monospace] text-[0.58rem]" title={label}>{label}</span>
          <div className="flex-1 h-3.5 bg-[#E8DFC7] border-[1.5px] border-[#0C0C0C]">
            <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="w-7 text-right font-['DM_Mono',monospace] text-[0.62rem]">{count}</span>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />

      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleImportJSON}
        className="hidden"
      />

      <div className="max-w-[1400px] w-full mx-auto p-4 sm:p-6 pb-16 flex-1">
        {/* Header & Quick Action Buttons */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="font-['Bebas_Neue'] text-[2.2rem] tracking-[1.5px] leading-tight">
              Case Records &amp; Workflow Timeline
            </h1>
            <div className="font-['DM_Mono',monospace] text-[0.72rem] text-[#666]">
              STANDALONE DASHBOARD · ZERO NETWORK DELAY
            </div>
          </div>

          {/* Import / Export & Navigation Tools */}
          <div className="flex gap-2 flex-wrap items-center">
            <Link
              href="/trademark-application"
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[5px] shadow-[3px_3px_0_#0C0C0C] no-underline font-bold hover:translate-x-[-1px] hover:translate-y-[-1px]"
            >
              + New Case
            </Link>

            <button
              onClick={handleExportCSV}
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#0D9970] text-white border-[2.5px] border-[#0C0C0C] rounded-[5px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer font-bold flex items-center gap-1.5"
              title="Export Current Table as CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>

            <button
              onClick={handleExportJSON}
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FFE066] text-[#0C0C0C] border-[2.5px] border-[#0C0C0C] rounded-[5px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer font-bold flex items-center gap-1.5"
              title="Download Full JSON Backup"
            >
              <Download className="w-3.5 h-3.5" /> Backup JSON
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] text-[#0C0C0C] border-[2.5px] border-[#0C0C0C] rounded-[5px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer font-bold flex items-center gap-1.5 hover:bg-white"
              title="Import JSON Backup file"
            >
              <Upload className="w-3.5 h-3.5" /> Import JSON
            </button>

            <button
              onClick={() => setShowCharts(!showCharts)}
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3 bg-[#E8DFC7] border-[2.5px] border-[#0C0C0C] rounded-[5px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer font-bold flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" /> {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>

            <a
              href={SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[5px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]"
            >
              Google Sheet
            </a>

            <Link
              href="/"
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[5px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]"
            >
              ← CMS Home
            </Link>
          </div>
        </div>

        {/* Bulk Action Banner */}
        {selectedKeys.length > 0 && (
          <div className="bg-[#0C0C0C] text-[#FAF6EE] p-3.5 mb-4 border-[3px] border-[#C94A00] rounded-[6px] shadow-[5px_5px_0_#C94A00] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="font-['DM_Mono',monospace] text-[0.82rem] font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C94A00] animate-ping" />
              <span>{selectedKeys.length} CASES SELECTED FOR BULK UPDATE</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-['DM_Mono',monospace] text-[0.72rem] text-[#aaa]">NEW STAGE:</span>
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="bg-[#FAF6EE] text-[#0C0C0C] font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1 px-2 border-2 border-[#0C0C0C] rounded-[4px] uppercase"
              >
                {WORKFLOW_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={bulkUpdating}
                className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1.5 px-3.5 bg-[#0D9970] text-white border-2 border-[#FAF6EE] rounded-[4px] shadow-[2px_2px_0_#FAF6EE] cursor-pointer hover:bg-[#0b825f] uppercase"
              >
                {bulkUpdating ? 'UPDATING...' : `APPLY TO ${selectedKeys.length} CASES`}
              </button>
              <button
                onClick={() => setSelectedKeys([])}
                className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1.5 px-3 bg-[#333] text-[#FAF6EE] border border-[#777] rounded-[4px] cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Feedback Notice */}
        {bulkNotice && (
          <div className="mb-4 p-3 bg-[#d1fae5] text-[#065f46] border-[2.5px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] font-['DM_Mono',monospace] text-[0.8rem] font-bold flex items-center justify-between">
            <span>✓ {bulkNotice}</span>
            <button onClick={() => setBulkNotice(null)} className="cursor-pointer text-[#065f46]">✕</button>
          </div>
        )}

        {/* Stats Grid Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#0D9970] text-white border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.5rem] leading-none tracking-[1px]">{stats.total}</div>
            <div className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] mt-1 opacity-90 uppercase">Total Cases</div>
          </div>
          <div className="bg-[#FFE066] text-[#0C0C0C] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.5rem] leading-none tracking-[1px]">{stats.pending}</div>
            <div className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] mt-1 uppercase">Pending</div>
          </div>
          <div className="bg-[#7EB8DA] text-[#0C0C0C] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.5rem] leading-none tracking-[1px]">{stats.dispatched}</div>
            <div className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] mt-1 uppercase">Dispatched</div>
          </div>
          <div className="bg-[#FAF6EE] text-[#0C0C0C] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.5rem] leading-none tracking-[1px]">{stats.delivered}</div>
            <div className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] mt-1 uppercase">Delivered</div>
          </div>
        </div>

        {/* Charts Section (Collapsible) */}
        {showCharts && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 rounded-[4px]">
              <h3 className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] mb-2.5 pb-1.5 border-b-2 border-[#0C0C0C] font-bold uppercase">
                Cases By Month
              </h3>
              {renderBars(stats.byMonth, 'bg-[#D4A800]')}
            </div>
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 rounded-[4px]">
              <h3 className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] mb-2.5 pb-1.5 border-b-2 border-[#0C0C0C] font-bold uppercase">
                Workflow Stage Distribution
              </h3>
              {renderBars(stats.byStatus, 'bg-[#0D9970]')}
            </div>
          </div>
        )}

        {/* Short Filter Buttons (Status & Years) */}
        <div className="bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] p-3 rounded-[6px] shadow-[4px_4px_0_#0C0C0C] mb-4 flex flex-col gap-2.5">
          {/* Status Quick Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-['DM_Mono',monospace] text-[0.68rem] font-bold tracking-[1px] text-[#666] uppercase mr-1">
              STATUS:
            </span>
            <button
              onClick={() => { setFilterStatus(''); setCurrentPage(1); }}
              className={`font-['DM_Mono',monospace] text-[0.68rem] tracking-[0.5px] py-1 px-2.5 border-2 border-[#0C0C0C] rounded-[3px] cursor-pointer font-bold ${
                filterStatus === '' ? 'bg-[#0C0C0C] text-[#FAF6EE]' : 'bg-white hover:bg-[#E8DFC7]'
              }`}
            >
              ALL ({allRecords.length})
            </button>
            {WORKFLOW_STATUSES.map(s => {
              const count = allRecords.filter(r => String(r.status || '').toUpperCase() === s).length;
              return (
                <button
                  key={s}
                  onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                  className={`font-['DM_Mono',monospace] text-[0.68rem] tracking-[0.5px] py-1 px-2.5 border-2 border-[#0C0C0C] rounded-[3px] cursor-pointer font-bold ${
                    filterStatus === s ? 'bg-[#C94A00] text-white shadow-[2px_2px_0_#0C0C0C]' : 'bg-white hover:bg-[#E8DFC7]'
                  }`}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>

          {/* Year Quick Filters & Search Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-['DM_Mono',monospace] text-[0.68rem] font-bold tracking-[1px] text-[#666] uppercase mr-1">
              YEAR:
            </span>
            <button
              onClick={() => { setFilterYear(''); setCurrentPage(1); }}
              className={`font-['DM_Mono',monospace] text-[0.68rem] tracking-[0.5px] py-1 px-2.5 border-2 border-[#0C0C0C] rounded-[3px] cursor-pointer font-bold ${
                filterYear === '' ? 'bg-[#0C0C0C] text-[#FAF6EE]' : 'bg-white hover:bg-[#E8DFC7]'
              }`}
            >
              ALL YEARS
            </button>
            {yearsList.map(y => (
              <button
                key={y}
                onClick={() => { setFilterYear(y); setCurrentPage(1); }}
                className={`font-['DM_Mono',monospace] text-[0.68rem] tracking-[0.5px] py-1 px-2.5 border-2 border-[#0C0C0C] rounded-[3px] cursor-pointer font-bold ${
                  filterYear === y ? 'bg-[#0D9970] text-white shadow-[2px_2px_0_#0C0C0C]' : 'bg-white hover:bg-[#E8DFC7]'
                }`}
              >
                {y}
              </button>
            ))}

            {/* Live Search Input with Highlight Indicator */}
            <div className="flex-1 min-w-[240px] ml-auto relative">
              <input
                type="text"
                placeholder="Search case name, applicant, tracking ID, TM No…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 border-2 border-[#0C0C0C] bg-white font-['Space_Grotesk'] text-[0.82rem] uppercase rounded-[3px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-[#999] hover:text-[#0C0C0C] font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Minimal and Required Records Table */}
        {loading ? (
          <div className="p-10 text-center font-['DM_Mono',monospace] text-[0.85rem] border-[3px] border-[#0C0C0C] bg-[#FAF6EE] shadow-[5px_5px_0_#0C0C0C]">
            Loading records from Standalone Engine (0ms latency)…
          </div>
        ) : errorMsg ? (
          <div className="p-10 text-center font-['DM_Mono',monospace] text-[0.85rem] border-[3px] border-[#0C0C0C] bg-[#fde2e2] text-[#c0392b] shadow-[5px_5px_0_#0C0C0C]">
            Live fetch failed: {errorMsg}
          </div>
        ) : filteredAndSortedRecords.length === 0 ? (
          <div className="p-10 text-center font-['DM_Mono',monospace] text-[0.85rem] border-[3px] border-[#0C0C0C] bg-[#FAF6EE] shadow-[5px_5px_0_#0C0C0C]">
            No records found matching your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] bg-[#FAF6EE] rounded-[4px]">
              <table className="w-full border-collapse text-[0.82rem]">
                <thead>
                  <tr className="bg-[#0C0C0C] text-[#FAF6EE]">
                    {/* Bulk Selection Checkbox */}
                    <th className="p-2.5 w-10 text-center border-b-2 border-[#0C0C0C]">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={toggleSelectAll}
                        className="cursor-pointer w-4 h-4 accent-[#C94A00]"
                        title="Select All on Current Page"
                      />
                    </th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Case Ref</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Case / Mark Name</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Class</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Workflow Stage</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">TM No / Tracking</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Applicant</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-right border-b-2 border-[#0C0C0C]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRecords.map((r, idx) => {
                    const rowKey = getRecordKey(r);
                    const isSelected = selectedKeys.includes(rowKey);
                    return (
                      <tr
                        key={rowKey || idx}
                        className={`border-b border-[#ddd] transition-colors ${
                          isSelected ? 'bg-[#FFE066]/30 hover:bg-[#FFE066]/40' : 'hover:bg-[#E8DFC7]'
                        }`}
                      >
                        {/* Checkbox cell */}
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(rowKey)}
                            className="cursor-pointer w-4 h-4 accent-[#C94A00]"
                          />
                        </td>

                        {/* Case Ref */}
                        <td className="p-2.5 font-['DM_Mono',monospace] text-[0.75rem] font-bold whitespace-nowrap">
                          [{r.selectionMenu || 'A'}] <HighlightText text={r.clientCode || '646'} query={searchQuery} /> - #<HighlightText text={r.caseNo || '001'} query={searchQuery} />
                        </td>

                        {/* Case / Mark Name */}
                        <td className="p-2.5 font-bold" title={r.folder}>
                          <HighlightText text={r.folder} query={searchQuery} />
                        </td>

                        {/* Class */}
                        <td className="p-2.5 font-['DM_Mono',monospace] font-bold">
                          Cl. <HighlightText text={r.classNo || '—'} query={searchQuery} />
                        </td>

                        {/* Workflow Stage */}
                        <td className="p-2.5">
                          <span className={`inline-block px-2.5 py-1 border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.68rem] font-bold ${statusBadgeClass(r.status)}`}>
                            {r.status || 'PENDING'}
                          </span>
                        </td>

                        {/* TM / Tracking ID */}
                        <td className="p-2.5 font-['DM_Mono',monospace] text-[0.75rem]">
                          <div><HighlightText text={r.tm || '—'} query={searchQuery} /></div>
                          {r.trackingId && (
                            <div className="text-[0.65rem] text-[#666]">
                              Trk: <HighlightText text={r.trackingId} query={searchQuery} />
                            </div>
                          )}
                        </td>

                        {/* Applicant */}
                        <td className="p-2.5 truncate max-w-[170px]" title={r.appName}>
                          <HighlightText text={r.appName} query={searchQuery} />
                        </td>

                        {/* Actions */}
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(r)}
                            className="px-2.5 py-1 border-2 border-[#0C0C0C] bg-[#FAF6EE] font-['DM_Mono',monospace] text-[0.68rem] cursor-pointer hover:bg-white font-bold rounded-[3px] shadow-[2px_2px_0_#0C0C0C] active:translate-x-[1px] active:translate-y-[1px]"
                          >
                            Edit &amp; Timeline
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                <div className="font-['DM_Mono',monospace] text-[0.75rem] text-[#666]">
                  Showing {pageRecords.length} of {filteredAndSortedRecords.length} records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-1.5 px-3 bg-[#FAF6EE] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Back
                  </button>
                  <span className="font-['DM_Mono',monospace] text-[0.72rem] py-1.5 px-3 bg-[#0C0C0C] text-[#FAF6EE] border-[2px] border-[#0C0C0C] rounded-[4px]">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-1.5 px-3 bg-[#FAF6EE] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Details, Timeline & Edit Modal */}
        {editingRecord && (
          <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-6 max-w-xl w-full rounded-[6px] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-[#0C0C0C]">
                <h2 className="font-['Bebas_Neue'] text-[1.5rem]">Case: {editingRecord.folder}</h2>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="font-['DM_Mono',monospace] text-[0.8rem] font-bold px-2 py-1 bg-[#fee2e2] border-2 border-[#0C0C0C] cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {modalMsg && (
                <div
                  className={`mb-4 p-3 border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.75rem] font-bold ${
                    modalMsg.type === 'success'
                      ? 'bg-[#d1fae5] text-[#065f46]'
                      : 'bg-[#fee2e2] text-[#991b1b]'
                  }`}
                >
                  {modalMsg.text}
                </div>
              )}

              {/* Modal Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('details')}
                  className={`font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1.5 px-3 border-2 border-[#0C0C0C] cursor-pointer ${activeModalTab === 'details' ? 'bg-[#C94A00] text-white' : 'bg-[#FAF6EE]'}`}
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('history')}
                  className={`font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1.5 px-3 border-2 border-[#0C0C0C] cursor-pointer ${activeModalTab === 'history' ? 'bg-[#C94A00] text-white' : 'bg-[#FAF6EE]'}`}
                >
                  Timeline / History ({historyLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('docs')}
                  className={`font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1.5 px-3 border-2 border-[#0C0C0C] cursor-pointer ${activeModalTab === 'docs' ? 'bg-[#C94A00] text-white' : 'bg-[#FAF6EE]'}`}
                >
                  Documents ({associatedDocs.length})
                </button>
              </div>

              {activeModalTab === 'details' && (
                <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                  <div>
                    <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Case / Mark Name</label>
                    <input
                      type="text"
                      value={editingRecord.folder}
                      onChange={e => setEditingRecord({ ...editingRecord, folder: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
                    />
                  </div>
                  <div>
                    <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Workflow Stage</label>
                    <select
                      value={editingRecord.status}
                      onChange={e => setEditingRecord({ ...editingRecord, status: e.target.value })}
                      className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
                    >
                      {WORKFLOW_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Trademark Number (Acknowledgment)</label>
                    <input
                      type="text"
                      value={editingRecord.tm}
                      onChange={e => setEditingRecord({ ...editingRecord, tm: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
                    />
                  </div>
                  <div>
                    <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Tracking ID</label>
                    <input
                      type="text"
                      value={editingRecord.trackingId}
                      onChange={e => setEditingRecord({ ...editingRecord, trackingId: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      type="submit"
                      disabled={savingRecord}
                      className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-5 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[4px] cursor-pointer disabled:opacity-50"
                    >
                      {savingRecord ? 'Saving...' : 'Save Changes & Log Timeline'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRecord(null)}
                      className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-5 bg-[#FAF6EE] text-[#0C0C0C] border-[2.5px] border-[#0C0C0C] rounded-[4px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {activeModalTab === 'history' && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-['DM_Mono',monospace] text-[0.8rem] font-bold">Status Change Timeline</h3>
                  {historyLogs.length === 0 ? (
                    <div className="p-4 bg-white border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.75rem]">No history logs recorded yet.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {historyLogs.map((h, i) => (
                        <div key={i} className="p-3 bg-white border-2 border-[#0C0C0C] shadow-[2px_2px_0_#0C0C0C] text-[0.8rem]">
                          <div className="flex justify-between font-['DM_Mono',monospace] text-[0.7rem] text-[#666]">
                            <span>Stage: <strong>{h.status || h.action}</strong></span>
                            <span suppressHydrationWarning>{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</span>
                          </div>
                          {h.notes && <p className="mt-1 font-['Space_Grotesk'] text-[0.85rem]">{h.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeModalTab === 'docs' && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-['DM_Mono',monospace] text-[0.8rem] font-bold">Associated Documents (PDFs, Scans)</h3>
                  {associatedDocs.length === 0 ? (
                    <div className="p-4 bg-white border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.75rem]">No additional documents attached to this case.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {associatedDocs.map((d, i) => (
                        <div key={i} className="p-3 bg-white border-2 border-[#0C0C0C] shadow-[2px_2px_0_#0C0C0C] flex justify-between items-center text-[0.8rem]">
                          <div>
                            <div className="font-bold">{d.file_name}</div>
                            <div className="font-['DM_Mono',monospace] text-[0.65rem] text-[#666]">{(d.file_size / 1024).toFixed(1)} KB · {d.file_type}</div>
                          </div>
                          <span className="font-['DM_Mono',monospace] text-[0.7rem] bg-[#0D9970] text-white px-2 py-1 border border-[#0C0C0C]">
                            Saved in Standalone DB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
