'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { HardDrive, ShieldCheck, LogOut } from 'lucide-react';
import DataBackupModal from './DataBackupModal';

export default function Navbar() {
  const pathname = usePathname();
  const [showBackupModal, setShowBackupModal] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  return (
    <>
      <nav className="navbar relative sticky top-0 z-[1000] h-[60px] bg-[#0C0C0C] border-b-[3px] border-[#C94A00] shadow-[0_5px_0_rgba(0,0,0,.2)] flex items-center justify-between px-5 gap-3">
        <Link href="/" className="nb-brand flex items-center gap-3 text-inherit no-underline shrink-0">
          <Image
            src="/assets/aistudio/ChatGPT_Image_Nov_8__2026__10_03_54_PM_067fea60.png"
            alt="Brandex Logo"
            width={40}
            height={40}
            className="nb-logo rounded-full object-contain p-0.5 border-2 border-[#C94A00] bg-[#FAF6EE]"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="nb-brand-text font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#FAF6EE] leading-[1.1]">
              BRANDEX
            </div>
            <div className="nb-brand-sub font-['DM_Mono',monospace] text-[9px] text-[#0D9970] tracking-[2px] uppercase mt-[1px] hidden sm:block">
              Trademark Application · Supabase Cloud &amp; Local CMS
            </div>
          </div>
        </Link>

        <div className="nb-nav flex items-center justify-center flex-1 gap-0">
          <Link
            href="/"
            className={`ni flex items-center px-3 sm:px-4 h-[60px] font-['DM_Mono',monospace] text-[10px] sm:text-[11px] font-medium tracking-[1px] uppercase text-decoration-none border-b-[4px] ${
              pathname === '/' ? 'text-[#FAF6EE] border-b-[#C94A00]' : 'text-[rgba(250,246,238,.55)] border-b-transparent hover:text-[#FAF6EE] hover:bg-[#1A1A1A]'
            }`}
          >
            Home
          </Link>
          <Link
            href="/trademark-application"
            className={`ni flex items-center px-3 sm:px-4 h-[60px] font-['DM_Mono',monospace] text-[10px] sm:text-[11px] font-medium tracking-[1px] uppercase text-decoration-none border-b-[4px] ${
              pathname === '/trademark-application' ? 'text-[#FAF6EE] border-b-[#C94A00]' : 'text-[rgba(250,246,238,.55)] border-b-transparent hover:text-[#FAF6EE] hover:bg-[#1A1A1A]'
            }`}
          >
            Application
          </Link>
          <Link
            href="/clients"
            className={`ni flex items-center px-3 sm:px-4 h-[60px] font-['DM_Mono',monospace] text-[10px] sm:text-[11px] font-medium tracking-[1px] uppercase text-decoration-none border-b-[4px] ${
              pathname === '/clients' ? 'text-[#FAF6EE] border-b-[#C94A00]' : 'text-[rgba(250,246,238,.55)] border-b-transparent hover:text-[#FAF6EE] hover:bg-[#1A1A1A]'
            }`}
          >
            Clients
          </Link>
          <Link
            href="/records"
            className={`ni flex items-center px-3 sm:px-4 h-[60px] font-['DM_Mono',monospace] text-[10px] sm:text-[11px] font-medium tracking-[1px] uppercase text-decoration-none border-b-[4px] ${
              pathname === '/records' ? 'text-[#FAF6EE] border-b-[#C94A00]' : 'text-[rgba(250,246,238,.55)] border-b-transparent hover:text-[#FAF6EE] hover:bg-[#1A1A1A]'
            }`}
          >
            Records
          </Link>
        </div>

        <div className="nb-right flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowBackupModal(true)}
            className="flex items-center gap-1.5 font-['DM_Mono',monospace] text-[10px] tracking-[1px] text-[#FAF6EE] bg-[#0C0C0C] hover:bg-[#1f1f1f] border-[1.5px] border-[#D4A800] px-2.5 py-1 uppercase rounded-[3px] shadow-[2px_2px_0_#D4A800] cursor-pointer"
            title="Backup & Restore Data"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4A800]" />
            <span className="hidden sm:inline text-[#FAF6EE]">BACKUP</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 font-['DM_Mono',monospace] text-[10px] tracking-[1px] text-[#FAF6EE] bg-[#0C0C0C] hover:bg-[#2b1818] border-[1.5px] border-[#DC2626] px-2.5 py-1 uppercase rounded-[3px] shadow-[2px_2px_0_#DC2626] cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3 h-3 text-[#DC2626]" />
            <span className="hidden md:inline text-[#FAF6EE]">EXIT</span>
          </button>
        </div>
      </nav>

      <DataBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </>
  );
}
