
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  UserPlus, 
  Truck, 
  TrendingUp, 
  Calculator, 
  History, 
  BarChart3, 
  BrainCircuit, 
  ShieldCheck, 
  Settings,
  Menu,
  LogOut,
  RefreshCcw,
  Zap,
  PieChart,
  Lock,
  User as UserIcon,
  ChevronRight,
  PackagePlus,
  Cloud,
  CloudOff,
  Database,
  Github,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppTab, AppData, Currency, UserRole, AppSettings, UserProfile, AccountType } from './types';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import POS from './components/POS';
import Purchases from './components/Purchases';
import DebtorsHub from './components/DebtorsHub';
import Invoices from './components/Invoices';
import Customers from './components/Customers';
import Suppliers from './components/Suppliers';
import Finances from './components/Finances';
import StockAdjustments from './components/StockAdjustments';
import Accounting from './components/Accounting';
import ZReport from './components/ZReport';
import Reports from './components/Reports';
import AIInsights from './components/AIInsights';
import Roles from './components/Roles';
import SettingsView from './components/SettingsView';
import { generateId } from './lib/utils';
import { getSupabase } from './lib/supabase';
import { pushToGithubGist, fetchAllGists } from './lib/github';

const STORAGE_KEY = 'ultimate_erp_master_data_v2';
const AUTH_KEY = 'erp_master_auth_session';

const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'XAYSIMO SUPER MARKET',
  exchangeRate: 125,
  taxRate: 0,
  defaultCurrency: Currency.USD,
  authUsername: 'doonka',
  authPassword: 'Shugri100@',
  githubToken: '', 
  currentUser: {
    name: 'Admin User',
    role: UserRole.ADMIN
  },
  syncSettings: {
    supabaseUrl: '',
    supabaseKey: '',
    autoSync: false,
    autoSyncGithub: false 
  }
};

