
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
  PackagePlus,
  Cloud,
  Database,
  CheckCircle2,
  HardDrive,
  Briefcase,
  User as UserIcon,
  Lock,
  ChevronRight
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
import CloudDatabase from './components/CloudDatabase';
import { generateId } from './lib/utils';
import { saveToSupabase, fetchFromSupabase } from './lib/supabase';

const STORAGE_KEY = 'ultimate_erp_master_data_v2';
const AUTH_KEY = 'erp_master_auth_session';

const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'XAYSIMO SUPER MARKET',
  exchangeRate: 125,
  taxRate: 0,
  defaultCurrency: Currency.USD,
  authUsername: 'doonka',
  authPassword: 'Shugri100@',
  supabaseUrl: 'https://lbayguclkcdrjuxouwjb.supabase.co', 
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXlndWNsa2Nkcmp1eG91d2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjc1MTMsImV4cCI6MjA4NjY0MzUxM30.QEUQuWkNBlmKm3vX0sQcfb-crQeTOAxC39I6Dupy7lE', 
  currentUser: {
    name: 'Admin User',
    role: UserRole.ADMIN
  },
  syncSettings: {
    autoSyncCloud: true,
    lastSyncedAt: 0,
    dataVersion: 1
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
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(0);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const syncTimeoutRef = useRef<any>(null);
  const isInitialLoad = useRef(true);

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
          supabaseUrl: DEFAULT_SETTINGS.supabaseUrl,
          supabaseKey: DEFAULT_SETTINGS.supabaseKey
        }
      };

      setData(mergedData);
      setLastSyncedAt(mergedData.settings.syncSettings?.lastSyncedAt || 0);
      setIsLoaded(true);

      // Attempt real-time cloud pull if local storage is empty (Multi-device behavior)
      if ((!localData || localData.products.length === 0) && mergedData.settings.supabaseUrl && mergedData.settings.supabaseKey) {
        try {
          setCloudSyncStatus('syncing');
          const cloudData = await fetchFromSupabase(mergedData.settings.supabaseUrl, mergedData.settings.supabaseKey);
          if (cloudData) {
            setData(cloudData);
            setLastSyncedAt(Date.now());
            setCloudSyncStatus('success');
          } else {
            setCloudSyncStatus('idle');
          }
        } catch (err) {
          console.error("Startup cloud recovery failed:", err);
          setCloudSyncStatus('error');
        }
      }
    };

    loadData();

    if (localStorage.getItem(AUTH_KEY) === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Persistence & Auto-Sync Engine
  useEffect(() => {
    if (!isLoaded) return;
    
    // Always save to local storage for offline resilience
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    document.title = data.settings.businessName || 'ERP Master';

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    const { supabaseUrl, supabaseKey, syncSettings } = data.settings;

    // Automatic Cloud Sync Debounce
    if (supabaseUrl && supabaseKey && syncSettings?.autoSyncCloud) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      
      setCloudSyncStatus('syncing');
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          await saveToSupabase(supabaseUrl, supabaseKey, data);
          const now = Date.now();
          setLastSyncedAt(now);
          setCloudSyncStatus('success');
          
          // Silently update local storage metadata without triggering another sync
          const currentStorage = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          if (currentStorage.settings) {
            currentStorage.settings.syncSettings = { ...currentStorage.settings.syncSettings, lastSyncedAt: now };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStorage));
          }
        } catch (err: any) {
          console.error("Auto-sync failure:", err.message);
          setCloudSyncStatus('error');
        }
      }, 5000); // Sync 5 seconds after last change
    }

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [data, isLoaded]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validUser = data.settings.authUsername || 'doonka';
    const validPass = data.settings.authPassword || 'Shugri100@';

    if (loginForm.username === validUser && loginForm.password === validPass) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, 'true');
      setLoginError('');
      addAuditLog('Login', 'Admin accessed system');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    if (confirm('Log out of system?')) {
      setIsAuthenticated(false);
      localStorage.removeItem(AUTH_KEY);
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
      AppTab.REPORTS, AppTab.AI, AppTab.DAILY_CLOSING, AppTab.DATABASE
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
    { tab: AppTab.ACCOUNTING, icon: Briefcase },
    { tab: AppTab.DAILY_CLOSING, icon: Zap },
    { tab: AppTab.REPORTS, icon: BarChart3 },
    { tab: AppTab.AI, icon: BrainCircuit },
    { tab: AppTab.DATABASE, icon: HardDrive },
    { tab: AppTab.AUDIT, icon: History },
    { tab: AppTab.ROLES, icon: ShieldCheck },
    { tab: AppTab.SETTINGS, icon: Settings },
  ].filter(item => allowedTabs.includes(item.tab));

  if (!isLoaded) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-10 bg-blue-600 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Zap size={40} className="fill-white" />
              </div>
              <h1 className="text-3xl font-black uppercase">{data.settings.businessName}</h1>
              <p className="text-sm opacity-80 mt-1 uppercase tracking-widest">Enterprise Portal</p>
            </div>

            <form onSubmit={handleLogin} className="p-10 space-y-6">
              {loginError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase text-center border border-red-100">
                  {loginError}
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username</label>
                  <input type="text" required className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                  <input type="password" required className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all">
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className={`no-print bg-slate-900 text-slate-300 w-64 fixed h-full z-20 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl text-white truncate uppercase">{data.settings.businessName}</span>
        </div>
        
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-160px)] scrollbar-hide">
          {menuItems.map(({ tab, icon: Icon }) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold tracking-tight transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <Icon size={18} /> {tab}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 bg-slate-900 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        <header className="no-print h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md bg-white/80">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <h2 className="font-semibold text-lg text-slate-700">{activeTab}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${cloudSyncStatus === 'success' ? 'bg-emerald-50 text-emerald-600' : cloudSyncStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
               <div className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' : cloudSyncStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
               {cloudSyncStatus === 'syncing' ? 'Syncing...' : cloudSyncStatus === 'success' ? 'Cloud Saved' : 'Cloud Error'}
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setGlobalCurrency(Currency.USD)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${globalCurrency === Currency.USD ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>USD</button>
              <button onClick={() => setGlobalCurrency(Currency.ETB)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${globalCurrency === Currency.ETB ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>ETB</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {(() => {
            const commonProps = { data, setData, addLog: addAuditLog, currency: globalCurrency };
            switch (activeTab) {
              case AppTab.DASHBOARD: return <Dashboard data={data} currency={globalCurrency} setActiveTab={setActiveTab} />;
              case AppTab.PRODUCTS: return <Products {...commonProps} />;
              case AppTab.POS: return <POS {...commonProps} />;
              case AppTab.PURCHASES: return <Purchases {...commonProps} />;
              case AppTab.INVOICES: return <Invoices {...commonProps} />;
              case AppTab.CUSTOMERS: return <Customers {...commonProps} />;
              case AppTab.DEBTORS: return <DebtorsHub {...commonProps} />;
              case AppTab.SUPPLIERS: return <Suppliers {...commonProps} />;
              case AppTab.STOCK: return <StockAdjustments {...commonProps} />;
              case AppTab.FINANCES: return <Finances {...commonProps} />;
              case AppTab.ACCOUNTING: return <Accounting {...commonProps} />;
              case AppTab.DAILY_CLOSING: return <ZReport data={data} currency={globalCurrency} />;
              case AppTab.REPORTS: return <Reports data={data} currency={globalCurrency} />;
              case AppTab.AI: return <AIInsights data={data} />;
              case AppTab.DATABASE: return <CloudDatabase {...commonProps} cloudSyncStatus={cloudSyncStatus} setCloudSyncStatus={setCloudSyncStatus} />;
              case AppTab.ROLES: return <Roles data={data} setData={setData} addLog={addAuditLog} />;
              case AppTab.SETTINGS: return <SettingsView data={data} setData={setData} addLog={addAuditLog} />;
              default: return <Dashboard data={data} currency={globalCurrency} setActiveTab={setActiveTab} />;
            }
          })()}
        </div>
      </main>
    </div>
  );
};

export default App;
