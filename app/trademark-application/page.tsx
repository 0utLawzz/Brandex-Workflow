'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { CLASS_DATA, LAW_FIRM_DEFAULT, CATEGORIES, WORKFLOW_STATUSES, SHEET_URL } from '@/lib/data';
import { standaloneDB } from '@/lib/standalone-db';
import { supabaseDB } from '@/lib/supabase-db';
import { Copy, Check, ExternalLink, AlertTriangle, X, ShieldAlert, BookOpen, ArrowRight, CheckCircle2, Database } from 'lucide-react';

export default function TrademarkApplicationPage() {
  const [selectedCategory, setSelectedCategory] = useState('INITIAL');
  const [selectionMenu, setSelectionMenu] = useState('A'); // X, A, N, B
  const [clientCode, setClientCode] = useState('646');
  const [caseNo, setCaseNo] = useState('001');

  const [savedClients, setSavedClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  const [classNo, setClassNo] = useState('3');
  const [classList] = useState(CLASS_DATA);
  const [classDesc, setClassDesc] = useState(() => CLASS_DATA.find(c => c.n === 3)?.desc || '');
  const [classDescEditable, setClassDescEditable] = useState(false);

  const [conName, setConName] = useState(LAW_FIRM_DEFAULT.name);
  const [conAdd, setConAdd] = useState(LAW_FIRM_DEFAULT.addr);
  const [conEditable, setConEditable] = useState(false);

  const [folder, setFolder] = useState('');
  const [tm, setTm] = useState(''); // Optional (acknowledgment stage)
  const [appType, setAppType] = useState('SOLE PROPRIETOR');
  const [appName, setAppName] = useState('');
  const [appSo, setAppSo] = useState('');
  const [appCnic, setAppCnic] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [appTrade, setAppTrade] = useState('');
  const [appAdd, setAppAdd] = useState('');
  const [year, setYear] = useState('2023');
  const [noImg, setNoImg] = useState('[TEXT HERE]');

  const [status, setStatus] = useState('PENDING');
  const [trackingId, setTrackingId] = useState('');

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing');
  const [showProgress, setShowProgress] = useState(false);

  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | ''>('');
  const [statusLinks, setStatusLinks] = useState<{ folderUrl?: string; tm1Url?: string; tm48Url?: string } | null>(null);

  // Google Apps Script Permission Guide Modal State
  const [permissionErrorModalOpen, setPermissionErrorModalOpen] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [lastSavedCaseId, setLastSavedCaseId] = useState<number | null>(null);
  const [lastSavedFolder, setLastSavedFolder] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const formatDisplayDate = (d: Date) => {
    const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    let hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12; if (hh === 0) hh = 12;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${MONTHS_SHORT[d.getMonth()]}-${d.getFullYear()} ${pad(hh)}:${pad(d.getMinutes())} ${ampm}`;
  };

  const updateExpiry = React.useCallback((d: Date) => {
    const expiry = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
    setExpiryDate(formatDisplayDate(expiry));
  }, []);

  const onClassChange = React.useCallback((val: string) => {
    setClassNo(val);
    const item = CLASS_DATA.find(c => c.n === parseInt(val, 10));
    if (item) {
      setClassDesc(item.desc);
    } else {
      setClassDesc('');
    }
  }, []);

  const handleRemoveClassDesc = () => {
    setClassDesc('');
  };

  const handleIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIssueDate(val);
    if (val) {
      updateExpiry(new Date(val));
    }
  };

  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setIssueDate(localStr);
    updateExpiry(now);

    // Fetch client profiles
    async function fetchClients() {
      try {
        const res = await supabaseDB.getClients();
        setSavedClients(res.clients);
      } catch {
        const clients = standaloneDB.getClients();
        setSavedClients(clients);
      }
    }
    fetchClients();

    // Auto-increment case number
    async function fetchLatestCaseNo() {
      try {
        const res = await supabaseDB.getRecords();
        let maxCase = 0;
        res.records.forEach(r => {
          if (r.caseNo) {
            const num = parseInt(r.caseNo, 10);
            if (!isNaN(num) && num > maxCase) maxCase = num;
          }
        });
        setCaseNo(String(maxCase + 1).padStart(3, '0'));
      } catch {
        const records = standaloneDB.getRecords();
        let maxCase = 0;
        records.forEach(r => {
          if (r.caseNo) {
            const num = parseInt(r.caseNo, 10);
            if (!isNaN(num) && num > maxCase) maxCase = num;
          }
        });
        setCaseNo(String(maxCase + 1).padStart(3, '0'));
      }
    }
    fetchLatestCaseNo();
  }, [updateExpiry]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = savedClients.find(c => String(c.id) === clientId);
    if (client) {
      if (client.client_code) setClientCode(client.client_code);
      if (client.client_name) setAppName(client.client_name);
      if (client.father_name) setAppSo(client.father_name);
      if (client.trading_as) setAppTrade(client.trading_as);
      if (client.cnic) setAppCnic(client.cnic);
      if (client.address) setAppAdd(client.address);
    }
  };

  const handleCnicInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 13);
    let formatted = digits;
    if (digits.length > 5) formatted = digits.slice(0, 5) + '-' + digits.slice(5);
    if (digits.length > 12) formatted = digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
    setAppCnic(formatted);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        e.target.value = '';
        setStatusType('error');
        setStatusMsg('Choose a PNG or JPEG image.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        e.target.value = '';
        setStatusType('error');
        setStatusMsg('Logo images must be 2 MB or smaller.');
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewSrc(ev.target?.result as string);
        setNoImg('IMAGE UPLOADED');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      const acceptedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
      const combined = [...additionalFiles, ...filesArr];
      const invalidType = combined.find(file => !acceptedTypes.has(file.type));
      const tooLarge = combined.find(file => file.size > 4 * 1024 * 1024);
      if (combined.length > 10 || combined.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024 || invalidType || tooLarge) {
        e.target.value = '';
        setStatusType('error');
        setStatusMsg(invalidType
          ? 'Additional files must be PDFs, JPEGs, or PNGs.'
          : tooLarge
            ? 'Each attachment must be 4 MB or smaller.'
            : 'Attach up to 10 files and keep their combined size under 8 MB.');
        return;
      }
      setAdditionalFiles(combined);
    }
  };

  const primeAudio = () => {
    try {
      const AudioCtxRef = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtxRef();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    } catch { }
  };

  const notifyResult = (success: boolean, message: string) => {
    try {
      primeAudio();
      const ctx = audioCtxRef.current;
      if (ctx) {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
        const tones = success ? [523, 659, 784] : [220, 165];
        tones.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          osc.type = success ? 'triangle' : 'sawtooth';
          osc.frequency.value = freq;
          osc.connect(gain);
          const startAt = ctx.currentTime + (index * 0.09);
          osc.start(startAt);
          osc.stop(startAt + 0.11);
        });
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(success ? 'Documents Generated' : 'Document Error', { body: message });
      }
    } catch { }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folder.trim() || !classNo.trim() || !appName.trim() || !issueDate || !appTrade.trim() || !year.trim()) {
      setStatusType('error');
      setStatusMsg('❌ Error: Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setShowProgress(true);
    setProgressPercent(10);
    setProgressLabel('Preparing request');
    setStatusType('info');
    setStatusMsg('Saving a local browser copy and sending the application to Google Apps Script...');
    setStatusLinks(null);

    progressTimerRef.current = setInterval(() => {
      setProgressPercent(prev => (prev < 88 ? prev + 4 : prev));
    }, 1300);

    try {
      const payload: Record<string, any> = {
        action: 'generateFromForm',
        category: selectedCategory,
        selectionMenu,
        clientCode,
        caseNo,
        folder: folder.trim().toUpperCase(),
        tm: tm.trim().toUpperCase(),
        classNo: classNo.trim().toUpperCase(),
        classDesc: classDesc.trim().toUpperCase(),
        appType: appType.toUpperCase(),
        appName: appName.trim().toUpperCase(),
        appSo: appSo.trim().toUpperCase(),
        appCnic: appCnic.trim().toUpperCase(),
        issueDate: formatDisplayDate(issueDate ? new Date(issueDate) : new Date()).toUpperCase(),
        expiryDate: expiryDate.trim().toUpperCase(),
        appTrade: appTrade.trim().toUpperCase(),
        appAdd: appAdd.trim().toUpperCase(),
        year: year,
        conName: conName.trim().toUpperCase(),
        conAdd: conAdd.trim().toUpperCase(),
        status: status.toUpperCase(),
        trackingId: trackingId.trim().toUpperCase(),
        noImg: (noImg.trim() || '[NO IMAGE PROVIDED]').toUpperCase()
      };

      if (selectedFile) {
        setProgressPercent(18);
        setProgressLabel('Reading logo image');
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
        payload.imageBase64 = base64;
        payload.imageName = selectedFile.name;
        payload.imageMime = selectedFile.type;
      }

      if (additionalFiles.length > 0) {
        setProgressPercent(24);
        setProgressLabel('Preparing additional attachments');
        payload.additionalFiles = await Promise.all(additionalFiles.map(async file => {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return { name: file.name, mimeType: file.type, dataUrl };
        }));
      }

      // 1. Save to Supabase Cloud Database (and local cache)
      setProgressPercent(30);
      setProgressLabel('Saving record in Supabase Database');
      const newRec = await supabaseDB.addRecord({
        clientId: selectedClientId ? Number(selectedClientId) : undefined,
        category: selectedCategory,
        selectionMenu,
        clientCode,
        caseNo,
        tm: tm.trim().toUpperCase() || 'PENDING',
        folder: folder.trim().toUpperCase(),
        classNo: classNo.trim().toUpperCase(),
        classDesc: classDesc.trim().toUpperCase(),
        appType: appType.toUpperCase(),
        appName: appName.trim().toUpperCase(),
        appTrade: appTrade.trim().toUpperCase(),
        conName: conName.trim().toUpperCase(),
        status: status.toUpperCase(),
        trackingId: trackingId.trim().toUpperCase(),
        year,
        date: payload.issueDate,
        expiryDate: expiryDate.trim().toUpperCase(),
        conAddr: conAdd.trim().toUpperCase(),
        img: payload.imageBase64 || '',
        noImg,
        filingProcess: 'PENDING',
      });
      const insertedRecordId = newRec.id;
      setLastSavedCaseId(insertedRecordId);
      setLastSavedFolder(payload.folder);

      setProgressPercent(60);
      setProgressLabel('Generating documents via Google Apps Script');

      let data: any = null;
      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        setProgressPercent(85);
        setProgressLabel('Processing response');

        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {}

        if (res.ok && data && data.ok === true) {
          if (data.serialNo) await supabaseDB.updateRecord(insertedRecordId, { serialNo: String(data.serialNo) });
          let attachmentWarning = '';
          for (const attachment of data.attachments || []) {
            try {
              await supabaseDB.addDocument({
                record_id: insertedRecordId,
                file_name: attachment.name,
                file_size: attachment.size,
                file_type: attachment.mimeType,
                file_url: attachment.url,
              });
            } catch (error) {
              console.error('[Application] Attachment reference could not be saved:', error);
              attachmentWarning = ' One or more files are in Drive, but their database references could not be saved.';
            }
          }
          clearInterval(progressTimerRef.current as NodeJS.Timeout);
          setProgressPercent(100);
          setProgressLabel('Completed');

          setStatusType('success');
          setStatusMsg(
            `✅ Success! Case saved to Supabase Database & documents generated.\n` +
            `${payload.folder} (Client: ${clientCode} · Case #${caseNo})\n` +
            `Applicant: ${payload.appName} | Status: ${payload.status}\n` +
            (payload.trackingId ? `Tracking ID: ${payload.trackingId}` : '') + attachmentWarning
          );
          setStatusLinks({
            folderUrl: data.folderUrl,
            tm1Url: data.tm1Url,
            tm48Url: data.tm48Url
          });
          notifyResult(true, `${payload.folder} — saved to database and documents generated.`);
          return;
        } else {
          const errMsg = data?.error || `Google Apps Script returned status ${res.status}`;
          const isDocAuth = data?.code === 'GOOGLE_DOCS_PERMISSION_REQUIRED';
          if (isDocAuth) {
            setPermissionErrorModalOpen(true);
          }
          setStatusType('info');
          setStatusMsg(
            `✅ CASE SAVED IN SUPABASE DATABASE!\n` +
            `Record "${payload.folder}" (#${clientCode}-${selectionMenu}-${caseNo}) is stored in Supabase.\n` +
            `Note on Document Generation: ${errMsg}.`
          );
          notifyResult(true, 'Case saved in database. Apps Script doc generation pending.');
        }
      } catch (scriptErr: any) {
        setStatusType('info');
        setStatusMsg(
          `✅ CASE SAVED IN SUPABASE DATABASE!\n` +
          `Record "${payload.folder}" (#${clientCode}-${selectionMenu}-${caseNo}) is safely saved.\n` +
          `Apps Script doc generation note: ${scriptErr.message || 'Service unavailable'}.`
        );
        notifyResult(true, 'Case saved in database.');
      }
    } catch (err: any) {
      clearInterval(progressTimerRef.current as NodeJS.Timeout);
      setProgressPercent(100);

      const errText = String(err?.message || err || '');
      setStatusType('error');
      setStatusMsg('❌ Submission error: ' + errText);
      notifyResult(false, errText);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFolder('');
    setTm('');
    onClassChange('3');
    setAppType('SOLE PROPRIETOR');
    setAppName('');
    setAppSo('');
    setAppCnic('');
    setYear('2023');
    setAppTrade('');
    setAppAdd('');
    setStatus('PENDING');
    setTrackingId('');
    setNoImg('[TEXT HERE]');
    setPreviewSrc(null);
    setSelectedFile(null);
    setAdditionalFiles([]);
    setStatusMsg('');
    setStatusType('');
    setShowProgress(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />

      <div className="max-w-[880px] w-full mx-auto p-4 sm:p-7 pb-16 flex-1">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h1 className="font-['Bebas_Neue'] text-[1.9rem] tracking-[1px]">Trademark Case Generator (MailMerge)</h1>
          <div className="flex gap-2.5 flex-wrap">
            <Link href="/clients" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]">
              Manage Clients
            </Link>
            <Link href="/records" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]">
              Record View &amp; Timeline
            </Link>
            <Link href="/" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]">
              ← Back to CMS
            </Link>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`font-['DM_Mono',monospace] text-[0.75rem] font-bold tracking-[1px] py-2.5 px-4 border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer uppercase ${selectedCategory === cat.id ? 'bg-[#C94A00] text-white' : 'bg-[#FAF6EE] text-[#0C0C0C]'
                }`}
            >
              {cat.name} {cat.placeholder ? '(Soon)' : ''}
            </button>
          ))}
        </div>

        {selectedCategory !== 'INITIAL' ? (
          <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-8 text-center rounded-[6px]">
            <h2 className="font-['Bebas_Neue'] text-[1.8rem] mb-2">{CATEGORIES.find(c => c.id === selectedCategory)?.name} Module</h2>
            <p className="font-['DM_Mono',monospace] text-[0.85rem] text-[#666]">This module template is currently under development. Switch to Initial Trademark to use the active generator.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Card 0: Select Client Profile & Auto-Fetch Case Details */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#0C0C0C] flex-wrap gap-2">
                <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] flex items-center gap-2">
                  <span>⚡ Select Client Profile &amp; Auto-Fetch Case Details</span>
                </div>
                <Link
                  href="/clients"
                  className="font-['DM_Mono',monospace] text-[0.7rem] font-bold text-[#C94A00] hover:underline"
                >
                  + Add New Client to Directory →
                </Link>
              </div>
              <div className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
                <select
                  value={selectedClientId}
                  onChange={e => handleClientSelect(e.target.value)}
                  className="flex-1 p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px] cursor-pointer"
                >
                  <option value="">-- SELECT CLIENT TO AUTO-FETCH DETAILS --</option>
                  {savedClients.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.client_code}] {c.name} — {c.company_name || c.address}
                    </option>
                  ))}
                </select>
                {selectedClientId && (
                  <button
                    type="button"
                    onClick={() => handleClientSelect(selectedClientId)}
                    className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2.5 px-4 bg-[#0D9970] text-white border-[2.5px] border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer whitespace-nowrap"
                  >
                    ✓ Re-fetch Client Data
                  </button>
                )}
              </div>
            </div>

            {/* Card 1: Case References */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-2 border-[#0C0C0C]">
                Case Reference &amp; Menu
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Selection Menu <span className="text-[#C94A00]">*</span>
                  </label>
                  <select
                    value={selectionMenu}
                    onChange={e => setSelectionMenu(e.target.value)}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px] cursor-pointer font-bold"
                  >
                    <option value="X">X — Option X</option>
                    <option value="A">A — Option A</option>
                    <option value="N">N — Option N</option>
                    <option value="B">B — Option B</option>
                  </select>
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Client Code (3 Digits) <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="646"
                    value={clientCode}
                    onChange={e => setClientCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Case No (Auto 3 Digits) <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="001"
                    value={caseNo}
                    onChange={e => setCaseNo(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#E8DFC7] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px] font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Case Information */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Case Information &amp; Trademark Acknowledgment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Case / Mark Name <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HUSNA BEAUTY SOAP"
                    value={folder}
                    onChange={e => setFolder(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Trademark No <span className="text-[0.65rem] opacity-70">(Acknowledgment stage - optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="E.G. 123456 (OPTIONAL)"
                    value={tm}
                    onChange={e => setTm(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Class <span className="text-[#C94A00]">*</span>
                  </label>
                  <select
                    required
                    value={classNo}
                    onChange={e => onClassChange(e.target.value)}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px] cursor-pointer"
                  >
                    <option value="">-- SELECT CLASS (1–45) --</option>
                    {classList.map(c => (
                      <option key={c.n} value={c.n}>
                        Class {c.n} {c.type !== 'GOODS' ? `(${c.type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Workflow Status <span className="text-[#C94A00]">*</span>
                  </label>
                  <select
                    required
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px] cursor-pointer"
                  >
                    {WORKFLOW_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-['DM_Mono',monospace] text-[0.75rem] font-bold">
                      Class Description / Specification of Services
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setClassDescEditable(!classDescEditable)}
                        className="font-['DM_Mono',monospace] text-[0.65rem] border border-[#0C0C0C] px-2 py-0.5 bg-[#E8DFC7] cursor-pointer"
                      >
                        ✏️ {classDescEditable ? 'Lock' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveClassDesc}
                        className="font-['DM_Mono',monospace] text-[0.65rem] border border-[#0C0C0C] px-2 py-0.5 bg-[#fee2e2] text-[#991b1b] cursor-pointer"
                      >
                        🗑️ Clear
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    readOnly={!classDescEditable}
                    value={classDesc}
                    onChange={e => setClassDesc(e.target.value.toUpperCase())}
                    placeholder="SELECT A CLASS ABOVE OR TYPE MANUALLY"
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.85rem] uppercase rounded-[4px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Application Type <span className="text-[#C94A00]">*</span>
                  </label>
                  <select
                    required
                    value={appType}
                    onChange={e => setAppType(e.target.value)}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px] cursor-pointer"
                  >
                    <option value="SOLE PROPRIETOR">SOLE PROPRIETOR</option>
                    <option value="PARTNERS">PARTNERS</option>
                    <option value="A PAKISTANI COMPANY">COMPANY</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 3: Applicant Details */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Applicant Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Applicant Name <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={e => setAppName(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Fathers Name</label>
                  <input
                    type="text"
                    value={appSo}
                    onChange={e => setAppSo(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">CNIC No</label>
                  <input
                    type="text"
                    placeholder="37405-123457-9 Format"
                    value={appCnic}
                    onChange={handleCnicInput}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    E-Stamp Issue Date <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={issueDate}
                    onChange={handleIssueDateChange}
                    suppressHydrationWarning
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    E-Stamp Expiry Date <span className="text-[0.65rem] opacity-70">(auto = issue +7 days)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={expiryDate}
                    suppressHydrationWarning
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#E8DFC7] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Business Name / Trading As <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={appTrade}
                    onChange={e => setAppTrade(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Applicant Address</label>
                  <textarea
                    rows={2}
                    value={appAdd}
                    onChange={e => setAppAdd(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.85rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    USING Year / Since <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="yearList"
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                  <datalist id="yearList">
                    <option value="2020" />
                    <option value="2021" />
                    <option value="2022" />
                    <option value="2023" />
                    <option value="2024" />
                    <option value="2025" />
                    <option value="2026" />
                    <option value="2027" />
                    <option value="2028" />
                  </datalist>
                </div>
              </div>
            </div>

            {/* Card 4: Law Firm / Consultant & Dispatch Tracking */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Law Firm / Consultant &amp; Dispatch Tracking
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-['DM_Mono',monospace] text-[0.75rem] font-bold">
                      Law Firm Name <span className="text-[#C94A00]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setConEditable(!conEditable)}
                      className="font-['DM_Mono',monospace] text-[0.65rem] border border-[#0C0C0C] px-2 py-0.5 bg-[#E8DFC7] cursor-pointer"
                    >
                      ✏️ {conEditable ? 'Lock' : 'Edit'}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly={!conEditable}
                    value={conName}
                    onChange={e => setConName(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Law Firm Address</label>
                  <input
                    type="text"
                    readOnly={!conEditable}
                    value={conAdd}
                    onChange={e => setConAdd(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Dispatch Tracking ID
                  </label>
                  <input
                    type="text"
                    placeholder="E.G. TCS-TRK-982341"
                    value={trackingId}
                    onChange={e => setTrackingId(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                  />
                </div>
              </div>
            </div>

            {/* Card 5: Trademark Image & Multiple Document Uploads */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Trademark Logo &amp; Supporting Documents (PDFs, Scans)
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#0C0C0C] p-6 text-center bg-[#E8DFC7] cursor-pointer hover:bg-[#dfd7bf] transition-colors rounded-[4px] mb-4"
              >
                <p className="font-['DM_Mono',monospace] text-[0.85rem] font-bold">Click or Drag &amp; Drop Logo Image Here</p>
                <p className="font-['DM_Mono',monospace] text-[0.65rem] text-[#666] mt-1">PNG or JPEG · Maximum 2 MB</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewSrc && (
                  <Image
                    src={previewSrc}
                    alt="Preview"
                    width={128}
                    height={128}
                    className="mt-3 max-h-32 mx-auto border-2 border-[#0C0C0C] bg-white object-contain"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                )}
              </div>

              {/* Multiple Document Upload */}
              <div className="p-4 border-2 border-[#0C0C0C] bg-white rounded-[4px] mb-4">
                <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-2 font-bold">
                  Attach Additional Documents (PDFs, E-Stamp Scans, Power of Attorney)
                </label>
                <input
                  type="file"
                  multiple
                  ref={multiFileInputRef}
                  onChange={handleMultipleFilesChange}
                  className="font-['DM_Mono',monospace] text-[0.75rem]"
                />
                {additionalFiles.length > 0 && (
                  <ul className="mt-2 text-[0.75rem] font-['DM_Mono',monospace] text-[#0D9970]">
                    {additionalFiles.map((f, i) => (
                      <li key={i}>✓ {f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                  Fallback Text (If No Image) <span className="text-[#C94A00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noImg}
                  onChange={e => setNoImg(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-[#FAF6EE] font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px]"
                />
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="font-['DM_Mono',monospace] text-[0.9rem] font-bold tracking-[1px] uppercase py-3.5 px-6 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[5px_5px_0_#0C0C0C] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_#0C0C0C] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                {submitting ? 'Saving & Generating Case...' : '⚡ Generate & Save Case Documents'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="font-['DM_Mono',monospace] text-[0.9rem] font-bold tracking-[1px] uppercase py-3.5 px-6 bg-[#FAF6EE] text-[#0C0C0C] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[5px_5px_0_#0C0C0C] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_#0C0C0C] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Reset Case Form
              </button>
            </div>
          </form>
        )}

        {/* Progress bar */}
        {showProgress && (
          <div className="mt-6 p-4 bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[3px_3px_0_#0C0C0C] rounded-[6px]">
            <div className="flex justify-between font-['DM_Mono',monospace] text-[0.8rem] mb-2 font-bold">
              <span>{progressLabel}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-4 bg-[#E8DFC7] border-2 border-[#0C0C0C] overflow-hidden rounded-[2px]">
              <div
                className="h-full bg-[#0D9970] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Status box */}
        {statusMsg && (
          <div
            className={`mt-6 p-5 border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] rounded-[6px] font-['Space_Grotesk'] text-[0.95rem] ${statusType === 'success'
              ? 'bg-[#d1fae5] text-[#065f46]'
              : statusType === 'error'
                ? 'bg-[#fee2e2] text-[#991b1b]'
                : 'bg-[#fef3c7] text-[#92400e]'
              }`}
          >
            <div className="whitespace-pre-line">{statusMsg}</div>
            {statusType === 'info' && (
              <div className="mt-4 pt-3 border-t-2 border-[#0C0C0C]/20 flex flex-wrap gap-2.5 items-center">
                <button
                  type="button"
                  onClick={() => setPermissionErrorModalOpen(true)}
                  className="inline-flex items-center gap-1.5 font-['DM_Mono',monospace] text-[0.78rem] font-bold py-2 px-3.5 bg-[#C94A00] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] hover:bg-[#b54000] cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Fix Apps Script Permissions (2-Min Guide)
                </button>
                <Link
                  href="/records"
                  className="inline-flex items-center gap-1.5 font-['DM_Mono',monospace] text-[0.78rem] font-bold py-2 px-3.5 bg-[#FAF6EE] text-[#0C0C0C] border-2 border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] hover:bg-white"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#0D9970]" />
                  View Case #{caseNo} in Records Dashboard
                </Link>
              </div>
            )}
            {statusLinks && (
              <div className="mt-3 pt-3 border-t border-[#0C0C0C]/25 flex flex-wrap gap-3 font-['DM_Mono',monospace] text-[0.8rem]">
                {statusLinks.folderUrl && (
                  <a href={statusLinks.folderUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                    Open Drive Folder
                  </a>
                )}
                {statusLinks.tm1Url && (
                  <a href={statusLinks.tm1Url} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                    Open TM-1 Document
                  </a>
                )}
                {statusLinks.tm48Url && (
                  <a href={statusLinks.tm48Url} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                    Open TM-48 Document
                  </a>
                )}
                <Link href="/records" className="underline font-bold">
                  Open Record View
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Apps Script Permission Authorization Guide Modal */}
        {permissionErrorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 text-[#0C0C0C]">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2 py-0.5 bg-[#FFE066] border border-[#0C0C0C] rounded-[3px] mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#C94A00]" />
                    ACTION REQUIRED: GOOGLE DOCS SCOPE
                  </div>
                  <h3 className="font-['Bebas_Neue'] text-[1.8rem] tracking-[1px] leading-tight">
                    Authorize Google Apps Script Permissions
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissionErrorModalOpen(false)}
                  className="p-1 border-2 border-[#0C0C0C] bg-[#FAF6EE] hover:bg-[#F0E8D0] rounded-[4px] cursor-pointer shadow-[2px_2px_0_#0C0C0C]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Note */}
              <div className="bg-[#d1fae5] border-2 border-[#0C0C0C] p-3 rounded-[4px] mb-4 text-[0.85rem] font-['Space_Grotesk']">
                <strong className="text-[#065f46] font-bold">Good news:</strong> Your case <strong>{lastSavedFolder || folder || 'Trademark Case'}</strong> (Client {clientCode} · Case #{caseNo}) has a copy saved in this browser. You can view it in this browser&apos;s Records Dashboard.
              </div>

              <p className="text-[0.88rem] mb-4 font-['Space_Grotesk'] leading-relaxed">
                To auto-generate live <strong>TM-1</strong> and <strong>TM-48</strong> Google Docs in your Drive folder, Google requires you to grant the <code className="bg-[#E8DFC7] px-1 py-0.5 rounded border border-[#0C0C0C] text-[0.8rem] font-mono">https://www.googleapis.com/auth/documents</code> OAuth permission to your Apps Script deployment.
              </p>

              {/* 4 Steps */}
              <div className="space-y-4 mb-6">
                {/* Step 1 */}
                <div className="p-3.5 bg-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold px-2 py-0.5 bg-[#C94A00] text-white rounded">
                      STEP 1
                    </span>
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-['DM_Mono',monospace] text-[0.72rem] underline font-bold flex items-center gap-1 text-[#C94A00]"
                    >
                      Open Google Apps Script <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[0.85rem] font-bold mb-1">Open your Apps Script Project</p>
                  <p className="text-[0.8rem] text-[#444]">
                    Open your Brandex mailmerge project at script.google.com. On the left sidebar, click <strong>Project Settings (⚙️)</strong> and check <strong>&quot;Show &apos;appsscript.json&apos; manifest file in editor&quot;</strong>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 bg-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold px-2 py-0.5 bg-[#0D9970] text-white rounded">
                      STEP 2
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const manifestContent = JSON.stringify({
                          timeZone: "Asia/Karachi",
                          dependencies: {},
                          exceptionLogging: "STACKDRIVER",
                          runtimeVersion: "V8",
                          oauthScopes: [
                            "https://www.googleapis.com/auth/documents",
                            "https://www.googleapis.com/auth/spreadsheets",
                            "https://www.googleapis.com/auth/drive"
                          ]
                        }, null, 2);
                        navigator.clipboard.writeText(manifestContent);
                        setCopiedManifest(true);
                        setTimeout(() => setCopiedManifest(false), 2000);
                      }}
                      className="font-['DM_Mono',monospace] text-[0.72rem] py-1 px-2.5 bg-[#FAF6EE] border border-[#0C0C0C] rounded font-bold cursor-pointer hover:bg-white flex items-center gap-1"
                    >
                      {copiedManifest ? <Check className="w-3 h-3 text-[#0D9970]" /> : <Copy className="w-3 h-3" />}
                      {copiedManifest ? 'Copied Manifest!' : 'Copy appsscript.json'}
                    </button>
                  </div>
                  <p className="text-[0.85rem] font-bold mb-1">Verify appsscript.json Manifest</p>
                  <p className="text-[0.8rem] text-[#444]">
                    Switch to the Editor tab (<code className="font-mono text-xs">&lt; &gt;</code>), click <strong>appsscript.json</strong>, and ensure <code className="font-mono text-xs">&quot;https://www.googleapis.com/auth/documents&quot;</code> is listed in <code className="font-mono text-xs">oauthScopes</code>.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 bg-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold px-2 py-0.5 bg-[#D4A800] text-[#0C0C0C] rounded">
                      STEP 3
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `function authorizeScript() {\n  var doc = DocumentApp.create("Brandex_Permission_Check_Temp");\n  DriveApp.getFileById(doc.getId()).setTrashed(true);\n  Logger.log("✅ Google Docs authorized!");\n}`;
                        navigator.clipboard.writeText(snippet);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2000);
                      }}
                      className="font-['DM_Mono',monospace] text-[0.72rem] py-1 px-2.5 bg-[#FAF6EE] border border-[#0C0C0C] rounded font-bold cursor-pointer hover:bg-white flex items-center gap-1"
                    >
                      {copiedScript ? <Check className="w-3 h-3 text-[#0D9970]" /> : <Copy className="w-3 h-3" />}
                      {copiedScript ? 'Copied Function!' : 'Copy authorizeScript'}
                    </button>
                  </div>
                  <p className="text-[0.85rem] font-bold mb-1">Run authorizeScript to Grant Google Permission</p>
                  <p className="text-[0.8rem] text-[#444]">
                    In <strong>Code.gs</strong>, select <strong>authorizeScript</strong> in the toolbar dropdown and click <strong>Run</strong>. When Google prompts &quot;Authorization required&quot;, click:
                    <br />
                    <span className="font-semibold text-[#0C0C0C]">Review permissions → Select Google Account → Advanced → Go to Brandex (unsafe) → Allow</span>.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 bg-[#fff8e1] border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold px-2 py-0.5 bg-[#0C0C0C] text-white rounded">
                      STEP 4 · CRITICAL
                    </span>
                  </div>
                  <p className="text-[0.85rem] font-bold mb-1">Deploy as a &quot;New Version&quot;</p>
                  <p className="text-[0.8rem] text-[#444]">
                    In Google Apps Script, web app permissions only update when a new version is created:
                    <br />
                    Click <strong>Deploy → Manage deployments → ✏️ Edit icon</strong>.
                    <br />
                    Change the Version dropdown to <strong>&quot;New version&quot;</strong> and click <strong>Deploy</strong>.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-wrap gap-3 justify-end pt-3 border-t-2 border-[#0C0C0C]">
                <Link
                  href="/records"
                  className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-4 bg-[#0D9970] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] hover:bg-[#0b805d] flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" /> Go to Records Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => setPermissionErrorModalOpen(false)}
                  className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-4 bg-[#FAF6EE] text-[#0C0C0C] border-2 border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] hover:bg-white cursor-pointer"
                >
                  Close &amp; Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
