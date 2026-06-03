import React, { useState, useEffect } from 'react';
import { Delete, ShieldCheck, AlertCircle, Check, Sparkles, Clock, Lock } from 'lucide-react';
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
  const [time, setTime] = useState(new Date());

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hours = time.getHours();
    if (hours < 12) return 'Buenos días';
    if (hours < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const formatClockTime = () => {
    return time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

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

  const clearCode = () => {
    setCode('');
    setError(false);
  };

  const handleSubmit = async (overrideCode?: string) => {
    const activeCode = overrideCode || code;
    if (activeCode.length < 4) return;
    setLoading(true);
    
    // Smooth transition delay to feel premium
    await new Promise(r => setTimeout(r, 450));

    // 1. Super Admin checking
    if (activeCode === '012004') {
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

    // 2. Fetch from database
    try {
        const foundUser = await getUserByCode(activeCode);
        if (foundUser && foundUser.id) {
            const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await updateUser(foundUser.id, { sessionToken: newToken });
            onLogin({ ...foundUser, sessionToken: newToken });
        } else {
            setError(true);
            setTimeout(() => setCode(''), 400);
            setLoading(false);
        }
    } catch (e) {
        console.error(e);
        setError(true);
        setCode('');
        setLoading(false);
    }
  };

  // Auto-submit when user reaches 6 digits
  useEffect(() => {
    if (code.length === 6) {
      handleSubmit(code);
    }
  }, [code]);

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-100 flex flex-col items-center justify-center p-3 select-none overflow-hidden bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/40">
      
      {/* Dynamic Ambient Background Flow */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 0.95, 1],
            x: [-20, 20, -10, -20],
            y: [-10, 15, -20, -10],
            opacity: [0.25, 0.35, 0.3, 0.25]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] left-[-5%] w-[450px] h-[450px] bg-indigo-200/40 rounded-full blur-[80px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1, 1],
            x: [20, -20, 10, 20],
            y: [10, -15, 20, 10],
            opacity: [0.2, 0.3, 0.25, 0.2]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[70px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.012)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
      </div>

      {/* Main Single Card Panel — Perfect scale for iPad screen height */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative z-10 w-full max-w-[420px] bg-white border border-white/60 rounded-[2.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.05),0_1px_2px_rgba(0,0,0,0.01)] overflow-hidden flex flex-col p-6 sm:p-7 backdrop-blur-xl"
      >
        
        {/* Top Header Row with clock & lock status */}
        <div className="flex justify-between items-center mb-5 text-slate-500 font-semibold">
          <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-100 py-1 px-2.5 rounded-full shadow-sm text-[8px] font-bold text-slate-600 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="uppercase">{businessName || 'SISTEMA'} SECURE</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-100 py-1 px-2.5 rounded-full text-[9px] text-slate-600 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatClockTime()}</span>
          </div>
        </div>

        {/* Identity block */}
        <div className="flex flex-col items-center text-center space-y-1 mb-4 h-auto">
          {logoUrl ? (
            <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-xl p-1 mb-1 shadow-sm flex items-center justify-center">
              <img src={logoUrl} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain rounded" />
            </div>
          ) : (
            <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mb-1">
              <Lock className="w-4 h-4 text-indigo-600" />
            </div>
          )}

          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-600">
            {getGreeting()}
          </span>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">
            {businessName || 'Control de Acceso'}
          </h2>
        </div>

        {/* PIN Indicators Section */}
        <div className="space-y-2 mb-4">
          <motion.div 
            animate={error ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex gap-3.5 justify-center items-center h-10"
          >
            {[...Array(6)].map((_, i) => {
              const isActive = i === code.length;
              const isFilled = i < code.length;
              return (
                <motion.div 
                  key={i} 
                  animate={{ 
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: error 
                      ? 'rgba(225, 29, 72, 0.95)' 
                      : isFilled 
                        ? 'rgba(79, 70, 229, 0.95)' 
                        : 'rgba(241, 245, 249, 1)',
                    borderColor: error
                      ? 'rgba(225, 29, 72, 0.4)'
                      : isActive 
                        ? 'rgba(79, 70, 229, 0.8)' 
                        : 'rgba(226, 232, 240, 1)'
                  }}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isFilled 
                      ? (error 
                          ? 'shadow-[0_0_10px_rgba(225,29,72,0.3)]' 
                          : 'shadow-[0_4px_10px_rgba(79,70,229,0.25)]') 
                      : (isActive ? 'shadow-[0_0_8px_rgba(79,70,229,0.12)]' : '')
                  }`}
                >
                  {isFilled && !error && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_1px_2.5px_rgba(0,0,0,0.1)]" />
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Dynamic feedback banner */}
          <div className="h-5 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-1.5 text-rose-600 font-bold"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[10px] uppercase tracking-wider">PIN INCORRECTO. INTENTE OTRA VEZ</span>
                </motion.div>
              ) : loading ? (
                <motion.div 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 text-indigo-600 font-bold"
                >
                  <div className="w-3 h-3 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-[10px] uppercase tracking-wider">INGRESANDO...</span>
                </motion.div>
              ) : (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  {code.length === 0 ? 'INGRESA PIN' : `${code.length} / 6 DÍGITOS`}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* iPad/Tablet optimized tactile Numpad keys (optimized to be wide but vertically space-saving) */}
        <div className="grid grid-cols-3 gap-3.5 w-full justify-items-center relative z-10 sm:gap-4 select-none mb-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.90 }}
              onClick={() => handlePress(num.toString())}
              disabled={loading}
              className="w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-slate-50 hover:bg-slate-100/90 active:bg-slate-200 border border-slate-200/80 flex items-center justify-center transition-all shadow-sm group"
            >
              <span className="text-slate-800 text-xl font-bold tracking-tight">
                {num}
              </span>
            </motion.button>
          ))}
          
          {/* Assist / Demo key */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={() => {
              clearCode();
              setCode('012004');
            }}
            disabled={loading}
            title="Clave Demo: 012004"
            className="w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-indigo-50/50 hover:bg-indigo-50 active:bg-indigo-100 border border-indigo-100/60 flex items-center justify-center transition-all text-indigo-500 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
          </motion.button>
          
          {/* 0 key */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={() => handlePress("0")}
            disabled={loading}
            className="w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-slate-50 hover:bg-slate-100/90 active:bg-slate-200 border border-slate-200/80 flex items-center justify-center transition-all shadow-sm text-slate-800 text-xl font-bold tracking-tight"
          >
            0
          </motion.button>
          
          {/* Delete key */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={handleBackspace}
            disabled={loading}
            className="w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-rose-50 hover:bg-rose-100 active:bg-rose-100/80 border border-rose-100/60 flex items-center justify-center transition-all text-rose-600 shadow-sm"
          >
            <Delete className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Manual submit trigger fallback if needed (compact design) */}
        {code.length >= 4 && code.length < 6 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 relative z-10"
          >
            <motion.button
              onClick={() => handleSubmit()}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] tracking-[0.15em] uppercase shadow-md flex items-center justify-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              <span>CONFIRMAR CLAVE</span>
            </motion.button>
          </motion.div>
        )}

        {/* Shield verification footer info inside card to keep everything grouped and fit height */}
        <div className="mt-4 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100/80 pt-3.5 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>CYC TERMINAL • ENLACE SEGURO</span>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
