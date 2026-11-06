'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error captured:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0E8D0] text-[#0C0C0C] p-4 text-center">
      <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-8 max-w-md w-full rounded-[6px]">
        <h1 className="font-['Bebas_Neue'] text-[2.5rem] mb-2 text-[#C94A00]">An Error Occurred</h1>
        <p className="font-['DM_Mono',monospace] text-[0.8rem] mb-6 text-[#444]">
          {error?.message || 'Something went wrong while rendering this section.'}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => reset()}
            className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-5 bg-[#0C0C0C] text-[#FAF6EE] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-5 bg-[#C94A00] text-white border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] no-underline"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
