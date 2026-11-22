'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#F0E8D0] p-4 text-[#0C0C0C]">
        <main className="w-full max-w-md rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-6 text-center shadow-[5px_5px_0_#0C0C0C]">
          <h1 className="font-['Bebas_Neue'] text-3xl text-[#C94A00]">Brandex needs to reload</h1>
          <p className="mt-2 text-sm text-[#555]">A temporary application error occurred. Please reload and try again.</p>
          <button type="button" onClick={reset} className="mt-5 inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#0C0C0C] px-4 py-2 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Reload application</button>
        </main>
      </body>
    </html>
  );
}
