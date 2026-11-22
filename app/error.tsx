'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Table2 } from 'lucide-react';

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep technical details in the browser console, not in the user-facing page.
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F0E8D0] p-4 text-[#0C0C0C]">
      <section className="w-full max-w-md rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-6 text-center shadow-[5px_5px_0_#0C0C0C] sm:p-8">
        <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-[#C94A00]" />
        <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#555]">This page could not be loaded. Your saved records have not been changed by this error.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#0C0C0C] px-4 py-2 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Try again</button>
          <Link href="/records" className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-4 py-2 text-sm font-bold text-white"><Table2 className="h-4 w-4" /> Open Records</Link>
        </div>
      </section>
    </main>
  );
}
