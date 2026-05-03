import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Plus, Calendar, TrendingDown, Trash2 } from 'lucide-react';
import { Button, Input, Card } from '../components/UI';
import { Expense, User } from '../types';
import { addExpense, getExpenses, deleteExpense } from '../services/dataService';

const Expenses: React.FC<{ user: User }> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'year'>('today');

  const isAdmin = user.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    const data = await getExpenses();
    setExpenses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !amount) return;

    // Validate numeric
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert("Por favor ingresa una cantidad válida.");
      return;
    }

    try {
      await addExpense({
        concept: concept.toUpperCase(),
        amount: val,
        createdAt: Date.now(),
        registeredBy: user.name
      });
      setConcept('');
      setAmount('');
      loadData();
    } catch (error) {
      alert("Error al registrar gasto.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("¿Eliminar este registro de gasto?")) {
      await deleteExpense(id);
      loadData();
    }
  };

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    
    // Time boundaries
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const currentDay = now.getDay(); 
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeekDate = new Date(now);
    startOfWeekDate.setDate(now.getDate() - daysToMonday);
    startOfWeekDate.setHours(0,0,0,0);
    const startOfWeek = startOfWeekDate.getTime();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return expenses.filter(exp => {
      const d = exp.createdAt;
      if (filter === 'today') return d >= startOfToday;
      if (filter === 'week') return d >= startOfWeek;
      if (filter === 'month') return d >= startOfMonth;
      if (filter === 'year') return d >= startOfYear;
      return true;
    });
  }, [expenses, filter]);

  const totalFiltered = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 uppercase">
          <Wallet className="w-8 h-8 text-indigo-600" />
          GASTOS
        </h1>
        <p className="text-slate-500 mt-2 uppercase">REGISTRO DE SALIDAS DE DINERO</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full overflow-hidden">
        
        {/* LEFT: Registration Form */}
        <div className="lg:col-span-1">
          <Card className="h-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              NUEVO GASTO
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-6">
              <Input 
                label="CONCEPTO" 
                placeholder="EJ. PAGO DE LUZ" 
                value={concept}
                onChange={e => setConcept(e.target.value.toUpperCase())}
                autoFocus
              />
              <Input 
                label="CANTIDAD" 
                placeholder="0.00" 
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              
              <Button type="submit" className="w-full uppercase shadow-xl">
                <Plus className="w-5 h-5" /> REGISTRAR SALIDA
              </Button>
            </form>
          </Card>
        </div>

        {/* RIGHT: List & Filters */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          
          {/* Filters */}
          <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm mb-4 flex-shrink-0">
             {['today', 'week', 'month', 'year'].map((f) => (
                <button 
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase transition-all ${filter === f ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {f === 'today' ? 'HOY' : (f === 'week' ? 'SEMANA' : (f === 'month' ? 'MES' : 'AÑO'))}
                </button>
             ))}
          </div>

          {/* Total Banner */}
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex justify-between items-center mb-4 flex-shrink-0">
             <span className="text-rose-800 font-bold uppercase text-sm">TOTAL EN PERIODO</span>
             <span className="text-3xl font-black text-rose-600 font-mono">${totalFiltered.toFixed(2)}</span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-24">
             {loading ? (
                <div className="text-center py-10 text-slate-400 uppercase">CARGANDO...</div>
             ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-10 text-slate-400 uppercase flex flex-col items-center">
                   <Calendar className="w-12 h-12 mb-2 opacity-20" />
                   NO HAY GASTOS REGISTRADOS
                </div>
             ) : (
                filteredExpenses.map(exp => (
                  <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm group">
                     <div>
                        <div className="font-bold text-slate-800 uppercase">{exp.concept}</div>
                        <div className="text-xs text-slate-400 uppercase mt-1 flex items-center gap-2">
                           <span>{new Date(exp.createdAt).toLocaleDateString()}</span>
                           <span>•</span>
                           <span>{new Date(exp.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           {exp.registeredBy && (
                             <>
                               <span>•</span>
                               <span className="font-bold text-indigo-400">{exp.registeredBy}</span>
                             </>
                           )}
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="font-bold text-lg text-rose-600 font-mono">-${exp.amount.toFixed(2)}</span>
                        {isAdmin && (
                          <button onClick={() => exp.id && handleDelete(exp.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                             <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                     </div>
                  </div>
                ))
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Expenses;