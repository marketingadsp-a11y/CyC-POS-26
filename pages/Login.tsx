
import React, { useState } from 'react';
import { Delete, Lock, ShieldCheck, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { getUserByCode, updateUser } from '../services/dataService';

interface LoginProps {
  onLogin: (user: User) => void;
  logoUrl?: string;
  businessName?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, logoUrl, businessName }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePress = (num: string) => {
    if (code.length < 6) {
      setCode(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setCode(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleSubmit = async () => {
    if (code.length < 4) return;
    setLoading(true);
    
    // Simulate slight delay for feedback
    await new Promise(r => setTimeout(r, 600));

    // 1. Check Super Admin Hardcoded
    if (code === '012004') {
      onLogin({ 
        name: 'Cristobal', 
        code: '012004', 
        role: 'admin',
        permissions: {
            canAccessPOS: true,
            canViewReports: true,
            canManageSettings: true,
            canManageInventory: true,
            canManageUsers: true,
            canRefund: true,
            canDeleteCustomers: true,
            canManageExpenses: true,
            canApplyDiscounts: true
        }
      });
      return;
    }

    // 2. Fetch Fresh User from DB and set Session Token
    try {
        const foundUser = await getUserByCode(code);
        if (foundUser && foundUser.id) {
            const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await updateUser(foundUser.id, { sessionToken: newToken });
            onLogin({ ...foundUser, sessionToken: newToken });
        } else {
            setError(true);
            // Shake effect handled by state
            setTimeout(() => setCode(''), 300);
            setLoading(false);
        }
    } catch (e) {
        console.error(e);
        setError(true);
        setCode('');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/30 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -45, 0],
            opacity: [0.1, 0.25, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] bg-purple-600/25 rounded-full blur-[100px]"
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[400px] flex flex-col items-center"
      >
        {/* Hardware-like Card Container */}
        <div className="w-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl shadow-black/50">
          
          {/* Logo/Header */}
          <div className="flex flex-col items-center mb-10 text-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-20 h-20 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 rounded-[22px] mb-5 flex items-center justify-center shadow-xl shadow-indigo-500/20 overflow-hidden border border-white/20 p-1"
            >
               {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-[18px]" />
               ) : (
                  <div className="text-white flex flex-col items-center leading-none">
                     <span className="text-xs font-black uppercase tracking-[0.2em] mb-0.5 opacity-70">POS</span>
                     <span className="text-3xl font-black italic tracking-tighter">
                       {businessName ? businessName.substring(0, 3) : 'CyC'}
                     </span>
                  </div>
               )}
            </motion.div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">
              {businessName || 'SISTEMA POS'}
            </h1>
            <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Acceso Seguro</span>
            </div>
          </div>

          {/* Display & Indicator */}
          <div className="mb-10">
            <motion.div 
              animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-4 justify-center items-center h-12"
            >
              {[...Array(6)].map((_, i) => (
                 <motion.div 
                   key={i} 
                   animate={{ 
                     scale: i < code.length ? 1.2 : 1,
                     backgroundColor: i < code.length ? (error ? '#f43f5e' : '#6366f1') : '#1e293b'
                   }}
                   className={`w-3.5 h-3.5 rounded-full border border-white/5 shadow-inner ${
                     i < code.length ? (error ? 'shadow-[0_0_15px_#f43f5e]' : 'shadow-[0_0_20px_rgba(99,102,241,0.4)]') : ''
                   }`}
                 />
              ))}
            </motion.div>
            <p className={`text-center text-[11px] font-bold uppercase mt-2 tracking-widest transition-colors duration-300 ${error ? 'text-rose-500' : 'text-slate-500'}`}>
              {error ? 'Autenticación Fallida' : 'Ingrese su PIN de 6 dígitos'}
            </p>
          </div>

          {/* Digital Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.9, backgroundColor: 'rgba(99, 102, 241, 0.2)' }}
                onClick={() => handlePress(num.toString())}
                className="h-16 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/5 hover:border-white/20 transition-colors shadow-sm"
              >
                <span className="text-white text-2xl font-black">{num}</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter opacity-50">
                  {num === 2 ? 'abc' : num === 3 ? 'def' : num === 4 ? 'ghi' : num === 5 ? 'jkl' : num === 6 ? 'mno' : num === 7 ? 'pqrs' : num === 8 ? 'tuv' : num === 9 ? 'wxyz' : ''}
                </span>
              </motion.button>
            ))}
            <div className="h-16 flex items-center justify-center p-3">
               <Fingerprint className="w-8 h-8 text-slate-700 opacity-20" />
            </div>
            <motion.button
              whileTap={{ scale: 0.9, backgroundColor: 'rgba(99, 102, 241, 0.2)' }}
              onClick={() => handlePress("0")}
              className="h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 hover:border-white/20 transition-colors text-white text-2xl font-black"
            >
              0
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9, backgroundColor: 'rgba(244, 63, 94, 0.2)' }}
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 hover:border-rose-500/40 transition-colors text-rose-500"
            >
              <Delete className="w-7 h-7" />
            </motion.button>
          </div>

          {/* Action Area */}
          <div className="relative group">
            <motion.button 
              disabled={code.length < 4 || loading}
              onClick={handleSubmit}
              whileHover={code.length >= 4 ? { scale: 1.02 } : {}}
              whileTap={code.length >= 4 ? { scale: 0.98 } : {}}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${
                loading 
                ? 'bg-slate-800 text-slate-400 cursor-wait' 
                : code.length < 4 
                  ? 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-indigo-900/30 ring-2 ring-indigo-400/20 cursor-pointer'
              }`}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
                    <span>Validando...</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="normal"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Iniciar Sistema</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            
            {/* Visual glow on hover */}
            {code.length >= 4 && !loading && (
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition pointer-events-none -z-10" />
            )}
          </div>
        </div>

        {/* Footer Credit */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity"
        >
          <div className="flex items-center gap-8 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
            <span>Build 2026.05.03</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            <span>Server Online</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
