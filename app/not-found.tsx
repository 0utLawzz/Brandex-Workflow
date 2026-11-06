import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0E8D0] text-[#0C0C0C] p-4 text-center">
      <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-8 max-w-md w-full rounded-[6px]">
        <h1 className="font-['Bebas_Neue'] text-[3rem] mb-2">404 — Page Not Found</h1>
        <p className="font-['DM_Mono',monospace] text-[0.85rem] mb-6">The page you are looking for does not exist or has been moved.</p>
        <Link
          href="/"
          className="inline-block font-['DM_Mono',monospace] text-[0.85rem] font-bold py-3 px-6 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[4px] shadow-[4px_4px_0_#0C0C0C] no-underline"
        >
          ← Return to CMS Home
        </Link>
      </div>
    </div>
  );
}
