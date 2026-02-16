
import React, { useMemo, useState } from 'react';
import { AppData, Currency, AccountType, Account } from '../types';
import { formatCurrency, generateId } from '../lib/utils';
import { TrendingUp, Building2, Wallet, Package, Users, History, FileText, Plus, Landmark, PieChart, X, Edit2, Trash2, Smartphone, Landmark as BankIcon, CircleDollarSign, ChevronRight, Printer, Scale, CheckCircle2, AlertTriangle, Briefcase } from 'lucide-react';

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
    // 1. INCOME STATEMENT CALCULATIONS
    const revenue = data.transactions.reduce((acc, t) => acc + t.total, 0);
    const cogs = data.transactions.reduce((acc, t) => {
      return acc + t.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    }, 0);
    const expenses = data.expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = (revenue - cogs) - expenses;

    // 2. BALANCE SHEET: ASSETS
    // Current Assets
    const cashAndBankAccounts = data.accounts.filter(a => a.type === AccountType.ASSET);
    const cashAndBankTotal = cashAndBankAccounts.reduce((acc, a) => acc + a.balance, 0);
    
    const otherCurrentAssetsAccounts = data.accounts.filter(a => a.type === AccountType.OTHER_CURRENT_ASSET);
    const otherCurrentAssetsTotal = otherCurrentAssetsAccounts.reduce((acc, a) => acc + a.balance, 0);
    
    const inventoryValue = data.products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
    const accountsReceivable = data.customers.reduce((acc, c) => acc + c.debtBalance, 0);
    
    const totalCurrentAssets = cashAndBankTotal + otherCurrentAssetsTotal + inventoryValue + accountsReceivable;

    // Fixed Assets
    const fixedAssetsAccounts = data.accounts.filter(a => a.type === AccountType.FIXED_ASSET);
    const totalFixedAssets = fixedAssetsAccounts.reduce((acc, a) => acc + a.balance, 0);

    const totalAssets = totalCurrentAssets + totalFixedAssets;

    // 3. BALANCE SHEET: LIABILITIES
    const accountsPayable = data.suppliers.reduce((acc, s) => acc + s.balance, 0);
    const otherLiabilitiesAccounts = data.accounts.filter(a => a.type === AccountType.LIABILITY);
    const otherLiabilitiesTotal = otherLiabilitiesAccounts.reduce((acc, a) => acc + a.balance, 0);
    
    const totalLiabilities = accountsPayable + otherLiabilitiesTotal;

    // 4. BALANCE SHEET: EQUITY
    const equityAccounts = data.accounts.filter(a => a.type === AccountType.EQUITY);
    const paidInCapital = equityAccounts.reduce((acc, a) => acc + a.balance, 0);
    const retainedEarnings = netProfit; // Current period profit acts as retained earnings
    
    const totalEquity = paidInCapital + retainedEarnings;

    // 5. THE BALANCING ACT
    const balanceDiscrepancy = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    const isBalanced = balanceDiscrepancy < 0.01;

    return {
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      expenses,
      netProfit,
      cashAndBankAccounts,
      cashAndBankTotal,
      otherCurrentAssetsAccounts,
      otherCurrentAssetsTotal,
      inventoryValue,
      accountsReceivable,
      totalCurrentAssets,
      fixedAssetsAccounts,
      totalFixedAssets,
      totalAssets,
      accountsPayable,
      otherLiabilitiesTotal,
      totalLiabilities,
      paidInCapital,
      retainedEarnings,
      totalEquity,
      isBalanced,
      balanceDiscrepancy
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
      setData(prev => ({
        ...prev,
        accounts: prev.accounts.filter(a => a.id !== id)
      }));
      addLog('Account Deleted', `Removed ledger account: ${accountToDelete.name}`);
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
    <div className="p-8 max-w-6xl mx-auto space-y-12 pb-24">
      <div className="flex items-center justify-between border-b pb-6 no-print">
         <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financial Intelligence</h1>
            <p className="text-slate-500 font-medium">Standard Income Statement & Balance Sheet</p>
         </div>
         <div className="flex gap-3">
            <button 
              onClick={() => window.print()}
              className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-200 transition-all"
            >
              <Printer size={18} /> Print Reports
            </button>
            <button 
              onClick={() => setShowAddAccount(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> New Ledger Account
            </button>
         </div>
      </div>

      <div className="hidden print:block text-center border-b-2 border-black pb-8 mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter">{data.settings.businessName}</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Financial Performance Report • {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* SECTION 1: INCOME STATEMENT */}
        <div className="bg-white p-10 rounded-[40px] border shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center gap-3 text-blue-600 print:text-black">
            <TrendingUp size={24} />
            <h2 className="text-xl font-black uppercase tracking-tight">Income Statement</h2>
          </div>

          <div className="space-y-6">
             <div className="flex justify-between items-end border-b pb-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Gross Revenue (Sales)</span>
                <span className="text-2xl font-black text-slate-900">{formatCurrency(financialStats.revenue, currency, rate)}</span>
             </div>
             <div className="flex justify-between items-end border-b pb-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Cost of Goods Sold (COGS)</span>
                <span className="text-lg font-bold text-red-600">({formatCurrency(financialStats.cogs, currency, rate)})</span>
             </div>
             <div className="flex justify-between items-end bg-slate-50 p-4 rounded-2xl print:bg-transparent print:border-y print:rounded-none">
                <span className="text-sm font-black text-slate-800 uppercase">Gross Profit</span>
                <span className="text-2xl font-black text-blue-600 print:text-black">{formatCurrency(financialStats.grossProfit, currency, rate)}</span>
             </div>
             <div className="flex justify-between items-end border-b pb-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Operating Expenses</span>
                <span className="text-lg font-bold text-red-600">({formatCurrency(financialStats.expenses, currency, rate)})</span>
             </div>
             <div className="flex justify-between items-end bg-slate-900 p-6 rounded-3xl text-white print:bg-black print:rounded-none">
                <span className="text-sm font-black uppercase tracking-widest">Net Profit / Loss</span>
                <span className="text-3xl font-black">{formatCurrency(financialStats.netProfit, currency, rate)}</span>
             </div>
          </div>
        </div>

        {/* SECTION 2: BALANCE SHEET */}
        <div className="bg-white p-10 rounded-[40px] border shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-800">
                <Scale size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight">Balance Sheet</h2>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${financialStats.isBalanced ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                 {financialStats.isBalanced ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                 {financialStats.isBalanced ? 'Balanced' : 'Imbalance Detected'}
              </div>
           </div>

          <div className="space-y-8">
             {/* ASSETS SECTION */}
             <div className="space-y-4">
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Assets</p>
                
                {/* Current Assets */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase ml-2">Current Assets</p>
                  <div className="space-y-1.5 pl-4">
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                       <span>Cash & Equivalents</span>
                       <span>{formatCurrency(financialStats.cashAndBankTotal, currency, rate)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                       <span>Accounts Receivable</span>
                       <span>{formatCurrency(financialStats.accountsReceivable, currency, rate)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                       <span>Inventory Asset</span>
                       <span>{formatCurrency(financialStats.inventoryValue, currency, rate)}</span>
                    </div>
                    {financialStats.otherCurrentAssetsTotal > 0 && (
                      <div className="flex justify-between text-sm font-bold text-slate-600">
                        <span>Other Current Assets</span>
                        <span>{formatCurrency(financialStats.otherCurrentAssetsTotal, currency, rate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-800 pt-1 border-t border-slate-100">
                       <span className="italic">Total Current Assets</span>
                       <span>{formatCurrency(financialStats.totalCurrentAssets, currency, rate)}</span>
                    </div>
                  </div>
                </div>

                {/* Fixed Assets */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase ml-2">Fixed Assets</p>
                  <div className="space-y-1.5 pl-4">
                    {financialStats.fixedAssetsAccounts.length > 0 ? (
                      financialStats.fixedAssetsAccounts.map(a => (
                        <div key={a.id} className="flex justify-between text-sm font-bold text-slate-600">
                           <span>{a.name}</span>
                           <span>{formatCurrency(a.balance, currency, rate)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between text-sm font-bold text-slate-400 italic">
                        <span>No fixed assets recorded</span>
                        <span>{formatCurrency(0, currency, rate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-800 pt-1 border-t border-slate-100">
                       <span className="italic">Total Fixed Assets</span>
                       <span>{formatCurrency(financialStats.totalFixedAssets, currency, rate)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl print:bg-transparent print:border-y-2 print:border-black print:rounded-none mt-2">
                   <span className="text-sm font-black uppercase">Total Assets</span>
                   <span className="text-2xl font-black border-b-4 border-double border-slate-900">{formatCurrency(financialStats.totalAssets, currency, rate)}</span>
                </div>
             </div>

             {/* LIABILITIES & EQUITY SECTION */}
             <div className="space-y-4">
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Liabilities & Equity</p>
                
                {/* Liabilities */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase ml-2">Liabilities</p>
                  <div className="space-y-1.5 pl-4">
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                       <span>Accounts Payable (Suppliers)</span>
                       <span>{formatCurrency(financialStats.accountsPayable, currency, rate)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                       <span>Other Liabilities</span>
                       <span>{formatCurrency(financialStats.otherLiabilitiesTotal, currency, rate)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-800 pt-1 border-t border-slate-100">
                       <span className="italic">Total Liabilities</span>
                       <span>{formatCurrency(financialStats.totalLiabilities, currency, rate)}</span>
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase ml-2">Equity</p>
                  <div className="space-y-1.5 pl-4">
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                       <span>Paid-in Capital</span>
                       <span>{formatCurrency(financialStats.paidInCapital, currency, rate)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                       <span>Retained Earnings (Net Profit)</span>
                       <span>{formatCurrency(financialStats.retainedEarnings, currency, rate)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-800 pt-1 border-t border-slate-100">
                       <span className="italic">Total Equity</span>
                       <span>{formatCurrency(financialStats.totalEquity, currency, rate)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100 print:bg-transparent print:border-y-2 print:border-black print:rounded-none">
                   <span className="text-sm font-black uppercase">Total Liabilities & Equity</span>
                   <span className="text-2xl font-black border-b-4 border-double border-blue-600 print:border-black">{formatCurrency(financialStats.totalLiabilities + financialStats.totalEquity, currency, rate)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Chart of Accounts Table */}
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
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-tight ${a.type === AccountType.ASSET ? 'bg-emerald-50 text-emerald-600' : a.type === AccountType.LIABILITY ? 'bg-rose-50 text-rose-600' : a.type === AccountType.FIXED_ASSET ? 'bg-amber-50 text-amber-600' : a.type === AccountType.OTHER_CURRENT_ASSET ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(a.balance, currency, rate)}</span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEdit(a)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit">
                         <Edit2 size={16} />
                       </button>
                       <button onClick={(e) => deleteAccount(e, a.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete">
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
                <h3 className="text-2xl font-black tracking-tight">{editingAccount ? 'Edit Account' : 'New Account'}</h3>
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
                  <input type="text" className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" placeholder="e.g. Bank Account 1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Classification</label>
                  <select className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as AccountType})}>
                    <option value={AccountType.ASSET}>Current Asset (Cash/Bank)</option>
                    <option value={AccountType.OTHER_CURRENT_ASSET}>Other Current Asset</option>
                    <option value={AccountType.FIXED_ASSET}>Fixed Asset (Equipment/Machinery)</option>
                    <option value={AccountType.EQUITY}>Equity (Capital)</option>
                    <option value={AccountType.LIABILITY}>Liability</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Opening Balance ({currency})</label>
                  <input type="number" className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-black text-xl" value={formData.balance || 0} onChange={e => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={closeModal} className="flex-1 py-4 font-black text-slate-400">Cancel</button>
                <button onClick={handleSaveAccount} className="flex-[2] py-4 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-900/10">
                   {editingAccount ? 'Update Account' : 'Create Account'}
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
