'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { CLASS_DATA, CONSULTANT_DATA, CATEGORIES, WORKFLOW_STATUSES, LAW_FIRM_DEFAULT, APPS_SCRIPT_URL, SHEET_URL } from '@/lib/data';

export default function TrademarkApplicationPage() {
  const [selectedCategory, setSelectedCategory] = useState('INITIAL');
  const [classNo, setClassNo] = useState('3');
  const [classDesc, setClassDesc] = useState('');
  const [classDescEditable, setClassDescEditable] = useState(false);
  const [classList, setClassList] = useState(CLASS_DATA);

  const [conName, setConName] = useState(LAW_FIRM_DEFAULT.name);
  const [conAdd, setConAdd] = useState(LAW_FIRM_DEFAULT.addr);
  const [conEditable, setConEditable] = useState(false);

  const [folder, setFolder] = useState('');
  const [tm, setTm] = useState('');
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

  const [submitting, setSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing');
  const [showProgress, setShowProgress] = useState(false);

  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | ''>('');
  const [statusLinks, setStatusLinks] = useState<{ folderUrl?: string; tm1Url?: string; tm48Url?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    onClassChange('3');
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setIssueDate(localStr);
    updateExpiry(now);
  }, []);

  const onClassChange = (val: string) => {
    setClassNo(val);
    const item = classList.find(c => c.n === parseInt(val, 10));
    if (item) {
      setClassDesc(item.desc);
    } else {
      setClassDesc('');
    }
  };

  const handleRemoveClassDesc = () => {
    setClassDesc('');
  };

  const updateExpiry = (d: Date) => {
    const expiry = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
    setExpiryDate(formatDisplayDate(expiry));
  };

  const handleIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIssueDate(val);
    if (val) {
      updateExpiry(new Date(val));
    }
  };

  const formatDisplayDate = (d: Date) => {
    const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    let hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12; if (hh === 0) hh = 12;
    const mm = d.getMinutes().toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const mon = MONTHS_SHORT[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${mon}-${yyyy} ${hh.toString().padStart(2, '0')}:${mm} ${ampm}`;
  };

  const handleCnicInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 13);
    let formatted = digits;
    if (digits.length > 5) formatted = digits.slice(0, 5) + '-' + digits.slice(5);
    if (digits.length > 12) formatted = digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
    setAppCnic(formatted);
  };

  const handleTmInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTm(val);
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

    if (!folder.trim() || !tm.trim() || tm.length !== 6) {
      setStatusType('error');
      setStatusMsg('❌ Error: 6-digit Trademark Number / Acknowledgment is required.');
      return;
    }

    if (!classNo.trim() || !appName.trim() || !issueDate || !appTrade.trim() || !year.trim()) {
      setStatusType('error');
      setStatusMsg('❌ Error: Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setShowProgress(true);
    setProgressPercent(10);
    setProgressLabel('Preparing request');
    setStatusType('info');
    setStatusMsg('Processing... Please wait (this may take 15-40 seconds).');
    setStatusLinks(null);

    progressTimerRef.current = setInterval(() => {
      setProgressPercent(prev => (prev < 88 ? prev + 4 : prev));
    }, 1300);

    try {
      const payload: Record<string, any> = {
        action: 'generateFromForm',
        category: selectedCategory,
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

      setProgressPercent(34);
      setProgressLabel('Sending to Apps Script Backend');

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
      });

      setProgressPercent(78);
      setProgressLabel('Processing response');

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from server: ' + text.substring(0, 200));
      }

      if (data.ok) {
        clearInterval(progressTimerRef.current as NodeJS.Timeout);
        setProgressPercent(100);
        setProgressLabel('Completed');

        const warningLine = data.imageWarning ? `<br><span style="color:#b45309;">${data.imageWarning}</span>` : '';
        setStatusType('success');
        setStatusMsg(
          `✅ Success! Documents generated.<br>` +
          `<strong>${payload.folder}</strong> (TM No: ${payload.tm})<br>` +
          `Applicant: ${payload.appName} &nbsp;|&nbsp; Status: ${payload.status}<br>` +
          (payload.trackingId ? `Tracking ID: ${payload.trackingId}<br>` : '') +
          warningLine
        );
        setStatusLinks({
          folderUrl: data.folderUrl,
          tm1Url: data.tm1Url,
          tm48Url: data.tm48Url
        });
        notifyResult(true, `${payload.folder} — documents generated successfully.`);
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
    setStatusMsg('');
    setStatusType('');
    setShowProgress(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />

      <div className="max-w-[880px] w-full mx-auto p-4 sm:p-7 pb-16 flex-1">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h1 className="font-['Bebas_Neue'] text-[1.9rem] tracking-[1px]">Trademark Application &amp; MailMerge</h1>
          <div className="flex gap-2.5 flex-wrap">
            <Link href="/records" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]">
              Record View
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
            {/* Card 1: Basic Information */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Basic Information &amp; Acknowledgment
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
                    Trademark No (6-Digit Acknowledgment) <span className="text-[#C94A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={tm}
                    onChange={handleTmInput}
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

            {/* Card 2: Applicant Details */}
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

            {/* Card 3: Law Firm / Consultant & Dispatch Tracking */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Law Firm / Consultant &amp; Dispatch Tracking
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-['DM_Mono',monospace] text-[0.75rem] font-bold">
                      Law Firm / Consultant Name <span className="text-[#C94A00]">*</span>
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
                    Dispatch Tracking ID <span className="text-[0.65rem] opacity-70">(Required for courier/dispatch tracking)</span>
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

            {/* Card 4: Trademark Image */}
            <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-5 rounded-[6px]">
              <div className="font-['Bebas_Neue'] text-[1.2rem] tracking-[1px] mb-4 pb-2 border-b-[2px] border-[#0C0C0C]">
                Trademark Logo / Image (Optional)
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#0C0C0C] p-6 text-center bg-[#E8DFC7] cursor-pointer hover:bg-[#dfd7bf] transition-colors rounded-[4px]"
              >
                <p className="font-['DM_Mono',monospace] text-[0.85rem] font-bold">Click or Drag &amp; Drop Image Here</p>
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
              <div className="mt-4">
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
                {submitting ? 'Generating...' : 'Generate Documents'}
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
