'use client';
import { useState } from 'react';

const scripts = new Map<string, Promise<void>>();
function loadScript(url: string): Promise<void> {
  if (!scripts.has(url)) scripts.set(url, new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = url; script.async = true;
    script.onload = () => resolve(); script.onerror = () => { scripts.delete(url); reject(new Error('Google Picker could not load.')); };
    document.head.appendChild(script);
  }));
  return scripts.get(url)!;
}

export default function DriveFolderPicker({ clientId, recordId, onSaved }: { clientId?: number; recordId?: number; onSaved: (folderId: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const choose = async () => {
    setBusy(true); setMessage('');
    try {
      const clientIdConfig = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
      const appId = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER;
      if (!clientIdConfig || !apiKey || !appId) throw new Error('Google Drive Picker is not configured.');
      await Promise.all([loadScript('https://apis.google.com/js/api.js'), loadScript('https://accounts.google.com/gsi/client')]);
      const { google, gapi } = window as unknown as { google: any; gapi: any };
      await new Promise<void>((resolve, reject) => gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Picker failed to load.')) }));
      const token = await new Promise<string>((resolve, reject) => google.accounts.oauth2.initTokenClient({ client_id: clientIdConfig, scope: 'https://www.googleapis.com/auth/drive.file', callback: (response: any) => response.access_token ? resolve(response.access_token) : reject(new Error('Google authorization failed.')), error_callback: () => reject(new Error('Google authorization was cancelled.')) }).requestAccessToken({ prompt: '' }));
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
      new google.picker.PickerBuilder().setAppId(appId).setDeveloperKey(apiKey).setOAuthToken(token).setOrigin(window.location.origin).addView(view).setCallback(async (result: any) => {
        if (result.action === google.picker.Action.CANCEL) { setBusy(false); return; }
        if (result.action !== google.picker.Action.PICKED) return;
        try {
          const response = await fetch('/api/drive/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, recordId, folderId: result.docs[0].id, oauthToken: token }) });
          const saved = await response.json();
          if (!response.ok || !saved.ok) throw new Error(saved.error || 'Folder could not be saved.');
          onSaved(saved.folderId); setMessage(`Saved destination: ${saved.name}`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Folder selection failed.'); }
        finally { setBusy(false); }
      }).build().setVisible(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Folder selection failed.'); setBusy(false); }
  };
  return <div><button type="button" disabled={busy} onClick={() => void choose()} className="rounded border-2 border-[#0C0C0C] bg-white px-3 py-2 text-sm disabled:opacity-50">{busy ? 'Selecting folder…' : 'Choose Google Drive folder'}</button>{message && <p role="status" className="mt-2 text-xs">{message}</p>}</div>;
}
