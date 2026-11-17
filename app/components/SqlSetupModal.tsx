'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, RefreshCw, X } from 'lucide-react';
import { supabaseDB, SupabaseStatus } from '@/lib/supabase-db';

interface SqlSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SqlSetupModal({ isOpen, onClose }: SqlSetupModalProps) {
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const testConnection = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await supabaseDB.checkConnection());
    } catch {
      setStatus({ connected: false, tableReady: false, error: 'Connection check failed', url: '' });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void testConnection();
  }, [isOpen, testConnection]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-6 max-w-2xl w-full rounded-[6px]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#0C0C0C]">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#C94A00]" />
            <h2 className="font-['Bebas_Neue'] text-[1.6rem] tracking-[1px]">Supabase Connection</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 border-2 border-[#0C0C0C] bg-[#fee2e2] hover:bg-[#fca5a5]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-white border-2 border-[#0C0C0C] rounded-[4px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[0.82rem] font-['Space_Grotesk']">
            {checking ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Checking Supabase…</>
            ) : status?.tableReady ? (
              <><CheckCircle2 className="w-4 h-4 text-[#0D9970]" /> Supabase connected; required tables are available.</>
            ) : (
              <><AlertCircle className="w-4 h-4 text-[#C94A00]" /> {status?.error || 'Supabase connection is unavailable.'}</>
            )}
          </div>
          <button onClick={() => void testConnection()} disabled={checking} className="shrink-0 flex items-center gap-1 px-2.5 py-1 border border-[#0C0C0C] disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="p-4 bg-[#EBF7F2] border-2 border-[#0D9970] rounded-[4px] font-['Space_Grotesk'] text-[0.86rem] text-[#0C0C0C] space-y-2">
          <p><strong>Supabase stores all clients, cases, and workflow data.</strong> Google Drive stores generated documents and files.</p>
          <p>The database connection is configured on Vercel. The server-only key belongs in the Production environment variable <code>SUPABASE_SERVICE_ROLE_KEY</code>; it is never saved in this browser.</p>
          <p>Use the existing database schema. This screen will not run SQL or upload browser-cached records over Supabase.</p>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2 px-5 bg-[#0C0C0C] text-[#FAF6EE] border-2 border-[#0C0C0C] rounded-[4px]">Close</button>
        </div>
      </div>
    </div>
  );
}
