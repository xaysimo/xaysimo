
import React, { useState } from 'react';
import { AppData, UserRole, UserProfile } from '../types';
import { ShieldCheck, UserPlus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { generateId } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
}

const Roles: React.FC<Props> = ({ data, setData, addLog }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: UserRole.CASHIER });

  const saveUser = () => {
    if (!formData.name) return;
    
    const newUser: UserProfile = {
      id: generateId(),
      name: formData.name,
      role: formData.role,
      isActive: true
    };

    setData(prev => ({ ...prev, users: [...prev.users, newUser] }));
    addLog('User Created', `New system user added: ${formData.name} as ${formData.role}`);
    setShowModal(false);
    setFormData({ name: '', role: UserRole.CASHIER });
  };

  const deleteUser = (id: string, name: string, role: UserRole) => {
    if (role === UserRole.ADMIN) return alert("Cannot delete an Administrator account.");
    
    if (confirm(`Are you sure you want to permanently remove access for ${name}?`)) {
      setData(prev => {
        const newUsers = prev.users.filter(u => u.id !== id);
        const newLog = {
          id: generateId(),
          action: 'User Deleted',
          details: `Removed access for: ${name} (${role})`,
          timestamp: Date.now(),
          user: prev.settings.currentUser.name
        };
        return {
          ...prev,
          users: newUsers,
          auditLogs: [newLog, ...prev.auditLogs]
        };
      });
    }
  };

  const switchRole = (userId: string) => {
    const user = data.users.find(u => u.id === userId);
    if (!user) return;
    
    setData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        currentUser: { name: user.name, role: user.role }
      }
    }));
    addLog('Login Simulation', `Switched session to: ${user.name}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 no-print">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">Access Control</h1>
           <p className="text-slate-500 font-medium">Manage system users and functional permissions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg">
          <UserPlus size={20} /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-lg transition-all group relative">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${user.role === UserRole.ADMIN ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <ShieldCheck size={24} />
                   </div>
                   <div>
                      <h3 className="font-black text-slate-900">{user.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
                   </div>
                </div>
                <div className="flex gap-2 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => switchRole(user.id)} 
                     className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-tight"
                   >
                     Login Simulation
                   </button>
                   {user.role !== UserRole.ADMIN && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); deleteUser(user.id, user.name, user.role); }} 
                       className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                       title="Delete User"
                     >
                        <Trash2 size={18} />
                     </button>
                   )}
                </div>
             </div>
             
             <div className="bg-slate-50 p-4 rounded-2xl border flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Account Status</span>
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   ACTIVE
                </span>
             </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-800">New System User</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Display Name</label>
                  <input className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Access Role</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                     <option value={UserRole.ADMIN}>Admin (Full Access)</option>
                     <option value={UserRole.MANAGER}>Manager (Staff Mgmt)</option>
                     <option value={UserRole.CASHIER}>Cashier (Sales Only)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                <button onClick={saveUser} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">Save User</button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 flex items-start gap-6 shadow-sm">
         <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex-shrink-0 flex items-center justify-center">
            <ShieldAlert size={24} />
         </div>
         <div className="space-y-2">
            <h4 className="font-black text-amber-800 uppercase text-sm tracking-tight">Permission Security Notice</h4>
            <p className="text-sm text-amber-700/80 leading-relaxed font-medium">
               Role restrictions are enforced at the application layer. Switching users simulates a new session with specific tab access. Ensure critical business data is only accessible to Trusted Managers and Admins.
            </p>
         </div>
      </div>
    </div>
  );
};

export default Roles;
