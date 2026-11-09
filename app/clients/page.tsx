'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { standaloneDB, ClientProfile } from '@/lib/standalone-db';
import { Trash2, Plus, Users, ShieldCheck, Download, Pencil, X } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientCode, setClientCode] = useState('646');
  const [clientName, setClientName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [tradingAs, setTradingAs] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [consultantName, setConsultantName] = useState('BRANDEX LAW ASSOCIATES');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Client Modal State
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ClientProfile>>({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    setLoading(true);
    const data = standaloneDB.getClients();
    setClients(data);

    // Compute next suggested client code
    if (data.length > 0) {
      const codes = data.map(c => parseInt(c.client_code, 10)).filter(n => !isNaN(n));
      if (codes.length > 0) {
        setClientCode(String(Math.max(...codes) + 1).padStart(3, '0'));
      }
    }
    setLoading(false);
  };

  const handleOpenEdit = (client: ClientProfile) => {
    setEditingClient(client);
    setEditFormData({
      client_code: client.client_code,
      client_name: client.client_name,
      father_name: client.father_name || '',
      trading_as: client.trading_as || '',
      cnic: client.cnic || '',
      address: client.address || '',
      consultant_name: client.consultant_name || 'BRANDEX LAW ASSOCIATES'
    });
  };

  const handleSaveEditedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editFormData.client_name?.trim()) return;
    setEditSaving(true);
    try {
      const updated = standaloneDB.updateClient(editingClient.id, {
        client_code: (editFormData.client_code || '').trim(),
        client_name: (editFormData.client_name || '').trim().toUpperCase(),
        father_name: (editFormData.father_name || '').trim().toUpperCase(),
        trading_as: (editFormData.trading_as || '').trim().toUpperCase(),
        cnic: (editFormData.cnic || '').trim(),
        address: (editFormData.address || '').trim().toUpperCase(),
        consultant_name: (editFormData.consultant_name || '').trim().toUpperCase()
      });
      if (updated) {
        setClients(standaloneDB.getClients());
        setSuccessMsg(`Client profile for "${updated.client_name}" successfully updated!`);
        setEditingClient(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update client');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const added = standaloneDB.addClient({
        client_code: clientCode.trim(),
        client_name: clientName.trim().toUpperCase(),
        father_name: fatherName.trim().toUpperCase(),
        trading_as: tradingAs.trim().toUpperCase(),
        cnic: cnic.trim(),
        address: address.trim().toUpperCase(),
        consultant_name: consultantName.trim().toUpperCase(),
        total_cases: 0,
        created_at: new Date().toISOString()
      });

      setClients(standaloneDB.getClients());
      setSuccessMsg(`Client profile for "${added.client_name}" saved to Standalone Database!`);

      // Reset form
      setClientName('');
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

  const handleDeleteClient = (id: number, name: string) => {
    if (confirm(`Delete client profile for ${name}?`)) {
      standaloneDB.deleteClient(id);
      setClients(standaloneDB.getClients());
      setSuccessMsg(`Client ${name} removed.`);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Client Code', 'Full Name', 'Father Name', 'Trading As', 'CNIC', 'Address', 'Consultant'];
    const rows = clients.map(c => [
      c.client_code,
      `"${c.client_name || ''}"`,
      `"${c.father_name || ''}"`,
      `"${c.trading_as || ''}"`,
      `"${c.cnic || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.consultant_name || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandex-clients-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />

      <div className="max-w-[1050px] w-full mx-auto p-4 sm:p-7 pb-16 flex-1">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['DM_Mono',monospace] text-[0.7rem] font-bold px-2 py-0.5 bg-[#0D9970] text-white rounded border border-[#0C0C0C]">
                STANDALONE 0ms
              </span>
              <span className="font-['DM_Mono',monospace] text-[0.7rem] text-[#666]">
                LOCAL SOVEREIGNTY
              </span>
            </div>
            <h1 className="font-['Bebas_Neue'] text-[2.2rem] tracking-[1px] leading-tight">
              Client Profiles &amp; Ledger Directory
            </h1>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] text-[#0C0C0C] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] hover:bg-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Clients (.CSV)
            </button>
            <Link
              href="/trademark-application"
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#C94A00] text-white border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] no-underline font-bold"
            >
              + New Application
            </Link>
            <Link
              href="/"
              className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2px] border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] no-underline text-[#0C0C0C]"
            >
              ← Back to CMS
            </Link>
          </div>
        </div>

        {/* Add Client Form */}
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
            <div className="mb-4 p-3 bg-[#fee2e2] text-[#991b1b] border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.8rem] font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddClient} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                onChange={e => setCnic(e.target.value)}
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

        {/* Clients Table */}
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-6 rounded-[6px]">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#0C0C0C] mb-4">
            <h2 className="font-['Bebas_Neue'] text-[1.45rem] tracking-[1px]">
              Saved Client Directory ({clients.length})
            </h2>
            <div className="font-['DM_Mono',monospace] text-[0.72rem] text-[#0D9970] font-bold">
              ✓ 100% Standalone In-Memory &amp; Local Persistence
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
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Address</th>
                    <th className="p-2.5 text-center font-['DM_Mono',monospace] text-[0.7rem]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, idx) => (
                    <tr key={idx} className="border-b border-[#ddd] hover:bg-[#E8DFC7]">
                      <td className="p-2.5 font-['DM_Mono',monospace] font-bold text-[#C94A00]">
                        #{c.client_code}
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
                      <td className="p-2.5 text-[0.78rem] max-w-xs truncate" title={c.address}>
                        {c.address || '—'}
                      </td>
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
              <div className="grid grid-cols-3 gap-3">
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
                    onChange={e => setEditFormData({ ...editFormData, cnic: e.target.value })}
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
