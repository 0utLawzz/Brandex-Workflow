'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, Database } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/records';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        router.push(from);
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Invalid credentials. Please verify your username and password.');
      }
    } catch {
      setErrorMsg('Login request failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <Image
          src="/assets/aistudio/ChatGPT_Image_Nov_8__2026__10_03_54_PM_067fea60.png"
          alt="Brandex Logo"
          width={64}
          height={64}
          className="rounded-full object-contain p-1 border-2 border-[#C94A00] bg-white shadow-[3px_3px_0_#0C0C0C] mb-3"
          referrerPolicy="no-referrer"
        />
        <h1 className="font-['Bebas_Neue'] text-[2.2rem] tracking-[1.5px] leading-tight">
          BRANDEX LAW ASSOCIATES
        </h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2 py-0.5 bg-[#0D9970] text-white rounded border border-[#0C0C0C] flex items-center gap-1">
            <Database className="w-3 h-3" /> SUPABASE LINKED
          </span>
          <span className="font-['DM_Mono',monospace] text-[0.7rem] text-[#666] font-bold">
            CMS ACCESS
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-[#FEE2E2] border-2 border-[#DC2626] rounded-[4px] text-[0.8rem] font-bold text-[#991B1B] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-['Space_Grotesk']">
        <div>
          <label className="block text-[0.78rem] font-bold font-['DM_Mono',monospace] mb-1">
            USERNAME (APP_ACCESS_USER):
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-[#0C0C0C] rounded font-['Space_Grotesk'] text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-[#C94A00]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[0.78rem] font-bold font-['DM_Mono',monospace] mb-1">
            PASSWORD (APP_ACCESS_PASSWORD):
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-[#0C0C0C] rounded font-['Space_Grotesk'] text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-[#C94A00]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full flex items-center justify-center gap-2 font-['DM_Mono',monospace] text-[0.88rem] font-bold py-3 px-4 bg-[#C94A00] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] hover:bg-[#b04000] cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            'Verifying...'
          ) : (
            <>
              <span>Sign In to Brandex CMS</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t-2 border-[#0C0C0C]/10 text-center">
        <p className="font-['DM_Mono',monospace] text-[0.7rem] text-[#666] flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0D9970]" /> Secured with AI Studio Environment Credentials
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F0E8D0] text-[#0C0C0C] flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="font-['DM_Mono',monospace] text-sm">Loading CMS Login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
