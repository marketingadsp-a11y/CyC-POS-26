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

  const formatFullDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return time.toLocaleDateString('es-MX', options);
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
    await new Promise(r => setTimeout(r, 600));

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
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative overflow-hidden font-sans select-none bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/40">
      
      {/* Background aesthetic touches */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 0.95, 1.05, 1],
            x: [-30, 40, -20, 30, -30],
            y: [-20, 30, -40, 15, -20],
            opacity: [0.3, 0.45, 0.35, 0.5, 0.3]
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/50 via-violet-100/40 to-transparent rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1.2, 0.95, 1],
            x: [30, -30, 40, -15, 30],
            y: [15, -40, 30, -20, 15],
            opacity: [0.25, 0.4, 0.3, 0.45, 0.25]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-gradient-to-br from-indigo-100/40 via-sky-200/30 to-transparent rounded-full blur-[90px]"
        />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.015)_1px,transparent_1px)] bg-[size:40px_40px] opacity-70" />
      </div>

      {/* Main double-sided modern split panel */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className="relative z-10 w-full max-w-4xl bg-white/80 border border-white rounded-[2.5rem] shadow-[0_24px_60px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[660px] md:min-h-[700px] backdrop-blur-xl"
      >
        
        {/* LEFT COLUMN: Brand identity, time & status (Tablet / Desktop optimized, collapses elegantly) */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 p-12 flex-col justify-between text-white relative overflow-hidden">
          
          {/* Subtle cosmic abstract light leak built purely from CSS */}
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.2),transparent_70%)]" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Elegant Logo / Specular Window */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              className="w-16 h-16 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-center p-2 mb-8 shadow-inner"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <div className="text-white flex flex-col items-center leading-none">
                  <span className="text-[7px] font-black uppercase tracking-[0.2em] mb-1 text-indigo-300">CYC</span>
                  <span className="text-xl font-black tracking-tight">
                    {businessName ? businessName.substring(0, 3) : 'POS'}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Time & Greeting */}
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-indigo-300 backdrop-blur-sm border border-white/5">
                {getGreeting()}
              </span>
              <h1 className="text-5xl font-extrabold tracking-tight font-sans text-white/95 leading-none">
                {businessName || 'Control de Acceso'}
              </h1>
              <p className="text-slate-400 text-sm font-medium tracking-wide">
                Por favor, ingrese su clave de personal de 6 dígitos en el teclado para iniciar su sesión de trabajo.
              </p>
            </div>
          </div>

          {/* Large Clock Display */}
          <div className="relative z-10 space-y-2 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
              <Clock className="w-4 h-4" />
              <span>Hora del sistema</span>
            </div>
            <div className="text-4xl font-extrabold tracking-tighter font-mono text-white">
              {formatClockTime()}
            </div>
            <div className="text-xs font-semibold text-slate-400 capitalize">
              {formatFullDate()}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Large touch numpad login form (Universal & optimized for iPad touch targets!) */}
        <div className="col-span-12 md:col-span-7 p-8 sm:p-12 md:p-14 flex flex-col justify-between items-center bg-white/30 backdrop-blur-md rounded-r-[2.5rem]">
          
          {/* Header Mobile Info (Only visible on small layouts without left panel) */}
          <div className="w-full md:hidden flex justify-between items-center mb-6 text-slate-500">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 py-1.5 px-3.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-extrabold tracking-widest uppercase text-slate-600">
                {businessName || 'CyC POS'}
              </span>
            </div>
            <div className="text-right text-[10px] font-bold tracking-wider text-slate-600">
              {formatClockTime()}
            </div>
          </div>

          <div className="w-full max-w-sm flex flex-col items-center my-auto space-y-6 sm:space-y-8">
            {/* Title & Status */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Ingreso de Personal
              </h2>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                Clave de acceso de 6 dígitos
              </p>
            </div>

            {/* PIN Code Indicators */}
            <div className="space-y-3 w-full">
              <motion.div 
                animate={error ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex gap-4 justify-center items-center h-12"
              >
                {[...Array(6)].map((_, i) => {
                  const isActive = i === code.length;
                  const isFilled = i < code.length;
                  return (
                    <motion.div 
                      key={i} 
                      animate={{ 
                        scale: isActive ? 1.2 : 1,
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
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isFilled 
                          ? (error 
                              ? 'shadow-[0_0_12px_rgba(225,29,72,0.35)]' 
                              : 'shadow-[0_4px_12px_rgba(79,70,229,0.3)]') 
                          : (isActive ? 'shadow-[0_0_10px_rgba(79,70,229,0.15)]' : '')
                      }`}
                    >
                      {isFilled && !error && (
                        <div className="w-2 h-2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]" />
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Dynamic Notification Message */}
              <div className="h-6 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-1.5 text-rose-600 font-bold"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs uppercase tracking-wider">PIN INCORRECTO. INTENTE DE NUEVO</span>
                    </motion.div>
                  ) : loading ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2 text-indigo-600 font-bold"
                    >
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-xs uppercase tracking-wider">VERIFICANDO CREDENCIALES...</span>
                    </motion.div>
                  ) : (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest"
                    >
                      {code.length === 0 ? 'INGRESE SU CLAVE' : `${code.length} DE 6 DÍGITOS`}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* GIANT iPad-Optimized tactile Numpad keys (Touch target 80px - 96px) */}
            <div className="grid grid-cols-3 gap-5 sm:gap-6 w-full justify-items-center relative z-10 select-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button
                  key={num}
                  whileTap={{ scale: 0.90 }}
                  onClick={() => handlePress(num.toString())}
                  disabled={loading}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-50 hover:bg-slate-100/80 active:bg-slate-200 border border-slate-200/80 hover:border-slate-300 flex items-center justify-center transition-all shadow-sm relative overflow-hidden group"
                >
                  <span className="text-slate-800 text-2xl sm:text-3xl font-extrabold tracking-tight select-none">
                    {num}
                  </span>
                </motion.button>
              ))}
              
              {/* Demo button */}
              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={() => {
                  clearCode();
                  setCode('012004');
                }}
                disabled={loading}
                title="Clave Demo: 012004"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-indigo-50/50 hover:bg-indigo-50 active:bg-indigo-100 border border-indigo-100/70 hover:border-indigo-200 flex items-center justify-center transition-all text-indigo-600 shadow-sm"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>
              
              {/* 0 button */}
              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={() => handlePress("0")}
                disabled={loading}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-50 hover:bg-slate-100/80 active:bg-slate-200 border border-slate-200/80 hover:border-slate-300 flex items-center justify-center transition-all shadow-sm text-slate-800 text-2xl sm:text-3xl font-extrabold tracking-tight"
              >
                0
              </motion.button>
              
              {/* Backspace button */}
              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={handleBackspace}
                disabled={loading}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-100/80 flex items-center justify-center transition-all text-rose-600 shadow-sm"
              >
                <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>
            </div>

            {/* Quick manual validation button if code is partial */}
            {code.length >= 4 && code.length < 6 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full relative z-10"
              >
                <motion.button
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-widest uppercase shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="w-5 h-5" />
                  <span>CONFIRMAR CLAVE</span>
                </motion.button>
              </motion.div>
            )}

          </div>

          {/* Locked Badge Footer */}
          <div className="mt-8 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-5 w-full justify-center">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Encriptado Enlace Seguro CyC • v2.6</span>
          </div>

        </div>

      </motion.div>
    </div>
  );
};

export default Login;
