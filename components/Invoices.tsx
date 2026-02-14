
import React, { useState } from 'react';
import { AppData, Currency, Transaction, PaymentMethod } from '../types';
import { formatCurrency, generateId } from '../lib/utils';
import { Search, FileText, Printer, Trash2, X, AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Invoices: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  
  const rate = data.settings.exchangeRate;

  const getCustomerName = (tx: Transaction) => {
    if (!tx.customerId) return 'Walk-in Customer';
    return data.customers.find(c => c.id === tx.customerId)?.name || 'Walk-in Customer';
  };

  const filteredTx = data.transactions.filter(t => {
    const customerName = getCustomerName(t);
    return t.id.toLowerCase().includes(search.toLowerCase()) || 
           customerName.toLowerCase().includes(search.toLowerCase());
  }).reverse();

  const exportInvoicesToExcel = () => {
    const headers = ['Invoice ID', 'Date', 'Customer', 'Payment Method', 'Subtotal', 'Tax', 'Total', 'Items Count'];
    const rows = data.transactions.map(t => [
      `"INV-${t.id.slice(-5).toUpperCase()}"`,
      `"${new Date(t.timestamp).toLocaleDateString()}"`,
      `"${getCustomerName(t).replace(/"/g, '""')}"`,
      `"${t.paymentMethod}"`,
      t.subtotal,
      t.tax,
      t.total,
      t.items.length
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('Export Invoices', 'Exported full sales ledger to Excel');
  };

  const handleDeleteInvoice = () => {
    if (!selectedTx) return;
    if (!confirm(`⚠️ WARNING: You are about to DELETE Invoice #INV-${selectedTx.id.slice(-5).toUpperCase()}.\n\nThis will:\n1. Revert product stock\n2. Deduct money from accounts\n3. Revert customer debt\n\nAre you sure?`)) return;

    setData(prev => {
      // 1. Revert Stock
      const newProducts = prev.products.map(p => {
        const soldItem = selectedTx.items.find(item => item.id === p.id);
        return soldItem ? { ...p, stock: p.stock + soldItem.quantity } : p;
      });

      // 2. Revert Financials (Account Balance)
      const newAccounts = prev.accounts.map(a => {
        if (selectedTx.accountId && a.id === selectedTx.accountId) {
          const received = selectedTx.paymentMethod === PaymentMethod.PARTIAL && selectedTx.paymentDetails
            ? (selectedTx.paymentDetails.cash + selectedTx.paymentDetails.bank + selectedTx.paymentDetails.mobile)
            : (selectedTx.paymentMethod === PaymentMethod.DEBT ? 0 : selectedTx.total);
          
          return { ...a, balance: Math.max(0, a.balance - received) };
        }
        return a;
      });

      // 3. Revert Customer Debt/Points
      const newCustomers = prev.customers.map(c => {
        if (selectedTx.customerId && c.id === selectedTx.customerId) {
          const debtToRevert = selectedTx.paymentMethod === PaymentMethod.DEBT 
            ? selectedTx.total 
            : (selectedTx.paymentMethod === PaymentMethod.PARTIAL && selectedTx.paymentDetails ? selectedTx.paymentDetails.debt : 0);
          
          return {
            ...c,
            debtBalance: Math.max(0, c.debtBalance - debtToRevert),
            loyaltyPoints: Math.max(0, c.loyaltyPoints - Math.floor(selectedTx.total)),
            history: c.history.filter(id => id !== selectedTx.id)
          };
        }
        return c;
      });

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== selectedTx.id),
        products: newProducts,
        accounts: newAccounts,
        customers: newCustomers
      };
    });

    addLog('Invoice Deleted', `Invoice #INV-${selectedTx.id.slice(-5).toUpperCase()} was deleted and its impacts reverted.`);
    setSelectedTx(null);
    alert("Invoice deleted and system balances restored.");
  };

  return (
    <div className="flex h-full no-print">
      {/* List */}
      <div className="w-1/3 border-r bg-white overflow-y-auto">
        <div className="p-6 sticky top-0 bg-white border-b z-10 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={exportInvoicesToExcel}
            className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
          >
            <FileSpreadsheet size={14} /> Export All to Excel
          </button>
        </div>
        
        <div className="divide-y">
          {filteredTx.map(t => (
            <button 
              key={t.id} 
              onClick={() => setSelectedTx(t)}
              className={`w-full p-6 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group ${selectedTx?.id === t.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''}`}
            >
              <div>
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" />
                  INV-{t.id.slice(-5).toUpperCase()}
                </p>
                <p className="text-xs text-slate-500">{new Date(t.timestamp).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-600">{formatCurrency(t.total, currency, rate)}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">{t.paymentMethod}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-slate-50 overflow-y-auto p-12">
        {selectedTx ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center no-print">
              <button 
                onClick={handleDeleteInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-all border border-rose-100"
              >
                <Trash2 size={16} /> Delete Invoice
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all">
                <Printer size={18} /> Print Invoice
              </button>
            </div>

            {/* Actual Invoice Body */}
            <div className="bg-white p-12 rounded-2xl shadow-xl border print:shadow-none print:border-none print:p-0" id="invoice-content">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{data.settings.businessName}</h1>
                  <p className="text-sm text-slate-500 mt-1 font-bold">PROFESSIONAL SALES INVOICE</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-900">INV-{selectedTx.id.slice(-5).toUpperCase()}</h2>
                  <p className="text-xs text-slate-500 font-bold">{new Date(selectedTx.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                  <p className="font-bold text-slate-900 text-lg">{getCustomerName(selectedTx)}</p>
                  <p className="text-sm text-slate-500">{selectedTx.customerId ? 'Registered Client' : 'Walk-in Client'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Info</p>
                  <p className="font-bold text-slate-900 uppercase">{selectedTx.paymentMethod}</p>
                  <p className="text-sm text-slate-500">Status: <span className="text-emerald-600 font-bold">PAID</span></p>
                </div>
              </div>

              <table className="w-full mb-12">
                <thead className="border-b-2 border-slate-900">
                  <tr>
                    <th className="py-4 text-left text-xs font-black uppercase tracking-wider text-slate-900">Description</th>
                    <th className="py-4 text-center text-xs font-black uppercase tracking-wider text-slate-900">Qty</th>
                    <th className="py-4 text-right text-xs font-black uppercase tracking-wider text-slate-900">Price</th>
                    <th className="py-4 text-right text-xs font-black uppercase tracking-wider text-slate-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedTx.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-4 font-bold text-slate-800">{item.name}</td>
                      <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-4 text-right text-slate-600">{formatCurrency(item.sellPrice, currency, rate)}</td>
                      <td className="py-4 text-right font-bold text-slate-900">{formatCurrency(item.sellPrice * item.quantity, currency, rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span className="font-bold">Subtotal</span>
                    <span>{formatCurrency(selectedTx.subtotal, currency, rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span className="font-bold">Tax ({selectedTx.tax / selectedTx.subtotal * 100}%)</span>
                    <span>{formatCurrency(selectedTx.tax, currency, rate)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-slate-900 pt-3 border-t-2 border-slate-900">
                    <span>Total</span>
                    <span>{formatCurrency(selectedTx.total, currency, rate)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-8 border-t text-center space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thank you for your business</p>
                <p className="text-[10px] text-slate-300">Generated by ERP Master v2.0 • No signature required</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <FileText size={80} className="mb-4 opacity-10" />
            <p className="font-bold">Select an invoice to preview or manage</p>
          </div>
        )}
      </div>

      <div className="print-only fixed inset-0 bg-white p-0">
        {selectedTx && (
          <div className="w-full">
            <div className="border-b-4 border-black pb-4 mb-4">
              <h1 className="text-4xl font-black uppercase">{data.settings.businessName}</h1>
              <p>SALES INVOICE</p>
            </div>
            <p>ID: INV-{selectedTx.id.toUpperCase()}</p>
            <p>Date: {new Date(selectedTx.timestamp).toLocaleString()}</p>
            <p className="mt-4 font-bold underline">Customer: {getCustomerName(selectedTx)}</p>
            
            <table className="w-full mt-6 border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedTx.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-2">{item.name}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatCurrency(item.sellPrice * item.quantity, currency, rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-6 text-right">
              <p>Subtotal: {formatCurrency(selectedTx.subtotal, currency, rate)}</p>
              <p>Tax: {formatCurrency(selectedTx.tax, currency, rate)}</p>
              <p className="text-2xl font-black mt-2">Total: {formatCurrency(selectedTx.total, currency, rate)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;