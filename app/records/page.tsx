'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { APPS_SCRIPT_URL, SHEET_URL, WORKFLOW_STATUSES } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

interface RecordItem {
  id?: number;
  date: string;
  folder: string;
  tm: string;
  classNo: string;
  appName: string;
  appTrade: string;
  year: string;
  conName: string;
  img: string;
  noImg: string;
  status: string;
  filingProcess: string;
  trackingId?: string;
  selectionMenu?: string;
  clientCode?: string;
  caseNo?: string;
}

export default function RecordsPage() {
  const [allRecords, setAllRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'mark' | 'status'>('date-desc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'history' | 'docs'>('details');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [associatedDocs, setAssociatedDocs] = useState<any[]>([]);

  useEffect(() => {
    loadAllRecords();
  }, []);

  const loadAllRecords = async () => {
    setLoading(true);
    try {
      let sbData: RecordItem[] = [];
      try {
        const { data, error } = await supabase.from('trademark_records').select('*').order('id', { ascending: false });
        if (!error && data) {
          sbData = data.map((r: any) => ({
            id: r.id,
            date: r.created_at || r.issue_date || '',
            folder: r.mark_name || r.folder || '',
            tm: r.trademark_no || r.tm || '',
            classNo: r.class_no || r.classNo || '',
            appName: r.applicant_name || r.appName || '',
            appTrade: r.trading_as || r.appTrade || '',
            year: r.usage_year || r.year || '',
            conName: r.consultant_name || r.conName || '',
            img: r.logo_url || r.img || '',
            noImg: r.noImg || '',
            status: r.status || 'PENDING',
            filingProcess: r.filing_process || r.filingProcess || 'PENDING',
            trackingId: r.tracking_id || r.trackingId || '',
            selectionMenu: r.selection_menu || 'A',
            clientCode: r.client_code || '646',
            caseNo: r.case_no || '001',
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch fallback:', err);
      }

      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getRecords&_=${Date.now()}`, {
          method: 'GET',
          redirect: 'follow',
        });
        const text = await res.text();
        const data = JSON.parse(text);
        if (data.ok && Array.isArray(data.records)) {
          const sheetRecords = data.records.map((r: any) => ({
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
          const combined = [...sbData, ...sheetRecords];
          setAllRecords(combined);
          setLoading(false);
          return;
        }
      } catch {}

      setAllRecords(sbData);
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
    if (s.includes('APPROVED') || s.includes('REJECT')) return 'bg-[#D4A800] text-[#0C0C0C]';
    if (s.includes('REVIEW')) return 'bg-[#FFE066] text-[#0C0C0C]';
    return 'bg-[#FAF6EE] text-[#0C0C0C]';
  };

  const formatFilingDate = (d: string) => {
    if (!d) return '—';
    const s = String(d).trim();
    if (!s) return '—';
    const t = Date.parse(s);
    if (!isNaN(t)) {
      const dateObj = new Date(t);
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      const day = String(dateObj.getDate()).padStart(2, '0');
      const mon = months[dateObj.getMonth()];
      const yy = String(dateObj.getFullYear()).slice(-2);
      let h = dateObj.getHours();
      const m = String(dateObj.getMinutes()).padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
      return `${day}-${mon}-${yy} ${String(h).padStart(2, '0')}:${m} ${ap}`;
    }
    return s;
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

  const handleExportCSV = () => {
    const csv = Papa.unparse(filteredAndSortedRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `brandex_trademark_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEditModal = async (r: RecordItem) => {
    setEditingRecord(r);
    setActiveModalTab('details');
    setHistoryLogs([]);
    setAssociatedDocs([]);

    if (r.id) {
      try {
        // Fetch history logs
        const { data: hData } = await supabase
          .from('trademark_history')
          .select('*')
          .eq('record_id', r.id)
          .order('created_at', { ascending: false });
        if (hData) setHistoryLogs(hData);

        // Fetch associated documents
        const { data: dData } = await supabase
          .from('trademark_documents')
          .select('*')
          .eq('record_id', r.id)
          .order('id', { ascending: false });
        if (dData) setAssociatedDocs(dData);
      } catch (err) {
        console.warn('Error loading record details:', err);
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      if (editingRecord.id) {
        const { error } = await supabase
          .from('trademark_records')
          .update({
            status: editingRecord.status,
            tracking_id: editingRecord.trackingId,
            trademark_no: editingRecord.tm,
            mark_name: editingRecord.folder,
          })
          .eq('id', editingRecord.id);

        if (error) throw error;

        // Log history change
        await supabase.from('trademark_history').insert([
          {
            record_id: editingRecord.id,
            status: editingRecord.status,
            notes: `Status updated to ${editingRecord.status}`,
          }
        ]);
      }

      setAllRecords(prev => prev.map(item => (item.id === editingRecord.id ? editingRecord : item)));
      setEditingRecord(null);
      alert('Record and history updated successfully!');
    } catch (err: any) {
      alert('Failed to update record: ' + err.message);
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

      <div className="max-w-[1400px] w-full mx-auto p-4 sm:p-6 pb-16 flex-1">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h1 className="font-['Bebas_Neue'] text-[2rem] tracking-[1px]">Trademark Records &amp; Timeline Management</h1>
          <div className="flex gap-2.5 flex-wrap">
            <Link href="/trademark-application" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline font-bold">
              + New Application
            </Link>
            <button
              onClick={handleExportCSV}
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#0D9970] text-white border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer font-bold"
            >
              Export CSV
            </button>
            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]">
              Open Sheet
            </a>
            <Link href="/" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]">
              ← CMS Home
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2.5 items-center mb-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search mark, applicant, client code, case no, tracking ID…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.85rem] uppercase rounded-[4px]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['DM_Mono',monospace] text-[0.7rem] uppercase cursor-pointer min-w-[130px] rounded-[4px]"
          >
            <option value="">All Statuses</option>
            {WORKFLOW_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setCurrentPage(1); }}
            className="p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['DM_Mono',monospace] text-[0.7rem] uppercase cursor-pointer min-w-[100px] rounded-[4px]"
          >
            <option value="">All Years</option>
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['DM_Mono',monospace] text-[0.7rem] uppercase cursor-pointer min-w-[120px] rounded-[4px]"
          >
            <option value="date-desc">Newest Date</option>
            <option value="date-asc">Oldest Date</option>
            <option value="mark">Mark Name (A-Z)</option>
            <option value="status">Status</option>
          </select>
          <select
            value={pageSize}
            onChange={e => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
            className="p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['DM_Mono',monospace] text-[0.7rem] uppercase cursor-pointer min-w-[100px] rounded-[4px]"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
          <div className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] bg-[#0D9970] text-white border-2 border-[#0C0C0C] py-2.5 px-3 shadow-[3px_3px_0_#0C0C0C] rounded-[4px]">
            {filteredAndSortedRecords.length} shown
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#0D9970] text-white border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-4 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.8rem] leading-none tracking-[1px]">{stats.total}</div>
            <div className="font-['DM_Mono',monospace] text-[0.78rem] tracking-[1px] mt-1.5 opacity-90">Total Cases</div>
          </div>
          <div className="bg-[#FFE066] text-[#0C0C0C] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-4 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.8rem] leading-none tracking-[1px]">{stats.pending}</div>
            <div className="font-['DM_Mono',monospace] text-[0.78rem] tracking-[1px] mt-1.5">Pending</div>
          </div>
          <div className="bg-[#7EB8DA] text-[#0C0C0C] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-4 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.8rem] leading-none tracking-[1px]">{stats.dispatched}</div>
            <div className="font-['DM_Mono',monospace] text-[0.78rem] tracking-[1px] mt-1.5">Dispatched</div>
          </div>
          <div className="bg-[#FAF6EE] text-[#0C0C0C] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-4 text-center rounded-[4px]">
            <div className="font-['Bebas_Neue'] text-[2.8rem] leading-none tracking-[1px]">{stats.delivered}</div>
            <div className="font-['DM_Mono',monospace] text-[0.78rem] tracking-[1px] mt-1.5">Delivered</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 rounded-[4px]">
            <h3 className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[1px] mb-3 pb-1.5 border-b-2 border-[#0C0C0C]">Cases By Month</h3>
            {renderBars(stats.byMonth, 'bg-[#D4A800]')}
          </div>
          <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] p-3.5 rounded-[4px]">
            <h3 className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[1px] mb-3 pb-1.5 border-b-2 border-[#0C0C0C]">Workflow Stage Distribution</h3>
            {renderBars(stats.byStatus, 'bg-[#0D9970]')}
          </div>
        </div>

        {/* Records Table or States */}
        {loading ? (
          <div className="p-10 text-center font-['DM_Mono',monospace] text-[0.85rem] border-[3px] border-[#0C0C0C] bg-[#FAF6EE] shadow-[5px_5px_0_#0C0C0C]">
            Loading live records from Supabase &amp; Google Sheet…
          </div>
        ) : errorMsg ? (
          <div className="p-10 text-center font-['DM_Mono',monospace] text-[0.85rem] border-[3px] border-[#0C0C0C] bg-[#fde2e2] text-[#c0392b] shadow-[5px_5px_0_#0C0C0C]">
            Live fetch failed: {errorMsg}
          </div>
        ) : filteredAndSortedRecords.length === 0 ? (
          <div className="p-10 text-center font-['DM_Mono',monospace] text-[0.85rem] border-[3px] border-[#0C0C0C] bg-[#FAF6EE] shadow-[5px_5px_0_#0C0C0C]">
            No records found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] bg-[#FAF6EE]">
              <table className="w-full border-collapse text-[0.82rem]">
                <thead>
                  <tr className="bg-[#0C0C0C] text-[#FAF6EE]">
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Logo</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Menu/Client/Case</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Mark Name</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Workflow Stage</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">TM No</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Applicant</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Tracking ID</th>
                    <th className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.5px] p-2.5 text-left border-b-2 border-[#0C0C0C]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRecords.map((r, idx) => {
                    const thumbUrl = r.img ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(r.img)}&sz=w80` : '';
                    return (
                      <tr key={idx} className="hover:bg-[#E8DFC7] border-b border-[#ddd]">
                        <td className="p-2.5">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt=""
                              className="w-[34px] h-[34px] object-contain border-2 border-[#0C0C0C] bg-white"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-[34px] h-[34px] border-2 border-dashed border-[#999] bg-[#f0f0f0] flex items-center justify-center text-[0.5rem] font-['DM_Mono',monospace] text-[#666]">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-['DM_Mono',monospace] text-[0.75rem] font-bold">
                          [{r.selectionMenu || 'A'}] {r.clientCode || '646'} - #{r.caseNo || '001'}
                        </td>
                        <td className="p-2.5 font-bold" title={r.folder}>{r.folder}</td>
                        <td className="p-2.5">
                          <span className={`inline-block px-2.5 py-1 border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.7rem] font-bold ${statusBadgeClass(r.status)}`}>
                            {r.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="p-2.5 font-['DM_Mono',monospace]">{r.tm || '—'}</td>
                        <td className="p-2.5 truncate max-w-[150px]" title={r.appName}>{r.appName}</td>
                        <td className="p-2.5 font-['DM_Mono',monospace]">{r.trackingId || '—'}</td>
                        <td className="p-2.5 flex gap-1.5 items-center">
                          <button
                            onClick={() => openEditModal(r)}
                            className="px-2.5 py-1 border-2 border-[#0C0C0C] bg-[#FAF6EE] font-['DM_Mono',monospace] text-[0.7rem] cursor-pointer hover:bg-[#E8DFC7] font-bold"
                          >
                            Details &amp; Timeline
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
              <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  ← Back
                </button>
                <span className="font-['DM_Mono',monospace] text-[0.75rem] tracking-[1px] py-2 px-3.5 bg-[#0C0C0C] text-[#FAF6EE] border-2 border-[#0C0C0C]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Details, Timeline & Edit Modal */}
        {editingRecord && (
          <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-6 max-w-xl w-full rounded-[6px] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-[#0C0C0C]">
                <h2 className="font-['Bebas_Neue'] text-[1.5rem]">Case Details: {editingRecord.folder}</h2>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="font-['DM_Mono',monospace] text-[0.8rem] font-bold px-2 py-1 bg-[#fee2e2] border-2 border-[#0C0C0C] cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

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
                    <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Mark Name</label>
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
                      className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-5 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[4px] cursor-pointer"
                    >
                      Save Changes &amp; Log Timeline
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
                            <span>Stage: <strong>{h.status}</strong></span>
                            <span>{new Date(h.created_at).toLocaleString()}</span>
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
                    <div className="p-4 bg-white border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.75rem]">No additional documents attached to this application.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {associatedDocs.map((d, i) => (
                        <div key={i} className="p-3 bg-white border-2 border-[#0C0C0C] shadow-[2px_2px_0_#0C0C0C] flex justify-between items-center text-[0.8rem]">
                          <div>
                            <div className="font-bold">{d.file_name}</div>
                            <div className="font-['DM_Mono',monospace] text-[0.65rem] text-[#666]">{(d.file_size / 1024).toFixed(1)} KB · {d.file_type}</div>
                          </div>
                          <span className="font-['DM_Mono',monospace] text-[0.7rem] bg-[#0D9970] text-white px-2 py-1 border border-[#0C0C0C]">
                            Saved in Supabase
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
