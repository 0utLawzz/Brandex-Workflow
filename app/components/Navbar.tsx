'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar relative sticky top-0 z-[1000] h-[60px] bg-[#0C0C0C] border-b-[3px] border-[#C94A00] shadow-[0_5px_0_rgba(0,0,0,.2)] flex items-center justify-between px-5 gap-3">
      <Link href="/" className="nb-brand flex items-center gap-3 text-inherit no-underline shrink-0">
        <Image
          src="/assets/brandex-logo-15.png"
          alt="Brandex"
          width={40}
          height={40}
          className="nb-logo rounded-full object-cover border-2 border-[#C94A00] bg-[#FAF6EE]"
          referrerPolicy="no-referrer"
        />
        <div>
          <div className="nb-brand-text font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#FAF6EE] leading-[1.1]">
            BRANDEX
          </div>
          <div className="nb-brand-sub font-['DM_Mono',monospace] text-[9px] text-[#0D9970] tracking-[2px] uppercase mt-[1px] hidden sm:block">
            Trademark Application · CMS
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
        <span className="nb-pill font-['DM_Mono',monospace] text-[10px] tracking-[1px] text-[#C94A00] border-[1.5px] border-[#333] px-2 py-1 uppercase hidden sm:block">
          SUPABASE READY
        </span>
      </div>
    </nav>
  );
}
