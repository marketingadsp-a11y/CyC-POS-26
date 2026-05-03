
import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { User } from '../types';
import { getUserByCode, updateUser } from '../services/dataService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
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
    setLoading(true);
    
    // Simulate slight delay for feedback
    await new Promise(r => setTimeout(r, 300));

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
            // Generate a fresh session token
            const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            // Save to DB
            await updateUser(foundUser.id, { sessionToken: newToken });
            
            // Login locally with the new token
            onLogin({ ...foundUser, sessionToken: newToken });
        } else {
            setError(true);
            setCode('');
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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo/Header */}
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
             <span className="text-white font-bold text-3xl">CyC</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CyC POS 26</h1>
          <p className="text-slate-400 mt-2">Ingrese código de acceso</p>
        </div>

        {/* Display Dots */}
        <div className="mb-10 flex gap-4 h-8 justify-center items-center">
          {[...Array(6)].map((_, i) => (
             <div 
               key={i} 
               className={`transition-all duration-300 rounded-full ${
                 i < code.length 
                   ? 'w-4 h-4 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                   : 'w-3 h-3 bg-slate-700'
               } ${error ? 'bg-rose-500 animate-pulse' : ''}`}
             />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePress(num.toString())}
              className="h-20 rounded-2xl bg-slate-800/50 text-white text-2xl font-medium backdrop-blur-md border border-white/5 active:bg-indigo-600/50 active:scale-95 transition-all shadow-lg"
            >
              {num}
            </button>
          ))}
          <div className="h-20 flex items-center justify-center">
             {/* Empty slot for alignment */}
          </div>
          <button
            onClick={() => handlePress("0")}
            className="h-20 rounded-2xl bg-slate-800/50 text-white text-2xl font-medium backdrop-blur-md border border-white/5 active:bg-indigo-600/50 active:scale-95 transition-all shadow-lg"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-20 rounded-2xl bg-slate-800/50 text-slate-400 text-xl font-medium backdrop-blur-md border border-white/5 active:bg-rose-900/50 active:text-rose-200 active:scale-95 transition-all shadow-lg flex items-center justify-center"
          >
            <Delete className="w-8 h-8" />
          </button>
        </div>

        {/* Login Button */}
        <button 
          onClick={handleSubmit}
          disabled={code.length < 4 || loading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl text-white font-bold text-lg shadow-xl shadow-indigo-900/50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Verificando...' : (
            <>
              <Lock className="w-5 h-5" /> Iniciar Sesión
            </>
          )}
        </button>
        
        {error && <p className="text-rose-500 mt-4 font-medium animate-bounce">Código Incorrecto</p>}
      </div>
    </div>
  );
};

export default Login;
