'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Table2, FilePlus2, Users, Settings, Home, ShieldCheck, LogOut } from 'lucide-react';
import DataBackupModal from './DataBackupModal';

const NAV_ITEMS = [
  { href: '/records', label: 'Records', icon: Table2 },
  { href: '/trademark-application', label: 'Application', icon: FilePlus2 },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/', label: 'Home', icon: Home }
];

export default function Navbar() {
  const pathname = usePathname();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Redirect to the login page even if the network request fails.
    } finally {
      window.location.assign('/login');
    }
  };

  const navLinkClass = (href: string) =>
    `flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-wide transition sm:px-3.5 ${pathname === href ? 'bg-[#C94A00] text-white' : 'text-[#FAF6EE]/75 hover:bg-white/10 hover:text-white'}`;

  return (
    <>
      <nav className="navbar sticky top-0 z-[1000] border-b-[3px] border-[#C94A00] bg-[#0C0C0C] shadow-[0_4px_0_rgba(0,0,0,.12)]">
        <div className="mx-auto flex min-h-[60px] w-full max-w-[1500px] items-center justify-between gap-3 px-3 sm:px-5">
          <Link href="/records" className="flex shrink-0 items-center gap-2.5 text-inherit no-underline" aria-label="Brandex Records">
            <Image src="/assets/aistudio/ChatGPT_Image_Nov_8__2026__10_03_54_PM_067fea60.png" alt="Brandex" width={40} height={40} className="h-9 w-9 rounded-full border-2 border-[#C94A00] bg-[#FAF6EE] object-contain p-0.5" />
            <span className="font-['Bebas_Neue'] text-xl tracking-[2px] text-[#FAF6EE] sm:text-2xl">BRANDEX</span>
          </Link>
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
            {NAV_ITEMS.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={navLinkClass(item.href)}><Icon className="h-3.5 w-3.5" />{item.label}</Link>; })}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setShowBackupModal(true)} className="inline-flex items-center gap-1.5 rounded border border-[#D4A800] px-2.5 py-2 text-[11px] font-semibold text-[#FAF6EE] hover:bg-white/10" title="Backup and restore"><ShieldCheck className="h-4 w-4 text-[#D4A800]" /><span className="hidden sm:inline">Backup</span></button>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded border border-[#DC2626] px-2.5 py-2 text-[11px] font-semibold text-[#FAF6EE] hover:bg-[#DC2626]/15" title="Sign out"><LogOut className="h-4 w-4 text-[#DC2626]" /><span className="hidden sm:inline">Exit</span></button>
            <button type="button" onClick={() => setMobileMenuOpen(open => !open)} className="inline-flex rounded border border-white/30 p-2 text-white md:hidden" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {mobileMenuOpen && <div className="grid grid-cols-2 gap-1 border-t border-white/15 bg-[#171717] p-2 md:hidden">{NAV_ITEMS.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={navLinkClass(item.href)}><Icon className="h-4 w-4" />{item.label}</Link>; })}</div>}
      </nav>
      <DataBackupModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
    </>
  );
}
