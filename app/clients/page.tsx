'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { ClientProfile } from '@/lib/standalone-db';
import { supabaseDB } from '@/lib/supabase-db';
import { formatPakistaniCnic, isValidPakistaniCnic } from '@/lib/case-reference';
import { Trash2, Plus, Users, ShieldCheck, Pencil, X } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbSource, setDbSource] = useState<'supabase' | 'local'>('supabase');
  const [clientCode, setClientCode] = useState('646');
  const [clientPrefix, setClientPrefix] = useState('A');
  const [clientCity, setClientCity] = useState('');
  const [clientFolderReference, setClientFolderReference] = useState('');
  const [clientName, setClientName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [tradingAs, setTradingAs] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [consultantName, setConsultantName] = useState('BRANDEX LAW ASSOCIATES');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit Client Modal State
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ClientProfile>>({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await supabaseDB.getClients();
      setClients(res.clients);
      setDbSource(res.source);

      // Compute next suggested client code
      if (res.clients.length > 0) {
        const codes = res.clients.map(c => parseInt(c.client_code, 10)).filter(n => !isNaN(n));
        if (codes.length > 0) {
          setClientCode(String(Math.max(...codes) + 1).padStart(3, '0'));
        }
      }
    } catch (error: any) {
      setErrorMsg(error?.message || 'Clients could not be loaded from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (client: ClientProfile) => {
    setEditingClient(client);
    setEditFormData({
      client_code: client.client_code,
      client_prefix: client.client_prefix || '',
      city: client.city || '',
      folder_reference: client.folder_reference || '',
      client_name: client.client_name,
      father_name: client.father_name || '',
      trading_as: client.trading_as || '',
      cnic: client.cnic || '',
      address: client.address || '',
      consultant_name: client.consultant_name || 'BRANDEX LAW ASSOCIATES'
    });
  };

  const handleSaveEditedClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editFormData.client_name?.trim()) return;
    const editPrefix = String(editFormData.client_prefix || '').trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]{0,7}$/.test(editPrefix)) {
      setErrorMsg('Client prefix must start with a letter and contain 1–8 letters or numbers.');
      return;
    }
    const editCnic = formatPakistaniCnic(editFormData.cnic || '');
    if (editCnic && !isValidPakistaniCnic(editCnic)) {
      setErrorMsg('CNIC must contain exactly 13 digits (XXXXX-XXXXXXX-X).');
      return;
    }
    setEditSaving(true);
    try {
      const updated = await supabaseDB.updateClient(editingClient.id, {
        client_code: (editFormData.client_code || '').replace(/\D/g, '').slice(0, 3).padStart(3, '0'),
        client_prefix: String(editFormData.client_prefix || '').trim().toUpperCase(),
        city: (editFormData.city || '').trim().toUpperCase(),
        folder_reference: (editFormData.folder_reference || '').trim().toUpperCase(),
        client_name: (editFormData.client_name || '').trim().toUpperCase(),
        father_name: (editFormData.father_name || '').trim().toUpperCase(),
        trading_as: (editFormData.trading_as || '').trim().toUpperCase(),
        cnic: editCnic,
        address: (editFormData.address || '').trim().toUpperCase(),
        consultant_name: (editFormData.consultant_name || '').trim().toUpperCase()
      });
      if (updated) {
        await loadClients();
        setSuccessMsg(`Client profile for "${updated.client_name}" successfully updated!`);
        setEditingClient(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update client');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    if (!/^[A-Z][A-Z0-9]{0,7}$/.test(clientPrefix.trim().toUpperCase())) {
      setErrorMsg('Client prefix must start with a letter and contain 1–8 letters or numbers.');
      return;
    }
    const newCnic = formatPakistaniCnic(cnic);
    if (newCnic && !isValidPakistaniCnic(newCnic)) {
      setErrorMsg('CNIC must contain exactly 13 digits (XXXXX-XXXXXXX-X).');
      return;
    }
    if (!/^\d{1,3}$/.test(clientCode.trim())) {
      setErrorMsg('Client code must contain 1 to 3 digits.');
      return;
    }
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const added = await supabaseDB.addClient({
        client_code: clientCode.trim().padStart(3, '0'),
        client_prefix: clientPrefix.trim().toUpperCase(),
        city: clientCity.trim().toUpperCase(),
        folder_reference: clientFolderReference.trim().toUpperCase(),
        client_name: clientName.trim().toUpperCase(),
        father_name: fatherName.trim().toUpperCase(),
        trading_as: tradingAs.trim().toUpperCase(),
        cnic: newCnic,
        address: address.trim().toUpperCase(),
        consultant_name: consultantName.trim().toUpperCase(),
        total_cases: 0,
        created_at: new Date().toISOString()
      });

      await loadClients();
      setSuccessMsg(`Client profile for "${added.client_name}" saved.`);

      // Reset form
      setClientName('');
      setClientCity('');
      setClientFolderReference('');
      setFatherName('');
      setTradingAs('');
      setCnic('');
      setAddress('');
      setClientCode(String(parseInt(clientCode, 10) + 1).padStart(3, '0'));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: number, name: string) => {
    if (confirm(`Delete client profile for ${name}?`)) {
      try {
        await supabaseDB.deleteClient(id);
        await loadClients();
        setSuccessMsg(`Client ${name} removed.`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to delete client');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />

      <div className="max-w-[1050px] w-full mx-auto p-4 sm:p-7 pb-16 flex-1">
        {/* Compact page header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-['Bebas_Neue'] text-[2.2rem] tracking-[1px] leading-tight">Client Profiles</h1>
            <p className="mt-1 text-xs text-[#666]">{clients.length} saved client profiles</p>
          </div>
          <button type="button" onClick={() => setShowAddForm(open => !open)} aria-expanded={showAddForm} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-4 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_#0C0C0C]">
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showAddForm ? 'Close form' : 'New Client'}
          </button>
        </div>

        {/* Add Client Form */}
        {showAddForm && (
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-6 rounded-[6px] mb-8">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
            <h2 className="font-['Bebas_Neue'] text-[1.45rem] tracking-[1px] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C94A00]" />
              Register New Client Profile
            </h2>
            <span className="font-['DM_Mono',monospace] text-[0.7rem] text-[#666]">
              Auto-syncs with Trademark Application Generator
            </span>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 bg-[#EBF7F2] text-[#0D9970] border-2 border-[#0D9970] font-['DM_Mono',monospace] text-[0.8rem] font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="mb-4 flex flex-col gap-2 rounded border-2 border-[#DC2626] bg-[#FEE2E2] p-3 text-sm font-semibold text-[#991B1B] sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 break-words">{errorMsg}</span>
              <button type="button" onClick={loadClients} disabled={loading} className="shrink-0 rounded border border-[#991B1B] px-3 py-1.5 text-xs font-bold disabled:opacity-50">{loading ? 'Retrying…' : 'Retry'}</button>
            </div>
          )}

          <form onSubmit={handleAddClient} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">Client Prefix / Category *</label>
              <input type="text" list="brandex-client-prefixes" required maxLength={8} value={clientPrefix}
                onChange={e => setClientPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['DM_Mono',monospace] font-bold rounded-[4px]" />
              <datalist id="brandex-client-prefixes"><option value="A" /><option value="X" /><option value="N" /><option value="B" /></datalist>
            </div>
            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">
                Client Code (3 Digits) *
              </label>
              <input
                type="text"
                required
                maxLength={3}
                value={clientCode}
                onChange={e => setClientCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['DM_Mono',monospace] font-bold text-[0.95rem] rounded-[4px]"
              />
            </div>

            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">
                Client Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="MUHAMMAD NADEEM"
                value={clientName}
                onChange={e => setClientName(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>

            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">
                Father / Husband Name
              </label>
              <input
                type="text"
                placeholder="MUHAMMAD ASLAM"
                value={fatherName}
                onChange={e => setFatherName(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>

            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">
                Trading As / Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="BRANDEX ASSOCIATES"
                value={tradingAs}
                onChange={e => setTradingAs(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>

            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">
                CNIC Number (5-7-1)
              </label>
              <input
                type="text"
                placeholder="37405-1234567-9"
                value={cnic}
                maxLength={15}
                onChange={e => setCnic(formatPakistaniCnic(e.target.value))}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['DM_Mono',monospace] rounded-[4px]"
              />
            </div>

            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">
                Default Legal Consultant
              </label>
              <input
                type="text"
                value={consultantName}
                onChange={e => setConsultantName(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>

            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">City</label>
              <input type="text" placeholder="ISLAMABAD" value={clientCity} onChange={e => setClientCity(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]" />
            </div>
            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">Additional Folder Reference</label>
              <input type="text" placeholder="CA / OPTIONAL" value={clientFolderReference} onChange={e => setClientFolderReference(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-['DM_Mono',monospace] text-[0.72rem] mb-1 font-bold">
                Client Registered Address *
              </label>
              <input
                type="text"
                required
                placeholder="OFFICE # 4, GIGA MALL ROAD, DHA 2, ISLAMABAD"
                value={address}
                onChange={e => setAddress(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full font-['DM_Mono',monospace] text-[0.85rem] font-bold py-3 px-4 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {submitting ? 'Saving...' : 'Save to Directory'}
              </button>
            </div>
          </form>
        </div>

        )}

        {/* Clients Table */}
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-6 rounded-[6px]">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
            <h2 className="font-['Bebas_Neue'] text-[1.45rem] tracking-[1px]">Client Directory ({clients.length})</h2>
            <div className="font-['DM_Mono',monospace] text-[0.72rem] text-[#0D9970] font-bold">
              ✓ {dbSource === 'supabase' ? 'Connected to cloud' : 'Local data'}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center font-['DM_Mono',monospace]">Loading client directory...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center font-['DM_Mono',monospace] text-[#666]">
              No clients found. Add your first client profile above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.85rem]">
                <thead>
                  <tr className="bg-[#0C0C0C] text-[#FAF6EE]">
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Code</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Client Name</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Trading As / Firm</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">CNIC</th>
                    <th className="p-2.5 text-center font-['DM_Mono',monospace] text-[0.7rem]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, idx) => (
                    <tr key={idx} className="border-b border-[#ddd] hover:bg-[#E8DFC7]">
                      <td className="p-2.5 font-['DM_Mono',monospace] font-bold text-[#C94A00]">
                        {c.client_prefix ? `${c.client_prefix}-${String(c.client_code).padStart(3, '0')}` : `PREFIX NEEDED · ${String(c.client_code).padStart(3, '0')}`}
                      </td>
                      <td className="p-2.5 font-bold">
                        <div>{c.client_name}</div>
                        {c.father_name && (
                          <div className="text-[0.7rem] text-[#666] font-normal font-['DM_Mono',monospace]">
                            S/O: {c.father_name}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 font-medium">{c.trading_as || '—'}</td>
                      <td className="p-2.5 font-['DM_Mono',monospace] text-[0.78rem]">{c.cnic || '—'}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-[#0C0C0C] bg-[#FAF6EE] hover:bg-white border border-[#0C0C0C] rounded shadow-[1px_1px_0_#0C0C0C] cursor-pointer"
                            title="Edit client profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(c.id, c.client_name)}
                            className="p-1.5 text-[#C94A00] hover:bg-[#fee2e2] rounded border border-transparent hover:border-[#C94A00] cursor-pointer"
                            title="Delete client profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] rounded-[6px] max-w-lg w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
              <h3 className="font-['Bebas_Neue'] text-[1.4rem] tracking-[1px] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#C94A00]" />
                Edit Client Profile (#{editingClient.client_code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="p-1 border border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedClient} className="flex flex-col gap-3 font-['Space_Grotesk'] text-[0.85rem]">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Prefix</label>
                  <input type="text" list="brandex-edit-prefixes" maxLength={8} value={editFormData.client_prefix || ''}
                    onChange={e => setEditFormData({ ...editFormData, client_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold" />
                  <datalist id="brandex-edit-prefixes"><option value="A" /><option value="X" /><option value="N" /><option value="B" /></datalist>
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={editFormData.client_code || ''}
                    onChange={e => setEditFormData({ ...editFormData, client_code: e.target.value })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.client_name || ''}
                    onChange={e => setEditFormData({ ...editFormData, client_name: e.target.value })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Father&apos;s Name</label>
                  <input
                    type="text"
                    value={editFormData.father_name || ''}
                    onChange={e => setEditFormData({ ...editFormData, father_name: e.target.value })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase"
                  />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">CNIC No</label>
                  <input
                    type="text"
                    placeholder="35202-1234567-1"
                    value={editFormData.cnic || ''}
                    maxLength={15}
                    onChange={e => setEditFormData({ ...editFormData, cnic: formatPakistaniCnic(e.target.value) })}
                    className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Trading As / Business</label>
                <input
                  type="text"
                  value={editFormData.trading_as || ''}
                  onChange={e => setEditFormData({ ...editFormData, trading_as: e.target.value })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase"
                />
              </div>

              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Address</label>
                <textarea
                  rows={2}
                  value={editFormData.address || ''}
                  onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase text-[0.8rem]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">City</label>
                  <input type="text" value={editFormData.city || ''} onChange={e => setEditFormData({ ...editFormData, city: e.target.value })} className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase" />
                </div>
                <div>
                  <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Additional Folder Reference</label>
                  <input type="text" value={editFormData.folder_reference || ''} onChange={e => setEditFormData({ ...editFormData, folder_reference: e.target.value })} className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase" />
                </div>
              </div>
              <div>
                <label className="block font-['DM_Mono',monospace] text-[0.7rem] font-bold mb-1">Assigned Law Firm / Consultant</label>
                <input
                  type="text"
                  value={editFormData.consultant_name || ''}
                  onChange={e => setEditFormData({ ...editFormData, consultant_name: e.target.value })}
                  className="w-full p-2 border-2 border-[#0C0C0C] bg-white rounded uppercase"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t-2 border-[#0C0C0C] mt-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="font-['DM_Mono',monospace] text-[0.75rem] py-2 px-4 border-2 border-[#0C0C0C] bg-[#E8DFC7] hover:bg-white rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-5 border-2 border-[#0C0C0C] bg-[#C94A00] text-white rounded shadow-[2px_2px_0_#0C0C0C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
                >
                  {editSaving ? 'Saving Changes...' : 'Save Client Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
