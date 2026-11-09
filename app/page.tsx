'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import {
  ExternalLink,
  Github,
  FileText,
  Database,
  BookOpen,
  ShieldCheck,
  Landmark,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Zap,
  HardDrive
} from 'lucide-react';

const BRAND_LOGOS = [
  {
    id: 'monogram-ring',
    name: 'bR Monogram (Ring)',
    src: '/assets/aistudio/ChatGPT_Image_Nov_8__2026__10_03_54_PM_067fea60.png'
  },
  {
    id: 'monogram-pure',
    name: 'bR Monogram',
    src: '/assets/aistudio/Elegant_purple_bR_monogram_40d16f05.png'
  },
  {
    id: 'app-squircle',
    name: 'Brandex App Icon',
    src: '/assets/aistudio/ChatGPT_Image_Nov_8__2026__10_03_37_PM_e12d09bd.png'
  }
];

interface Slide {
  id: number;
  badge: string;
  tag: string;
  title: string;
  desc: string;
  stat: string;
  accent: string;
  bgBadge: string;
  targetUrl: string;
  btnLabel: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    badge: "TOOL 01 · AUTOMATED GENERATOR",
    tag: "[MENU X / A / N / B]",
    title: "TRADEMARK™ APPLICATION & MAILMERGE",
    desc: "Generate full TM-1 & TM-48 documents with automatic 3-digit Client Code, auto-incrementing case numbering, and Nice Classification (1–45) goods/services specifications.",
    stat: "45 NICE CLASSES · DUAL POWER OF ATTORNEY",
    accent: "#C94A00",
    bgBadge: "bg-[#C94A00] text-white",
    targetUrl: "/trademark-application",
    btnLabel: "OPEN APPLICATION GENERATOR"
  },
  {
    id: 2,
    badge: "TOOL 02 · STANDALONE CMS",
    tag: "[PRIMARY DASHBOARD]",
    title: "CASE RECORDS CMS & STAGE TRACKING",
    desc: "Track trademark cases across 5 legal stages: PENDING → IN REVIEW → APPROVED / REJECT → DISPATCHED → DELIVERED. Zero network latency, instant search, and complete CSV/JSON backup sovereignty.",
    stat: "5 STAGE PIPELINE · 0ms LOCAL STORE",
    accent: "#0D9970",
    bgBadge: "bg-[#0D9970] text-white",
    targetUrl: "/records",
    btnLabel: "WIPE & LAUNCH RECORDS DASHBOARD"
  },
  {
    id: 3,
    badge: "TOOL 03 · CLIENT LEDGER",
    tag: "[DIRECTORY DIRECT]",
    title: "CLIENT DIRECTORY & PROFILES",
    desc: "Manage client master records with CNIC, Trading Name, Father's Name, and assigned legal consultants. 1-click autofill into any new trademark application.",
    stat: "INSTANT AUTOFILL · CLIENT PROFILES",
    accent: "#D4A800",
    bgBadge: "bg-[#D4A800] text-[#0C0C0C]",
    targetUrl: "/clients",
    btnLabel: "OPEN CLIENT DIRECTORY"
  },
  {
    id: 4,
    badge: "OFFICIAL · GOVERNMENT GATEWAY",
    tag: "[IP & TAX AUTHORITIES]",
    title: "IPO PAKISTAN · FBR IRIS · SECP LEAP",
    desc: "Direct high-speed gateway to Pakistan Intellectual Property Organization, Federal Board of Revenue, and Securities & Exchange Commission portals for compliance verification.",
    stat: "3 OFFICIAL AUTHORIZED PORTALS",
    accent: "#0C0C0C",
    bgBadge: "bg-[#0C0C0C] text-[#FAF6EE]",
    targetUrl: "https://apply.ipo.gov.pk",
    btnLabel: "EXPLORE GOVERNMENT PORTALS"
  }
];

