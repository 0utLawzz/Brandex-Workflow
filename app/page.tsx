'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ExternalLink, Github, FileText, Database, BookOpen, ShieldCheck, Landmark } from 'lucide-react';

export default function HomePage() {
  const playClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    el.classList.add('clicked');
    setTimeout(() => {
      el.classList.remove('clicked');
    }, 240);
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 380;
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />

      <div id="welcome" className="flex-1 flex flex-col items-center justify-center px-4 pt-9 pb-12">
        <div className="welcome-stamp font-['Bebas_Neue'] text-[1.2rem] tracking-[3px] border-[3px] border-[#0C0C0C] bg-[#D4A800] text-[#0C0C0C] py-[5px] px-4 rounded-[6px] rotate-[-5deg] shadow-[3px_3px_0_#0C0C0C] mb-5 inline-block">
          CMS v1.4 · SUPABASE CONNECTED
        </div>
        <h1 className="welcome-title font-['Bebas_Neue'] text-[clamp(2.3rem,7vw,3.6rem)] tracking-[2px] text-center leading-[1.05] mb-2.5">
          BRANDEX LAW ASSOCIATES CMS
        </h1>
        <p className="welcome-sub text-[0.9rem] font-medium text-[#444] text-center max-w-[520px] mb-8 tracking-[0.5px]">
          Select a tool or government portal below. All records sync with Supabase and Google Sheets.
        </p>

        {/* External Portals Quick Bar (FBR, IPO, SECP) */}
        <div className="flex flex-wrap gap-3 justify-center mb-8 w-full max-w-[650px]">
          <a
            href="https://iris.fbr.gov.pk/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClick}
            className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C] hover:translate-x-[-2px] hover:translate-y-[-2px]"
          >
            <Landmark className="w-4 h-4 text-[#C94A00]" /> FBR Portal <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="https://apply.ipo.gov.pk"
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClick}
            className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C] hover:translate-x-[-2px] hover:translate-y-[-2px]"
          >
            <ShieldCheck className="w-4 h-4 text-[#0D9970]" /> IPO Pakistan <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="https://leap.secp.gov.pk/#/user/login"
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClick}
            className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-4 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C] hover:translate-x-[-2px] hover:translate-y-[-2px]"
          >
            <BookOpen className="w-4 h-4 text-[#D4A800]" /> SECP Portal <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>

        <div className="menu-buttons flex flex-col gap-3 w-full max-w-[560px]">
          {/* Item 1 */}
          <div className="menu-btn menu-card font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[15px_18px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5">
            <span className="btn-num font-['Bebas_Neue'] text-[1.3rem] w-9 h-9 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0">
              01
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[5px]">
              <span className="btn-label text-[1.05rem]">Trademark™ Application &amp; MailMerge</span>
              <div className="btn-links flex flex-wrap gap-1.5">
                <Link href="/trademark-application" className="tag tag-live tag-link font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#C94A00] text-white no-underline" onClick={playClick}>
                  ＋ New Application
                </Link>
                <Link href="/records" className="tag tag-deploy tag-link font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#0D9970] text-white no-underline" onClick={playClick}>
                  Record View + Stages
                </Link>
                <a href="https://docs.google.com/spreadsheets/d/1u7oYu63G28y54byhOw-2KS3nlt7GrpmbkT3uKMX2b8M/edit?gid=1496727423#gid=1496727423" target="_blank" rel="noopener noreferrer" className="tag tag-sheet tag-link font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#D4A800] text-[#0C0C0C] no-underline" onClick={playClick}>
                  Google Sheet
                </a>
              </div>
            </div>
          </div>

          {/* Item 2 */}
          <div className="menu-btn placeholder font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[15px_18px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5 opacity-55 cursor-not-allowed">
            <span className="btn-num font-['Bebas_Neue'] text-[1.3rem] w-9 h-9 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0">
              02
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[5px]">
              <span className="btn-label text-[1.05rem]">Journal Publishing Unit</span>
              <div className="btn-links flex flex-wrap gap-1.5">
                <span className="tag tag-soon font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#888] text-white">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div className="menu-btn menu-card font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[15px_18px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5">
            <span className="btn-num font-['Bebas_Neue'] text-[1.3rem] w-9 h-9 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0">
              03
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[5px]">
              <span className="btn-label text-[1.05rem]">Database Record CMS (Supabase)</span>
              <div className="btn-links flex flex-wrap gap-1.5">
                <Link href="/records" className="tag tag-deploy tag-link font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#0D9970] text-white no-underline" onClick={playClick}>
                  Open Records
                </Link>
                <span className="tag tag-sheet font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#D4A800] text-[#0C0C0C]">
                  Supabase DB Active
                </span>
              </div>
            </div>
          </div>

          {/* Item 4: Ledger Consultants */}
          <div className="menu-btn menu-card font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[15px_18px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5">
            <span className="btn-num font-['Bebas_Neue'] text-[1.3rem] w-9 h-9 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0">
              04
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[5px]">
              <span className="btn-label text-[1.05rem]">Ledger Consultants</span>
              <div className="btn-links flex flex-wrap gap-1.5">
                <a href="https://brandex-client-ledger.vercel.app/" target="_blank" rel="noopener noreferrer" className="tag tag-deploy tag-link font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#0D9970] text-white no-underline" onClick={playClick}>
                  Open App
                </a>
                <a href="https://docs.google.com/spreadsheets/d/1tZqytFeYCnFCxVqJWTIUqJC8qwpop_J6IkuNwbr9nfw/edit?gid=236529280#gid=236529280" target="_blank" rel="noopener noreferrer" className="tag tag-sheet tag-link font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#D4A800] text-[#0C0C0C] no-underline" onClick={playClick}>
                  Google Sheet
                </a>
              </div>
            </div>
          </div>

          {/* Item 5: Document Enhancer */}
          <a href="https://0utlawzz.github.io/Document-Enhancer/" target="_blank" rel="noopener noreferrer" className="menu-btn font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[15px_18px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5 no-underline transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_#0C0C0C]" onClick={playClick}>
            <span className="btn-num font-['Bebas_Neue'] text-[1.3rem] w-9 h-9 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0">
              05
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[5px]">
              <span className="btn-label text-[1.05rem]">Tools: Document Enhancer</span>
              <div className="btn-links flex flex-wrap gap-1.5">
                <span className="tag tag-tool font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#0C0C0C] text-white">
                  Web Application
                </span>
              </div>
            </div>
          </a>

          {/* Item 6: GitHub Author Block */}
          <a href="https://github.com/0utLawzz/" target="_blank" rel="noopener noreferrer" className="menu-btn font-['DM_Mono',monospace] text-[0.88rem] font-medium tracking-[1px] uppercase p-[15px_18px] border-[2.5px] border-[#0C0C0C] rounded-[6px] bg-[#FAF6EE] text-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] flex items-center gap-3.5 no-underline transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_#0C0C0C]" onClick={playClick}>
            <span className="btn-num font-['Bebas_Neue'] text-[1.3rem] w-9 h-9 flex items-center justify-center border-2 border-currentColor rounded-[4px] shrink-0 bg-[#0C0C0C] text-[#FAF6EE]">
              <Github className="w-5 h-5" />
            </span>
            <div className="btn-content flex-1 flex flex-col gap-[5px]">
              <span className="btn-label text-[1.05rem]">GitHub Repository · 0utLawzz</span>
              <div className="btn-links flex flex-wrap gap-1.5">
                <span className="tag tag-deploy font-['DM_Mono',monospace] text-[0.58rem] tracking-[0.7px] px-2 py-[3px] border-[1.5px] border-[#0C0C0C] rounded-[3px] font-medium bg-[#0C0C0C] text-white">
                  View Profile &amp; Source
                </span>
              </div>
            </div>
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
