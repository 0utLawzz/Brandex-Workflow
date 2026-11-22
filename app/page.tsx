'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ArrowRight, ExternalLink, Github, Landmark, ShieldCheck, BookOpen, Search, FilePlus2, Users, Settings, Table2 } from 'lucide-react';

const BRAND_LOGO = '/assets/aistudio/ChatGPT_Image_Nov_8__2026__10_03_54_PM_067fea60.png';
const BRANDEX_REPOSITORIES = [
  { name: 'Brandex Workflow', description: 'Client, case and document workflow', url: 'https://github.com/0utLawzz/Brandex-Workflow', type: 'Core system' },
  { name: 'Brandex Client Ledger', description: 'Client records and ledger', url: 'https://github.com/0utLawzz/Brandex-Client-Ledger', preview: 'https://brandex-client-ledger.vercel.app/', type: 'Client management' },
  { name: 'Brandex Tax NTN', description: 'NTN and tax filing tools', url: 'https://github.com/0utLawzz/Brandex-Tax-NTN', preview: 'https://brandex-tax-ntn.vercel.app', type: 'Tax' },
  { name: 'Brandex Database CMS', description: 'Database and records utilities', url: 'https://github.com/0utLawzz/Brandex-Database-CMS', preview: 'https://brandexsheet.vercel.app', type: 'Data' },
  { name: 'Brandex Drive Parser', description: 'Google Drive folder and case parsing', url: 'https://github.com/0utLawzz/Brandex-Drive-Parser', preview: 'https://0utlawzz.github.io/Brandex-Drive-Parser', type: 'Automation' }
];

