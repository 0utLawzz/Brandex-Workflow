'use client';

import React, { useEffect, useState } from 'react';
import { Check, Edit2, Plus, RefreshCw, X } from 'lucide-react';
import { supabaseDB, type CaseSeries } from '@/lib/supabase-db';

export default function SeriesManagement() {
  const [series, setSeries] = useState<CaseSeries[]>([]);
  const [newCode, setNewCode] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSeries = async () => {
    setLoading(true);
    setError('');
    try {
      setSeries(await supabaseDB.getSeries());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Shared series could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    supabaseDB.getSeries()
      .then(rows => { if (active) setSeries(rows); })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Shared series could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const addSeries = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await supabaseDB.addSeries(newCode);
      setSeries(current => [...current, created].sort((a, b) => a.sort_order - b.sort_order || a.series_code.localeCompare(b.series_code)));
      setNewCode('');
      setNotice(`Series ${created.series_code} added and activated.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Series could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (item: CaseSeries) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await supabaseDB.updateSeries(item.id, { series_code: editCode });
      setSeries(current => current.map(row => row.id === updated.id ? updated : row));
      setEditingId(null);
      setNotice(`Series updated to ${updated.series_code}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Series could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: CaseSeries) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await supabaseDB.updateSeries(item.id, { is_active: !item.is_active });
      setSeries(current => current.map(row => row.id === updated.id ? updated : row));
      setNotice(`Series ${updated.series_code} is now ${updated.is_active ? 'active' : 'inactive'}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Series status could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-5 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Case Series</h2>
          <p className="mt-1 text-xs text-[#666]">Shared list used by every staff member when creating a case.</p>
        </div>
        <button type="button" onClick={loadSeries} disabled={loading || saving} aria-label="Refresh series" className="rounded border border-[#0C0C0C] bg-[#E8DFC7] p-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {error && <div role="alert" className="mb-3 rounded border border-red-700 bg-red-50 p-2 text-xs font-semibold text-red-800">{error}</div>}
      {notice && <div role="status" className="mb-3 rounded border border-emerald-700 bg-emerald-50 p-2 text-xs font-semibold text-emerald-800">{notice}</div>}

      <form onSubmit={addSeries} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={newCode}
          onChange={event => setNewCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          maxLength={8}
          pattern="[A-Za-z][A-Za-z0-9]{0,7}"
          required
          aria-label="New series code"
          placeholder="New series code (e.g. N)"
          className="min-w-0 flex-1 rounded border-2 border-[#0C0C0C] bg-white px-3 py-2 text-sm uppercase"
        />
        <button type="submit" disabled={saving || loading || !newCode} className="inline-flex items-center justify-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add series</button>
      </form>

      {loading ? <p className="py-3 text-sm text-[#666]">Loading shared series…</p> : series.length === 0 ? (
        <p className="py-3 text-sm text-[#666]">No series found. Add a series to enable case creation.</p>
      ) : (
        <div className="divide-y divide-[#0C0C0C]/10">
          {series.map(item => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="min-w-14 rounded border border-[#0C0C0C]/20 bg-white px-3 py-1.5 text-center font-mono text-sm font-bold">{item.series_code}</span>
                <span className={`text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-[#777]'}`}>{item.is_active ? 'Active' : 'Inactive'}</span>
                {editingId === item.id && (
                  <input value={editCode} onChange={event => setEditCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} maxLength={8} aria-label={`Edit ${item.series_code} code`} className="w-28 rounded border border-[#0C0C0C] bg-white px-2 py-1 text-sm uppercase" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === item.id ? (
                  <>
                    <button type="button" disabled={saving || !editCode} onClick={() => void saveEdit(item)} aria-label="Save series code" className="rounded border border-[#0C0C0C] bg-emerald-100 p-2 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                    <button type="button" disabled={saving} onClick={() => setEditingId(null)} aria-label="Cancel series edit" className="rounded border border-[#0C0C0C] bg-[#E8DFC7] p-2"><X className="h-4 w-4" /></button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={saving} onClick={() => { setEditingId(item.id); setEditCode(item.series_code); }} aria-label={`Edit ${item.series_code}`} className="rounded border border-[#0C0C0C] bg-[#E8DFC7] p-2 disabled:opacity-50"><Edit2 className="h-4 w-4" /></button>
                    <button type="button" disabled={saving} onClick={() => void toggleActive(item)} className={`rounded border border-[#0C0C0C] px-3 py-2 text-xs font-bold disabled:opacity-50 ${item.is_active ? 'bg-[#FCE8E6] text-[#8B1D18]' : 'bg-emerald-100 text-emerald-800'}`}>{item.is_active ? 'Deactivate' : 'Activate'}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 border-t border-[#0C0C0C]/10 pt-3 text-[11px] text-[#666]">Series used by existing cases cannot be renamed. Deactivate old series instead; historical case references remain unchanged. Series are retained and are never deleted.</p>
    </section>
  );
}
