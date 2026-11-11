'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { SHEET_URL } from '@/lib/data';
import { standaloneDB, RecordItem, ClientProfile } from '@/lib/standalone-db';
import { supabaseDB } from '@/lib/supabase-db';
import SqlSetupModal from '@/app/components/SqlSetupModal';
import {
  CheckSquare,
  Square,
  Download,
  Upload,
  Filter,
  BarChart3,
  RefreshCw,
  X,
  Plus,
  ArrowRight,
  HelpCircle,
  Settings,
  Check,
  Truck,
  PackageCheck,
  FileText,
  UserCheck,
  Building2,
  Calendar,
  Pencil,
  Trash2,
  Database,
  Receipt,
  Eye,
  Paperclip,
  ExternalLink
} from 'lucide-react';

// Highlight query matches in text
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

// Format short date
function formatShortDate(d?: string) {
  if (!d) return '—';
  const str = String(d).trim();
  // If in format "Wednesday, 15 October 2026", take last 3 tokens
  if (str.includes(',')) {
    const afterComma = str.split(',')[1]?.trim();
    if (afterComma) return afterComma;
  }
  return str;
}

// Format class number purely as number (1-45)
function formatClassPure(c?: string | number) {
  if (!c) return '—';
  const digits = String(c).replace(/\D/g, '');
  return digits || String(c);
}

