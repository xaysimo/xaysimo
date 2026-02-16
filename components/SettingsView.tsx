
import React, { useState } from 'react';
import { AppData, Currency, AccountType, UserRole } from '../types';
import { Save, RefreshCw, Database, ShieldCheck, Search, Globe, TrendingUp, Trash2, RotateCcw, Package, AlertTriangle } from 'lucide-react';
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

  const handleFreshFinancialStart = () => {
    if (confirm("🔄 FRESH FINANCIAL START: This will reset all ledger balances, sales history, expenses, and debts to ZERO.\n\nYour PRODUCT LIST and SETTINGS will be kept. Continue?")) {
      if (confirm("FINAL CONFIRMATION: Are you sure you want to clear all money records and start fresh?")) {
        setData(prev => ({
          ...prev,
          // Zero money
          accounts: prev.accounts.map(acc => ({ ...acc, balance: 0 })),
          customers: prev.customers.map(cust => ({ ...cust, debtBalance: 0, loyaltyPoints: 0 })),
          suppliers: prev.suppliers.map(supp => ({ ...supp, balance: 0 })),
          // Clear history
          transactions: [],
          expenses: [],
          stockAdjustments: [],
          // We EXPLICITLY do NOT zero products or settings here
          lastModified: Date.now()
        }));
        addLog('System Reset', 'Fresh Financial Start: Cleared history and balances, kept product list.');
        alert('Financial reset complete. All money records and history have been cleared.');
      }
    }
  };

  const handleMasterClear = () => {
    if (confirm("⚠️ MASTER CLEAR: This will reset ALL money balances to $0 AND ALL product stock to 0.\n\nTransactions and expense history will also be permanently deleted. Continue?")) {
      if (confirm("FINAL CONFIRMATION: Are you absolutely sure? This action cannot be undone.")) {
        setData(prev => ({
          ...prev,
          // Zero money
          accounts: prev.accounts.map(acc => ({ ...acc, balance: 0 })),
          customers: prev.customers.map(cust => ({ ...cust, debtBalance: 0, loyaltyPoints: 0 })),
          suppliers: prev.suppliers.map(supp => ({ ...supp, balance: 0 })),
          // Zero items
          products: prev.products.map(p => ({ ...p, stock: 0 })),
          // Clear history
          transactions: [],
          expenses: [],
          stockAdjustments: [],
          lastModified: Date.now()
        }));
        addLog('System Reset', 'Master Clear performed: All balances and stock zeroed.');
        alert('System successfully cleared. All balances and items are now at zero.');
      }
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
        {/* Cloud Config */}
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supabase API Key</label>
              <input type="password" value={settings.supabaseKey || ''} onChange={e => setSettings({...settings, supabaseKey: e.target.value})} className={`w-full px-4 py-3 bg-slate-800 border-none rounded-2xl outline-none font-bold text-xs transition-all ${settings.supabaseKey?.startsWith('sbp_') ? 'text-rose-400 ring-2 ring-rose-500/50' : 'text-emerald-400'}`} placeholder="eyJ..." />
              <p className="text-[9px] text-slate-500 font-medium px-1">Found in Settings > API > anon (public)</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
               <span className="text-xs font-black uppercase">Live Mirroring (Auto)</span>
               <input type="checkbox" checked={syncSettings.autoSyncCloud} onChange={e => setSettings({...settings, syncSettings: {...syncSettings, autoSyncCloud: e.target.checked}})} className="w-5 h-5 accent-emerald-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleCloudBackup} disabled={isSyncing} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors">
                {isSyncing ? <RefreshCw className="animate-spin" size={14}/> : <ShieldCheck size={14}/>}
                Push Now
              </button>
              <button onClick={handleCloudPull} disabled={isPulling} className="py-4 bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-600 flex items-center justify-center gap-2 transition-colors">
                {isPulling ? <RefreshCw className="animate-spin" size={14}/> : <Search size={14}/>}
                Pull State
              </button>
            </div>
          </div>
        </section>

        {/* Identity */}
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

        {/* Finance */}
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

        {/* Maintenance */}
        <section className="bg-rose-50 p-8 rounded-[32px] border border-rose-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-rose-800 border-b border-rose-200 pb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600" /> System Maintenance
          </h3>
          <div className="space-y-4">
             <div className="p-4 bg-white rounded-2xl border border-rose-100 space-y-3">
                <p className="text-xs font-bold text-rose-700 mb-2 uppercase tracking-tight">Danger Zone Operations</p>
                
                <button 
                  onClick={handleFreshFinancialStart}
                  className="w-full py-4 bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Fresh Financial Start
                </button>
                <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest">
                  Resets Money + History | Keeps Products & Settings
                </p>

                <div className="h-px bg-slate-100 my-2" />

                <button 
                  onClick={handleMasterClear}
                  className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Master System Clear
                </button>
                <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest">
                  Zeroes Everything (Balances + Stock + History)
                </p>
             </div>
             
             <button 
                onClick={() => { if(confirm("This will permanently WIPE all local storage data. Continue?")) { localStorage.clear(); window.location.reload(); } }}
                className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-colors"
             >
                Factory Reset Local Device
             </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
