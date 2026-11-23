'use client';

import React, { useState, useEffect } from 'react';
import { DEFAULT_BRAND, validateSharedSettings } from '@/lib/shared-settings';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Table2, FilePlus2, Users, Settings, Home, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/records', label: 'Cases', icon: Table2 },
  { href: '/trademark-application', label: 'Create Case', icon: FilePlus2 }
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/settings', { cache: 'no-store', signal: controller.signal }).then(async response => { if (response.ok) setBrand(validateSharedSettings(await response.json())); }).catch(() => { /* Default branding remains visible if shared settings cannot load. */ });
    const update = (event: Event) => { try { setBrand(validateSharedSettings((event as CustomEvent).detail)); } catch { /* Reject malformed update events. */ } };
    window.addEventListener('brandex-brand-updated', update);
    return () => { controller.abort(); window.removeEventListener('brandex-brand-updated', update); };
  }, []);

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
    `flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold tracking-wide transition sm:px-3.5 ${(href === '/' ? pathname === '/' : pathname === href) ? 'bg-[#C94A00] text-white' : 'text-[#FAF6EE]/75 hover:bg-white/10 hover:text-white'}`;

  return (
    <><nav className="navbar sticky top-0 z-[1000] border-b-[3px] border-[#C94A00] bg-[#0C0C0C] shadow-[0_4px_0_rgba(0,0,0,.12)]">
      <div className="mx-auto flex min-h-[60px] w-full max-w-[1500px] items-center justify-between gap-3 px-3 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-inherit no-underline" aria-label="Brandex Home">
          <Image src={brand.logo_url || '/assets/aistudio/ChatGPT_Image_Nov_8__2026__10_03_54_PM_067fea60.png'} alt={brand.display_name} unoptimized width={40} height={40} className="h-9 w-9 rounded-xl border-2 border-[#C94A00] bg-[#FAF6EE] object-contain p-0.5" />
          <span className="max-w-48 truncate text-[#FAF6EE]" title={brand.display_name}><span className="block truncate font-['Bebas_Neue'] text-xl tracking-[2px] sm:text-2xl">{brand.display_name}</span>{brand.tagline && <span className="hidden truncate text-[10px] sm:block">{brand.tagline}</span>}</span>
        </Link>
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
          {NAV_ITEMS.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={navLinkClass(item.href)}><Icon className="h-3.5 w-3.5" />{item.label}</Link>; })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/settings" aria-label="Settings" title="Settings" className={`rounded border border-white/30 p-2 text-white transition hover:bg-white/10 ${pathname === '/settings' ? 'bg-[#C94A00]' : ''}`}><Settings className="h-4 w-4" /></Link>
          <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded border border-[#DC2626] px-2.5 py-2 text-[11px] font-semibold text-[#FAF6EE] hover:bg-[#DC2626]/15" title="Sign out"><LogOut className="h-4 w-4 text-[#DC2626]" /><span className="hidden sm:inline">Exit</span></button>
          <button type="button" onClick={() => setMobileMenuOpen(open => !open)} className="inline-flex rounded border border-white/30 p-2 text-white md:hidden" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {mobileMenuOpen && <div className="grid grid-cols-2 gap-1 border-t border-white/15 bg-[#171717] p-2 md:hidden">{NAV_ITEMS.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={navLinkClass(item.href)}><Icon className="h-4 w-4" />{item.label}</Link>; })}</div>}
    </nav>
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-[1500px] px-4 pt-3 text-xs text-[#666] sm:px-6">
      <ol className="flex items-center gap-2">
        <li>{pathname === '/' ? <span aria-current="page">Home</span> : <Link href="/" className="underline underline-offset-2">Home</Link>}</li>
        {pathname !== '/' && <><li aria-hidden="true">/</li><li aria-current="page">{pathname === '/settings' ? 'Settings' : NAV_ITEMS.find(item => item.href === pathname)?.label || 'Workspace'}</li></>}
      </ol>
    </nav></>
  );
}
