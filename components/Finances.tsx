
import React, { useState } from 'react';
import { AppData, Currency, Expense, AccountType } from '../types';
import { Plus, Search, TrendingDown, DollarSign, Camera, FileText, Trash2, X, Wallet, Landmark, Smartphone } from 'lucide-react';
import { formatCurrency, compressImage, generateId } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Finances: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Partial<Expense>>({
    category: 'General',
    description: '',
    amount: 0,
    currency: currency,
    accountId: '',
    receipt: ''
  });

  const rate = data.settings.exchangeRate;

  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImage(file);
      setFormData({ ...formData, receipt: base64 });
    }
  };

  const saveExpense = () => {
    if (!formData.description || !formData.amount || !formData.accountId) {
      return alert("Description, Amount, and Funding Account are all required.");
    }

    const selectedAccount = data.accounts.find(a => a.id === formData.accountId);
    if (selectedAccount && selectedAccount.balance < (formData.amount || 0)) {
      if (!confirm(`Warning: The selected account (${selectedAccount.name}) has insufficient funds. Record anyway?`)) return;
    }

    const newExpense: Expense = {
      id: generateId(),
      category: formData.category || 'General',
      description: formData.description,
      amount: formData.amount,
      currency: formData.currency || currency,
      accountId: formData.accountId,
      timestamp: Date.now(),
      receipt: formData.receipt
    };

    setData(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      accounts: prev.accounts.map(a => 
        a.id === formData.accountId ? { ...a, balance: a.balance - (formData.amount || 0) } : a
      )
    }));

    addLog('Add Expense', `Recorded expense: ${formData.description}. Deducted ${formatCurrency(formData.amount || 0, currency, rate)} from ${selectedAccount?.name}`);
    setShowModal(false);
    setFormData({ category: 'General', description: '', amount: 0, currency: currency, accountId: '', receipt: '' });
  };

  const deleteExpense = (expense: Expense) => {
    if (confirm(`Delete expense record: ${expense.description}? This will REFUND the ${formatCurrency(expense.amount, currency, rate)} back to its original account.`)) {
      setData(prev => {
        const newExpenses = prev.expenses.filter(item => item.id !== expense.id);
        const newAccounts = prev.accounts.map(a => 
          a.id === expense.accountId ? { ...a, balance: a.balance + expense.amount } : a
        );
        
        const newLog = {
          id: generateId(),
          action: 'Delete Expense',
          details: `Removed expense: ${expense.description}. Refunded ${expense.amount} to account.`,
          timestamp: Date.now(),
          user: prev.settings.currentUser.name
        };
        
        return {
          ...prev,
          expenses: newExpenses,
          accounts: newAccounts,
          auditLogs: [newLog, ...prev.auditLogs]
        };
      });
    }
  };

  const filteredExpenses = data.expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const getAccountIcon = (accountId: string) => {
    const acc = data.accounts.find(a => a.id === accountId);
    if (!acc) return <Wallet size={12} />;
    const name = acc.name.toLowerCase();
    if (name.includes('bank')) return <Landmark size={12} className="text-blue-500"/>;
    if (name.includes('mobile')) return <Smartphone size={12} className="text-purple-500"/>;
    return <DollarSign size={12} className="text-emerald-500" />;
  };

  return (
    <div className="p-6 space-y-6 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search expenses..." 
            className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100">
             <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Total Period Expenses</p>
             <p className="text-xl font-black text-red-700">{formatCurrency(totalExpenses, currency, rate)}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg">
            <Plus size={20} /> Add Expense
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Paid From</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredExpenses.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 text-sm text-slate-500 font-medium">{new Date(e.timestamp).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shadow-sm">
                      <TrendingDown size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{e.description}</p>
                      {e.receipt && <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1 mt-0.5"><FileText size={10} /> Receipt Attached</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg">
                        {getAccountIcon(e.accountId)}
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {data.accounts.find(a => a.id === e.accountId)?.name || 'Unknown Account'}
                      </span>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-tight">
                    {e.category}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-red-600 text-right">
                  -{formatCurrency(e.amount, currency, rate)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={(ev) => { ev.stopPropagation(); deleteExpense(e); }} 
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group-hover:opacity-100"
                    title="Delete Record & Refund Account"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredExpenses.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center opacity-40">
            <DollarSign size={48} className="text-slate-200 mb-2" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No expense records found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Record Expense</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Office Rent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Amount ({currency})</label>
                  <input type="number" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Category</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="General">General</option>
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Salary">Salary</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                   <Wallet size={12} /> Funding Account (Money Source)
                </label>
                <select 
                  className="w-full px-5 py-4 bg-blue-50 border-none rounded-2xl outline-none font-bold text-blue-800 appearance-none"
                  value={formData.accountId}
                  onChange={e => setFormData({...formData, accountId: e.target.value})}
                >
                  <option value="">Select Account...</option>
                  {data.accounts.filter(a => a.type === AccountType.ASSET || a.type === AccountType.OTHER_CURRENT_ASSET).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, currency, rate)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Receipt Image</label>
                <div className="relative h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden group hover:border-blue-500 transition-all">
                  {formData.receipt ? <img src={formData.receipt} className="w-full h-full object-cover" /> : <>
                    <Camera size={24} className="text-slate-300 mb-2 group-hover:text-blue-500 transition-colors" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click to upload receipt</p>
                  </>}
                  <input type="file" accept="image/*" onChange={handleReceipt} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 font-black text-slate-400">Cancel</button>
              <button onClick={saveExpense} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finances;
