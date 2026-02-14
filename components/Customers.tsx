
import React, { useState } from 'react';
import { AppData, Customer, Currency } from '../types';
import { UserPlus, Search, Phone, Star, TrendingUp, History, X, Trash2 } from 'lucide-react';
import { formatCurrency, compressImage } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Customers: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', photo: '' });

  const rate = data.settings.exchangeRate;

  const filtered = data.customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const saveCustomer = () => {
    if (!formData.name || !formData.phone) return;
    const existing = data.customers.find(c => c.phone === formData.phone);
    if (existing) return alert("Phone number already registered");

    const newCust: Customer = {
      id: formData.phone,
      name: formData.name,
      phone: formData.phone,
      photo: formData.photo,
      debtBalance: 0,
      loyaltyPoints: 0,
      history: []
    };

    setData(prev => ({ ...prev, customers: [...prev.customers, newCust] }));
    addLog('Add Customer', `New client registered: ${formData.name}`);
    setShowModal(false);
    setFormData({ name: '', phone: '', photo: '' });
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (!confirm(`Permanently delete customer ${name}? All their order history will be removed from this view.`)) return;
    
    setData(prev => ({
      ...prev,
      customers: prev.customers.filter(c => c.id !== id)
    }));
    
    addLog('Customer Deleted', `Customer profile for ${name} was permanently removed.`);
    setSelectedCustomer(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or phone..."
            className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2"
        >
          <UserPlus size={20} /> Register Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-3xl border shadow-sm p-6 space-y-6 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(c)}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
                {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xl">{c.name.charAt(0)}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 truncate">{c.name}</h3>
                <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                  <Phone size={10} /> {c.phone}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Loyalty</p>
                <div className="flex items-center justify-center gap-1 text-blue-700 font-black">
                  <Star size={12} /> {c.loyaltyPoints}
                </div>
              </div>
              <div className={`p-3 rounded-2xl text-center ${c.debtBalance > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                <p className="text-[10px] font-black uppercase mb-1">Debt</p>
                <p className="text-xs font-black">{formatCurrency(c.debtBalance, currency, rate)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-8 space-y-6">
            <h3 className="text-2xl font-black text-slate-800">New Client</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Name</label>
                <input 
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phone</label>
                <input 
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
              <button onClick={saveCustomer} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black">Register</button>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 overflow-hidden border border-white/20">
                  {selectedCustomer.photo ? <img src={selectedCustomer.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">{selectedCustomer.name.charAt(0)}</div>}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{selectedCustomer.name}</h3>
                  <p className="opacity-75 font-bold text-sm">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                   className="p-3 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white rounded-xl transition-all mr-2"
                   title="Delete Customer Profile"
                 >
                   <Trash2 size={20} />
                 </button>
                 <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-3 gap-4">
              <div className="bg-slate-50 p-6 rounded-3xl text-center border">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                <p className="text-2xl font-black text-slate-900">{selectedCustomer.history.length}</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-3xl text-center border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Loyalty Points</p>
                <p className="text-2xl font-black text-blue-900">{selectedCustomer.loyaltyPoints}</p>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl text-center border border-amber-100">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Balance Due</p>
                <p className="text-xl font-black text-amber-900 truncate">{formatCurrency(selectedCustomer.debtBalance, currency, rate)}</p>
              </div>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                <History size={14} /> Recent Transactions
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {selectedCustomer.history.length > 0 ? [...selectedCustomer.history].reverse().map(id => {
                  const tx = data.transactions.find(t => t.id === id);
                  if (!tx) return null;
                  return (
                    <div key={id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border hover:bg-white hover:shadow-sm transition-all">
                      <div>
                        <p className="text-sm font-black text-slate-800">#INV-{id.slice(-5).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{new Date(tx.timestamp).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-600">{formatCurrency(tx.total, currency, rate)}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{tx.paymentMethod}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center py-10 text-slate-300 font-bold italic">No transaction history found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