export default function RecordsPage() {
  const [allRecords, setAllRecords] = useState<RecordItem[]>([]);
  const [savedClients, setSavedClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [dbSource, setDbSource] = useState<'supabase' | 'local'>('supabase');
  const [sqlModalOpen, setSqlModalOpen] = useState(false);

  // 1. Default status is "PENDING & IN REVIEW"
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_IN_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'mark' | 'status'>('date-desc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCharts, setShowCharts] = useState(true);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [selectedClientForAssign, setSelectedClientForAssign] = useState<string>('');

  // Floating Action Button & Modals
  const [fabOpen, setFabOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Workflow Stage Transition Modals
  // Approved/Rejected modal
  const [approveRejectModal, setApproveRejectModal] = useState<{
    open: boolean;
    record?: RecordItem;
    isBulk?: boolean;
    decision: 'APPROVED' | 'REJECTED';
    notes: string;
  }>({
    open: false,
    decision: 'APPROVED',
    notes: ''
  });

  // Dispatch modal
  const [dispatchModal, setDispatchModal] = useState<{
    open: boolean;
    record?: RecordItem;
    isBulk?: boolean;
    date: string;
    note: string;
    trackingId: string;
    dispatchedImage?: string;
    dispatchedDocName?: string;
    dispatchedDocType?: string;
  }>({
    open: false,
    date: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    note: '',
    trackingId: '',
    dispatchedImage: '',
    dispatchedDocName: '',
    dispatchedDocType: ''
  });

  // Delivered modal
  const [deliveredModal, setDeliveredModal] = useState<{
    open: boolean;
    record?: RecordItem;
    isBulk?: boolean;
    date: string;
    receiverName: string;
    receiptImage: string;
  }>({
    open: false,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
    receiverName: '',
    receiptImage: ''
  });

  // Receipt & Proof Viewer Modal (for full-size viewing of dispatch receipt or delivery receipt)
  const [proofModal, setProofModal] = useState<{
    open: boolean;
    title: string;
    url: string;
    docName?: string;
    docType?: string;
  }>({
    open: false,
    title: '',
    url: ''
  });

  // Edit Single Record Modal
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  // File input refs
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const receiptImgInputRef = useRef<HTMLInputElement>(null);
  const dispatchDocInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllRecords();
  }, []);

  const loadAllRecords = async () => {
    setLoading(true);
    try {
      const recordsResult = await supabaseDB.getRecords();
      const clientsResult = await supabaseDB.getClients();
      setSavedClients(clientsResult.clients);
      setDbSource(recordsResult.source);

      // Background sync check with Apps Script
      let sheetRecords: RecordItem[] = [];
      try {
        const res = await fetch('/api/records', {
          method: 'GET',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.records)) {
            sheetRecords = data.records.map((r: any, idx: number) => ({
              id: 1000 + idx,
              date: r.date || '',
              folder: r.folder || '',
              tm: r.tm || '',
              classNo: r.classNo || '',
              appName: r.appName || '',
              appTrade: r.appTrade || '',
              year: r.year || '',
              conName: r.conName || 'BRANDEX LAW ASSOCIATES',
              lawFirm: r.conName || 'BRANDEX LAW ASSOCIATES',
              img: r.img || '',
              noImg: r.noImg || '',
              status: r.status || 'PENDING',
              filingProcess: r.filingProcess || '',
              trackingId: r.trackingId || '',
            }));
          }
        }
      } catch { }

      const map = new Map<string, RecordItem>();
      sheetRecords.forEach(r => map.set(`${r.folder}__${r.tm}`, r));
      recordsResult.records.forEach(r => map.set(`${r.folder}__${r.tm || r.id}`, r));

      setAllRecords(Array.from(map.values()));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  // Helper date parser
  const parseDateForSort = (d: string) => {
    if (!d) return 0;
    const months: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const parts = String(d).toUpperCase().trim().split(/[-\/\s,]+/);
    if (parts.length < 3) return 0;
    let day = 0;
    let mon = 0;
    let year = 0;
    for (const p of parts) {
      if (/^\d{4}$/.test(p)) year = parseInt(p, 10);
      else if (/^\d{1,2}$/.test(p) && !day) day = parseInt(p, 10);
      else if (months[p.substring(0, 3)] !== undefined) mon = months[p.substring(0, 3)];
    }
    return new Date(year || 2026, mon, day || 1).getTime();
  };

  // List of all unique consultants for multi-select filter
  const allConsultantsList = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      const c = (r.lawFirm || r.conName || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [allRecords]);

  // List of unique years
  const yearsList = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.year) set.add(String(r.year).trim());
    });
    return Array.from(set).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [allRecords]);

  // Filtered & Sorted records
  const filteredAndSortedRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const st = filterStatus.toUpperCase();
    const y = filterYear.trim();

    const filtered = allRecords.filter(r => {
      const recordStatus = String(r.status || '').toUpperCase();

      // Default Status Filter: PENDING & IN REVIEW
      if (st === 'PENDING_IN_REVIEW') {
        const isPendingOrReview = recordStatus.includes('PENDING') || recordStatus.includes('REVIEW');
        if (!isPendingOrReview) return false;
      } else if (st && st !== 'ALL') {
        if (!recordStatus.includes(st)) return false;
      }

      // Year filter
      if (y && String(r.year || '').trim() !== y) return false;

      // Multi-select Legal Consultant filter
      if (selectedConsultants.length > 0) {
        const firm = (r.lawFirm || r.conName || '').toUpperCase();
        const matches = selectedConsultants.some(c => firm.includes(c.toUpperCase()));
        if (!matches) return false;
      }

      // Query search
      if (!q) return true;
      return [
        r.folder,
        r.tm,
        r.appName,
        r.appTrade,
        r.lawFirm,
        r.conName,
        r.classNo,
        r.status,
        r.trackingId,
        r.clientCode,
        r.caseNo,
        r.date,
        r.dispatchedDate,
        r.deliveredDate,
        r.receiverName
      ].some(v => String(v || '').toLowerCase().includes(q));
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'date-desc') return parseDateForSort(b.date) - parseDateForSort(a.date);
      if (sortBy === 'date-asc') return parseDateForSort(a.date) - parseDateForSort(b.date);
      if (sortBy === 'mark') return (a.folder || '').localeCompare(b.folder || '');
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return 0;
    });
  }, [allRecords, searchQuery, filterStatus, filterYear, selectedConsultants, sortBy]);

  // 4 BOX STATISTICS & LAW FIRM WIDGET DATA
  const stats = useMemo(() => {
    let pending = 0;
    let inReview = 0;
    let approved = 0;
    let rejected = 0;
    let dispatched = 0;
    let delivered = 0;
    const byFirm: Record<string, number> = {};

    allRecords.forEach(r => {
      const st = String(r.status || '').toUpperCase();
      if (st.includes('DELIVERED')) delivered++;
      else if (st.includes('DISPATCHED')) dispatched++;
      else if (st.includes('APPROVED')) approved++;
      else if (st.includes('REJECT')) rejected++;
      else if (st.includes('REVIEW')) inReview++;
      else if (st.includes('PENDING')) pending++;

      const firm = (r.lawFirm || r.conName || 'BRANDEX LAW ASSOCIATES').trim().toUpperCase();
      byFirm[firm] = (byFirm[firm] || 0) + 1;
    });

    const firmsSorted = Object.entries(byFirm).sort((a, b) => b[1] - a[1]);

    return {
      total: allRecords.length,
      pending,
      inReview,
      pendingInReview: pending + inReview,
      approved,
      rejected,
      approvedRejected: approved + rejected,
      dispatched,
      delivered,
      dispatchedDelivered: dispatched + delivered,
      byFirm: firmsSorted
    };
  }, [allRecords]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / pageSize));
  const pageRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  // Bulk Selection Helpers
  const isAllCurrentSelected = pageRecords.length > 0 && pageRecords.every(r => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (isAllCurrentSelected) {
      const pageIdSet = new Set(pageRecords.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !pageIdSet.has(id)));
    } else {
      const newIds = Array.from(new Set([...selectedIds, ...pageRecords.map(r => r.id)]));
      setSelectedIds(newIds);
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // CSV Export & Import Handlers
  const handleExportCSV = () => {
    const csvContent = standaloneDB.exportRecordsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Brandex_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBulkNotice('✓ Exported all records to CSV successfully.');
    setTimeout(() => setBulkNotice(null), 4000);
  };

  const handleImportCSVClick = () => {
    csvFileInputRef.current?.click();
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = standaloneDB.importRecordsCSV(content);
        if (result.success) {
          loadAllRecords();
          setBulkNotice(`✓ ${result.message}`);
        } else {
          setErrorMsg(result.message);
        }
        setTimeout(() => setBulkNotice(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Bulk Reassign to Saved Client
  const handleBulkAssignClient = async () => {
    if (!selectedClientForAssign || selectedIds.length === 0) return;
    const client = savedClients.find(c => String(c.id) === selectedClientForAssign);
    if (!client) return;

    await supabaseDB.bulkAssignClient(selectedIds, client);
    loadAllRecords();
    setBulkNotice(`✓ Reassigned ${selectedIds.length} cases to client "${client.client_name}" (#${client.client_code})`);
    setSelectedIds([]);
    setTimeout(() => setBulkNotice(null), 4000);
  };

  // Stage Transition Triggers:
  // Rules are: Pending / In Review > Approved / Rejected > Dispatched > Delivered
  const handleOpenStageTransition = (record: RecordItem, targetStage: string) => {
    const current = (record.status || '').toUpperCase();

    if (targetStage === 'APPROVED_OR_REJECTED') {
      setApproveRejectModal({
        open: true,
        record,
        decision: 'APPROVED',
        notes: ''
      });
    } else if (targetStage === 'DISPATCHED') {
      setDispatchModal({
        open: true,
        record,
        date: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
        note: record.dispatchedNote || '',
        trackingId: record.trackingId || '',
        dispatchedImage: record.dispatchedImage || '',
        dispatchedDocName: record.dispatchedDocName || '',
        dispatchedDocType: record.dispatchedDocType || ''
      });
    } else if (targetStage === 'DELIVERED') {
      setDeliveredModal({
        open: true,
        record,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
        receiverName: record.receiverName || '',
        receiptImage: record.receiptImage || ''
      });
    }
  };

  // Submit Approved or Rejected Decision
  const handleSaveApproveReject = async () => {
    if (approveRejectModal.record) {
      const r = approveRejectModal.record;
      await supabaseDB.updateRecord(r.id, {
        status: approveRejectModal.decision,
        filingProcess: approveRejectModal.decision,
        notes: approveRejectModal.notes ? `${r.notes || ''} [Decision: ${approveRejectModal.notes}]` : r.notes
      });
      await supabaseDB.addHistory(r.id, approveRejectModal.decision, approveRejectModal.notes || `Case marked as ${approveRejectModal.decision}`);
      setBulkNotice(`✓ Case ${r.folder} marked as ${approveRejectModal.decision}`);
    } else if (approveRejectModal.isBulk && selectedIds.length > 0) {
      await supabaseDB.bulkUpdateStatus(selectedIds, approveRejectModal.decision, approveRejectModal.notes || `Bulk marked as ${approveRejectModal.decision}`);
      setBulkNotice(`✓ Marked ${selectedIds.length} cases as ${approveRejectModal.decision}`);
      setSelectedIds([]);
    }
    setApproveRejectModal({ open: false, decision: 'APPROVED', notes: '' });
    loadAllRecords();
    setTimeout(() => setBulkNotice(null), 4000);
  };

  // Submit Dispatch Details (Including courier tracking and proof of sending)
  const handleSaveDispatch = async () => {
    if (dispatchModal.record) {
      const r = dispatchModal.record;
      await supabaseDB.updateRecord(r.id, {
        status: 'DISPATCHED',
        filingProcess: 'DISPATCHED',
        dispatchedDate: dispatchModal.date,
        dispatchedNote: dispatchModal.note,
        trackingId: dispatchModal.trackingId || r.trackingId,
        dispatchedImage: dispatchModal.dispatchedImage,
        dispatchedDocName: dispatchModal.dispatchedDocName,
        dispatchedDocType: dispatchModal.dispatchedDocType
      });
      await supabaseDB.addHistory(
        r.id,
        'DISPATCHED',
        `Dispatched on ${dispatchModal.date}. Trk: ${dispatchModal.trackingId || 'N/A'}. ${dispatchModal.note || ''}${dispatchModal.dispatchedImage ? ' [Receipt / Proof of Sending Attached]' : ''}`
      );
      setBulkNotice(`✓ Case ${r.folder} marked as DISPATCHED.`);
    } else if (dispatchModal.isBulk && selectedIds.length > 0) {
      await supabaseDB.bulkUpdateStatus(selectedIds, 'DISPATCHED', `Bulk dispatched on ${dispatchModal.date}. ${dispatchModal.note}`, {
        dispatchedDate: dispatchModal.date,
        dispatchedNote: dispatchModal.note,
        dispatchedImage: dispatchModal.dispatchedImage,
        dispatchedDocName: dispatchModal.dispatchedDocName,
        dispatchedDocType: dispatchModal.dispatchedDocType
      });
      setBulkNotice(`✓ Marked ${selectedIds.length} cases as DISPATCHED.`);
      setSelectedIds([]);
    }
    setDispatchModal({
      open: false,
      date: '',
      note: '',
      trackingId: '',
      dispatchedImage: '',
      dispatchedDocName: '',
      dispatchedDocType: ''
    });
    loadAllRecords();
    setTimeout(() => setBulkNotice(null), 4000);
  };

  // Submit Delivered Details
  const handleSaveDelivered = async () => {
    if (deliveredModal.record) {
      const r = deliveredModal.record;
      await supabaseDB.updateRecord(r.id, {
        status: 'DELIVERED',
        filingProcess: 'DELIVERED',
        deliveredDate: deliveredModal.date,
        receiverName: deliveredModal.receiverName,
        receiptImage: deliveredModal.receiptImage
      });
      await supabaseDB.addHistory(r.id, 'DELIVERED', `Delivered on ${deliveredModal.date} to receiver: ${deliveredModal.receiverName}`);
      setBulkNotice(`✓ Case ${r.folder} marked as DELIVERED to ${deliveredModal.receiverName}`);
    } else if (deliveredModal.isBulk && selectedIds.length > 0) {
      await supabaseDB.bulkUpdateStatus(selectedIds, 'DELIVERED', `Bulk delivered on ${deliveredModal.date}. Receiver: ${deliveredModal.receiverName}`, {
        deliveredDate: deliveredModal.date,
        receiverName: deliveredModal.receiverName,
        receiptImage: deliveredModal.receiptImage
      });
      setBulkNotice(`✓ Marked ${selectedIds.length} cases as DELIVERED.`);
      setSelectedIds([]);
    }
    setDeliveredModal({ open: false, date: '', receiverName: '', receiptImage: '' });
    loadAllRecords();
    setTimeout(() => setBulkNotice(null), 4000);
  };

  // Handle receipt image upload for Delivery confirmation
  const handleReceiptImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDeliveredModal(prev => ({ ...prev, receiptImage: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Proof of Sending (Receipt / Doc / Waybill) upload for Dispatch
  const handleDispatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert('Proof file size exceeds 12MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setDispatchModal(prev => ({
        ...prev,
        dispatchedImage: result,
        dispatchedDocName: file.name,
        dispatchedDocType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle single record edit save
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSavingRecord(true);
    try {
      await supabaseDB.updateRecord(editingRecord.id, editingRecord);
      await supabaseDB.addHistory(editingRecord.id, 'RECORD UPDATED', 'Case metadata edited directly in CMS');
      setBulkNotice(`✓ Updated details for case ${editingRecord.folder}`);
      setEditingRecord(null);
      loadAllRecords();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update record');
    } finally {
      setSavingRecord(false);
      setTimeout(() => setBulkNotice(null), 4000);
    }
  };

  const handleDeleteRecord = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete case "${name}"?`)) {
      await supabaseDB.deleteRecord(id);
      loadAllRecords();
      setBulkNotice(`Case "${name}" removed.`);
      setTimeout(() => setBulkNotice(null), 4000);
    }
  };

  const statusBadge = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('DELIVERED')) return 'bg-[#0D9970] text-white';
    if (s.includes('DISPATCHED')) return 'bg-[#0284c7] text-white';
    if (s.includes('APPROVED')) return 'bg-[#15803d] text-white';
    if (s.includes('REJECT')) return 'bg-[#dc2626] text-white';
    if (s.includes('REVIEW')) return 'bg-[#d97706] text-white';
    return 'bg-[#FAF6EE] text-[#0C0C0C]';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C] relative">
      <Navbar />

      {/* Hidden CSV File Input */}
      <input
        type="file"
        ref={csvFileInputRef}
        accept=".csv,text/csv"
        onChange={handleCSVFileChange}
        className="hidden"
      />

      {/* Hidden Receipt Image File Input */}
      <input
        type="file"
        ref={receiptImgInputRef}
        accept="image/*"
        onChange={handleReceiptImgUpload}
        className="hidden"
      />

      {/* Hidden Dispatch Receipt / Doc File Input (Images & PDFs) */}
      <input
        type="file"
        ref={dispatchDocInputRef}
        accept="image/*,application/pdf"
        onChange={handleDispatchFileUpload}
        className="hidden"
      />

      <div className="w-full max-w-[1350px] mx-auto p-4 sm:p-7 pb-24 flex-1">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2 py-0.5 ${dbSource === 'supabase' ? 'bg-[#0D9970]' : 'bg-[#C94A00]'} text-white rounded border border-[#0C0C0C]`}>
                {dbSource === 'supabase' ? 'SUPABASE CLOUD LIVE' : 'STANDALONE / LOCAL'}
              </span>
              <button
                onClick={() => setSqlModalOpen(true)}
                className="font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2 py-0.5 bg-[#FAF6EE] hover:bg-white text-[#0C0C0C] rounded border border-[#0C0C0C] flex items-center gap-1 cursor-pointer"
                title="Configure Supabase SQL schema & API keys"
              >
                <Database className="w-3 h-3 text-[#0D9970]" /> Supabase SQL / DB
              </button>
              <span className="font-['DM_Mono',monospace] text-[0.7rem] text-[#666] font-bold">
                BRANDEX CMS v2.2
              </span>
            </div>
            <h1 className="font-['Bebas_Neue'] text-[2.2rem] tracking-[1.5px] leading-tight">
              Case Records &amp; Workflow Timeline
            </h1>
          </div>

          <div className="flex gap-2.5 flex-wrap items-center">
            {/* CSV Import & Export Tools */}
            <button
              onClick={handleImportCSVClick}
              className="flex items-center gap-1.5 font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] text-[#0C0C0C] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] hover:bg-white cursor-pointer font-bold"
              title="Import cases from CSV file"
            >
              <Upload className="w-3.5 h-3.5 text-[#C94A00]" /> Import CSV
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] text-[#0C0C0C] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] hover:bg-white cursor-pointer font-bold"
              title="Export all cases to CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#0D9970]" /> Export CSV
            </button>

            <Link
              href="/trademark-application"
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#C94A00] text-white border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] no-underline font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> + New Case
            </Link>

            <button
              onClick={loadAllRecords}
              className="p-2 border-[2px] border-[#0C0C0C] bg-[#FAF6EE] hover:bg-white rounded-[4px] shadow-[2px_2px_0_#0C0C0C] cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {bulkNotice && (
          <div className="p-3 bg-[#EBF7F2] border-2 border-[#0D9970] text-[#0D9970] font-['DM_Mono',monospace] text-[0.8rem] rounded-[4px] font-bold mb-4 shadow-[2px_2px_0_#0D9970]">
            {bulkNotice}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#fee2e2] border-2 border-[#ef4444] text-[#991b1b] font-['DM_Mono',monospace] text-[0.8rem] rounded-[4px] font-bold mb-4">
            {errorMsg}
          </div>
        )}

        {/* =========================================================================
            4 BOX STATISTICS ROW (TOTAL, PENDING/REVIEW, APPROVED/REJECTED, DISPATCHED/DELIVERED)
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Box 1: Total */}
          <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] p-4 rounded-[6px] shadow-[4px_4px_0_#0C0C0C]">
            <div className="font-['DM_Mono',monospace] text-[0.7rem] font-bold tracking-[1px] text-[#666] uppercase mb-1">
              BOX 01 · TOTAL CASES
            </div>
            <div className="font-['Bebas_Neue'] text-[2.4rem] tracking-[1px] leading-none text-[#0C0C0C]">
              {stats.total}
            </div>
            <div className="font-['DM_Mono',monospace] text-[0.7rem] text-[#0D9970] mt-1 font-bold">
              ✓ Full Case Sovereignty
            </div>
          </div>

          {/* Box 2: Pending & In Review (Default) */}
          <div
            onClick={() => setFilterStatus('PENDING_IN_REVIEW')}
            className={`border-[3px] border-[#0C0C0C] p-4 rounded-[6px] shadow-[4px_4px_0_#0C0C0C] cursor-pointer transition-all ${filterStatus === 'PENDING_IN_REVIEW' ? 'bg-[#FFE066]' : 'bg-[#FAF6EE] hover:bg-[#fff9db]'
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold tracking-[1px] text-[#0C0C0C] uppercase">
                BOX 02 · PENDING / IN REVIEW
              </span>
              <span className="font-['DM_Mono',monospace] text-[0.65rem] bg-[#0C0C0C] text-[#FAF6EE] px-1.5 py-0.2 rounded font-bold">
                DEFAULT
              </span>
            </div>
            <div className="font-['Bebas_Neue'] text-[2.4rem] tracking-[1px] leading-none text-[#0C0C0C]">
              {stats.pendingInReview}
            </div>
            <div className="font-['DM_Mono',monospace] text-[0.7rem] text-[#333] mt-1 font-bold">
              {stats.pending} Pending · {stats.inReview} In Review
            </div>
          </div>

          {/* Box 3: Approved / Rejected */}
          <div
            onClick={() => setFilterStatus('APPROVED')}
            className={`border-[3px] border-[#0C0C0C] p-4 rounded-[6px] shadow-[4px_4px_0_#0C0C0C] cursor-pointer transition-all ${filterStatus === 'APPROVED' ? 'bg-[#EBF7F2]' : 'bg-[#FAF6EE] hover:bg-[#f0fbf6]'
              }`}
          >
            <div className="font-['DM_Mono',monospace] text-[0.7rem] font-bold tracking-[1px] text-[#666] uppercase mb-1">
              BOX 03 · APPROVED / REJECTED
            </div>
            <div className="font-['Bebas_Neue'] text-[2.4rem] tracking-[1px] leading-none text-[#0C0C0C]">
              {stats.approvedRejected}
            </div>
            <div className="font-['DM_Mono',monospace] text-[0.7rem] text-[#333] mt-1 font-bold">
              <span className="text-[#0D9970]">{stats.approved} Approved</span> ·{' '}
              <span className="text-[#dc2626]">{stats.rejected} Rejected</span>
            </div>
          </div>

          {/* Box 4: Dispatched / Delivered */}
          <div
            onClick={() => setFilterStatus('DISPATCHED')}
            className={`border-[3px] border-[#0C0C0C] p-4 rounded-[6px] shadow-[4px_4px_0_#0C0C0C] cursor-pointer transition-all ${filterStatus === 'DISPATCHED' ? 'bg-[#e0f2fe]' : 'bg-[#FAF6EE] hover:bg-[#f0f9ff]'
              }`}
          >
            <div className="font-['DM_Mono',monospace] text-[0.7rem] font-bold tracking-[1px] text-[#666] uppercase mb-1">
              BOX 04 · DISPATCHED / DELIVERED
            </div>
            <div className="font-['Bebas_Neue'] text-[2.4rem] tracking-[1px] leading-none text-[#0C0C0C]">
              {stats.dispatchedDelivered}
            </div>
            <div className="font-['DM_Mono',monospace] text-[0.7rem] text-[#333] mt-1 font-bold">
              <span className="text-[#0284c7]">{stats.dispatched} Dispatched</span> ·{' '}
              <span className="text-[#0D9970]">{stats.delivered} Delivered</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            LAW FIRM WIDGET (Replaced Workflow Stage Distribution)
           ========================================================================= */}
        {showCharts && (
          <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px] mb-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#C94A00]" />
                <h2 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px]">
                  Cases by Law Firm / Legal Consultant
                </h2>
              </div>
              <span className="font-['DM_Mono',monospace] text-[0.7rem] text-[#666] font-bold">
                Top Practice Portfolios
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.byFirm.slice(0, 6).map(([firmName, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div
                    key={firmName}
                    onClick={() => {
                      if (selectedConsultants.includes(firmName)) {
                        setSelectedConsultants(prev => prev.filter(f => f !== firmName));
                      } else {
                        setSelectedConsultants(prev => [...prev, firmName]);
                      }
                    }}
                    className={`p-3 border-2 border-[#0C0C0C] rounded-[4px] cursor-pointer transition-all ${selectedConsultants.includes(firmName)
                        ? 'bg-[#C94A00] text-white shadow-[2px_2px_0_#0C0C0C]'
                        : 'bg-white hover:bg-[#F0E8D0]'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold truncate max-w-[200px]" title={firmName}>
                        {firmName}
                      </span>
                      <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold ml-2">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#ddd] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${selectedConsultants.includes(firmName) ? 'bg-[#FFE066]' : 'bg-[#0D9970]'}`}
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            CONTROLS, SHORT FILTER BUTTONS & MULTI-SELECT CONSULTANT
           ========================================================================= */}
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-4 rounded-[6px] mb-6">
          <div className="flex flex-col gap-3">
            {/* Short Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold tracking-[1px] uppercase text-[#666] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Stage:
              </span>

              {[
                { label: 'PENDING & IN REVIEW (Default)', value: 'PENDING_IN_REVIEW' },
                { label: 'ALL', value: 'ALL' },
                { label: 'APPROVED', value: 'APPROVED' },
                { label: 'REJECTED', value: 'REJECT' },
                { label: 'DISPATCHED', value: 'DISPATCHED' },
                { label: 'DELIVERED', value: 'DELIVERED' }
              ].map(st => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => {
                    setFilterStatus(st.value);
                    setCurrentPage(1);
                  }}
                  className={`font-['DM_Mono',monospace] text-[0.7rem] font-bold py-1.5 px-3 border-[1.5px] border-[#0C0C0C] rounded-[3px] cursor-pointer transition-all ${filterStatus === st.value
                      ? 'bg-[#0C0C0C] text-[#FAF6EE] shadow-[2px_2px_0_#C94A00]'
                      : 'bg-[#FAF6EE] text-[#0C0C0C] hover:bg-white'
                    }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Multi-select filter for Legal Consultant / Law Firm */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#ddd]">
              <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold tracking-[1px] uppercase text-[#666]">
                Consultant Filter:
              </span>
              {allConsultantsList.slice(0, 5).map(cName => {
                const isSelected = selectedConsultants.includes(cName);
                return (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => {
                      setSelectedConsultants(prev =>
                        isSelected ? prev.filter(c => c !== cName) : [...prev, cName]
                      );
                      setCurrentPage(1);
                    }}
                    className={`font-['DM_Mono',monospace] text-[0.68rem] font-bold py-1 px-2.5 border border-[#0C0C0C] rounded-[3px] cursor-pointer transition-all ${isSelected ? 'bg-[#C94A00] text-white' : 'bg-white text-[#0C0C0C] hover:bg-[#F0E8D0]'
                      }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {cName.length > 22 ? cName.substring(0, 22) + '...' : cName}
                  </button>
                );
              })}
              {selectedConsultants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedConsultants([])}
                  className="font-['DM_Mono',monospace] text-[0.65rem] text-[#dc2626] underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Search Input & Sorters */}
            <div className="flex gap-3 flex-wrap items-center pt-2 border-t border-[#ddd]">
              <div className="flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="SEARCH CASE NAME, APPLICANT, LAW FIRM, REF, TM NO..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2.5 border-2 border-[#0C0C0C] bg-white font-['Space_Grotesk'] text-[0.85rem] uppercase rounded-[4px]"
                />
              </div>

              {/* Year Filter */}
              <select
                value={filterYear}
                onChange={e => {
                  setFilterYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2.5 border-2 border-[#0C0C0C] bg-white font-['Space_Grotesk'] text-[0.8rem] rounded-[4px] cursor-pointer font-bold"
              >
                <option value="">ALL YEARS</option>
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="p-2.5 border-2 border-[#0C0C0C] bg-white font-['Space_Grotesk'] text-[0.8rem] rounded-[4px] cursor-pointer font-bold"
              >
                <option value="date-desc">Recent Date (Newest)</option>
                <option value="date-asc">Oldest Date First</option>
                <option value="mark">Case Name (A–Z)</option>
                <option value="status">Workflow Stage</option>
              </select>

              <button
                type="button"
                onClick={() => setShowCharts(!showCharts)}
                className="font-['DM_Mono',monospace] text-[0.72rem] font-bold py-2.5 px-3 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded-[4px] cursor-pointer"
              >
                {showCharts ? 'Hide Firm Widget' : 'Show Firm Widget'}
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BULK ACTIONS TOOLBAR (WHEN ROWS ARE CHECKED)
           ========================================================================= */}
        {selectedIds.length > 0 && (
          <div className="bg-[#0C0C0C] text-[#FAF6EE] border-[3px] border-[#C94A00] p-4 rounded-[6px] shadow-[4px_4px_0_#C94A00] mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="font-['DM_Mono',monospace] text-[0.8rem] font-bold text-[#FFE066]">
                [{selectedIds.length} CASES SELECTED]
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Stage Transition Buttons */}
              <button
                type="button"
                onClick={() => setApproveRejectModal({ open: true, isBulk: true, decision: 'APPROVED', notes: '' })}
                className="font-['DM_Mono',monospace] text-[0.72rem] font-bold py-1.5 px-3 bg-[#0D9970] text-white border border-[#FAF6EE] rounded cursor-pointer"
              >
                Mark Approved/Reject
              </button>

              <button
                type="button"
                onClick={() => setDispatchModal({
                  open: true,
                  isBulk: true,
                  date: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
                  note: '',
                  trackingId: '',
                  dispatchedImage: '',
                  dispatchedDocName: '',
                  dispatchedDocType: ''
                })}
                className="font-['DM_Mono',monospace] text-[0.72rem] font-bold py-1.5 px-3 bg-[#0284c7] text-white border border-[#FAF6EE] rounded cursor-pointer"
              >
                Mark Dispatched
              </button>

              <button
                type="button"
                onClick={() => setDeliveredModal({
                  open: true,
                  isBulk: true,
                  date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
                  receiverName: '',
                  receiptImage: ''
                })}
                className="font-['DM_Mono',monospace] text-[0.72rem] font-bold py-1.5 px-3 bg-[#15803d] text-white border border-[#FAF6EE] rounded cursor-pointer"
              >
                Mark Delivered
              </button>

              {/* Bulk Reassign to Saved Client */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
                <select
                  value={selectedClientForAssign}
                  onChange={e => setSelectedClientForAssign(e.target.value)}
                  className="p-1.5 bg-[#1f1f1f] text-[#FAF6EE] border border-white/40 font-['DM_Mono',monospace] text-[0.7rem] rounded"
                >
                  <option value="">-- Bulk Reassign to Saved Client --</option>
                  {savedClients.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.client_code}] {c.client_name}
                    </option>
                  ))}
                </select>
                {selectedClientForAssign && (
                  <button
                    type="button"
                    onClick={handleBulkAssignClient}
                    className="font-['DM_Mono',monospace] text-[0.7rem] font-bold py-1.5 px-3 bg-[#C94A00] text-white border border-white rounded cursor-pointer"
                  >
                    Assign
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="font-['DM_Mono',monospace] text-[0.7rem] py-1.5 px-2 bg-transparent text-[#999] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            RECORDS TABLE WITH SPECIFIED 11 COLUMNS + ACTIONS
           ========================================================================= */}
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] rounded-[6px] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.82rem]">
              <thead>
                <tr className="bg-[#0C0C0C] text-[#FAF6EE] border-b-2 border-[#0C0C0C]">
                  {/* Col 1: Tickmark Col */}
                  <th className="p-3 text-center w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[#FAF6EE] hover:text-[#C94A00] cursor-pointer"
                      title="Select all on page"
                    >
                      {isAllCurrentSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#C94A00]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>

                  {/* Col 2: Date (Short, sorted by recent date) */}
                  <th className="p-3 text-left font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase whitespace-nowrap">
                    Date
                  </th>

                  {/* Col 3: Case Ref in box of 3 col */}
                  <th className="p-3 text-center font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase whitespace-nowrap">
                    Case Ref [Code | Menu | #]
                  </th>

                  {/* Col 4: Image Thumbnail */}
                  <th className="p-3 text-center font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase w-14">
                    Logo
                  </th>

                  {/* Col 5: Case Name */}
                  <th className="p-3 text-left font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase">
                    Case Name
                  </th>

                  {/* Col 6: Class (1-45) Just Numbers */}
                  <th className="p-3 text-center font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase">
                    Class
                  </th>

                  {/* Col 7: Workflow Stage */}
                  <th className="p-3 text-center font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase">
                    Workflow Stage
                  </th>

                  {/* Col 8: Applicant */}
                  <th className="p-3 text-left font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase">
                    Applicant
                  </th>

                  {/* Col 9: Law Firm Name * */}
                  <th className="p-3 text-left font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase">
                    Law Firm Name *
                  </th>

                  {/* Col 10: Dispatched Date (ddd DD-MMM-YYYY) */}
                  <th className="p-3 text-left font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase whitespace-nowrap">
                    Dispatched Date
                  </th>

                  {/* Col 11: Delivered Date (DD-MMM-YY + Receiver name) */}
                  <th className="p-3 text-left font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase whitespace-nowrap">
                    Delivered Date
                  </th>

                  {/* Actions */}
                  <th className="p-3 text-center font-['DM_Mono',monospace] text-[0.68rem] tracking-[1px] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="p-12 text-center font-['DM_Mono',monospace]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#C94A00]" />
                      Loading standalone cases...
                    </td>
                  </tr>
                ) : pageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-12 text-center font-['DM_Mono',monospace] text-[#666]">
                      No cases match current filter.
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterStatus('ALL');
                            setSearchQuery('');
                            setSelectedConsultants([]);
                          }}
                          className="font-bold underline text-[#C94A00] cursor-pointer"
                        >
                          View All Cases
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRecords.map((r, idx) => {
                    const isSelected = selectedIds.includes(r.id);
                    const classPure = formatClassPure(r.classNo);
                    const shortDate = formatShortDate(r.date);
                    const lawFirm = r.lawFirm || r.conName || 'BRANDEX LAW ASSOCIATES';

                    return (
                      <tr
                        key={r.id || idx}
                        className={`border-b border-[#ddd] transition-colors ${isSelected ? 'bg-[#FFE066]/30' : idx % 2 === 0 ? 'bg-[#FAF6EE]' : 'bg-[#F5EEDC]'
                          } hover:bg-[#E8DFC7]`}
                      >
                        {/* Col 1: Tickmark Checkbox */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(r.id)}
                            className="cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#C94A00]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#666]" />
                            )}
                          </button>
                        </td>

                        {/* Col 2: Date (Short, sorted by recent date) */}
                        <td className="p-2.5 font-['DM_Mono',monospace] text-[0.74rem] font-bold text-[#0C0C0C] whitespace-nowrap">
                          {shortDate}
                        </td>

                        {/* Col 3: Case Ref in box of 3 col */}
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center border-[1.5px] border-[#0C0C0C] rounded-[3px] overflow-hidden bg-white shadow-[1px_1px_0_#0C0C0C] font-['DM_Mono',monospace] text-[0.68rem] font-bold">
                            <span className="px-1.5 py-0.5 bg-[#FAF6EE] text-[#C94A00] border-r border-[#0C0C0C]">
                              {r.clientCode || '646'}
                            </span>
                            <span className="px-1.5 py-0.5 bg-white text-[#0C0C0C] border-r border-[#0C0C0C]">
                              {r.selectionMenu || 'A'}
                            </span>
                            <span className="px-1.5 py-0.5 bg-[#E8DFC7] text-[#0C0C0C]">
                              {r.caseNo || String(idx + 1).padStart(3, '0')}
                            </span>
                          </div>
                        </td>

                        {/* Col 4: Image Thumbnail */}
                        <td className="p-2.5 text-center">
                          {r.img && r.img.startsWith('data:image') ? (
                            <div className="w-9 h-9 border border-[#0C0C0C] rounded bg-white p-0.5 overflow-hidden mx-auto shadow-[1px_1px_0_#0C0C0C]">
                              <Image
                                src={r.img}
                                alt="Logo"
                                width={36}
                                height={36}
                                className="object-contain w-full h-full"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 border border-[#0C0C0C] rounded bg-[#E8DFC7] flex items-center justify-center font-['DM_Mono',monospace] text-[0.6rem] font-bold text-[#666] mx-auto shadow-[1px_1px_0_#0C0C0C]">
                              TM
                            </div>
                          )}
                        </td>

                        {/* Col 5: Case Name */}
                        <td className="p-2.5 font-bold font-['Space_Grotesk'] text-[0.85rem] text-[#0C0C0C]">
                          <HighlightText text={r.folder} query={searchQuery} />
                          {r.tm && (
                            <div className="text-[0.68rem] text-[#666] font-normal font-['DM_Mono',monospace]">
                              TM #{r.tm}
                            </div>
                          )}
                        </td>

                        {/* Col 6: Class (1-45) Just Numbers */}
                        <td className="p-2.5 text-center font-['Bebas_Neue'] text-[1.2rem] text-[#C94A00]">
                          {classPure}
                        </td>

                        {/* Col 7: Workflow Stage */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span className={`inline-block font-['DM_Mono',monospace] text-[0.68rem] font-bold py-1 px-2.5 rounded-[3px] border border-[#0C0C0C] shadow-[1px_1px_0_#0C0C0C] uppercase ${statusBadge(r.status)}`}>
                            {r.status || 'PENDING'}
                          </span>
                        </td>

                        {/* Col 8: Applicant */}
                        <td className="p-2.5 text-[0.78rem]">
                          <div className="font-bold">
                            <HighlightText text={r.appName} query={searchQuery} />
                          </div>
                          {r.appTrade && (
                            <div className="text-[0.68rem] text-[#666] font-['DM_Mono',monospace] truncate max-w-[160px]" title={r.appTrade}>
                              {r.appTrade}
                            </div>
                          )}
                        </td>

                        {/* Col 9: Law Firm Name * */}
                        <td className="p-2.5 text-[0.76rem] font-medium font-['DM_Mono',monospace] max-w-[180px] truncate" title={lawFirm}>
                          <HighlightText text={lawFirm} query={searchQuery} />
                        </td>

                        {/* Col 10: Dispatched Date (ddd DD-MMM-YYYY) & Proof of Sending */}
                        <td className="p-2.5 font-['DM_Mono',monospace] text-[0.72rem] text-[#0C0C0C] whitespace-nowrap">
                          {r.dispatchedDate ? (
                            <div>
                              <div className="font-bold text-[#0284c7]">{r.dispatchedDate}</div>
                              {r.trackingId && (
                                <div className="text-[0.65rem] text-[#666]">Trk: {r.trackingId}</div>
                              )}
                              {r.dispatchedImage && (
                                <button
                                  type="button"
                                  onClick={() => setProofModal({
                                    open: true,
                                    title: `Dispatch Proof / Receipt - Case ${r.folder} (${r.tm || 'No TM'})`,
                                    url: r.dispatchedImage!,
                                    docName: r.dispatchedDocName || `dispatch_receipt_${r.folder}`,
                                    docType: r.dispatchedDocType || (r.dispatchedImage?.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg')
                                  })}
                                  className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.65rem] font-bold bg-[#e0f2fe] text-[#0369a1] border border-[#0284c7] rounded hover:bg-[#bae6fd] cursor-pointer"
                                  title="View Dispatch Receipt / Proof of Sending"
                                >
                                  <Receipt className="w-3 h-3 text-[#0284c7]" />
                                  <span>Receipt Proof ✓</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#999]">—</span>
                          )}
                        </td>

                        {/* Col 11: Delivered Date (DD-MMM-YY + Receiver name) */}
                        <td className="p-2.5 font-['DM_Mono',monospace] text-[0.72rem] whitespace-nowrap">
                          {r.deliveredDate ? (
                            <div>
                              <span className="font-bold text-[#0D9970]">{r.deliveredDate}</span>
                              {r.receiverName && (
                                <span className="text-[0.65rem] text-[#333] ml-1 font-normal">
                                  ({r.receiverName})
                                </span>
                              )}
                              {r.receiptImage && (
                                <button
                                  type="button"
                                  onClick={() => setProofModal({
                                    open: true,
                                    title: `Delivery Receipt - Case ${r.folder}`,
                                    url: r.receiptImage!,
                                    docName: `delivery_receipt_${r.folder}`,
                                    docType: 'image/jpeg'
                                  })}
                                  className="ml-1 inline-flex items-center gap-0.5 text-[0.65rem] text-[#15803d] font-bold bg-[#dcfce7] border border-[#16a34a] px-1 py-0.5 rounded hover:bg-[#bbf7d0] cursor-pointer"
                                  title="View Delivery Receipt"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  <span>Receipt ✓</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#999]">—</span>
                          )}
                        </td>

                        {/* Col 12: Actions */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Workflow Stage Advancers */}
                            <button
                              type="button"
                              onClick={() => handleOpenStageTransition(r, 'APPROVED_OR_REJECTED')}
                              className="p-1.5 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-[#FFE066] rounded shadow-[1px_1px_0_#0C0C0C] cursor-pointer"
                              title="Advance: Approve or Reject"
                            >
                              <Check className="w-3.5 h-3.5 text-[#0D9970]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenStageTransition(r, 'DISPATCHED')}
                              className="p-1.5 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-[#e0f2fe] rounded shadow-[1px_1px_0_#0C0C0C] cursor-pointer"
                              title="Advance: Mark Dispatched"
                            >
                              <Truck className="w-3.5 h-3.5 text-[#0284c7]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenStageTransition(r, 'DELIVERED')}
                              className="p-1.5 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-[#EBF7F2] rounded shadow-[1px_1px_0_#0C0C0C] cursor-pointer"
                              title="Advance: Mark Delivered"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-[#15803d]" />
                            </button>

                            {/* Edit Case details */}
                            <button
                              type="button"
                              onClick={() => setEditingRecord({ ...r })}
                              className="p-1.5 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-white rounded shadow-[1px_1px_0_#0C0C0C] cursor-pointer"
                              title="Edit Case Details"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#0C0C0C]" />
                            </button>

                            {/* Delete Case */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(r.id, r.folder)}
                              className="p-1.5 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-[#fee2e2] rounded shadow-[1px_1px_0_#0C0C0C] cursor-pointer"
                              title="Delete Case"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#dc2626]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-[#E8DFC7] border-t-2 border-[#0C0C0C] p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="font-['DM_Mono',monospace] text-[0.72rem] text-[#333]">
              Showing {filteredAndSortedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredAndSortedRecords.length)} of {filteredAndSortedRecords.length} filtered cases
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2.5 py-1 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-white rounded disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2.5 py-1 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-white rounded disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FLOATING ACTION BUTTON (FAB)
          Quick access to Import CSV, Open Help, and Toggle Settings
         ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {fabOpen && (
          <div className="mb-3 flex flex-col items-end gap-2 bg-[#FAF6EE] border-[3px] border-[#0C0C0C] p-3 rounded-[6px] shadow-[6px_6px_0_#0C0C0C] min-w-[210px] animate-in fade-in slide-in-from-bottom-2">
            <div className="font-['DM_Mono',monospace] text-[0.68rem] font-bold tracking-[1px] uppercase text-[#666] pb-1 border-b border-[#ddd] w-full text-left">
              Quick Actions
            </div>

            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                handleImportCSVClick();
              }}
              className="flex items-center gap-2 w-full text-left font-['DM_Mono',monospace] text-[0.75rem] font-bold p-1.5 hover:bg-[#E8DFC7] rounded cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#C94A00]" />
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                handleExportCSV();
              }}
              className="flex items-center gap-2 w-full text-left font-['DM_Mono',monospace] text-[0.75rem] font-bold p-1.5 hover:bg-[#E8DFC7] rounded cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#0D9970]" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                setHelpModalOpen(true);
              }}
              className="flex items-center gap-2 w-full text-left font-['DM_Mono',monospace] text-[0.75rem] font-bold p-1.5 hover:bg-[#E8DFC7] rounded cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#0284c7]" />
              <span>Open Help &amp; Rules</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                setSettingsModalOpen(true);
              }}
              className="flex items-center gap-2 w-full text-left font-['DM_Mono',monospace] text-[0.75rem] font-bold p-1.5 hover:bg-[#E8DFC7] rounded cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[#666]" />
              <span>Toggle Settings</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className="w-13 h-13 rounded-full bg-[#C94A00] text-white border-[3px] border-[#0C0C0C] flex items-center justify-center shadow-[4px_4px_0_#0C0C0C] hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold"
          title="Quick CMS Actions (FAB)"
        >
          {fabOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      {/* =========================================================================
          DIALOG 1: APPROVED OR REJECTED MODAL
         ========================================================================= */}
      {approveRejectModal.open && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] flex items-center gap-2">
                <Check className="w-5 h-5 text-[#0D9970]" />
                Stage Decision: Approved or Rejected?
              </h3>
              <button
                type="button"
                onClick={() => setApproveRejectModal({ open: false, decision: 'APPROVED', notes: '' })}
                className="p-1 border border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-['Space_Grotesk'] text-[0.85rem] text-[#333] mb-4">
              Please specify whether this case ({approveRejectModal.record ? approveRejectModal.record.folder : `${selectedIds.length} selected cases`}) has been officially <strong>APPROVED</strong> or <strong>REJECTED</strong> by the IPO Examiner.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setApproveRejectModal(prev => ({ ...prev, decision: 'APPROVED' }))}
                className={`py-3 px-4 border-[2.5px] border-[#0C0C0C] rounded-[4px] font-['DM_Mono',monospace] text-[0.85rem] font-bold cursor-pointer transition-all ${approveRejectModal.decision === 'APPROVED'
                    ? 'bg-[#0D9970] text-white shadow-[3px_3px_0_#0C0C0C]'
                    : 'bg-white text-[#0C0C0C]'
                  }`}
              >
                ✓ Approve Case
              </button>

              <button
                type="button"
                onClick={() => setApproveRejectModal(prev => ({ ...prev, decision: 'REJECTED' }))}
                className={`py-3 px-4 border-[2.5px] border-[#0C0C0C] rounded-[4px] font-['DM_Mono',monospace] text-[0.85rem] font-bold cursor-pointer transition-all ${approveRejectModal.decision === 'REJECTED'
                    ? 'bg-[#dc2626] text-white shadow-[3px_3px_0_#0C0C0C]'
                    : 'bg-white text-[#0C0C0C]'
                  }`}
              >
                ✕ Reject Case
              </button>
            </div>

            <div className="mb-4">
              <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">
                Official Examination Note / Reason:
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Granted IPO Acknowledgment receipt / Objection under Section 14"
                value={approveRejectModal.notes}
                onChange={e => setApproveRejectModal(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2.5 border-2 border-[#0C0C0C] bg-white rounded text-[0.82rem] font-['Space_Grotesk'] uppercase"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t-2 border-[#0C0C0C]">
              <button
                type="button"
                onClick={() => setApproveRejectModal({ open: false, decision: 'APPROVED', notes: '' })}
                className="font-['DM_Mono',monospace] text-[0.75rem] py-2 px-4 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApproveReject}
                className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-5 border-2 border-[#0C0C0C] bg-[#C94A00] text-white rounded shadow-[2px_2px_0_#0C0C0C] cursor-pointer"
              >
                Save Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIALOG 2: DISPATCH MODAL (Date, Note, Tracking ID)
         ========================================================================= */}
      {dispatchModal.open && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#0284c7]" />
                Dispatch Shipment Details
              </h3>
              <button
                type="button"
                onClick={() => setDispatchModal({ open: false, date: '', note: '', trackingId: '' })}
                className="p-1 border border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 font-['Space_Grotesk'] text-[0.85rem]">
              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">
                  Dispatched Date (ddd DD-MMM-YYYY) *
                </label>
                <input
                  type="text"
                  required
                  value={dispatchModal.date}
                  onChange={e => setDispatchModal(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded font-bold"
                />
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">
                  Courier Tracking ID
                </label>
                <input
                  type="text"
                  placeholder="E.g., TCS-TRK-99120488 or LCS-881920"
                  value={dispatchModal.trackingId}
                  onChange={e => setDispatchModal(prev => ({ ...prev, trackingId: e.target.value.toUpperCase() }))}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">
                  Dispatch Note / Shipping Manifest
                </label>
                <textarea
                  rows={2}
                  placeholder="E.g., Hardcopy TM-1 & TM-48 documents dispatched via Leopard Courier."
                  value={dispatchModal.note}
                  onChange={e => setDispatchModal(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase text-[0.8rem]"
                />
              </div>

              {/* Courier Receipt & Proof of Sending Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-['DM_Mono',monospace] text-[0.7rem] font-bold flex items-center gap-1.5 text-[#0C0C0C]">
                    <Receipt className="w-3.5 h-3.5 text-[#0284c7]" />
                    Proof of Sending (Courier Receipt / Waybill / Slip)
                  </label>
                  {dispatchModal.dispatchedImage && (
                    <button
                      type="button"
                      onClick={() => setDispatchModal(prev => ({ ...prev, dispatchedImage: '', dispatchedDocName: '', dispatchedDocType: '' }))}
                      className="text-[0.65rem] text-[#dc2626] font-bold hover:underline cursor-pointer"
                    >
                      Remove Slip
                    </button>
                  )}
                </div>

                <div
                  onClick={() => dispatchDocInputRef.current?.click()}
                  className="border-2 border-dashed border-[#0C0C0C] p-3 text-center bg-[#E8DFC7] cursor-pointer hover:bg-[#dfd7bf] rounded transition-colors"
                >
                  {dispatchModal.dispatchedImage ? (
                    <div className="flex items-center justify-between gap-2.5 text-left bg-white p-2 border border-[#0C0C0C] rounded shadow-[2px_2px_0_#0C0C0C]">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {dispatchModal.dispatchedDocType?.includes('pdf') || dispatchModal.dispatchedImage.startsWith('data:application/pdf') ? (
                          <div className="w-10 h-10 bg-[#fee2e2] border border-[#ef4444] rounded flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#b91c1c]" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 border border-[#0C0C0C] rounded overflow-hidden shrink-0 bg-[#FAF6EE]">
                            <Image
                              src={dispatchModal.dispatchedImage}
                              alt="Receipt Slip"
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-['DM_Mono',monospace] text-[0.72rem] font-bold truncate text-[#0C0C0C]">
                            {dispatchModal.dispatchedDocName || 'Courier_Booking_Receipt'}
                          </p>
                          <span className="font-['DM_Mono',monospace] text-[0.65rem] text-[#0D9970] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#0D9970]" />
                            Receipt attached (Click to change)
                          </span>
                        </div>
                      </div>
                      <span className="text-[0.68rem] font-['DM_Mono',monospace] px-2 py-1 bg-[#FAF6EE] border border-[#0C0C0C] rounded font-bold shrink-0">
                        Replace
                      </span>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Upload className="w-5 h-5 mx-auto mb-1 text-[#0284c7]" />
                      <p className="font-['DM_Mono',monospace] text-[0.72rem] font-bold text-[#0C0C0C]">
                        Click to upload Courier Booking Receipt or Airway Bill
                      </p>
                      <p className="font-['Space_Grotesk'] text-[0.65rem] text-[#666] mt-0.5">
                        Accepts TCS, Leopard, Post booking receipts (Images or PDF documents up to 12MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t-2 border-[#0C0C0C] mt-4">
              <button
                type="button"
                onClick={() => setDispatchModal({ open: false, date: '', note: '', trackingId: '', dispatchedImage: '', dispatchedDocName: '', dispatchedDocType: '' })}
                className="font-['DM_Mono',monospace] text-[0.75rem] py-2 px-4 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDispatch}
                className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-5 border-2 border-[#0C0C0C] bg-[#0284c7] text-white rounded shadow-[2px_2px_0_#0C0C0C] cursor-pointer"
              >
                Save Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIALOG 3: DELIVERED MODAL (Date, Receiver Name, Upload Image Receipt)
         ========================================================================= */}
      {deliveredModal.open && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#15803d]" />
                Delivery Confirmation &amp; Receipt
              </h3>
              <button
                type="button"
                onClick={() => setDeliveredModal({ open: false, date: '', receiverName: '', receiptImage: '' })}
                className="p-1 border border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 font-['Space_Grotesk'] text-[0.85rem]">
              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">
                  Delivered Date (DD-MMM-YY) *
                </label>
                <input
                  type="text"
                  required
                  value={deliveredModal.date}
                  onChange={e => setDeliveredModal(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded font-bold"
                />
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">
                  Name of Receiver *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Abdul Razzaq (Manager)"
                  value={deliveredModal.receiverName}
                  onChange={e => setDeliveredModal(prev => ({ ...prev, receiverName: e.target.value.toUpperCase() }))}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">
                  Upload Delivery Receipt Image
                </label>
                <div
                  onClick={() => receiptImgInputRef.current?.click()}
                  className="border-2 border-dashed border-[#0C0C0C] p-4 text-center bg-[#E8DFC7] cursor-pointer hover:bg-[#dfd7bf] rounded"
                >
                  {deliveredModal.receiptImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 border border-[#0C0C0C] rounded overflow-hidden">
                        <Image
                          src={deliveredModal.receiptImage}
                          alt="Receipt Preview"
                          width={80}
                          height={80}
                          className="object-contain w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="font-['DM_Mono',monospace] text-[0.65rem] text-[#0D9970] font-bold">
                        ✓ Receipt Image Uploaded (Click to replace)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-5 h-5 mx-auto mb-1 text-[#666]" />
                      <span className="font-['DM_Mono',monospace] text-[0.72rem] font-bold">
                        Click to select delivery receipt photo
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t-2 border-[#0C0C0C] mt-4">
              <button
                type="button"
                onClick={() => setDeliveredModal({ open: false, date: '', receiverName: '', receiptImage: '' })}
                className="font-['DM_Mono',monospace] text-[0.75rem] py-2 px-4 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDelivered}
                className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-5 border-2 border-[#0C0C0C] bg-[#15803d] text-white rounded shadow-[2px_2px_0_#0C0C0C] cursor-pointer"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIALOG 4: EDIT CASE DETAILS MODAL
         ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#C94A00]" />
                Edit Case ({editingRecord.folder})
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 border border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="flex flex-col gap-3 font-['Space_Grotesk'] text-[0.85rem]">
              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Case Name *</label>
                <input
                  type="text"
                  required
                  value={editingRecord.folder || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, folder: e.target.value.toUpperCase() })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Class (1–45)</label>
                  <input
                    type="text"
                    value={editingRecord.classNo || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, classNo: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded font-bold"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">TM Number</label>
                  <input
                    type="text"
                    value={editingRecord.tm || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, tm: e.target.value.toUpperCase() })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Law Firm Name *</label>
                <input
                  type="text"
                  value={editingRecord.lawFirm || editingRecord.conName || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, lawFirm: e.target.value.toUpperCase(), conName: e.target.value.toUpperCase() })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={editingRecord.appName || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, appName: e.target.value.toUpperCase() })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Trading As / Business</label>
                <input
                  type="text"
                  value={editingRecord.appTrade || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, appTrade: e.target.value.toUpperCase() })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Dispatched Date</label>
                  <input
                    type="text"
                    placeholder="ddd DD-MMM-YYYY"
                    value={editingRecord.dispatchedDate || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, dispatchedDate: e.target.value })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Tracking ID</label>
                  <input
                    type="text"
                    value={editingRecord.trackingId || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, trackingId: e.target.value.toUpperCase() })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                  />
                </div>
              </div>

              {/* Dispatch Proof of Sending / Receipt in Edit Modal */}
              <div className="p-2.5 bg-[#FAF6EE] border-2 border-[#0C0C0C] rounded">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold flex items-center gap-1.5 text-[#0284c7]">
                    <Receipt className="w-3.5 h-3.5" />
                    Dispatch Proof of Sending:
                  </span>
                  {editingRecord.dispatchedImage && (
                    <button
                      type="button"
                      onClick={() => setEditingRecord({ ...editingRecord, dispatchedImage: '', dispatchedDocName: '', dispatchedDocType: '' })}
                      className="text-[0.65rem] text-[#dc2626] font-bold hover:underline cursor-pointer"
                    >
                      Remove Slip
                    </button>
                  )}
                </div>
                {editingRecord.dispatchedImage ? (
                  <div className="flex items-center justify-between gap-2 bg-white p-2 border border-[#0C0C0C] rounded shadow-[1px_1px_0_#0C0C0C]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {editingRecord.dispatchedDocType?.includes('pdf') || editingRecord.dispatchedImage.startsWith('data:application/pdf') ? (
                        <FileText className="w-4 h-4 text-[#b91c1c] shrink-0" />
                      ) : (
                        <div className="w-6 h-6 border border-[#0C0C0C] rounded overflow-hidden shrink-0">
                          <Image
                            src={editingRecord.dispatchedImage}
                            alt="Slip"
                            width={24}
                            height={24}
                            className="object-cover w-full h-full"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold truncate">
                        {editingRecord.dispatchedDocName || 'Dispatch_Receipt_Attached'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProofModal({
                        open: true,
                        title: `Dispatch Proof - ${editingRecord.folder}`,
                        url: editingRecord.dispatchedImage!,
                        docName: editingRecord.dispatchedDocName || 'Dispatch_Receipt',
                        docType: editingRecord.dispatchedDocType
                      })}
                      className="font-['DM_Mono',monospace] text-[0.68rem] font-bold px-2 py-0.5 bg-[#e0f2fe] text-[#0369a1] border border-[#0284c7] rounded hover:bg-[#bae6fd] cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-[#0C0C0C] bg-white rounded cursor-pointer hover:bg-[#F0E8D0] font-['DM_Mono',monospace] text-[0.7rem] font-bold text-[#555]">
                    <Upload className="w-3.5 h-3.5 text-[#0284c7]" />
                    <span>Upload Dispatch Receipt / Slip</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setEditingRecord(prev => prev ? ({
                            ...prev,
                            dispatchedImage: ev.target?.result as string,
                            dispatchedDocName: file.name,
                            dispatchedDocType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
                          }) : null);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Delivered Date</label>
                  <input
                    type="text"
                    placeholder="DD-MMM-YY"
                    value={editingRecord.deliveredDate || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, deliveredDate: e.target.value })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Receiver Name</label>
                  <input
                    type="text"
                    value={editingRecord.receiverName || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, receiverName: e.target.value.toUpperCase() })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={editingRecord.notes || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded text-[0.8rem]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-[#0C0C0C] mt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="font-['DM_Mono',monospace] text-[0.75rem] py-2 px-4 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-5 border-2 border-[#0C0C0C] bg-[#C94A00] text-white rounded shadow-[2px_2px_0_#0C0C0C] cursor-pointer"
                >
                  {savingRecord ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIALOG 5: HELP & WORKFLOW RULES MODAL
         ========================================================================= */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-lg w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0284c7]" />
                CMS Workflow Rules &amp; Guide
              </h3>
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="p-1 border border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-['Space_Grotesk'] text-[0.85rem] text-[#333]">
              <div className="p-3 bg-[#FFE066]/30 border-2 border-[#0C0C0C] rounded">
                <div className="font-['DM_Mono',monospace] text-[0.72rem] font-bold text-[#0C0C0C] mb-1">
                  1. WORKFLOW SEQUENCE
                </div>
                <div>Pending / In Review → Approved / Rejected → Dispatched → Delivered</div>
              </div>

              <div className="p-3 bg-[#EBF7F2] border-2 border-[#0C0C0C] rounded">
                <div className="font-['DM_Mono',monospace] text-[0.72rem] font-bold text-[#0D9970] mb-1">
                  2. CSV IMPORT &amp; EXPORT
                </div>
                <div>You can download all cases at any time as CSV or import cases directly with zero network latency.</div>
              </div>

              <div className="p-3 bg-white border-2 border-[#0C0C0C] rounded">
                <div className="font-['DM_Mono',monospace] text-[0.72rem] font-bold text-[#C94A00] mb-1">
                  3. BULK REASSIGNMENT
                </div>
                <div>Select any number of rows with checkboxes to bulk update their status or reassign them to an existing saved client.</div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t-2 border-[#0C0C0C] mt-4">
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-5 border-2 border-[#0C0C0C] bg-[#0C0C0C] text-[#FAF6EE] rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIALOG 6: SETTINGS MODAL
         ========================================================================= */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-sm w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#666]" />
                CMS Preferences
              </h3>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="p-1 border border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 font-['Space_Grotesk'] text-[0.85rem]">
              <div className="flex items-center justify-between">
                <span>Show Law Firm Widget:</span>
                <input
                  type="checkbox"
                  checked={showCharts}
                  onChange={e => setShowCharts(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Page Size:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="p-1 border border-[#0C0C0C] bg-white rounded font-bold font-['DM_Mono',monospace] text-[0.75rem]"
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t-2 border-[#0C0C0C] mt-5">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-5 border-2 border-[#0C0C0C] bg-[#0C0C0C] text-[#FAF6EE] rounded cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIALOG 6: PROOF OF SENDING / RECEIPT VIEWER MODAL
         ========================================================================= */}
      {proofModal.open && (
        <div className="fixed inset-0 z-[1300] bg-black/75 flex items-center justify-center p-3 sm:p-5 backdrop-blur-[2px]">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-2xl w-full max-h-[92vh] flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b-2 border-[#0C0C0C] bg-[#FAF6EE]">
              <div className="flex items-center gap-2 overflow-hidden">
                <Receipt className="w-5 h-5 text-[#0284c7] shrink-0" />
                <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] truncate">
                  {proofModal.title || 'Proof of Sending / Receipt'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProofModal({ open: false, title: '', url: '' })}
                className="p-1 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-[#F0E8D0] flex flex-col items-center justify-center min-h-[300px]">
              {proofModal.url.startsWith('data:application/pdf') || proofModal.docType?.includes('pdf') || proofModal.docName?.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-[500px] flex flex-col bg-white border-2 border-[#0C0C0C] rounded overflow-hidden">
                  <div className="p-2 bg-[#E8DFC7] border-b border-[#0C0C0C] flex items-center justify-between text-xs font-['DM_Mono',monospace]">
                    <span className="font-bold truncate flex items-center gap-1.5 text-[#b91c1c]">
                      <FileText className="w-4 h-4" />
                      {proofModal.docName || 'Dispatch_Document.pdf'}
                    </span>
                    <span className="text-[#666]">PDF Document</span>
                  </div>
                  <iframe
                    src={proofModal.url}
                    className="w-full flex-1 border-none"
                    title="Proof PDF Viewer"
                  />
                </div>
              ) : (
                <div className="relative max-h-[550px] w-full flex items-center justify-center p-2 bg-white border-2 border-[#0C0C0C] rounded shadow-[3px_3px_0_#0C0C0C]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofModal.url}
                    alt={proofModal.title}
                    className="max-h-[500px] max-w-full object-contain rounded"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#FAF6EE] border-t-2 border-[#0C0C0C] flex items-center justify-between gap-3">
              <span className="font-['DM_Mono',monospace] text-[0.7rem] text-[#666] truncate max-w-[280px]">
                {proofModal.docName || 'Receipt_Verification_Proof'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={proofModal.url}
                  download={proofModal.docName || 'Brandex_Dispatch_Proof'}
                  className="font-['DM_Mono',monospace] text-[0.72rem] font-bold py-2 px-4 border-2 border-[#0C0C0C] bg-[#0284c7] text-white rounded shadow-[2px_2px_0_#0C0C0C] flex items-center gap-1.5 hover:bg-[#0369a1] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </a>
                <button
                  type="button"
                  onClick={() => setProofModal({ open: false, title: '', url: '' })}
                  className="font-['DM_Mono',monospace] text-[0.72rem] py-2 px-4 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SqlSetupModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        onSuccess={loadAllRecords}
      />

      <Footer />
    </div>
  );
}