const INITIAL_DATA: AppData = {
  products: [],
  transactions: [],
  customers: [],
  suppliers: [],
  expenses: [],
  stockAdjustments: [],
  auditLogs: [],
  settings: DEFAULT_SETTINGS,
  users: [
    { id: '1', name: 'Admin User', role: UserRole.ADMIN, isActive: true }
  ],
  accounts: [
    { id: 'acc-cash', name: 'Cash Account', type: AccountType.ASSET, balance: 0 },
    { id: 'acc-bank', name: 'Bank Account', type: AccountType.ASSET, balance: 0 },
    { id: 'acc-mobile', name: 'Mobile Account', type: AccountType.ASSET, balance: 0 },
    { id: 'acc-inv', name: 'Inventory Asset', type: AccountType.ASSET, balance: 0 },
    { id: 'acc-4', name: 'Loss - Damaged Items', type: AccountType.LIABILITY, balance: 0 },
    { id: 'acc-5', name: 'Loss - Lost Items', type: AccountType.LIABILITY, balance: 0 },
    { id: 'acc-6', name: 'Loss - Expired Items', type: AccountType.LIABILITY, balance: 0 }
  ]
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [globalCurrency, setGlobalCurrency] = useState<Currency>(Currency.USD);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [githubSyncStatus, setGithubSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  const syncTimerRef = useRef<any>(null);
  const githubSyncTimerRef = useRef<any>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Initial Data Load & Cloud Recovery
  useEffect(() => {
    const loadData = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      let localData: AppData | null = null;

      if (saved) {
        try {
          localData = JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse local storage", e);
        }
      }

      const mergedData = { 
        ...INITIAL_DATA, 
        ...localData,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(localData?.settings || {}),
          syncSettings: {
             ...DEFAULT_SETTINGS.syncSettings,
             ...(localData?.settings?.syncSettings || {})
          }
        }
      };

      setData(mergedData);
      setIsLoaded(true);

      // Attempt Cloud Recovery if local storage is fresh/empty but token exists
      if ((!localData || localData.products.length === 0) && mergedData.settings.githubToken) {
        try {
          setGithubSyncStatus('syncing');
          const gists = await fetchAllGists(mergedData.settings.githubToken);
          const dbGist = gists.find((g: any) => g.files['XAYSIMO_ERP_MASTER_DATABASE.json']);
          if (dbGist) {
            const response = await fetch(dbGist.files['XAYSIMO_ERP_MASTER_DATABASE.json'].raw_url);
            const cloudData = await response.json();
            setData(prev => ({
              ...cloudData,
              settings: {
                ...cloudData.settings,
                syncSettings: { ...cloudData.settings.syncSettings, githubGistId: dbGist.id }
              }
            }));
            setGithubSyncStatus('success');
            console.log("System restored from GitHub Cloud Database");
          }
        } catch (err) {
          console.error("Cloud recovery failed", err);
          setGithubSyncStatus('error');
        }
      }
    };

    loadData();

    const session = localStorage.getItem(AUTH_KEY);
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Sync Logic
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    document.title = data.settings.businessName || 'XAYSIMO SUPER MARKET';

    const { syncSettings, githubToken } = data.settings;

    // 1. Supabase Sync
    if (syncSettings?.supabaseUrl && syncSettings?.supabaseKey && syncSettings?.autoSync) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      setSyncStatus('syncing');
      syncTimerRef.current = setTimeout(async () => {
        try {
          const supabase = getSupabase(syncSettings.supabaseUrl, syncSettings.supabaseKey);
          if (supabase) {
            const { error } = await supabase.from('erp_storage').upsert({ 
              id: 'master_data', 
              payload: data, 
              updated_at: new Date().toISOString() 
            });
            if (error) throw error;
            setSyncStatus('success');
          }
        } catch (err) {
          setSyncStatus('error');
        }
      }, 5000); 
    }

    // 2. GitHub Gist Database Sync
    if (githubToken && syncSettings?.autoSyncGithub) {
      if (githubSyncTimerRef.current) clearTimeout(githubSyncTimerRef.current);
      setGithubSyncStatus('syncing');
      githubSyncTimerRef.current = setTimeout(async () => {
        try {
          const result = await pushToGithubGist(githubToken, data, syncSettings.githubGistId);
          if (result?.id && result.id !== syncSettings.githubGistId) {
            setData(prev => ({
              ...prev,
              settings: {
                ...prev.settings,
                syncSettings: {
                  ...prev.settings.syncSettings!,
                  githubGistId: result.id
                }
              }
            }));
          }
          setGithubSyncStatus('success');
          // Update last sync timestamp in data
          setData(prev => ({
            ...prev,
            settings: {
              ...prev.settings,
              syncSettings: {
                ...prev.settings.syncSettings!,
                lastSyncedAt: Date.now()
              }
            }
          }));
        } catch (err: any) {
          setGithubSyncStatus('error');
          if (err.message.includes('Bad credentials')) {
             setData(prev => ({
               ...prev,
               settings: { ...prev.settings, syncSettings: { ...prev.settings.syncSettings!, autoSyncGithub: false }}
             }));
          }
        }
      }, 10000);
    }
  }, [data, isLoaded]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validUser = data.settings.authUsername || 'doonka';
    const validPass = data.settings.authPassword || 'Shugri100@';

    if (loginForm.username === validUser && loginForm.password === validPass) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, 'true');
      setLoginError('');
      addAuditLog('Login', 'System accessed by administrator');
    } else {
      setLoginError('Invalid credentials. Please try again.');
    }
  };

  const handleGithubLogin = async () => {
    const { supabaseUrl, supabaseKey } = data.settings.syncSettings || {};
    if (!supabaseUrl || !supabaseKey) {
      return alert("Please configure Supabase in settings first to enable GitHub login.");
    }
    const supabase = getSupabase(supabaseUrl, supabaseKey);
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin }
      });
      if (error) alert("GitHub Login Error: " + error.message);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      const supabase = getSupabase(data.settings.syncSettings?.supabaseUrl, data.settings.syncSettings?.supabaseKey);
      if (supabase) await supabase.auth.signOut();
      setIsAuthenticated(false);
      localStorage.removeItem(AUTH_KEY);
      addAuditLog('Logout', 'User session terminated');
    }
  };

  const addAuditLog = (action: string, details: string) => {
    const newLog = {
      id: generateId(),
      action,
      details,
      timestamp: Date.now(),
      user: data.settings.currentUser.name
    };
    setData(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs] }));
  };

  const rolePermissions: Record<UserRole, AppTab[]> = {
    [UserRole.ADMIN]: Object.values(AppTab),
    [UserRole.MANAGER]: [
      AppTab.DASHBOARD, AppTab.PRODUCTS, AppTab.PURCHASES, AppTab.INVOICES, AppTab.CUSTOMERS, 
      AppTab.DEBTORS, AppTab.SUPPLIERS, AppTab.STOCK, AppTab.FINANCES, 
      AppTab.REPORTS, AppTab.AI, AppTab.DAILY_CLOSING
    ],
    [UserRole.CASHIER]: [
      AppTab.DASHBOARD, AppTab.POS, AppTab.INVOICES, AppTab.CUSTOMERS, AppTab.DAILY_CLOSING
    ]
  };

  const allowedTabs = rolePermissions[data.settings.currentUser.role];

  const menuItems = [
    { tab: AppTab.DASHBOARD, icon: LayoutDashboard },
    { tab: AppTab.PRODUCTS, icon: Package },
    { tab: AppTab.POS, icon: ShoppingCart },
    { tab: AppTab.PURCHASES, icon: PackagePlus },
    { tab: AppTab.INVOICES, icon: FileText },
    { tab: AppTab.CUSTOMERS, icon: UserPlus },
    { tab: AppTab.DEBTORS, icon: Users },
    { tab: AppTab.SUPPLIERS, icon: Truck },
    { tab: AppTab.STOCK, icon: RefreshCcw },
    { tab: AppTab.FINANCES, icon: TrendingUp },
    { tab: AppTab.ACCOUNTING, icon: Calculator },
    { tab: AppTab.DAILY_CLOSING, icon: Zap },
    { tab: AppTab.REPORTS, icon: PieChart },
    { tab: AppTab.AI, icon: BrainCircuit },
    { tab: AppTab.AUDIT, icon: History },
    { tab: AppTab.ROLES, icon: ShieldCheck },
    { tab: AppTab.SETTINGS, icon: Settings },
  ].filter(item => allowedTabs.includes(item.tab));

  const renderContent = () => {
    if (!allowedTabs.includes(activeTab)) {
       setActiveTab(AppTab.DASHBOARD);
       return null;
    }

    switch (activeTab) {
      case AppTab.DASHBOARD: return <Dashboard data={data} currency={globalCurrency} />;
      case AppTab.PRODUCTS: return <Products data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.POS: return <POS data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.PURCHASES: return <Purchases data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.INVOICES: return <Invoices data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.CUSTOMERS: return <Customers data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.DEBTORS: return <DebtorsHub data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.SUPPLIERS: return <Suppliers data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.STOCK: return <StockAdjustments data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.FINANCES: return <Finances data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.ACCOUNTING: return <Accounting data={data} setData={setData} addLog={addAuditLog} currency={globalCurrency} />;
      case AppTab.DAILY_CLOSING: return <ZReport data={data} currency={globalCurrency} />;
      case AppTab.REPORTS: return <Reports data={data} currency={globalCurrency} />;
      case AppTab.AI: return <AIInsights data={data} />;
      case AppTab.AUDIT: 
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Audit Trail</h1>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Timestamp</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">User</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Action</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.auditLogs.slice(0, 50).map(log => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-medium">{log.user}</td>
                      <td className="px-6 py-4 text-sm text-blue-600">{log.action}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case AppTab.ROLES: return <Roles data={data} setData={setData} addLog={addAuditLog} />;
      case AppTab.SETTINGS: return <SettingsView data={data} setData={setData} addLog={addAuditLog} />;
      default: return null;
    }
  };

  if (!isLoaded) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-10 bg-blue-600 text-white text-center space-y-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-white/20">
                <Zap size={40} className="fill-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight uppercase">{data.settings.businessName}</h1>
                <p className="text-sm font-medium opacity-80 uppercase tracking-widest mt-1">Management Portal Login</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="p-10 space-y-6 pb-2">
              {loginError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-tight text-center border border-red-100 animate-bounce">
                  {loginError}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" autoFocus required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 transition-all" placeholder="Enter username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="password" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 transition-all" placeholder="Enter password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                Sign In <ChevronRight size={20} />
              </button>
            </form>

            <div className="px-10 pb-10 space-y-4">
               <div className="flex items-center gap-4 text-slate-300">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <span className="text-[10px] font-black uppercase">Or connect with</span>
                  <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <button onClick={handleGithubLogin} className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black text-sm flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95">
                  <Github size={20} /> Continue with GitHub
               </button>
            </div>

            <div className="p-6 bg-slate-50 text-center border-t">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Enterprise Resource Planning v2.0</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSupabaseActive = data.settings.syncSettings?.supabaseUrl && data.settings.syncSettings?.supabaseKey;
  const isGithubActive = !!data.settings.githubToken;

  return (
    <div className="flex min-h-screen">
      <aside className={`no-print bg-slate-900 text-slate-300 w-64 fixed h-full z-20 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl text-white truncate uppercase">{data.settings.businessName}</span>
        </div>
        
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-250px)] scrollbar-hide">
          {menuItems.map(({ tab, icon: Icon }) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Icon size={18} /> {tab}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full bg-slate-900 flex flex-col border-t border-slate-800">
            {isGithubActive && (
               <div className="px-4 py-2 flex items-center justify-between text-[9px] font-black uppercase tracking-tight text-slate-400">
                  <div className="flex items-center gap-2">
                    <Github size={12} className={githubSyncStatus === 'success' ? 'text-emerald-500' : githubSyncStatus === 'error' ? 'text-rose-500' : 'text-slate-500'} />
                    <span>Cloud Database</span>
                  </div>
                  <span className={githubSyncStatus === 'syncing' ? 'text-blue-400 animate-pulse' : githubSyncStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'}>{githubSyncStatus === 'success' ? 'CONNECTED' : githubSyncStatus.toUpperCase()}</span>
               </div>
            )}
            {isSupabaseActive && (
              <div className="px-4 py-2 flex items-center justify-between text-[9px] font-black uppercase tracking-tight text-slate-400">
                <div className="flex items-center gap-2">
                  <Database size={12} className={syncStatus === 'success' ? 'text-blue-500' : 'text-slate-500'} />
                  <span>Cloud DB (Supabase)</span>
                </div>
                <span className={syncStatus === 'syncing' ? 'text-blue-400 animate-pulse' : ''}>{syncStatus}</span>
              </div>
            )}
            <div className="p-4">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={18} /> Logout
              </button>
            </div>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        <header className="no-print h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <h2 className="font-semibold text-lg text-slate-700">{activeTab}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            {isGithubActive && (
               <div className={`hidden lg:flex items-center gap-2 ${githubSyncStatus === 'error' ? 'bg-rose-900 text-rose-100' : 'bg-slate-900 text-white'} px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                  <div className={`w-2 h-2 rounded-full ${githubSyncStatus === 'syncing' ? 'bg-blue-400 animate-ping' : githubSyncStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <Github size={14} className={githubSyncStatus === 'syncing' ? 'animate-spin' : ''} />
                  {githubSyncStatus === 'syncing' ? 'Syncing...' : githubSyncStatus === 'error' ? 'Cloud Err' : 'Cloud Safe'}
               </div>
            )}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setGlobalCurrency(Currency.USD)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${globalCurrency === Currency.USD ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>USD</button>
              <button onClick={() => setGlobalCurrency(Currency.ETB)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${globalCurrency === Currency.ETB ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>ETB</button>
            </div>
            <div className="flex items-center gap-2 border-l pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{data.settings.currentUser.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{data.settings.currentUser.role}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                {data.settings.currentUser.avatar ? <img src={data.settings.currentUser.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-sm">{data.settings.currentUser.name.charAt(0)}</div>}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
