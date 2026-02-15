
import React, { useState } from 'react';
import { AppData, Currency } from '../types';
import { 
  HardDrive, 
  Database, 
  RefreshCw, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUp, 
  ArrowDown, 
  FileJson,
  Activity,
  ShieldCheck,
  Zap,
  Lock,
  Terminal,
  Copy,
  ExternalLink,
  HelpCircle,
  Key,
  Info,
  ShieldAlert
} from 'lucide-react';
import { saveToSupabase, fetchFromSupabase, testConnection } from '../lib/supabase';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  cloudSyncStatus: string;
  setCloudSyncStatus: React.Dispatch<React.SetStateAction<any>>;
}

const CloudDatabase: React.FC<Props> = ({ data, setData, addLog, cloudSyncStatus, setCloudSyncStatus }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const sqlSchema = `-- THE "FIX-EVERYTHING" SQL SCRIPT
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS public.erp_storage (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.erp_storage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access" ON public.erp_storage;

CREATE POLICY "Public Full Access" 
ON public.erp_storage FOR ALL 
USING (true) WITH CHECK (true);

GRANT ALL ON public.erp_storage TO anon;
GRANT ALL ON public.erp_storage TO authenticated;
GRANT ALL ON public.erp_storage TO service_role;`;

  const handleTestConnection = async () => {
    const { supabaseUrl, supabaseKey } = data.settings;
    if (!supabaseUrl || !supabaseKey) {
      setTestResult({ success: false, message: "Missing URL or Key in Settings." });
      return;
    }
    
    setTestResult(null);
    setCloudSyncStatus('syncing');
    try {
      await testConnection(supabaseUrl, supabaseKey);
      setTestResult({ success: true, message: "Success! Connection verified and table 'erp_storage' found." });
      setCloudSyncStatus('success');
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      setCloudSyncStatus('error');
    }
  };

  const handleManualPush = async () => {
    const { supabaseUrl, supabaseKey } = data.settings;
    if (!supabaseUrl || !supabaseKey) return alert("Credentials missing.");
    
    setIsPushing(true);
    setCloudSyncStatus('syncing');
    try {
      await saveToSupabase(supabaseUrl, supabaseKey, data);
      setCloudSyncStatus('success');
      addLog('Cloud Push', 'Manual sync successful');
      alert("Push successful! Your business data is now safe in the cloud.");
    } catch (err: any) {
      setCloudSyncStatus('error');
      alert(`Push Failed: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  const handleManualPull = async () => {
    const { supabaseUrl, supabaseKey } = data.settings;
    if (!supabaseUrl || !supabaseKey) return alert("Credentials missing.");
    
    setIsPulling(true);
    try {
      const cloudData = await fetchFromSupabase(supabaseUrl, supabaseKey);
      if (!cloudData) throw new Error("No data found in Supabase. Have you pushed yet?");

      if (confirm("Replace your LOCAL data with the CLOUD version? This will overwrite everything.")) {
        setData(cloudData);
        addLog('Cloud Pull', 'State restored from cloud');
        alert("Restored successfully! System reloaded from cloud.");
      }
    } catch (err: any) {
      alert(`Pull Failed: ${err.message}`);
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Cloud Infrastructure</h1>
          <p className="text-slate-500 font-medium">Enterprise State Persistence via Supabase</p>
        </div>
        <button 
          onClick={handleTestConnection}
          className="px-6 py-3 bg-white border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
        >
          <Activity size={16} /> Check Database Health
        </button>
      </div>

      {testResult && (
        <div className={`p-6 rounded-[32px] border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 ${testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
          {testResult.success ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <div className="flex-1">
            <p className="font-black text-sm uppercase">{testResult.success ? 'System Online' : 'System Offline'}</p>
            <p className="text-sm font-medium">{testResult.message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: SQL */}
        <div className="bg-white p-10 rounded-[48px] border shadow-sm space-y-8">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl"><Terminal size={24} /></div>
              <h2 className="text-xl font-black text-slate-800 uppercase">Step 1: Run SQL Script</h2>
           </div>
           <p className="text-sm text-slate-500 font-medium leading-relaxed">
             Copy this code and run it in your **Supabase SQL Editor** to create the required data table.
           </p>
           <div className="bg-slate-900 rounded-3xl p-6 relative group">
              <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto whitespace-pre leading-relaxed">
                {sqlSchema}
              </pre>
              <button 
                onClick={() => { navigator.clipboard.writeText(sqlSchema); alert("Copied!"); }}
                className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                <Copy size={14} />
              </button>
           </div>
           <a 
             href="https://app.supabase.com" 
             target="_blank" 
             className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-center text-xs uppercase tracking-widest hover:bg-slate-200 flex items-center justify-center gap-2"
           >
             Open Supabase Dashboard <ExternalLink size={14} />
           </a>
        </div>

        {/* Step 2: Operations */}
        <div className="bg-slate-900 p-10 rounded-[48px] text-white space-y-8 flex flex-col justify-between">
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-600 text-white rounded-xl"><Zap size={24} /></div>
                 <h2 className="text-xl font-black uppercase">Step 2: Sync Actions</h2>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Push your local data to create a cloud backup, or Pull to recover data on a new device.
              </p>
           </div>

           <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={handleManualPush}
                disabled={isPushing}
                className="py-6 bg-blue-600 text-white rounded-[32px] font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
              >
                {isPushing ? <RefreshCw className="animate-spin" size={24} /> : <ArrowUp size={24} />}
                PUSH TO CLOUD
              </button>
              <button 
                onClick={handleManualPull}
                disabled={isPulling}
                className="py-6 bg-white/10 text-white rounded-[32px] font-black text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3"
              >
                {isPulling ? <RefreshCw className="animate-spin" size={24} /> : <ArrowDown size={24} />}
                PULL FROM CLOUD
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CloudDatabase;
