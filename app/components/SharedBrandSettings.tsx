'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_BRAND, validateSharedSettings } from '@/lib/shared-settings';
import type { SharedSettings } from '@/lib/shared-settings';

export default function SharedBrandSettings() {
  const [settings, setSettings] = useState<SharedSettings>(DEFAULT_BRAND);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/settings', { cache: 'no-store' }); const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings(validateSharedSettings(data)); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Settings unavailable.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validateSharedSettings(settings)) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const saved = validateSharedSettings(data); setSettings(saved); setMessage('Shared branding saved for all staff.');
      window.dispatchEvent(new CustomEvent('brandex-brand-updated', { detail: saved }));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Settings save failed.'); }
    finally { setBusy(false); }
  };
  return <section className="mb-5 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4">
    <h2 className="mb-3 text-lg font-bold">Shared branding</h2>
    <div className="grid gap-3 sm:grid-cols-2">{([['display_name', 'Display name'], ['brand_prefix', 'Brand prefix'], ['tagline', 'Tagline'], ['logo_url', 'Logo HTTPS URL']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input value={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.value }))} maxLength={key === 'logo_url' ? 2048 : key === 'tagline' ? 160 : key === 'brand_prefix' ? 12 : 80} className="mt-1 w-full rounded border p-2" /></label>)}</div>
    <div className="mt-3 flex gap-3"><button type="button" disabled={busy || settings.revision < 1} onClick={() => void save()} className="rounded border-2 bg-[#C94A00] px-3 py-2 text-sm text-white disabled:opacity-50">Save shared branding</button><button type="button" disabled={busy} onClick={() => void load()} className="text-sm underline">Reload</button></div>
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </section>;
}
