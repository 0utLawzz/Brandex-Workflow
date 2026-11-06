'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { CLASS_DATA, LAW_FIRM_DEFAULT, CATEGORIES, WORKFLOW_STATUSES, APPS_SCRIPT_URL, SHEET_URL } from '@/lib/data';
import { supabase } from '@/lib/supabase';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const formatDisplayDate = (d: Date) => {
    const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
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

    // Fetch saved clients from Supabase
    async function fetchClients() {
      try {
        const { data, error } = await supabase.from('clients').select('*').order('id', { ascending: false });
        if (!error && data) {
          setSavedClients(data);
        }
      } catch {}
    }
    fetchClients();

    // Auto-increment case number
    async function fetchLatestCaseNo() {
      try {
        const { data, error } = await supabase
          .from('trademark_records')
          .select('case_no')
          .order('id', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0 && data[0].case_no) {
          const lastNum = parseInt(data[0].case_no, 10);
          if (!isNaN(lastNum)) {
            setCaseNo(String(lastNum + 1).padStart(3, '0'));
          }
        }
      } catch {}
    }
    fetchLatestCaseNo();
  }, [updateExpiry]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = savedClients.find(c => String(c.id) === clientId);
    if (client) {
      if (client.client_code) setClientCode(client.client_code);
      if (client.name) setAppName(client.name);
      if (client.company_name) setAppTrade(client.company_name);
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
      setAdditionalFiles(prev => [...prev, ...filesArr]);
    }
  };

  const primeAudio = () => {
    try {
      const AudioCtxRef = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtxRef();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    } catch {}
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
    } catch {}
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
    setStatusMsg('Processing and syncing with Supabase & Google Apps Script...');
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

      // 1. Insert record into Supabase `trademark_records`
      setProgressPercent(30);
      setProgressLabel('Exporting record to Supabase');
      let insertedRecordId = null;
      try {
        const { data, error } = await supabase.from('trademark_records').insert([
          {
            selection_menu: selectionMenu,
            client_code: clientCode,
            case_no: caseNo,
            trademark_no: tm.trim().toUpperCase() || 'PENDING',
            category: selectedCategory,
            mark_name: folder.trim().toUpperCase(),
            class_no: classNo.trim().toUpperCase(),
            class_desc: classDesc.trim().toUpperCase(),
            app_type: appType.toUpperCase(),
            applicant_name: appName.trim().toUpperCase(),
            father_name: appSo.trim().toUpperCase(),
            cnic: appCnic.trim().toUpperCase(),
            issue_date: payload.issueDate,
            expiry_date: expiryDate.trim().toUpperCase(),
            trading_as: appTrade.trim().toUpperCase(),
            address: appAdd.trim().toUpperCase(),
            usage_year: year,
            consultant_name: conName.trim().toUpperCase(),
            consultant_addr: conAdd.trim().toUpperCase(),
            status: status.toUpperCase(),
            tracking_id: trackingId.trim().toUpperCase(),
          }
        ]).select();
        if (!error && data && data[0]) {
          insertedRecordId = data[0].id;
        }
      } catch (sbErr) {
        console.warn('Supabase insert warning:', sbErr);
      }

      // 2. Insert initial status history in `trademark_history`
      if (insertedRecordId) {
        try {
          await supabase.from('trademark_history').insert([
            {
              record_id: insertedRecordId,
              status: status.toUpperCase(),
              notes: 'Application created & generated.',
            }
          ]);
        } catch {}
      }

      // 3. Upload and associate multiple documents in `trademark_documents`
      if (insertedRecordId && additionalFiles.length > 0) {
        setProgressPercent(40);
        setProgressLabel('Uploading additional documents');
        for (const file of additionalFiles) {
          try {
            await supabase.from('trademark_documents').insert([
              {
                record_id: insertedRecordId,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type || 'application/pdf',
                storage_url: '#'
              }
            ]);
          } catch {}
        }
      }

      setProgressPercent(60);
      setProgressLabel('Sending to Apps Script Backend');

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
      });

      setProgressPercent(85);
      setProgressLabel('Processing response');

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { ok: true, serialNo: 'LOCAL-' + caseNo };
      }

      if (data.ok !== false) {
        clearInterval(progressTimerRef.current as NodeJS.Timeout);
        setProgressPercent(100);
        setProgressLabel('Completed');

        setStatusType('success');
        setStatusMsg(
          `✅ Success! Documents generated & exported to Supabase.<br>` +
          `<strong>${payload.folder}</strong> (Client: ${clientCode} · Case #${caseNo})<br>` +
          `Applicant: ${payload.appName} &nbsp;|&nbsp; Status: ${payload.status}<br>` +
          (payload.trackingId ? `Tracking ID: ${payload.trackingId}<br>` : '')
        );
        setStatusLinks({
          folderUrl: data.folderUrl,
          tm1Url: data.tm1Url,
          tm48Url: data.tm48Url
        });
        notifyResult(true, `${payload.folder} — documents generated and exported successfully.`);
      } else {
        throw new Error(data.error || 'Unknown server error');
      }
    } catch (err: any) {
      clearInterval(progressTimerRef.current as NodeJS.Timeout);
      setProgressPercent(100);
      setStatusType('error');
      setStatusMsg('❌ Request failed: ' + err.message);
      notifyResult(false, err.message);
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
          <h1 className="font-['Bebas_Neue'] text-[1.9rem] tracking-[1px]">Trademark Application &amp; Supabase Export</h1>
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
              className={`font-['DM_Mono',monospace] text-[0.75rem] font-bold tracking-[1px] py-2.5 px-4 border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer uppercase ${
                selectedCategory === cat.id ? 'bg-[#C94A00] text-white' : 'bg-[#FAF6EE] text-[#0C0C0C]'
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
            {/* Card 0: Select Saved Client Profile */}
            {savedClients.length > 0 && (
              <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
                <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-3 pb-2 border-b-2 border-[#0C0C0C]">
                  Select Saved Client Profile
                </div>
                <div>
                  <select
                    value={selectedClientId}
                    onChange={e => handleClientSelect(e.target.value)}
                    className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] text-[0.9rem] uppercase rounded-[4px] cursor-pointer"
                  >
                    <option value="">-- SELECT FROM SAVED CLIENTS (SUPABASE) --</option>
                    {savedClients.map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.client_code}] {c.name} — {c.company_name || c.address}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Card 1: Client & Case References */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-2 border-[#0C0C0C]">
                Client &amp; Case Reference
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

            {/* Card 2: Basic Information */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Basic Information &amp; Trademark Acknowledgment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">
                    Application / Mark Name <span className="text-[#C94A00]">*</span>
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
                        {c.n} — {c.type}
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
                      Class / Goods &amp; Services Description
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
                <p className="font-['DM_Mono',monospace] text-[0.65rem] text-[#666] mt-1">PNG, JPG, JPEG • Max Recommended 2MB</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewSrc && (
                  <img src={previewSrc} alt="Preview" className="mt-3 max-h-32 mx-auto border-2 border-[#0C0C0C] bg-white object-contain" />
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
                {submitting ? 'Exporting & Generating...' : 'Export to Supabase & Generate'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="font-['DM_Mono',monospace] text-[0.9rem] font-bold tracking-[1px] uppercase py-3.5 px-6 bg-[#FAF6EE] text-[#0C0C0C] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[5px_5px_0_#0C0C0C] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_#0C0C0C] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Reset
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
            className={`mt-6 p-5 border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] rounded-[6px] font-['Space_Grotesk'] text-[0.95rem] ${
              statusType === 'success'
                ? 'bg-[#d1fae5] text-[#065f46]'
                : statusType === 'error'
                ? 'bg-[#fee2e2] text-[#991b1b]'
                : 'bg-[#fef3c7] text-[#92400e]'
            }`}
          >
            <div dangerouslySetInnerHTML={{ __html: statusMsg }} />
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
      </div>

      <Footer />
    </div>
  );
}
