'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { supabase } from '@/lib/supabase';

interface ClientItem {
  id?: number;
  client_code: string;
  name: string;
  company_name: string;
  phone: string;
  cnic: string;
  address: string;
  created_at?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientCode, setClientCode] = useState('646');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    let remoteClients: ClientItem[] = [];
    try {
      const { data, error } = await supabase.from('clients').select('*').order('id', { ascending: false });
      if (!error && data) {
        remoteClients = data;
      }
    } catch (err) {
      console.warn('Supabase clients fetch error:', err);
    }

    let localClients: ClientItem[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('bx_local_clients');
        if (raw) localClients = JSON.parse(raw);
      } catch {}
    }

    const merged = [...remoteClients];
    localClients.forEach(lc => {
      if (!merged.some(rc => rc.client_code === lc.client_code || rc.name === lc.name)) {
        merged.push(lc);
      }
    });

    setClients(merged);
    setLoading(false);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');
    const newClient: ClientItem = {
      id: Date.now(),
      client_code: clientCode.trim(),
      name: name.trim().toUpperCase(),
      company_name: companyName.trim().toUpperCase(),
      phone: phone.trim(),
      cnic: cnic.trim(),
      address: address.trim().toUpperCase(),
    };

    try {
      const { data, error } = await supabase.from('clients').insert([newClient]).select();
      if (error) throw error;

      if (data && data[0]) {
        setClients([data[0], ...clients]);
      } else {
        setClients([newClient, ...clients]);
      }
      setSuccessMsg('Client profile saved to Supabase successfully!');
    } catch (err: any) {
      console.warn('Supabase save client error:', err);
      // Fallback save to localStorage
      const updatedClients = [newClient, ...clients];
      setClients(updatedClients);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bx_local_clients', JSON.stringify(updatedClients));
        } catch {}
      }

      const isSchemaCacheError = String(err?.message || '').toLowerCase().includes('schema cache') ||
        String(err?.message || '').toLowerCase().includes('not find the table') ||
        String(err?.message || '').toLowerCase().includes('relation');

      if (isSchemaCacheError) {
        setSuccessMsg(`Client saved locally! Note: Table 'clients' has not been created yet in Supabase. Click 'DB SQL SETUP' in the top bar to create the tables in Supabase.`);
      } else {
        setSuccessMsg(`Client saved to local profile cache. (Supabase notice: ${err?.message || 'table not synced'})`);
      }
    } finally {
      setName('');
      setCompanyName('');
      setPhone('');
      setCnic('');
      setAddress('');
      setClientCode(String(parseInt(clientCode, 10) + 1).padStart(3, '0'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />

      <div className="max-w-[1000px] w-full mx-auto p-4 sm:p-7 pb-16 flex-1">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h1 className="font-['Bebas_Neue'] text-[2rem] tracking-[1px]">Client &amp; Consultant Management (Supabase)</h1>
          <div className="flex gap-2.5 flex-wrap">
            <Link href="/trademark-application" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline font-bold">
              + New Application
            </Link>
            <Link href="/" className="font-['DM_Mono',monospace] text-[0.72rem] tracking-[1px] py-2 px-3.5 bg-[#FAF6EE] border-[2.5px] border-[#0C0C0C] rounded-[6px] shadow-[3px_3px_0_#0C0C0C] no-underline text-[#0C0C0C]">
              ← Back to CMS
            </Link>
          </div>
        </div>

        {/* Add Client Form */}
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-6 rounded-[6px] mb-8">
          <h2 className="font-['Bebas_Neue'] text-[1.4rem] mb-4 pb-2 border-b-2 border-[#0C0C0C]">Register New Client Profile</h2>
          {successMsg && (
            <div className="mb-4 p-3 bg-[#d1fae5] text-[#065f46] border-2 border-[#0C0C0C] font-['DM_Mono',monospace] text-[0.8rem] font-bold">
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
              <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Client Code (3 Digits)</label>
              <input
                type="text"
                required
                maxLength={3}
                value={clientCode}
                onChange={e => setClientCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] rounded-[4px]"
              />
            </div>
            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Client Full Name *</label>
              <input
                type="text"
                required
                placeholder="MUHAMMAD NADEEM"
                value={name}
                onChange={e => setName(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>
            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Company / Trading As</label>
              <input
                type="text"
                placeholder="BRANDEX ASSOCIATES"
                value={companyName}
                onChange={e => setCompanyName(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>
            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Phone Number</label>
              <input
                type="text"
                placeholder="+92 336 0015009"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] rounded-[4px]"
              />
            </div>
            <div>
              <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">CNIC Number</label>
              <input
                type="text"
                placeholder="37405-1234567-9"
                value={cnic}
                onChange={e => setCnic(e.target.value)}
                className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] rounded-[4px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-['DM_Mono',monospace] text-[0.75rem] mb-1 font-bold">Client Address</label>
              <input
                type="text"
                placeholder="ISLAMABAD, PAKISTAN"
                value={address}
                onChange={e => setAddress(e.target.value.toUpperCase())}
                className="w-full p-2.5 border-[2.5px] border-[#0C0C0C] bg-white font-['Space_Grotesk'] uppercase rounded-[4px]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full font-['DM_Mono',monospace] text-[0.85rem] font-bold py-3 px-4 bg-[#C94A00] text-white border-[2.5px] border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px]"
              >
                {submitting ? 'Saving...' : '+ Save Client to Supabase'}
              </button>
            </div>
          </form>
        </div>

        {/* Clients Table */}
        <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[5px_5px_0_#0C0C0C] p-6 rounded-[6px]">
          <h2 className="font-['Bebas_Neue'] text-[1.4rem] mb-4 pb-2 border-b-2 border-[#0C0C0C]">Saved Client Directory ({clients.length})</h2>
          {loading ? (
            <div className="p-6 text-center font-['DM_Mono',monospace]">Loading clients from Supabase...</div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center font-['DM_Mono',monospace]">No clients saved in Supabase yet. Add one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.85rem]">
                <thead>
                  <tr className="bg-[#0C0C0C] text-[#FAF6EE]">
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Code</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Name</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Company / Trading As</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Phone</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">CNIC</th>
                    <th className="p-2.5 text-left font-['DM_Mono',monospace] text-[0.7rem]">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, idx) => (
                    <tr key={idx} className="border-b border-[#ddd] hover:bg-[#E8DFC7]">
                      <td className="p-2.5 font-['DM_Mono',monospace] font-bold">{c.client_code}</td>
                      <td className="p-2.5 font-bold">{c.name}</td>
                      <td className="p-2.5">{c.company_name || '—'}</td>
                      <td className="p-2.5 font-['DM_Mono',monospace]">{c.phone || '—'}</td>
                      <td className="p-2.5 font-['DM_Mono',monospace]">{c.cnic || '—'}</td>
                      <td className="p-2.5">{c.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
