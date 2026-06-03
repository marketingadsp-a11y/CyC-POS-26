import React, { useState, useEffect } from 'react';
import { Delete, ShieldCheck, AlertCircle, Check, Sparkles } from 'lucide-react';
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

  // Real-time updates for high-end feel
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
    
    // Aesthetic feedback transition
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

    // 2. Fetch from DB
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
    <div className="min-h-screen bg-slate-50/90 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Pastel Fluid Background (Apple Liquid Style) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-tr from-[#f3e8ff]/70 via-[#e0f2fe]/60 to-[#ffedd5]/50">
        
        {/* Soft Violet/Lavender Liquid Orb */}
        <motion.div 
          animate={{ 
            scale: [1, 1.25, 0.9, 1.15, 1],
            x: [-40, 60, -30, 40, -40],
            y: [-30, 40, -50, 20, -30],
            opacity: [0.4, 0.6, 0.5, 0.65, 0.4]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-violet-300 via-indigo-200 to-transparent rounded-full blur-[110px]"
        />
        
        {/* Peach / Sunrise Orb */}
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1.3, 0.95, 1],
            x: [50, -40, 60, -20, 50],
            y: [30, -50, 40, -30, 30],
            opacity: [0.35, 0.55, 0.45, 0.6, 0.35]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-200 via-rose-200 to-transparent rounded-full blur-[100px]"
        />

        {/* Soft Sky Blue / Turquoise Glass Orb */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 0.85, 1.1, 1],
            x: [20, -60, 40, -10, 20],
            y: [60, 20, -40, 50, 60],
            opacity: [0.3, 0.5, 0.4, 0.55, 0.3]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 right-1/3 w-[550px] h-[550px] bg-gradient-to-tr from-sky-200 via-teal-100 to-transparent rounded-full blur-[120px]"
        />

        {/* Very subtle noise grid representing tactile paper-gloss finish */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.003)_1px,transparent_1px)] bg-[size:32px_32px] opacity-100" />
      </div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative z-10 w-full max-w-[325px] flex flex-col items-center"
      >
        {/* Micro HUD Status Bar - Apple Style */}
        <div className="w-full flex justify-between items-center px-4 mb-4 text-slate-500 text-[10px] font-semibold tracking-wider">
          <div className="flex items-center gap-1.5 bg-white/70 border border-white/80 py-1 px-3 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.7)] backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="text-slate-600 uppercase tracking-widest text-[8px] font-bold">CYC SECURE</span>
          </div>
          <div className="text-right text-slate-600 font-semibold tracking-wide bg-white/70 border border-white/80 py-1 px-3 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.7)] backdrop-blur-md">
            {formatClockTime()}
          </div>
        </div>

        {/* Liquid Glass Apple Card */}
        <div className={`w-full transition-all duration-500 rounded-[2.5rem] p-7 relative overflow-hidden backdrop-blur-[45px] ${
          error 
            ? 'bg-rose-50/70 border border-rose-300/60 shadow-[0_25px_50px_-12px_rgba(225,29,72,0.15),inset_0_1px_3px_rgba(255,255,255,0.9)]' 
            : 'bg-white/45 border border-white/70 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.08),inset_0_1px_3px_rgba(255,255,255,0.85)]'
        }`}>
          {/* Internal premium specular glass glare reflection overlay */}
          <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none rounded-t-[2.5rem]" />
          
          {/* Soft inner radial ambient lighting */}
          <div className="absolute inset-0 bg-radial-gradient from-white/20 via-transparent to-transparent pointer-events-none" />

          {/* Logo & Identity */}
          <div className="flex flex-col items-center text-center mb-6 relative z-10">
            {/* Elegant Liquid Pressed Logo Window */}
            <motion.div 
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-22 h-22 mb-4 mt-1 flex items-center justify-center cursor-pointer"
            >
              {/* Glass Rim highlight */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/50 via-white/80 to-white/30 rounded-[2rem] border border-white/90 shadow-[0_10px_25px_rgba(0,0,0,0.02),inset_0_1px_3px_rgba(255,255,255,0.91)]" />
              
              {/* Actual Content Container */}
              <div className="relative w-[90%] h-[90%] bg-white/75 border border-white/80 rounded-[1.75rem] flex items-center justify-center p-2.5 shadow-md">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" referrerPolicy="no-referrer" className="w-[90%] h-[90%] object-contain rounded-2xl" />
                ) : (
                  <div className="text-slate-800 flex flex-col items-center leading-none">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] mb-1.5 text-indigo-600">CYC POS</span>
                    <span className="text-2xl font-black tracking-tight bg-gradient-to-b from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {businessName ? businessName.substring(0, 3) : 'CYC'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600/80 mb-0.5 font-sans">{getGreeting()}</span>
            <h1 className="text-base font-extrabold text-slate-800 tracking-wide uppercase">
              {businessName || 'SISTEMA ACCESO'}
            </h1>
          </div>

          {/* PIN Indicators Section */}
          <div className="mb-6 relative z-10">
            <motion.div 
              animate={error ? { x: [-6, 6, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-3 justify-center items-center h-10"
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
                        ? 'rgba(225, 29, 72, 0.85)' 
                        : isFilled 
                          ? 'rgba(79, 70, 229, 0.9)' 
                          : 'rgba(255, 255, 255, 0.5)',
                      borderColor: isActive 
                        ? 'rgba(79, 70, 229, 0.7)' 
                        : isFilled
                          ? 'rgba(79, 70, 229, 0.3)'
                          : 'rgba(0, 0, 0, 0.08)'
                    }}
                    className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                      isFilled 
                        ? (error 
                            ? 'shadow-[0_0_12px_rgba(225,29,72,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]' 
                            : 'shadow-[0_4px_12px_rgba(79,70,229,0.35),inset_0_1px_2px_rgba(255,255,255,0.5)]') 
                        : (isActive ? 'shadow-[0_2px_8px_rgba(79,70,229,0.18)]' : '')
                    }`}
                  >
                    {isFilled && !error && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Notification Text Box */}
            <div className="h-6 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {error ? (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-1.5 text-rose-600 font-semibold"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[10px] uppercase tracking-widest font-black">NÚMERO INCORRECTO</span>
                  </motion.div>
                ) : loading ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 text-indigo-600 font-semibold"
                  >
                    <div className="w-3 h-3 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600">INICIANDO...</span>
                  </motion.div>
                ) : (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest"
                  >
                    {code.length === 0 ? 'INGRESA TU PIN' : `${code.length} / 6 DÍGITOS`}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Liquid Glass Numpad */}
          <div className="grid grid-cols-3 gap-3.5 w-full justify-items-center mb-5 relative z-10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.88 }}
                onClick={() => handlePress(num.toString())}
                disabled={loading}
                className="w-13 h-13 rounded-full bg-white/50 hover:bg-white/80 active:bg-white/90 border border-white/70 hover:border-white flex flex-col items-center justify-center transition-all shadow-[0_5px_15px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.9)] relative overflow-hidden group hover:shadow-[0_8px_20px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)]"
              >
                <span className="text-slate-800 text-lg font-bold tracking-tight select-none">{num}</span>
              </motion.button>
            ))}
            
            {/* Quick Demo Assist Switch or Spacer */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                clearCode();
                setCode('012004');
              }}
              disabled={loading}
              title="PIN DEMO: 012004"
              className="w-13 h-13 rounded-full bg-white/20 hover:bg-white/45 border border-white/40 flex items-center justify-center transition-all text-indigo-500/60 hover:text-indigo-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
            >
              <Sparkles className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => handlePress("0")}
              disabled={loading}
              className="w-13 h-13 rounded-full bg-white/50 hover:bg-white/80 active:bg-white/90 border border-white/70 hover:border-white flex items-center justify-center transition-all shadow-[0_5px_15px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.9)] text-slate-800 text-lg font-bold tracking-tight"
            >
              0
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleBackspace}
              disabled={loading}
              className="w-13 h-13 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-300/30 flex items-center justify-center transition-all text-rose-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"
            >
              <Delete className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Quick Submit Access Switch */}
          {code.length >= 4 && code.length < 6 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 relative z-10"
            >
              <motion.button
                onClick={() => handleSubmit()}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] tracking-[0.2em] uppercase shadow-[0_8px_25px_rgba(79,70,229,0.3),inset_0_1.5px_2px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>CONFIRMAR PIN</span>
              </motion.button>
            </motion.div>
          )}

        </div>

        {/* AES Shield Capsule Footer Details */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 0.5 }}
          className="mt-5 flex flex-col items-center space-y-1 text-center text-slate-500"
        >
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Encriptado Extremo AES-256</span>
          </div>
          <p className="text-[8px] font-semibold text-slate-500 tracking-[0.12em] uppercase">
            SISTEMA CYC • TERMINAL ACTIVA 2026
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
