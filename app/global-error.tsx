'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F0E8D0] text-[#0C0C0C] min-h-screen flex items-center justify-center p-4">
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-8 max-w-md w-full rounded-[6px] text-center">
          <h1 className="font-['Bebas_Neue',sans-serif] text-[2.5rem] mb-2 text-[#C94A00]">Application Error</h1>
          <p className="font-['DM_Mono',monospace] text-[0.8rem] mb-6 text-[#444]">
            {error?.message || 'A critical error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="font-['DM_Mono',monospace] text-[0.85rem] font-bold py-3 px-6 bg-[#0C0C0C] text-[#FAF6EE] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[4px_4px_0_#0C0C0C] cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
