
import React, { useMemo, useState } from 'react';
import { AppData, Currency, AccountType, Account } from '../types';
import { formatCurrency, generateId } from '../lib/utils';
import { TrendingUp, Building2, Wallet, Package, Users, History, FileText, Plus, Landmark, PieChart, X, Edit2, Trash2, Smartphone, Landmark as BankIcon, CircleDollarSign, ChevronRight, Printer } from 'lucide-react';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Accounting: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const rate = data.settings.exchangeRate;
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: AccountType.ASSET,
    balance: 0
  });

  const financialStats = useMemo(() => {
    const revenue = data.transactions.reduce((acc, t) => acc + t.total, 0);
    const cogs = data.transactions.reduce((acc, t) => {
      return acc + t.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    }, 0);
    const expenses = data.expenses.reduce((acc, e) => acc + e.amount, 0);
    
    const liquidAssets = data.accounts.filter(a => 
      (a.type === AccountType.ASSET || a.type === AccountType.OTHER_CURRENT_ASSET) && 
      a.id !== 'acc-inv' &&
      !a.name.toLowerCase().includes('receivables')
    );

    const inventoryValue = data.products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
    const debtorsTotal = data.customers.reduce((acc, c) => acc + c.debtBalance, 0);
    const creditorsTotal = data.suppliers.reduce((acc, s) => acc + s.balance, 0);
    
    const customLiabilities = data.accounts
      .filter(a => a.type === AccountType.LIABILITY)
      .reduce((acc, a) => acc + a.balance, 0);

    const customEquity = data.accounts
      .filter(a => a.type === AccountType.EQUITY)
      .reduce((acc, a) => acc + a.balance, 0);

    const netProfit = (revenue - cogs) - expenses;

    return {
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      expenses,
      netProfit,
      liquidAssets,
      inventoryValue,
      debtorsTotal,
      creditorsTotal,
      customLiabilities,
      customEquity,
      totalAssets: liquidAssets.reduce((acc, a) => acc + a.balance, 0) + inventoryValue + debtorsTotal,
      totalLiabilities: creditorsTotal + customLiabilities,
      totalEquity: netProfit + customEquity
    };
  }, [data]);

  const handleSaveAccount = () => {
    if (!formData.name) return alert("Account name is required");
    
    if (editingAccount) {
      setData(prev => ({
        ...prev,
        accounts: prev.accounts.map(a => a.id === editingAccount.id ? { ...a, ...formData } : a)
      }));
      addLog('Account Updated', `Updated ledger account: ${formData.name}`);
    } else {
      const account: Account = {
        id: generateId(),
        ...formData
      };
      setData(prev => ({
        ...prev,
        accounts: [...prev.accounts, account]
      }));
      addLog('Account Created', `New ledger account added: ${account.name}`);
    }

    closeModal();
  };

  const deleteAccount = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const accountToDelete = data.accounts.find(a => a.id === id);
    if (!accountToDelete) return;
    
    const confirmMsg = accountToDelete.balance !== 0 
      ? `WARNING: ${accountToDelete.name} has a balance of ${formatCurrency(accountToDelete.balance, currency, rate)}. Deleting it will cause an accounting imbalance. Continue?`
      : `Are you sure you want to delete ${accountToDelete.name}? This cannot be undone.`;

    if (confirm(confirmMsg)) {
      setData(prev => {
        const newAccounts = prev.accounts.filter(a => a.id !== id);
        const newLog = {
          id: generateId(),
          action: 'Account Deleted',
          details: `Removed ledger account: ${accountToDelete.name}`,
          timestamp: Date.now(),
          user: prev.settings.currentUser.name
        };
        return {
          ...prev,
          accounts: newAccounts,
          auditLogs: [newLog, ...prev.auditLogs]
        };
      });
    }
  };

  const closeModal = () => {
    setShowAddAccount(false);
    setEditingAccount(null);
    setFormData({ name: '', type: AccountType.ASSET, balance: 0 });
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance
    });
    setShowAddAccount(true);
  };

  const getAccountIcon = (name: string) => {
    const low = name.toLowerCase();
    if (low.includes('bank')) return <BankIcon size={14} className="text-blue-500"/>;
    if (low.includes('mobile')) return <Smartphone size={14} className="text-purple-500"/>;
    if (low.includes('cash')) return <Wallet size={14} className="text-emerald-500"/>;
    return <CircleDollarSign size={14} className="text-slate-500" />;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="flex items-center justify-between border-b pb-6 no-print">
         <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financial Intelligence</h1>
            <p className="text-slate-500 font-medium">Professional Profit & Loss and Chart of Accounts</p>
         </div>
         <div className="flex gap-3">
            <button 
              onClick={() => window.print()}
              className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-200 transition-all"
            >
              <Printer size={18} /> Print Statement
            </button>
            <button 
              onClick={() => setShowAddAccount(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> New Account
            </button>
         </div>
      </div>

      <div className="hidden print:block text-center border-b-2 border-black pb-8 mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter">{data.settings.businessName}</h1>
        <p className="text-sm font-bold text-slate-500">CONSOLIDATED FINANCIAL STATEMENT • {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-white p-10 rounded-[40px] border shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center gap-3 text-blue-600 print:text-black">
            <TrendingUp size={24} />
            <h2 className="text-xl font-black uppercase tracking-tight">Income Statement (P&L)</h2>
          </div>

          <div className="space-y-6">
             <div className="flex justify-between items-end border-b pb-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Gross Revenue</span>
                <span className="text-2xl font-black text-slate-900">{formatCurrency(financialStats.revenue, currency, rate)}</span>
             </div>
             <div className="flex justify-between items-end border-b pb-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Cost of Goods (COGS)</span>
                <span className="text-lg font-bold text-red-600">({formatCurrency(financialStats.cogs, currency, rate)})</span>
             </div>
             <div className="flex justify-between items-end bg-slate-50 p-4 rounded-2xl print:bg-transparent print:border-y print:rounded-none">
                <span className="text-sm font-black text-slate-800 uppercase">Gross Profit</span>
                <span className="text-2xl font-black text-blue-600 print:text-black">{formatCurrency(financialStats.grossProfit, currency, rate)}</span>
             </div>
             <div className="flex justify-between items-end border-b pb-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Total Expenses</span>
                <span className="text-lg font-bold text-red-600">({formatCurrency(financialStats.expenses, currency, rate)})</span>
             </div>
             <div className="flex justify-between items-end bg-slate-900 p-6 rounded-3xl text-white print:bg-black print:rounded-none">
                <span className="text-sm font-black uppercase tracking-widest">Net Profit</span>
                <span className="text-3xl font-black">{formatCurrency(financialStats.netProfit, currency, rate)}</span>
             </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
           <div className="flex items-center gap-3 text-slate-800">
            <Building2 size={24} />
            <h2 className="text-xl font-black uppercase tracking-tight">Financial Health</h2>
          </div>

          <div className="space-y-4">
             <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Liquid Accounts</p>
                <div className="space-y-3">
                   {financialStats.liquidAssets.map(a => (
                      <div 
                        key={a.id} 
                        className="w-full flex justify-between items-center text-sm p-2 rounded-xl border border-transparent"
                      >
                         <span className="flex items-center gap-2 font-bold">
                            {getAccountIcon(a.name)}
                            {a.name}
                         </span>
                         <span className="font-black text-slate-900">{formatCurrency(a.balance, currency, rate)}</span>
                      </div>
                   ))}
                </div>
                
                <div className="border-t border-slate-100 my-4 pt-4 space-y-3 px-2">
                   <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 font-bold"><Package size={14} className="text-slate-500"/> Inventory Value</span>
                      <span className="font-black">{formatCurrency(financialStats.inventoryValue, currency, rate)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 font-bold"><Users size={14} className="text-amber-500"/> Receivables</span>
                      <span className="font-black">{formatCurrency(financialStats.debtorsTotal, currency, rate)}</span>
                   </div>
                </div>

                <div className="flex justify-between items-end pt-4 border-t-2 border-slate-900 font-black">
                   <span className="text-slate-400 uppercase text-xs tracking-widest">Total Asset Value</span>
                   <span className="text-2xl text-slate-900">{formatCurrency(financialStats.totalAssets, currency, rate)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden no-print">
        <div className="p-8 border-b bg-slate-50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <PieChart className="text-slate-400" size={24} />
              <h2 className="text-xl font-black uppercase tracking-tight">Chart of Accounts</h2>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Details</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.accounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-4">
                    <p className="text-sm font-black text-slate-800">{a.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {a.id}</p>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-tight ${a.type === AccountType.ASSET ? 'bg-emerald-50 text-emerald-600' : a.type === AccountType.LIABILITY ? 'bg-rose-50 text-rose-600' : a.type === AccountType.OTHER_CURRENT_ASSET ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(a.balance, currency, rate)}</span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEdit(a)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit Account">
                         <Edit2 size={16} />
                       </button>
                       <button onClick={(e) => deleteAccount(e, a.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Account">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tight">{editingAccount ? 'Modify Ledger' : 'New Ledger Account'}</h3>
                <p className="opacity-75 font-medium text-xs">Configure your chart of accounts</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Account Name</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" placeholder="e.g. Shop Cash Account" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Classification</label>
                  <select className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as AccountType})}>
                    <option value={AccountType.ASSET}>Asset (Liquid/Cash)</option>
                    <option value={AccountType.OTHER_CURRENT_ASSET}>Other Current Asset</option>
                    <option value={AccountType.FIXED_ASSET}>Fixed Asset</option>
                    <option value={AccountType.EQUITY}>Equity</option>
                    <option value={AccountType.LIABILITY}>Liability (Expense / Debt)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Current Balance ({currency})</label>
                  <input type="number" className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-black text-xl" value={formData.balance || 0} onChange={e => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={closeModal} className="flex-1 py-4 font-black text-slate-400">Cancel</button>
                <button onClick={handleSaveAccount} className="flex-[2] py-4 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-900/10">
                   {editingAccount ? 'Update Ledger' : 'Create Ledger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;