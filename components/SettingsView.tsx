
import React, { useState } from 'react';
import { AppData, Currency, AccountType, UserRole } from '../types';
import { Save, RefreshCw, Database, Download, Upload, Lock, User, Trash2, AlertTriangle, Cloud, CloudRain, Wifi, Server, CheckCircle2, Globe, Github, ShieldCheck, Key, TrendingUp, Search } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { pushToGithubGist, fetchAllGists } from '../lib/github';
import { generateId } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
}

const SettingsView: React.FC<Props> = ({ data, setData, addLog }) => {
  const [settings, setSettings] = useState(data.settings);
  const [isFetching, setIsFetching] = useState(false);
  const [isGithubSyncing, setIsGithubSyncing] = useState(false);
  const [isPullingGithub, setIsPullingGithub] = useState(false);

  const saveSettings = () => {
    setData(prev => ({ ...prev, settings }));
    addLog('Settings Update', `Business configuration updated. App Name: ${settings.businessName}`);
    alert('Settings saved successfully!');
  };

  const backupData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const restoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (confirm("Restore this backup? This will overwrite ALL current data.")) {
            setData(imported);
            addLog('Data Restore', 'System data restored from backup');
            window.location.reload();
          }
        } catch (err) {
          alert("Invalid backup file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleGithubPull = async () => {
    if (!settings.githubToken) return alert("Please enter a GitHub Token first.");
    setIsPullingGithub(true);
    try {
      const gists = await fetchAllGists(settings.githubToken);
      const dbGist = gists.find((g: any) => g.files['XAYSIMO_ERP_MASTER_DATABASE.json']);
      
      if (!dbGist) throw new Error("No Master Database found in your GitHub account.");

      const fileUrl = dbGist.files['XAYSIMO_ERP_MASTER_DATABASE.json'].raw_url;
      const response = await fetch(fileUrl);
      const cloudData = await response.json();

      if (confirm(`Database found on GitHub from ${new Date(dbGist.updated_at).toLocaleString()}. Restore it now?`)) {
        setData({
          ...cloudData,
          settings: {
            ...cloudData.settings,
            syncSettings: {
              ...cloudData.settings.syncSettings,
              githubGistId: dbGist.id
            }
          }
        });
        addLog('GitHub Pull', 'Successfully restored database from GitHub Gist.');
        alert("System restored from GitHub Cloud!");
      }
    } catch (err: any) {
      alert("GitHub Search Error: " + err.message);
    } finally {
      setIsPullingGithub(false);
    }
  };

  const handleGithubBackup = async () => {
    if (!settings.githubToken) return alert("Please enter a GitHub Personal Access Token first.");
    setIsGithubSyncing(true);
    try {
      const res = await pushToGithubGist(settings.githubToken, data, settings.syncSettings?.githubGistId);
      if (res?.id) {
        setSettings(prev => ({
          ...prev,
          syncSettings: {
            ...prev.syncSettings!,
            githubGistId: res.id
          }
        }));
      }
      addLog('GitHub Sync', 'Manual database push to GitHub successful.');
      alert("Database stored on GitHub!");
    } catch (err: any) {
      alert("GitHub Error: " + err.message);
    } finally {
      setIsGithubSyncing(false);
    }
  };

  const syncSettings = settings.syncSettings || { supabaseUrl: '', supabaseKey: '', autoSync: false, autoSyncGithub: false };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Settings</h1>
           <p className="text-slate-500 font-medium">Cloud Database & Persistence Master</p>
        </div>
        <button onClick={saveSettings} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95">
          <Save size={20} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-slate-900 p-8 rounded-[32px] shadow-2xl space-y-6 text-white">
          <h3 className="text-lg font-black border-b border-slate-800 pb-4 flex items-center gap-2">
            <Github size={18} /> GitHub Cloud Database
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Personal Access Token (ghp_...)</label>
              <input type="password" value={settings.githubToken || ''} onChange={e => setSettings({...settings, githubToken: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-2xl outline-none font-bold text-xs text-blue-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
               <div className="flex items-center gap-3">
                  <Wifi size={18} className="text-blue-400" />
                  <span className="text-xs font-black uppercase">Auto-Sync Database</span>
               </div>
               <input type="checkbox" checked={syncSettings.autoSyncGithub} onChange={e => setSettings({...settings, syncSettings: {...syncSettings, autoSyncGithub: e.target.checked}})} className="w-5 h-5 accent-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleGithubBackup} disabled={isGithubSyncing} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                {isGithubSyncing ? <RefreshCw className="animate-spin" size={14}/> : <ShieldCheck size={14}/>}
                Push Now
              </button>
              <button onClick={handleGithubPull} disabled={isPullingGithub} className="py-4 bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-600 transition-all flex items-center justify-center gap-2">
                {isPullingGithub ? <RefreshCw className="animate-spin" size={14}/> : <Search size={14}/>}
                Pull from GitHub
              </button>
            </div>
            <p className="text-[9px] text-slate-500 font-medium px-1">Stores your entire system (Products, Sales, Debts) in a Private Gist on GitHub.</p>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[32px] border shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b pb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" /> Business Identity
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Business Title</label>
              <input type="text" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Regional Currency</label>
              <select value={settings.defaultCurrency} onChange={e => setSettings({...settings, defaultCurrency: e.target.value as Currency})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold appearance-none">
                <option value={Currency.USD}>USD - US Dollar</option>
                <option value={Currency.ETB}>ETB - Ethiopian Birr</option>
              </select>
            </div>
          </div>
        </section>

        {/* Financial Logic */}
        <section className="bg-white p-8 rounded-[32px] border shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b pb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" /> Accounting Rules
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Exchange Rate (USD to ETB)</label>
              <input type="number" value={settings.exchangeRate} onChange={e => setSettings({...settings, exchangeRate: parseFloat(e.target.value)})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Sales Tax (%)</label>
              <input type="number" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value)})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[32px] border shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b pb-4 flex items-center gap-2">
            <Server size={18} className="text-blue-600" /> Alternate Cloud (Supabase)
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">API Endpoint</label>
              <input type="text" value={syncSettings.supabaseUrl} onChange={e => setSettings({...settings, syncSettings: {...syncSettings, supabaseUrl: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-xs" />
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
               <span className="text-xs font-black text-blue-800 uppercase">Auto-Sync</span>
               <input type="checkbox" checked={syncSettings.autoSync} onChange={e => setSettings({...settings, syncSettings: {...syncSettings, autoSync: e.target.checked}})} className="w-5 h-5 accent-blue-600" />
            </div>
          </div>
        </section>

        <section className="bg-rose-50 p-8 rounded-[40px] border border-rose-100 shadow-sm space-y-6 md:col-span-2">
          <h3 className="text-lg font-black text-rose-800 border-b border-rose-200 pb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-600" /> Database Management
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex gap-4">
               <button onClick={backupData} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all">
                  <Download size={18} /> Export JSON
               </button>
               <label className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                  <Upload size={18} /> Import JSON
                  <input type="file" accept=".json" onChange={restoreData} className="hidden" />
               </label>
            </div>
            <button onClick={() => { if(confirm("Master Reset?")) { localStorage.clear(); window.location.reload(); } }} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all">
              Reset Local Storage
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
