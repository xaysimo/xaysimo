
import React, { useMemo } from 'react';
import { AppData, Currency, AccountType } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { ShoppingBag, Users, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle, User, ChevronRight, Phone, Cloud, ShieldCheck, Database, Github, RefreshCw, Zap } from 'lucide-react';

interface Props {
  data: AppData;
  currency: Currency;
}

const Dashboard: React.FC<Props> = ({ data, currency }) => {
  const rate = data.settings.exchangeRate;

  const totalSales = data.transactions.reduce((acc, t) => acc + t.total, 0);
  const totalProfit = data.transactions.reduce((acc, t) => {
    const cost = t.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    return acc + (t.total - cost);
  }, 0);
  const activeDebtors = data.customers.filter(c => c.debtBalance > 0);
  const criticalStockItems = data.products.filter(p => p.stock < 5);

  // Get top 5 debtors by balance
  const topDebtors = useMemo(() => {
    return [...activeDebtors]
      .sort((a, b) => b.debtBalance - a.debtBalance)
      .slice(0, 5);
  }, [activeDebtors]);

  // Cloud Status Logic
  const cloudInfo = useMemo(() => {
    const hasGithub = !!data.settings.githubToken;
    const hasSupabase = !!data.settings.syncSettings?.supabaseUrl;
    const lastSync = data.settings.syncSettings?.lastSyncedAt;
    
    return {
      hasGithub,
      hasSupabase,
      lastSync: lastSync ? new Date(lastSync).toLocaleTimeString() : 'Pending...',
      status: hasGithub || hasSupabase ? 'Protected' : 'Local Only'
    };
  }, [data.settings]);

  // Aggregate stats by date for the last 7 days
  const dailyStats = useMemo(() => {
    const statsMap: Record<string, { revenue: number, profit: number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      statsMap[key] = { revenue: 0, profit: 0 };
    }

    data.transactions.forEach(t => {
      const key = new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (statsMap[key]) {
        statsMap[key].revenue += t.total;
        const cost = t.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
        statsMap[key].profit += (t.total - cost);
      }
    });

    return Object.entries(statsMap).map(([name, values]) => ({
      name,
      ...values
    }));
  }, [data.transactions]);

  const stats = [
    { label: 'Total Sales', value: totalSales, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12.5%' },
    { label: 'Total Profit', value: totalProfit, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+8.2%' },
    { label: 'Critical Stock', value: criticalStockItems.length, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', noCurrency: true, trend: criticalStockItems.length > 0 ? 'Urgent' : 'Safe' },
    { label: 'Active Debtors', value: activeDebtors.length, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', noCurrency: true, trend: 'Follow up' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <p className="text-sm font-bold text-slate-700">
                {p.name}: <span className="font-black">{formatCurrency(p.value, currency, rate)}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend === 'Urgent' ? 'bg-rose-100 text-rose-600 animate-pulse' : stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : stat.trend.startsWith('-') ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                {stat.trend.startsWith('+') ? <ArrowUpRight size={10} /> : stat.trend.startsWith('-') ? <ArrowDownRight size={10} /> : null}
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {stat.noCurrency ? stat.value : formatCurrency(stat.value, currency, rate)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Debtors & Connectivity */}
        <div className="space-y-8">
          {/* Connectivity Status Card */}
          <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl border border-slate-800 text-white group hover:scale-[1.02] transition-all">
             <div className="flex items-center justify-between mb-6">
                <div>
                   <h3 className="text-lg font-black tracking-tight">System Connectivity</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Database Health Profile</p>
                </div>
                <Cloud size={24} className={cloudInfo.status === 'Protected' ? 'text-emerald-400' : 'text-amber-400'} />
             </div>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                   <div className="flex items-center gap-3">
                      <Github size={16} className={cloudInfo.hasGithub ? 'text-emerald-400' : 'text-slate-500'} />
                      <span className="text-xs font-bold">GitHub Cloud Sync</span>
                   </div>
                   <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${cloudInfo.hasGithub ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {cloudInfo.hasGithub ? 'ACTIVE' : 'OFF'}
                   </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                   <div className="flex items-center gap-3">
                      <Database size={16} className={cloudInfo.hasSupabase ? 'text-blue-400' : 'text-slate-500'} />
                      <span className="text-xs font-bold">Supabase Mirroring</span>
                   </div>
                   <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${cloudInfo.hasSupabase ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                      {cloudInfo.hasSupabase ? 'ACTIVE' : 'OFF'}
                   </span>
                </div>
             </div>

             <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <RefreshCw size={12} className="text-slate-500 animate-spin" />
                   <span className="text-[10px] font-black text-slate-500 uppercase">Last Global Sync</span>
                </div>
                <span className="text-xs font-black text-emerald-400">{cloudInfo.lastSync}</span>
             </div>
          </div>

          {/* Debtors Hub Widget */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Debtors Hub</h3>
                <p className="text-xs text-slate-400 font-medium">Largest outstanding balances</p>
              </div>
              <Users size={20} className="text-amber-500" />
            </div>

            <div className="space-y-4 flex-1">
              {topDebtors.map((debtor) => (
                <div key={debtor.id} className="p-4 rounded-3xl bg-slate-50 border border-transparent hover:border-amber-100 hover:bg-amber-50/30 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 border shadow-sm overflow-hidden">
                      {debtor.photo ? <img src={debtor.photo} className="w-full h-full object-cover" /> : <User size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{debtor.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Phone size={10} /> {debtor.phone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-amber-600">{formatCurrency(debtor.debtBalance, currency, rate)}</p>
                  </div>
                </div>
              ))}
              
              {topDebtors.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30">
                  <Users size={40} className="mb-2" />
                  <p className="text-[10px] font-black uppercase">No active debtors</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t flex justify-between items-center">
               <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Receivables</span>
                  <p className="text-lg font-black text-slate-900">
                    {formatCurrency(activeDebtors.reduce((acc, d) => acc + d.debtBalance, 0), currency, rate)}
                  </p>
               </div>
               <button className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                 <ChevronRight size={20} />
               </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sales Chart */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Revenue vs. Profit</h3>
                <p className="text-xs text-slate-400 font-medium">Daily performance tracking (7-day window)</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Profit</span>
                </div>
              </div>
            </div>
            
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8'}}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue"
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Bar 
                    dataKey="profit" 
                    name="Profit"
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    barSize={30}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