export default function HomePage() {
  const router = useRouter();
  const [isWiping, setIsWiping] = useState(false);
  const [wipeTitle, setWipeTitle] = useState('RECORDS');
  const [repoQuery, setRepoQuery] = useState('');

  const filteredRepositories = useMemo(() => {
    const query = repoQuery.trim().toLowerCase();
    if (!query) return BRANDEX_REPOSITORIES;
    return BRANDEX_REPOSITORIES.filter(repo =>
      [repo.name, repo.description, repo.type].some(value => value.toLowerCase().includes(query))
    );
  }, [repoQuery]);

  const triggerWipeAndNavigate = (targetUrl: string, title: string) => {
    setWipeTitle(title);
    setIsWiping(true);
    window.setTimeout(() => router.push(targetUrl), 700);
  };

  const internalLink = (href: string, title: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    triggerWipeAndNavigate(href, title);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C] overflow-x-hidden">
      <Navbar />
      <AnimatePresence>
        {isWiping && (
          <motion.div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }} style={{ originX: 0 }} className="absolute inset-0 z-10 bg-[#0C0C0C] flex flex-col items-center justify-center p-5 text-center">
              <motion.div initial={{ scale: 0.7, rotate: -10, opacity: 0 }} animate={{ scale: [0.7, 1.08, 1], rotate: [-10, 3, 0], opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-[3px] border-[#C94A00] bg-[#FAF6EE] p-2 shadow-[0_0_35px_rgba(201,74,0,.45)]">
                <Image src={BRAND_LOGO} alt="Brandex" width={112} height={112} className="w-full h-full object-contain" priority />
              </motion.div>
              <div className="mt-6 font-['Bebas_Neue'] text-[clamp(2rem,7vw,4rem)] tracking-[3px] text-[#FAF6EE]">OPENING {wipeTitle}</div>
              <div className="mt-2 text-xs sm:text-sm font-['DM_Mono',monospace] text-[#D4A800]">BRANDEX WORKSPACE</div>
              <div className="mt-6 h-2 w-64 max-w-[80vw] overflow-hidden rounded bg-[#292929]">
                <motion.div className="h-full bg-[#C94A00]" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.65, ease: 'easeInOut' }} />
              </div>
            </motion.div>
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} style={{ originX: 0 }} className="absolute inset-0 z-20 bg-[#C94A00] mix-blend-multiply opacity-80" />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10">
        <section className="grid gap-6 rounded-xl border-2 border-[#0C0C0C] bg-[#FAF6EE] p-5 shadow-[5px_5px_0_#0C0C0C] sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded border border-[#0C0C0C] bg-[#D4A800] px-2.5 py-1 text-xs font-bold tracking-wide">BRANDEX WORKSPACE</div>
            <h1 className="font-['Bebas_Neue'] text-4xl leading-none tracking-wide sm:text-6xl">Trademark &amp; Client Workflow</h1>
            <p className="mt-3 max-w-2xl text-sm text-[#555] sm:text-base">Manage client profiles, applications and case records from one place.</p>
            <button type="button" onClick={() => triggerWipeAndNavigate('/records', 'RECORDS')} className="mt-5 inline-flex items-center justify-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-5 py-3 text-sm font-bold text-white shadow-[3px_3px_0_#0C0C0C] transition hover:-translate-y-0.5 hover:bg-[#ad3f00]">
              <Table2 className="h-4 w-4" /> Open Records <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mx-auto w-28 shrink-0 rounded-2xl border-2 border-[#0C0C0C] bg-white p-2 shadow-[3px_3px_0_#0C0C0C] sm:mx-0 sm:w-36">
            <Image src={BRAND_LOGO} alt="Brandex logo" width={144} height={144} className="h-auto w-full object-contain" priority />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-['Bebas_Neue'] text-2xl tracking-wide sm:text-3xl">Quick Links</h2><span className="text-xs text-[#666]">Workspace</span></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/trademark-application" onClick={internalLink('/trademark-application', 'APPLICATION')} className="flex min-h-20 items-center gap-3 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] transition hover:-translate-y-0.5">
              <span className="rounded-md bg-[#C94A00] p-2 text-white"><FilePlus2 className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">New Application</strong><span className="text-xs text-[#666]">Create or retry documents</span></span><ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
            <Link href="/clients" onClick={internalLink('/clients', 'CLIENTS')} className="flex min-h-20 items-center gap-3 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] transition hover:-translate-y-0.5">
              <span className="rounded-md bg-[#D4A800] p-2 text-[#0C0C0C]"><Users className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">Clients</strong><span className="text-xs text-[#666]">Profiles and client codes</span></span><ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
            <Link href="/settings" onClick={internalLink('/settings', 'SETTINGS')} className="flex min-h-20 items-center gap-3 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] transition hover:-translate-y-0.5">
              <span className="rounded-md bg-[#0C0C0C] p-2 text-white"><Settings className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">Settings</strong><span className="text-xs text-[#666]">Workspace preferences</span></span><ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-['Bebas_Neue'] text-2xl tracking-wide sm:text-3xl">External Portals</h2>
          <div className="flex flex-wrap gap-2">
            <a href="https://iris.fbr.gov.pk/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded border border-[#0C0C0C] bg-[#FAF6EE] px-3 py-2 text-sm font-semibold shadow-[2px_2px_0_#0C0C0C]"><Landmark className="h-4 w-4 text-[#C94A00]" /> FBR Iris <ExternalLink className="h-3 w-3" /></a>
            <a href="https://apply.ipo.gov.pk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded border border-[#0C0C0C] bg-[#FAF6EE] px-3 py-2 text-sm font-semibold shadow-[2px_2px_0_#0C0C0C]"><ShieldCheck className="h-4 w-4 text-[#0D9970]" /> IPO Pakistan <ExternalLink className="h-3 w-3" /></a>
            <a href="https://leap.secp.gov.pk/#/user/login" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded border border-[#0C0C0C] bg-[#FAF6EE] px-3 py-2 text-sm font-semibold shadow-[2px_2px_0_#0C0C0C]"><BookOpen className="h-4 w-4 text-[#D4A800]" /> SECP LEAP <ExternalLink className="h-3 w-3" /></a>
          </div>
        </section>

        <section className="mt-auto border-t-2 border-[#0C0C0C]/20 pt-6">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="flex items-center gap-2"><Github className="h-5 w-5" /><h2 className="font-['Bebas_Neue'] text-2xl tracking-wide sm:text-3xl">Brandex Repositories</h2></div><p className="mt-1 text-xs text-[#666]">Related projects only</p></div>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />
              <input type="search" value={repoQuery} onChange={event => setRepoQuery(event.target.value)} placeholder="Filter Brandex repositories" aria-label="Filter Brandex repositories" className="w-full rounded border-2 border-[#0C0C0C] bg-white py-2 pl-9 pr-3 text-sm normal-case outline-none focus:ring-2 focus:ring-[#C94A00]" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredRepositories.map(repo => (
              <article key={repo.name} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[#0C0C0C]/30 bg-[#FAF6EE] p-3">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{repo.name}</strong><span className="rounded bg-[#E8DFC7] px-1.5 py-0.5 text-[10px] font-semibold text-[#555]">{repo.type}</span></div><p className="mt-1 truncate text-xs text-[#666]">{repo.description}</p></div>
                <div className="flex shrink-0 items-center gap-2">
                  {repo.preview && <a href={repo.preview} target="_blank" rel="noopener noreferrer" aria-label={`Open ${repo.name} preview`} title="Open preview" className="rounded border border-[#0C0C0C] p-2 hover:bg-[#E8DFC7]"><ExternalLink className="h-4 w-4" /></a>}
                  <a href={repo.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${repo.name} repository`} title="Open repository" className="rounded border border-[#0C0C0C] bg-[#0C0C0C] p-2 text-white hover:bg-[#333]"><Github className="h-4 w-4" /></a>
                </div>
              </article>
            ))}
            {filteredRepositories.length === 0 && <p className="rounded border border-dashed border-[#999] p-5 text-center text-sm text-[#666] md:col-span-2">No Brandex repository matches this filter.</p>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