export default function HomePage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedLogoIdx, setSelectedLogoIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeTarget, setWipeTarget] = useState('/records');
  const [wipeTitle, setWipeTitle] = useState('RECORDS DASHBOARD');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeLogo = BRAND_LOGOS[selectedLogoIdx];

  // Audio effect for button click and wipe
  const playSound = (freq = 420, duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  // Automatic Slide Rotation (every 4.5 seconds)
  useEffect(() => {
    if (isPaused || isWiping) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isWiping]);

  // Screen Wipe Navigation Trigger with Animated Logo Loading
  const triggerWipeAndNavigate = (targetUrl: string, title = 'RECORDS DASHBOARD') => {
    playSound(540, 0.15);
    setWipeTarget(targetUrl);
    setWipeTitle(title);
    setIsWiping(true);

    // After animation displays (700ms), push route
    setTimeout(() => {
      if (targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank');
        setIsWiping(false);
      } else {
        router.push(targetUrl);
      }
    }, 700);
  };

  const handleNext = () => {
    playSound(400);
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const handlePrev = () => {
    playSound(400);
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const activeSlide = SLIDES[currentSlide];

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C] relative overflow-x-hidden">
      <Navbar />

      {/* Screen Wipe Transition Overlay with Animated Brandex Logo */}
      <AnimatePresence>
        {isWiping && (
          <motion.div
            className="fixed inset-0 z-[9999] pointer-events-none flex flex-col"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Primary Wipe Layer 1 */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: 0 }}
              className="absolute inset-0 bg-[#0C0C0C] z-10 flex flex-col items-center justify-center p-6 text-center"
            >
              {/* Brandex Animated Logo in Wipe Loading Screen */}
              <motion.div
                initial={{ scale: 0.2, rotate: -15, opacity: 0 }}
                animate={{ scale: [0.2, 1.15, 1], rotate: [-15, 5, 0], opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative mb-6"
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#1c1611] border-[3px] border-[#C94A00] p-3 flex items-center justify-center relative overflow-hidden shadow-[0_0_50px_rgba(201,74,0,0.85),0_0_20px_rgba(212,168,0,0.6)]">
                  {/* Rotating decorative accent ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                    className="absolute -inset-2 border-2 border-dashed border-[#D4A800]/70 rounded-2xl pointer-events-none"
                  />
                  <Image
                    src={activeLogo.src}
                    alt="Brandex Loading Logo"
                    width={104}
                    height={104}
                    className="object-contain w-full h-full drop-shadow-[0_0_18px_rgba(201,74,0,0.9)]"
                    referrerPolicy="no-referrer"
                    priority
                  />
                </div>
                {/* Expanding pulse wave */}
                <motion.div
                  className="absolute -inset-3 rounded-2xl border-2 border-[#C94A00]"
                  animate={{ scale: [1, 1.35, 1.55], opacity: [0.9, 0.4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                />
              </motion.div>

              <div className="font-['Bebas_Neue'] text-[clamp(2.5rem,8vw,4.5rem)] text-[#FAF6EE] tracking-[4px] leading-tight">
                LAUNCHING {wipeTitle}...
              </div>
              <div className="font-['DM_Mono',monospace] text-[0.9rem] text-[#D4A800] tracking-[2px] mt-2 flex items-center gap-2">
                <HardDrive className="w-4 h-4 animate-spin text-[#C94A00]" />
                <span>STANDALONE CMS · LOCAL STORAGE 0ms LATENCY</span>
              </div>
              <div className="w-72 sm:w-80 h-3 bg-[#1A1A1A] border-2 border-[#FAF6EE] mt-6 p-0.5 rounded-[3px] overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#C94A00] via-[#D4A800] to-[#0D9970]"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.65, ease: "easeInOut" }}
                />
              </div>
            </motion.div>

            {/* Accent Wipe Layer 2 (Diagonal edge) */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: 0 }}
              className="absolute inset-0 bg-[#C94A00] z-20 mix-blend-multiply opacity-80"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center px-4 pt-7 pb-16 max-w-5xl mx-auto w-full">
        {/* Standalone Stamp Header */}
        <div className="welcome-stamp font-['Bebas_Neue'] text-[1.1rem] tracking-[2.5px] border-[3px] border-[#0C0C0C] bg-[#D4A800] text-[#0C0C0C] py-[5px] px-4 rounded-[6px] rotate-[-2deg] shadow-[4px_4px_0_#0C0C0C] mb-4 inline-flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          BRANDEX CMS v2.1
        </div>

        <h1 className="welcome-title font-['Bebas_Neue'] text-[clamp(2.4rem,7vw,4rem)] tracking-[2px] text-center leading-[1] mb-2 text-[#0C0C0C]">
          BRANDEX LAW ASSOCIATES CMS
        </h1>
        <p className="welcome-sub font-['DM_Mono',monospace] text-[0.85rem] font-bold text-[#C94A00] text-center max-w-[620px] mb-7 tracking-[1px] uppercase">
          STANDALONE EDITION · ZERO LATENCY
        </p>

        {/* =========================================================================
            AUTOMATIC SELECTION SLIDER
           ========================================================================= */}
        <div
          className="w-full mb-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold text-[#C94A00] tracking-[1px] uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AUTOMATIC SELECTION SLIDER
              </span>
              <span className="text-[0.7rem] font-['DM_Mono',monospace] text-[#666] bg-[#E8DFC7] px-2 py-0.5 rounded border border-[#0C0C0C]">
                {isPaused ? 'PAUSED' : 'AUTO-ROTATING'}
              </span>
            </div>

            {/* Slider Counter */}
            <div className="font-['DM_Mono',monospace] text-[0.8rem] font-bold tracking-[1px]">
              [{String(currentSlide + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}]
            </div>
          </div>

          {/* Slider Card Container */}
          <div className="relative bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] rounded-[8px] shadow-[8px_8px_0_#0C0C0C] overflow-hidden">
            {/* Slide Progress Bar */}
            <div className="w-full h-1.5 bg-[#E8DFC7] overflow-hidden">
              <motion.div
                key={currentSlide}
                className="h-full bg-[#C94A00]"
                initial={{ width: '0%' }}
                animate={{ width: isPaused ? '100%' : '100%' }}
                transition={{ duration: 4.5, ease: 'linear' }}
              />
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left/Main Column: Slide details */}
                <div className="lg:col-span-8 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className={`font-['DM_Mono',monospace] text-[0.7rem] font-bold py-1 px-2.5 border-2 border-[#0C0C0C] rounded-[4px] uppercase tracking-[1px] shadow-[2px_2px_0_#0C0C0C] ${activeSlide.bgBadge}`}>
                      {activeSlide.badge}
                    </span>
                    <span className="font-['DM_Mono',monospace] text-[0.75rem] font-bold text-[#666] tracking-[1px]">
                      {activeSlide.tag}
                    </span>
                  </div>

                  <h2 className="font-['Bebas_Neue'] text-[clamp(1.9rem,5vw,2.8rem)] tracking-[1.5px] leading-[1.05] mb-3 text-[#0C0C0C]">
                    {activeSlide.title}
                  </h2>

                  <p className="font-['DM_Mono',monospace] text-[0.85rem] text-[#333] leading-relaxed max-w-2xl mb-5">
                    {activeSlide.desc}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t-2 border-[#0C0C0C]">
                    <div className="font-['DM_Mono',monospace] text-[0.72rem] font-bold text-[#0D9970] bg-[#EBF7F2] border border-[#0D9970] px-3 py-1.5 rounded-[4px]">
                      ✓ {activeSlide.stat}
                    </div>

                    {/* Primary Wipe Button */}
                    <button
                      type="button"
                      onClick={() => triggerWipeAndNavigate(activeSlide.targetUrl, activeSlide.title)}
                      className="font-['DM_Mono',monospace] text-[0.85rem] font-bold py-3 px-5 sm:px-6 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[4px] shadow-[4px_4px_0_#0C0C0C] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#0C0C0C] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_#0C0C0C] transition-all flex items-center gap-2 cursor-pointer uppercase tracking-[1px]"
                    >
                      <span>{activeSlide.btnLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Column: Animated Brandex Logo Showcase */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center bg-[#F0E8D0] border-2 border-[#0C0C0C] rounded-[6px] p-4 shadow-[4px_4px_0_#0C0C0C]">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-['DM_Mono',monospace] text-[0.65rem] font-bold tracking-[1px] uppercase text-[#666] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#C94A00]" />
                      BRANDEX EMBLEM
                    </span>
                    <span className="font-['DM_Mono',monospace] text-[0.62rem] font-bold text-[#0D9970] bg-[#FAF6EE] px-1.5 py-0.5 border border-[#0C0C0C] rounded">
                      STANDALONE
                    </span>
                  </div>

                  {/* Animated Emblem Frame with Click-to-Wipe */}
                  <motion.div
                    key={activeLogo.id}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                    onClick={() => triggerWipeAndNavigate(activeSlide.targetUrl, activeSlide.title)}
                    className="relative group cursor-pointer my-1.5"
                    title="Click logo to launch Dashboard"
                  >
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#141210] border-[2.5px] border-[#C94A00] p-3 flex items-center justify-center relative shadow-[0_0_20px_rgba(201,74,0,0.5),5px_5px_0_#0C0C0C] group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(201,74,0,0.7),7px_7px_0_#0D9970] transition-all">
                      {/* Rotating accent dashed perimeter */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                        className="absolute -inset-1.5 border border-dashed border-[#D4A800]/80 rounded-2xl pointer-events-none"
                      />
                      <Image
                        src={activeLogo.src}
                        alt={activeLogo.name}
                        width={112}
                        height={112}
                        className="object-contain w-full h-full drop-shadow-[0_0_15px_rgba(201,74,0,0.8)]"
                        referrerPolicy="no-referrer"
                        priority
                      />
                    </div>
                  </motion.div>

                  {/* Logo Variant Switcher Tabs */}
                  <div className="flex items-center gap-1 mt-2.5">
                    {BRAND_LOGOS.map((logo, idx) => (
                      <button
                        key={logo.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound(320 + idx * 40);
                          setSelectedLogoIdx(idx);
                        }}
                        className={`font-['DM_Mono',monospace] text-[0.62rem] font-bold px-2 py-0.5 border border-[#0C0C0C] rounded-[3px] cursor-pointer transition-all ${
                          selectedLogoIdx === idx
                            ? 'bg-[#C94A00] text-white shadow-[1px_1px_0_#0C0C0C]'
                            : 'bg-[#FAF6EE] text-[#0C0C0C] hover:bg-white'
                        }`}
                        title={logo.name}
                      >
                        Logo 0{idx + 1}
                      </button>
                    ))}
                  </div>
                  <span className="font-['DM_Mono',monospace] text-[0.62rem] text-[#666] mt-1 text-center font-medium">
                    {activeLogo.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Slider Navigation Bar Bottom */}
            <div className="bg-[#E8DFC7] border-t-2 border-[#0C0C0C] px-6 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      playSound(360);
                      setCurrentSlide(idx);
                    }}
                    className={`font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2.5 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] cursor-pointer transition-all ${
                      currentSlide === idx
                        ? 'bg-[#0C0C0C] text-[#FAF6EE] shadow-[2px_2px_0_#C94A00]'
                        : 'bg-[#FAF6EE] text-[#0C0C0C] hover:bg-white'
                    }`}
                  >
                    0{s.id}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-1.5 border-2 border-[#0C0C0C] bg-[#FAF6EE] hover:bg-white rounded-[4px] shadow-[2px_2px_0_#0C0C0C] cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                  title="Previous Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1.5 border-2 border-[#0C0C0C] bg-[#FAF6EE] hover:bg-white rounded-[4px] shadow-[2px_2px_0_#0C0C0C] cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                  title="Next Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* External Portals Quick Bar (FBR, IPO, SECP) */}
        <div className="w-full mb-8">
          <div className="font-['DM_Mono',monospace] text-[0.75rem] font-bold text-[#666] tracking-[1.5px] uppercase mb-3 text-center">
            GOVERNMENT IP &amp; CORPORATE PORTALS
          </div>
          <div className="flex flex-wrap gap-3 justify-center w-full">
            <a
              href="https://iris.fbr.gov.pk/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound(380)}
              className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2.5 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-white transition-all"
            >
              <Landmark className="w-4 h-4 text-[#C94A00]" /> FBR Iris Portal <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="https://apply.ipo.gov.pk"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound(380)}
              className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2.5 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-white transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-[#0D9970]" /> IPO Pakistan e-Filing <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="https://leap.secp.gov.pk/#/user/login"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound(380)}
              className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2.5 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-white transition-all"
            >
              <BookOpen className="w-4 h-4 text-[#D4A800]" /> SECP LEAP Services <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Menu Buttons */}
        <div className="menu-buttons flex flex-col gap-3 w-full mb-8">
          {/* Item 1: Trademark Application Manager */}
          <div className="menu-btn menu-card font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[16px_20px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5">
            <span className="btn-num font-['Bebas_Neue'] text-[1.4rem] w-10 h-10 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0 bg-[#0C0C0C] text-[#FAF6EE]">
              01
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[6px]">
              <span className="btn-label text-[1.1rem] font-bold">Trademark™ Application Manager</span>
              <div className="btn-links flex flex-wrap gap-2">
                <Link
                  href="/trademark-application"
                  className="tag tag-live tag-link font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#C94A00] text-white no-underline shadow-[2px_2px_0_#0C0C0C]"
                  onClick={() => playSound(420)}
                >
                  Application
                </Link>
                <Link
                  href="/clients"
                  className="tag tag-link font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#D4A800] text-[#0C0C0C] no-underline shadow-[2px_2px_0_#0C0C0C]"
                  onClick={() => playSound(420)}
                >
                  Clients
                </Link>
                <button
                  type="button"
                  onClick={() => triggerWipeAndNavigate('/records', 'RECORDS DASHBOARD')}
                  className="tag tag-deploy tag-link font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#0D9970] text-white cursor-pointer shadow-[2px_2px_0_#0C0C0C]"
                >
                  Record View
                </button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1u7oYu63G28y54byhOw-2KS3nlt7GrpmbkT3uKMX2b8M/edit?gid=1496727423#gid=1496727423"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tag tag-sheet tag-link font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#FAF6EE] text-[#0C0C0C] no-underline shadow-[2px_2px_0_#0C0C0C]"
                  onClick={() => playSound(380)}
                >
                  Google Sheet
                </a>
              </div>
            </div>
          </div>

          {/* Item 2: Client Ledger */}
          <div className="menu-btn menu-card font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[16px_20px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5">
            <span className="btn-num font-['Bebas_Neue'] text-[1.4rem] w-10 h-10 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0 bg-[#D4A800] text-[#0C0C0C]">
              02
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[6px]">
              <span className="btn-label text-[1.1rem] font-bold">Client Ledger</span>
              <div className="btn-links flex flex-wrap gap-2">
                <Link
                  href="/clients"
                  className="tag tag-deploy tag-link font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#0D9970] text-white no-underline shadow-[2px_2px_0_#0C0C0C]"
                  onClick={() => playSound(420)}
                >
                  Client Directory
                </Link>
                <a
                  href="https://brandex-client-ledger.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tag tag-deploy tag-link font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#FAF6EE] text-[#0C0C0C] no-underline shadow-[2px_2px_0_#0C0C0C]"
                  onClick={() => playSound(380)}
                >
                  External Ledger App ↗
                </a>
              </div>
            </div>
          </div>

          {/* Item 3: Standalone Records CMS */}
          <div className="menu-btn menu-card font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[16px_20px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5">
            <span className="btn-num font-['Bebas_Neue'] text-[1.4rem] w-10 h-10 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0 bg-[#0D9970] text-white">
              03
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[6px]">
              <span className="btn-label text-[1.1rem] font-bold">Standalone Records CMS (0ms Latency)</span>
              <div className="btn-links flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => triggerWipeAndNavigate('/records', 'RECORDS DASHBOARD')}
                  className="tag tag-deploy tag-link font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#0D9970] text-white cursor-pointer shadow-[2px_2px_0_#0C0C0C]"
                >
                  Launch Dashboard
                </button>
                <span className="tag tag-sheet font-['DM_Mono',monospace] text-[0.7rem] tracking-[0.7px] px-3 py-1 border-[1.5px] border-[#0C0C0C] rounded-[3px] font-bold bg-[#FAF6EE] text-[#0D9970]">
                  ● Local Persistent Engine Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BRANDEX GITHUB PROJECTS ECOSYSTEM TABLE
           ========================================================================= */}
        <div className="w-full bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[6px_6px_0_#0C0C0C] rounded-[6px] p-5 sm:p-6 mb-8">
          <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#0C0C0C] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-[#0C0C0C]" />
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1.5px]">Brandex Projects Ecosystem</h3>
            </div>
            <a
              href="https://github.com/0utLawzz/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-['DM_Mono',monospace] text-[0.72rem] font-bold text-[#C94A00] hover:underline flex items-center gap-1"
            >
              github.com/0utLawzz <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-['DM_Mono',monospace] text-[0.78rem]">
              <thead>
                <tr className="bg-[#0C0C0C] text-[#FAF6EE]">
                  <th className="p-2.5 text-left border-b-2 border-[#0C0C0C]">Repo</th>
                  <th className="p-2.5 text-left border-b-2 border-[#0C0C0C]">GitHub</th>
                  <th className="p-2.5 text-left border-b-2 border-[#0C0C0C]">Preview / Deploy</th>
                  <th className="p-2.5 text-left border-b-2 border-[#0C0C0C]">Topics</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#ddd] hover:bg-[#E8DFC7]">
                  <td className="p-2.5 font-bold text-[#C94A00]">Brandex-Tax-NTN</td>
                  <td className="p-2.5">
                    <a
                      href="https://github.com/0utLawzz/Brandex-Tax-NTN"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C0C0C] hover:underline"
                    >
                      github.com/0utLawzz/Brandex-Tax-NTN
                    </a>
                  </td>
                  <td className="p-2.5">
                    <a
                      href="https://brandex-tax-ntn.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0D9970] text-white px-2 py-0.5 border border-[#0C0C0C] rounded-[2px] font-bold no-underline inline-block hover:opacity-90"
                    >
                      brandex-tax-ntn.vercel.app ↗
                    </a>
                  </td>
                  <td className="p-2.5 text-[#888]">—</td>
                </tr>

                <tr className="border-b border-[#ddd] hover:bg-[#E8DFC7]">
                  <td className="p-2.5 font-bold text-[#C94A00]">Brandex-Client-Ledger</td>
                  <td className="p-2.5">
                    <a
                      href="https://github.com/0utLawzz/Brandex-Client-Ledger"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C0C0C] hover:underline"
                    >
                      github.com/0utLawzz/Brandex-Client-Ledger
                    </a>
                  </td>
                  <td className="p-2.5">
                    <a
                      href="https://brandex-client-ledger.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0D9970] text-white px-2 py-0.5 border border-[#0C0C0C] rounded-[2px] font-bold no-underline inline-block hover:opacity-90"
                    >
                      brandex-client-ledger.vercel.app ↗
                    </a>
                  </td>
                  <td className="p-2.5 text-[#888]">—</td>
                </tr>

                <tr className="border-b border-[#ddd] hover:bg-[#E8DFC7]">
                  <td className="p-2.5 font-bold text-[#C94A00]">Brandex-Database-CMS</td>
                  <td className="p-2.5">
                    <a
                      href="https://github.com/0utLawzz/Brandex-Database-CMS"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C0C0C] hover:underline"
                    >
                      github.com/0utLawzz/Brandex-Database-CMS
                    </a>
                  </td>
                  <td className="p-2.5">
                    <a
                      href="https://brandexsheet.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0D9970] text-white px-2 py-0.5 border border-[#0C0C0C] rounded-[2px] font-bold no-underline inline-block hover:opacity-90"
                    >
                      brandexsheet.vercel.app ↗
                    </a>
                  </td>
                  <td className="p-2.5 text-[0.7rem] text-[#555] max-w-[280px]">
                    brandex, case-management, datasheet, excel, google-sheets, ip-practice, pakistan, postgres, react, rls, sheets, supabase, trademark, vercel, vite
                  </td>
                </tr>

                <tr className="hover:bg-[#E8DFC7]">
                  <td className="p-2.5 font-bold text-[#C94A00]">Brandex-Drive-Parser</td>
                  <td className="p-2.5">
                    <a
                      href="https://github.com/0utLawzz/Brandex-Drive-Parser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C0C0C] hover:underline"
                    >
                      github.com/0utLawzz/Brandex-Drive-Parser
                    </a>
                  </td>
                  <td className="p-2.5">
                    <a
                      href="https://0utlawzz.github.io/Brandex-Drive-Parser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0D9970] text-white px-2 py-0.5 border border-[#0C0C0C] rounded-[2px] font-bold no-underline inline-block hover:opacity-90"
                    >
                      0utlawzz.github.io/Brandex-Drive-Parser ↗
                    </a>
                  </td>
                  <td className="p-2.5 text-[0.7rem] text-[#555] max-w-[280px]">
                    automation, clean, drive-data, google-drive, google-sheets, pandas, python
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Tools & Author */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mb-8">
          {/* Document Enhancer */}
          <a
            href="https://0utlawzz.github.io/Document-Enhancer/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 font-['DM_Mono',monospace] text-[0.82rem] font-medium p-4 border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[4px_4px_0_#0C0C0C] flex items-center justify-between no-underline hover:translate-x-[-2px] hover:translate-y-[-2px]"
            onClick={() => playSound(380)}
          >
            <div>
              <div className="font-bold text-[0.95rem]">Document Enhancer</div>
              <div className="text-[0.68rem] text-[#666]">Online Image &amp; Scan Enhancer</div>
            </div>
            <ExternalLink className="w-4 h-4 opacity-70" />
          </a>

          {/* GitHub Author */}
          <a
            href="https://github.com/0utLawzz/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 font-['DM_Mono',monospace] text-[0.82rem] font-medium p-4 border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#0C0C0C] text-[#FAF6EE] shadow-[4px_4px_0_#0C0C0C] flex items-center justify-between no-underline hover:translate-x-[-2px] hover:translate-y-[-2px]"
            onClick={() => playSound(380)}
          >
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-[#FAF6EE]" />
              <div>
                <div className="font-bold text-[0.95rem]">github.com/0utLawzz</div>
                <div className="text-[0.68rem] text-[#aaa]">Explore All Repositories</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#D4A800]" />
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
