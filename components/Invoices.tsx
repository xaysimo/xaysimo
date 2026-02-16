
import React, { useState } from 'react';
import { AppData, Currency, Transaction, PaymentMethod } from '../types';
import { formatCurrency, generateId } from '../lib/utils';
// Added Package to imports
import { Search, FileText, Printer, Trash2, X, AlertTriangle, FileSpreadsheet, Download, Package } from 'lucide-react';

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
    link.href = url;
    link.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog('Export Invoices', 'Exported full sales ledger to Excel');
  };

  const handleDeleteInvoice = () => {
    if (!selectedTx) return;
    if (!confirm(`⚠️ WARNING: Delete Invoice #INV-${selectedTx.id.slice(-5).toUpperCase()}? Financials and stock will be reverted.`)) return;

    setData(prev => {
      // Revert Stock
      const newProducts = prev.products.map(p => {
        const soldItem = selectedTx.items.find(item => item.id === p.id);
        return soldItem ? { ...p, stock: p.stock + soldItem.quantity } : p;
      });

      // Revert Financials
      const newAccounts = prev.accounts.map(a => {
        if (selectedTx.accountId && a.id === selectedTx.accountId) {
          const received = selectedTx.paymentMethod === PaymentMethod.PARTIAL && selectedTx.paymentDetails
            ? (selectedTx.paymentDetails.cash + selectedTx.paymentDetails.bank + selectedTx.paymentDetails.mobile)
            : (selectedTx.paymentMethod === PaymentMethod.DEBT ? 0 : selectedTx.total);
          
          return { ...a, balance: Math.max(0, a.balance - received) };
        }
        return a;
      });

      // Revert Customer
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

    addLog('Invoice Deleted', `Invoice #INV-${selectedTx.id.slice(-5).toUpperCase()} deleted.`);
    setSelectedTx(null);
  };

  return (
    <div className="flex h-full bg-slate-50 no-print">
      {/* Sidebar List */}
      <div className="w-1/3 border-r bg-white overflow-y-auto">
        <div className="p-6 sticky top-0 bg-white border-b z-10 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search ID or Customer..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={exportInvoicesToExcel}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
          >
            <Download size={14} /> Export Sales Ledger
          </button>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredTx.map(t => (
            <button 
              key={t.id} 
              onClick={() => setSelectedTx(t)}
              className={`w-full p-6 text-left hover:bg-slate-50 transition-all flex items-center justify-between group ${selectedTx?.id === t.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''}`}
            >
              <div>
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" />
                  INV-{t.id.slice(-5).toUpperCase()}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(t.timestamp).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-blue-600">{formatCurrency(t.total, currency, rate)}</p>
                <p className="text-[8px] uppercase font-black text-slate-400 mt-1">{t.paymentMethod}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Viewer */}
      <div className="flex-1 overflow-y-auto p-12">
        {selectedTx ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center no-print">
              <button 
                onClick={handleDeleteInvoice}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100 transition-all border border-rose-100 uppercase"
              >
                <Trash2 size={16} /> Delete Record
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all">
                <Printer size={18} /> Print Invoice
              </button>
            </div>

            {/* Invoice Print Layout */}
            <div className="bg-white p-12 rounded-[40px] shadow-2xl border print:shadow-none print:border-none print:p-0">
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{data.settings.businessName}</h1>
                  <p className="text-xs font-black text-slate-500 mt-2 uppercase tracking-[0.2em]">Official Sales Receipt</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-900">INV-{selectedTx.id.slice(-5).toUpperCase()}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(selectedTx.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer Info</p>
                  <p className="font-black text-slate-900 text-xl">{getCustomerName(selectedTx)}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Attributed Account</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Details</p>
                  <p className="font-black text-slate-900 uppercase text-lg">{selectedTx.paymentMethod}</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">Status: Confirmed Paid</p>
                </div>
              </div>

              <table className="w-full mb-12">
                <thead className="border-b-2 border-slate-900">
                  <tr>
                    <th className="py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-900">Description</th>
                    <th className="py-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-900">Qty</th>
                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-900">Unit Price</th>
                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-900">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTx.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-5">
                         <p className="font-black text-slate-800">{item.name}</p>
                         <p className="text-[9px] text-slate-400 font-bold uppercase">{item.sku}</p>
                      </td>
                      <td className="py-5 text-center font-bold text-slate-600">{item.quantity}</td>
                      <td className="py-5 text-right font-medium text-slate-500">{formatCurrency(item.sellPrice, currency, rate)}</td>
                      <td className="py-5 text-right font-black text-slate-900">{formatCurrency(item.sellPrice * item.quantity, currency, rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-8 border-t-2 border-slate-100">
                <div className="w-72 space-y-4">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span className="uppercase tracking-widest">Subtotal</span>
                    <span>{formatCurrency(selectedTx.subtotal, currency, rate)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span className="uppercase tracking-widest">Tax (VAT 0%)</span>
                    <span>{formatCurrency(selectedTx.tax, currency, rate)}</span>
                  </div>
                  <div className="flex justify-between text-3xl font-black text-slate-900 pt-6 border-t-4 border-slate-900">
                    <span className="tracking-tighter uppercase">Total</span>
                    <span>{formatCurrency(selectedTx.total, currency, rate)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-20 text-center space-y-3">
                <div className="flex items-center justify-center gap-4 text-slate-200">
                   <div className="h-px w-12 bg-current" />
                   {/* Package component is now imported correctly */}
                   <Package size={20} />
                   <div className="h-px w-12 bg-current" />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Thank you for shopping at {data.settings.businessName}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-20">
            <FileText size={120} className="mb-4" />
            <p className="font-black text-xl uppercase tracking-widest">Select Invoice to View</p>
          </div>
        )}
      </div>

      {/* Hidden Print-Only View for browser printing */}
      <div className="print-only fixed inset-0 bg-white p-0">
        {selectedTx && (
          <div className="w-full">
            <div className="border-b-4 border-black pb-4 mb-4">
              <h1 className="text-4xl font-black uppercase">{data.settings.businessName}</h1>
              <p className="text-sm font-bold">SALES RECEIPT</p>
            </div>
            <div className="flex justify-between font-bold text-sm">
               <span>ID: INV-{selectedTx.id.toUpperCase()}</span>
               <span>Date: {new Date(selectedTx.timestamp).toLocaleString()}</span>
            </div>
            <p className="mt-4 font-black">Customer: {getCustomerName(selectedTx)}</p>
            
            <table className="w-full mt-6 border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-xs font-black uppercase">
                  <th className="text-left py-2">Item</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {selectedTx.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 font-bold">{item.name}</td>
                    <td className="text-center py-3">{item.quantity}</td>
                    <td className="text-right py-3">{formatCurrency(item.sellPrice, currency, rate)}</td>
                    <td className="text-right py-3 font-black">{formatCurrency(item.sellPrice * item.quantity, currency, rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-10 text-right space-y-1">
              <p className="text-xs font-bold">Subtotal: {formatCurrency(selectedTx.subtotal, currency, rate)}</p>
              <p className="text-xs font-bold">Tax: {formatCurrency(selectedTx.tax, currency, rate)}</p>
              <div className="text-3xl font-black mt-4 pt-4 border-t-2 border-black">
                 Total: {formatCurrency(selectedTx.total, currency, rate)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
