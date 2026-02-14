
import React, { useState } from 'react';
import { AppData, Supplier, Currency } from '../types';
import { Truck, Search, Phone, User, Plus, X, Trash2 } from 'lucide-react';
import { formatCurrency, generateId } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Suppliers: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact: '', phone: '' });

  const rate = data.settings.exchangeRate;

  const filtered = data.suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.phone.includes(search)
  );

  const saveSupplier = () => {
    if (!formData.name || !formData.phone) return;
    
    const newSupp: Supplier = {
      id: generateId(),
      name: formData.name,
      contact: formData.contact,
      phone: formData.phone,
      balance: 0
    };

    setData(prev => ({ ...prev, suppliers: [...prev.suppliers, newSupp] }));
    addLog('Add Supplier', `New supplier registered: ${formData.name}`);
    setShowModal(false);
    setFormData({ name: '', contact: '', phone: '' });
  };

  const deleteSupplier = (id: string, name: string) => {
    if (confirm(`Permanently remove supplier ${name}? This action cannot be undone.`)) {
      setData(prev => {
        const newSuppliers = prev.suppliers.filter(item => item.id !== id);
        const newLog = {
          id: generateId(),
          action: 'Delete Supplier',
          details: `Removed supplier: ${name}`,
          timestamp: Date.now(),
          user: prev.settings.currentUser.name
        };
        return {
          ...prev,
          suppliers: newSuppliers,
          auditLogs: [newLog, ...prev.auditLogs]
        };
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search suppliers..."
            className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none font-bold"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-3xl border shadow-sm p-6 space-y-4 hover:shadow-lg transition-all relative group">
            <button 
              onClick={(e) => { e.stopPropagation(); deleteSupplier(s.id, s.name); }} 
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Delete Supplier"
            >
              <Trash2 size={18} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck size={28} />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <h3 className="font-black text-slate-800 truncate">{s.name}</h3>
                <p className="text-xs text-slate-500 font-bold">{s.contact || 'Primary Contact'}</p>
              </div>
            </div>
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <Phone size={14} className="text-slate-400" /> {s.phone}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Owed</span>
                <span className={`font-black ${s.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(s.balance, currency, rate)}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center opacity-40">
             <Truck size={48} className="text-slate-300 mb-2" />
             <p className="font-bold text-slate-500 uppercase text-xs">No Suppliers Found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-8 space-y-6">
            <h3 className="text-2xl font-black text-slate-800">New Supplier</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Company Name</label>
                <input className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Global Supplies Ltd" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contact Person</label>
                <input className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="Full name" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phone</label>
                <input className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Mobile or landline" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
              <button onClick={saveSupplier} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
