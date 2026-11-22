import { Github, ExternalLink } from 'lucide-react';

const BRANDEX_REPOSITORIES = [
  { name: 'Workflow', url: 'https://github.com/0utLawzz/Brandex-Workflow' },
  { name: 'Client Ledger', url: 'https://github.com/0utLawzz/Brandex-Client-Ledger' },
  { name: 'Tax NTN', url: 'https://github.com/0utLawzz/Brandex-Tax-NTN' },
  { name: 'Database CMS', url: 'https://github.com/0utLawzz/Brandex-Database-CMS' },
  { name: 'Drive Parser', url: 'https://github.com/0utLawzz/Brandex-Drive-Parser' }
];

export default function Footer() {
  return (
    <footer className="bx-footer bg-[#0C0C0C] px-3 py-4 text-[#FFF9F0]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-center font-['DM_Mono',monospace] text-[0.58rem] tracking-[1px] sm:text-left">
          BRANDEX LAW ASSOCIATES · WWW.BRANDEX.PK · INFO@BRANDEX.PK · +92 336 0015009 · ISLAMABAD · KARACHI · LAHORE · MULTAN · RAWALPINDI
        </div>
        <nav aria-label="Brandex repositories" className="flex flex-wrap items-center justify-center gap-2">
          {BRANDEX_REPOSITORIES.map(repo => (
            <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded border border-white/20 px-2 py-1 text-[0.62rem] font-semibold text-[#FFF9F0]/80 transition hover:border-[#C94A00] hover:text-white" title={`Open Brandex ${repo.name} repository`}>
              <Github className="h-3 w-3 text-[#C94A00]" />{repo.name}<ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
