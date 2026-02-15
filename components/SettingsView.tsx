
import React, { useState } from 'react';
import { AppData, Currency, AccountType, UserRole } from '../types';
import { Save, RefreshCw, Download, Upload, TrendingUp, Database, ShieldCheck, Key, Search, Globe, AlertTriangle, Info } from 'lucide-react';
import { saveToSupabase, fetchFromSupabase } from '../lib/supabase';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
}

const SettingsView: React.FC<Props> = ({ data, setData, addLog }) => {
  const [settings, setSettings] = useState(data.settings);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const saveSettings = () => {
    setData(prev => ({ ...prev, settings }));
    addLog('Settings Update', `Business configuration updated: ${settings.businessName}`);
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
            addLog('Data Restore', 'System data restored from local backup');
            window.location.reload();
          }
        } catch (err) {
          alert("Invalid backup file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCloudPull = async () => {
    if (!settings.supabaseUrl || !settings.supabaseKey) return alert("Please enter Supabase URL and Key.");
    setIsPulling(true);
    try {
      const cloudData = await fetchFromSupabase(settings.supabaseUrl, settings.supabaseKey);
      if (cloudData) {
        if (confirm(`Database found in Supabase. Restore it now? This replaces current local state.`)) {
          setData({
            ...cloudData,
            settings: {
              ...cloudData.settings,
              syncSettings: {
                ...cloudData.settings.syncSettings,
                lastSyncedAt: Date.now()
              }
            }
          });
          addLog('Supabase Pull', 'Successfully restored database from Supabase Cloud.');
          alert("System restored from Cloud!");
        }
      } else {
        alert("No database found in your Supabase project.");
      }
    } catch (err: any) {
      alert("Supabase Error: " + err.message);
    } finally {
      setIsPulling(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!settings.supabaseUrl || !settings.supabaseKey) return alert("Please enter Supabase URL and Key.");
    setIsSyncing(true);
    try {
      await saveToSupabase(settings.supabaseUrl, settings.supabaseKey, data);
      addLog('Supabase Sync', 'Manual database push to Supabase successful.');
      alert("Database mirrored to Supabase!");
    } catch (err: any) {
      alert("Supabase Error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSettings = settings.syncSettings || { autoSyncCloud: false };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">Enterprise Settings</h1>
           <p className="text-slate-500 font-medium">Core Configuration & Cloud Mirroring</p>
        </div>
        <button onClick={saveSettings} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95">
          <Save size={20} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-slate-900 p-8 rounded-[32px] shadow-2xl space-y-6 text-white">
          <h3 className="text-lg font-black border-b border-slate-800 pb-4 flex items-center gap-2">
            <Database size={18} /> Supabase Cloud Configuration
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supabase Project URL</label>
              <input type="text" value={settings.supabaseUrl || ''} onChange={e => setSettings({...settings, supabaseUrl: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-2xl outline-none font-bold text-xs text-emerald-400" placeholder="https://xyz.supabase.co" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supabase API Key (anon public)</label>
              <input type="password" value={settings.supabaseKey || ''} onChange={e => setSettings({...settings, supabaseKey: e.target.value})} className={`w-full px-4 py-3 bg-slate-800 border-none rounded-2xl outline-none font-bold text-xs transition-all ${settings.supabaseKey?.startsWith('sbp_') ? 'text-rose-400 ring-2 ring-rose-500/50' : 'text-emerald-400'}`} placeholder="eyJ..." />
              {settings.supabaseKey?.startsWith('sbp_') && (
                <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1 mt-1">
                  <Info size={10} /> Management Token (sbp_) detected! Use the 'anon public' key instead.
                </p>
              )}
              <p className="text-[9px] text-slate-500 font-medium px-1">Must start with <strong>eyJ...</strong> found in Settings > API > anon (public)</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
               <span className="text-xs font-black uppercase">Live Mirroring (Auto)</span>
               <input type="checkbox" checked={syncSettings.autoSyncCloud} onChange={e => setSettings({...settings, syncSettings: {...syncSettings, autoSyncCloud: e.target.checked}})} className="w-5 h-5 accent-emerald-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleCloudBackup} disabled={isSyncing} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 flex items-center justify-center gap-2">
                {isSyncing ? <RefreshCw className="animate-spin" size={14}/> : <ShieldCheck size={14}/>}
                Push Now
              </button>
              <button onClick={handleCloudPull} disabled={isPulling} className="py-4 bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-600 flex items-center justify-center gap-2">
                {isPulling ? <RefreshCw className="animate-spin" size={14}/> : <Search size={14}/>}
                Pull State
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[32px] border shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b pb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" /> Business Identity
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Store Name</label>
              <input type="text" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">System Currency</label>
              <select value={settings.defaultCurrency} onChange={e => setSettings({...settings, defaultCurrency: e.target.value as Currency})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold appearance-none">
                <option value={Currency.USD}>USD - US Dollar</option>
                <option value={Currency.ETB}>ETB - Ethiopian Birr</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[32px] border shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b pb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" /> Financial Settings
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Exchange Rate (1 USD = ? ETB)</label>
              <input type="number" value={settings.exchangeRate} onChange={e => setSettings({...settings, exchangeRate: parseFloat(e.target.value)})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Global Tax Rate (%)</label>
              <input type="number" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value)})} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            </div>
          </div>
        </section>

        <section className="bg-rose-50 p-8 rounded-[40px] border border-rose-100 shadow-sm space-y-6 flex flex-col justify-center">
          <h3 className="text-lg font-black text-rose-800 border-b border-rose-200 pb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-600" /> Disaster Recovery
          </h3>
          <div className="flex flex-col gap-3">
             <button onClick={backupData} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all">
                <Download size={18} /> Export JSON Bundle
             </button>
             <label className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                <Upload size={18} /> Restore Local File
                <input type="file" accept=".json" onChange={restoreData} className="hidden" />
             </label>
             <button onClick={() => { if(confirm("This will WIPE all local data. Continue?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all">
               Factory Reset Local
             </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
