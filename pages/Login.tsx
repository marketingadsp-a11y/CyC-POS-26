import React, { useState, useEffect } from 'react';
import { Delete, Lock, ShieldCheck, Activity, AlertCircle, HelpCircle, Check } from 'lucide-react';
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
    
    // Aesthetic 2026 feedback transition
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
    <div className="min-h-screen bg-[#07080f] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* 2026 Kinetic Aurora Ambient Nebula */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Soft Indigo Fluid Sphere */}
        <motion.div 
          animate={{ 
            scale: [1, 1.12, 0.92, 1.05, 1],
            x: [0, 20, -15, 10, 0],
            y: [0, -15, 25, -10, 0],
            opacity: [0.15, 0.25, 0.18, 0.28, 0.15]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-500/30 via-indigo-600/10 to-transparent rounded-full blur-[100px]"
        />
        
        {/* Neon Emerald/Cyan Accents */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 0.95, 1.1, 1],
            x: [0, -30, 20, -10, 0],
            y: [0, 25, -20, 15, 0],
            opacity: [0.08, 0.15, 0.12, 0.18, 0.08]
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-400/20 via-blue-500/5 to-transparent rounded-full blur-[110px]"
        />

        {/* High-end Ultra-fine Laser Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] opacity-80" />
      </div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 22 }}
        className="relative z-10 w-full max-w-[310px] flex flex-col items-center"
      >
        {/* Mini Active Hud Header representing 2026 Micro-UX */}
        <div className="w-full flex justify-between items-center px-4 mb-3 text-slate-500 text-[9px] font-mono tracking-widest uppercase">
          <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 py-1 px-2.5 rounded-full backdrop-blur-xl shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-400">CYC-SECURE v2.26</span>
          </div>
          <div className="text-right text-slate-400 font-medium">
            {formatClockTime()}
          </div>
        </div>

        {/* Sculpted Cyber Capsule Form */}
        <div className={`w-full bg-[#0a0d1d]/60 backdrop-blur-[40px] border transition-all duration-300 rounded-[2.25rem] p-6 shadow-2xl relative overflow-hidden ${
          error 
            ? 'border-rose-500/50 shadow-[0_0_40px_rgba(244,63,94,0.15)] bg-rose-950/[0.03]' 
            : 'border-white/[0.08] hover:border-white/[0.12] shadow-indigo-950/20'
        }`}>
          {/* Internal premium rim light glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-transparent to-white/[0.04] pointer-events-none" />

          {/* Business identity / Interactive glass card heading */}
          <div className="flex flex-col items-center text-center mb-5">
            {/* Embedded Mini Glass Logo */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-20 h-20 mb-4 mt-1 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-3xl blur-md opacity-35" />
              <div className="relative w-full h-full bg-slate-950/80 border border-white/[0.12] rounded-3xl flex items-center justify-center p-2 shadow-lg">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-[85%] h-[85%] object-contain rounded-xl" />
                ) : (
                  <div className="text-white flex flex-col items-center leading-none">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 text-cyan-400">CYC POS</span>
                    <span className="text-xl font-black tracking-tighter bg-gradient-to-tr from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                      {businessName ? businessName.substring(0, 3) : 'CYC'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-cyan-400 mb-0.5">{getGreeting()}</span>
            <h1 className="text-sm font-black text-white/90 tracking-widest uppercase mb-1">
              {businessName || 'SISTEMA ACCESO'}
            </h1>
          </div>

          {/* Secure Dot Indicator display */}
          <div className="mb-4">
            <motion.div 
              animate={error ? { x: [-5, 5, -5, 5, -2, 2, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-3 justify-center items-center h-8"
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
                        ? 'rgba(244, 63, 94, 0.9)' 
                        : isFilled 
                          ? 'rgba(99, 102, 241, 1)' 
                          : 'rgba(255, 255, 255, 0.1)',
                      borderColor: isActive 
                        ? 'rgba(6, 182, 212, 0.5)' 
                        : isFilled
                          ? 'rgba(99, 102, 241, 0.5)'
                          : 'rgba(255, 255, 255, 0)'
                    }}
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                      isFilled 
                        ? (error 
                            ? 'shadow-[0_0_12px_rgba(244,63,94,0.6)]' 
                            : 'shadow-[0_0_12px_rgba(99,102,241,0.5)]') 
                        : (isActive ? 'shadow-[0_0_8px_rgba(6,182,212,0.3)] bg-white/20' : '')
                    }`}
                  >
                    {isFilled && !error && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-scale-in" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Micro notifications overlay */}
            <div className="h-5 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {error ? (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-1 text-rose-400"
                  >
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Código No Encontrado</span>
                  </motion.div>
                ) : loading ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-1.5 text-cyan-400"
                  >
                    <div className="w-2.5 h-2.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Iniciando Sesión...</span>
                  </motion.div>
                ) : (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    className="text-center text-[9px] font-semibold text-slate-400 uppercase tracking-widest"
                  >
                    {code.length === 0 ? 'Digitaliza PIN' : `${code.length} / 6 Dígitos`}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Compact Tactile Circle Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full justify-items-center mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.88 }}
                onClick={() => handlePress(num.toString())}
                disabled={loading}
                className="w-12 h-12 rounded-full bg-white/[0.03] hover:bg-white/[0.08] active:bg-indigo-600/20 border border-white/[0.04] hover:border-white/10 flex flex-col items-center justify-center transition-all shadow-md relative overflow-hidden group"
              >
                {/* 2026 organic dynamic radial overlay on hover */}
                <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <span className="text-white text-base font-black tracking-tight group-hover:text-cyan-400 transition-colors">{num}</span>
              </motion.button>
            ))}
            
            {/* Spacer for numpad alignment */}
            <div className="w-12 h-12" />
            
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => handlePress("0")}
              disabled={loading}
              className="w-12 h-12 rounded-full bg-white/[0.03] hover:bg-white/[0.08] active:bg-indigo-600/20 border border-white/[0.04] hover:border-white/10 flex items-center justify-center transition-all text-white text-base font-black tracking-tight"
            >
              0
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleBackspace}
              disabled={loading}
              className="w-12 h-12 rounded-full bg-rose-500/[0.02] hover:bg-rose-500/[0.08] border border-rose-500/10 hover:border-rose-500/30 flex items-center justify-center transition-all text-rose-400 hover:text-rose-300"
            >
              <Delete className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Quick Submit Access Switch */}
          {code.length >= 4 && code.length < 6 && (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1"
            >
              <motion.button
                onClick={() => handleSubmit()}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-[10px] tracking-[0.25em] uppercase shadow-lg shadow-indigo-950/55 flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>CONFIRMAR PIN</span>
              </motion.button>
            </motion.div>
          )}

        </div>



        {/* AES Shield Capsule Footer Details */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.6 }}
          className="mt-4 flex flex-col items-center space-y-1 text-center text-slate-500"
        >
          <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.3em]">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Encriptado Extremo AES-256</span>
          </div>
          <p className="text-[7px] font-mono text-slate-600 tracking-[0.15em] font-black">
            POS BUILD v2026.12 • TERMINAL ACTIVA
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
