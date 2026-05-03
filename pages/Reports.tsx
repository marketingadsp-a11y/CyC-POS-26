
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Wallet, CreditCard, ArrowUpRight, PieChart, DollarSign, Activity, ShoppingBag, Layers, Calendar, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Badge, Button } from '../components/UI';
import { Order, Expense } from '../types';
import { getOrders, getExpenses } from '../services/dataService';

// --- HELPER: Get Order Type ---
const getOrderType = (order: Order) => {
    const hasRent = order.items.some(i => i.transactionType === 'rent');
    const hasSale = order.items.some(i => i.transactionType === 'sale');
    if (hasRent && hasSale) return 'MIXTO';
    if (hasRent) return 'RENTA';
    return 'VENTA';
};

// --- PRINT TEMPLATE COMPONENT ---
const PrintableReport: React.FC<{ 
    activeTab: 'income' | 'expenses' | 'balance', 
    timeFilter: string, 
    stats: any, 
    expensesList: Expense[],
    // incomeList is now a list of financial events, not raw orders
    incomeList: any[] 
}> = ({ activeTab, timeFilter, stats, expensesList, incomeList }) => {
    
    const currentDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const currentTime = new Date().toLocaleTimeString();

    const getTitle = () => {
        if (activeTab === 'income') return 'REPORTE DE INGRESOS DETALLADO';
        if (activeTab === 'expenses') return 'REPORTE DE GASTOS DETALLADO';
        return 'ESTADO DE RESULTADOS (UTILIDAD)';
    };

    const getPeriodLabel = () => {
        if (timeFilter === 'today') return 'CORTE DEL DÍA (HOY)';
        if (timeFilter === 'week') return 'ACUMULADO SEMANAL';
        if (timeFilter === 'month') return 'ACUMULADO MENSUAL';
        return 'ACUMULADO ANUAL';
    };

    return (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-sans text-slate-900 overflow-y-auto">
            <style>
                {`@media print { @page { size: auto; margin: 10mm; } body { margin: 0; } }`}
            </style>

            {/* HEADER */}
            <div className="border-b-2 border-slate-900 pb-4 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">{getTitle()}</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase mt-1">{getPeriodLabel()}</p>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold uppercase">CyC POS 26</div>
                    <div className="text-xs text-slate-400 mt-1">Generado: {currentDate} {currentTime}</div>
                </div>
            </div>

            {/* CONTENT BASED ON TAB */}
            
            {/* 1. INCOME REPORT */}
            {activeTab === 'income' && (
                <div className="space-y-8">
                    {/* Summary Row */}
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                        <div>
                             <p className="text-xs font-bold uppercase text-slate-400">TOTAL INGRESOS</p>
                             <p className="text-3xl font-black font-mono">${stats.income.total.toLocaleString()}</p>
                        </div>
                        <div className="text-right space-y-1 text-xs">
                             <div>EFECTIVO: <strong>${stats.income.cash.toLocaleString()}</strong></div>
                             <div>TARJETA: <strong>${stats.income.card.toLocaleString()}</strong></div>
                             <div>TRANSFER: <strong>${stats.income.transfer.toLocaleString()}</strong></div>
                        </div>
                    </div>

                    {/* Full Detail Table */}
                    <div>
                        <h3 className="font-bold bg-slate-100 p-2 uppercase text-sm mb-2">DETALLE DE TRANSACCIONES</h3>
                        <table className="w-full text-left text-[10px]">
                            <thead>
                                <tr className="border-b-2 border-slate-300 uppercase">
                                    <th className="py-1">FECHA</th>
                                    <th className="py-1">FOLIO</th>
                                    <th className="py-1">CONCEPTO</th>
                                    <th className="py-1">CLIENTE</th>
                                    <th className="py-1">MÉTODO</th>
                                    <th className="py-1 text-right">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incomeList.map((event, idx) => (
                                    <tr key={`${event.orderId}-${idx}`} className="border-b border-slate-100">
                                        <td className="py-1 font-mono text-slate-500">{new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="py-1 font-mono font-bold">#{event.orderId?.slice(-6)}</td>
                                        <td className="py-1 uppercase">{event.type}</td>
                                        <td className="py-1 uppercase truncate max-w-[150px]">{event.customerName}</td>
                                        <td className="py-1 uppercase">{event.method}</td>
                                        <td className="py-1 text-right font-mono font-bold">${event.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. EXPENSE REPORT */}
            {activeTab === 'expenses' && (
                <div className="space-y-8">
                     <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl flex justify-between items-center">
                        <span className="text-lg font-bold uppercase text-slate-600">TOTAL GASTOS</span>
                        <span className="text-4xl font-black font-mono text-rose-600">-${stats.expense.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>

                    <div>
                        <h3 className="font-bold border-b-2 border-slate-800 pb-2 mb-4 uppercase text-sm">DESGLOSE DETALLADO</h3>
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-300 text-slate-500 uppercase">
                                    <th className="py-2">FECHA/HORA</th>
                                    <th className="py-2">CONCEPTO</th>
                                    <th className="py-2">REGISTRÓ</th>
                                    <th className="py-2 text-right">MONTO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expensesList.length === 0 ? (
                                    <tr><td colSpan={4} className="py-4 text-center text-slate-400 italic">SIN GASTOS EN ESTE PERIODO</td></tr>
                                ) : (
                                    expensesList.map((exp) => (
                                        <tr key={exp.id} className="border-b border-slate-100">
                                            <td className="py-2 font-mono text-slate-500">{new Date(exp.createdAt).toLocaleDateString()} {new Date(exp.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="py-2 font-bold uppercase">{exp.concept}</td>
                                            <td className="py-2 uppercase text-xs text-slate-500">{exp.registeredBy || '-'}</td>
                                            <td className="py-2 text-right font-mono font-bold text-rose-600">-${exp.amount.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 3. BALANCE REPORT */}
            {activeTab === 'balance' && (
                <div className="space-y-8">
                    <div className={`border-4 p-6 rounded-xl flex items-center justify-between ${stats.net >= 0 ? 'border-slate-900 bg-slate-50' : 'border-rose-500 bg-rose-50'}`}>
                        <span className="text-sm font-bold uppercase tracking-widest">UTILIDAD NETA</span>
                        <span className={`text-4xl font-black font-mono ${stats.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                            ${stats.net.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </div>

                    <div className="flex gap-8">
                        {/* INCOME SIDE */}
                        <div className="flex-1">
                             <h3 className="font-bold border-b-2 border-slate-900 pb-2 mb-2 uppercase text-sm">INGRESOS DETALLADOS</h3>
                             <table className="w-full text-left text-[9px]">
                                <thead>
                                    <tr className="border-b border-slate-300 uppercase text-slate-500">
                                        <th className="py-1">FECHA</th>
                                        <th className="py-1">FOLIO</th>
                                        <th className="py-1">CONCEPTO</th>
                                        <th className="py-1 text-right">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incomeList.map((event, idx) => (
                                        <tr key={`${event.orderId}-${idx}`} className="border-b border-slate-100">
                                            <td className="py-1 font-mono text-slate-500">{new Date(event.timestamp).toLocaleDateString()}</td>
                                            <td className="py-1 font-mono">#{event.orderId?.slice(-6)}</td>
                                            <td className="py-1 uppercase">{event.type}</td>
                                            <td className="py-1 text-right font-mono font-bold">${event.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-slate-900">
                                        <td colSpan={3} className="py-2 font-bold text-right uppercase">TOTAL INGRESOS</td>
                                        <td className="py-2 font-bold text-right font-mono text-sm">${stats.income.total.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* EXPENSE SIDE */}
                         <div className="flex-1">
                             <h3 className="font-bold border-b-2 border-rose-500 pb-2 mb-2 uppercase text-sm text-rose-700">GASTOS DETALLADOS</h3>
                             <table className="w-full text-left text-[9px]">
                                <thead>
                                    <tr className="border-b border-slate-300 uppercase text-slate-500">
                                        <th className="py-1">FECHA</th>
                                        <th className="py-1">CONCEPTO</th>
                                        <th className="py-1 text-right">MONTO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expensesList.map(exp => (
                                         <tr key={exp.id} className="border-b border-slate-100">
                                            <td className="py-1 font-mono">{new Date(exp.createdAt).toLocaleDateString()}</td>
                                            <td className="py-1 uppercase truncate max-w-[100px]">{exp.concept}</td>
                                            <td className="py-1 text-right font-mono font-bold text-rose-600">-${exp.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-rose-500 text-rose-700">
                                        <td colSpan={2} className="py-2 font-bold text-right uppercase">TOTAL GASTOS</td>
                                        <td className="py-2 font-bold text-right font-mono text-sm">-${stats.expense.total.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                             </table>
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <div className="mt-8 pt-4 border-t border-slate-300 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">REPORTE GENERADO AUTOMÁTICAMENTE</p>
            </div>
        </div>
    );
};

const Reports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'balance'>('income');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year'>('today');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [oData, eData] = await Promise.all([getOrders(), getExpenses()]);
      setOrders(oData);
      setExpenses(eData);
      setLoading(false);
    };
    loadData();
  }, []);

  // Reset pagination when filter or tab changes
  useEffect(() => {
      setCurrentPage(1);
  }, [timeFilter, activeTab]);

  // --- Core Financial Processing Logic ---
  // Transforms Orders into specific "Financial Events" (Down Payment vs Final Payment)
  // This avoids double counting and puts income in the correct time buckets.
  const financialEvents = useMemo(() => {
      const now = new Date();
      
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      const currentDay = now.getDay(); 
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeekDate = new Date(now);
      startOfWeekDate.setDate(now.getDate() - daysToMonday);
      startOfWeekDate.setHours(0,0,0,0);
      const startOfWeek = startOfWeekDate.getTime();

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

      const isDateInRange = (timestamp: number) => {
          if (timeFilter === 'today') return timestamp >= startOfToday;
          if (timeFilter === 'week') return timestamp >= startOfWeek;
          if (timeFilter === 'month') return timestamp >= startOfMonth;
          if (timeFilter === 'year') return timestamp >= startOfYear;
          return true;
      };

      const events: any[] = [];

      orders.forEach(order => {
          if (order.status === 'refunded') return;

          // Event 1: Creation (Initial Payment)
          // For Reservations: This is the Down Payment.
          // For Normal Sales: This is the Total.
          if (isDateInRange(order.createdAt)) {
              const isRes = order.status === 'reservation' || (order.downPayment !== undefined); // Is currently OR was a reservation
              const amount = isRes ? (order.downPayment || 0) : order.total;
              
              if (amount > 0) {
                  events.push({
                      id: order.id + '-init',
                      orderId: order.id,
                      timestamp: order.createdAt,
                      amount: amount,
                      type: isRes ? 'ANTICIPO' : getOrderType(order),
                      method: order.paymentMethod || 'cash',
                      customerName: order.customer?.name || 'MOSTRADOR',
                      rawOrder: order
                  });
              }
          }

          // Event 2: Finalization (Pickup/Delivery Payment)
          // Only exists if it was a reservation AND has been finalized
          if (order.finalizedAt && isDateInRange(order.finalizedAt)) {
              // The remaining balance was paid at this time
              const amount = order.remainingBalance || 0;
              
              if (amount > 0) {
                  events.push({
                      id: order.id + '-final',
                      orderId: order.id,
                      timestamp: order.finalizedAt,
                      amount: amount,
                      type: 'LIQUIDACIÓN',
                      method: order.paymentMethod || 'cash', // Assuming same method for simplicity, or add explicit tracking later
                      customerName: order.customer?.name || 'MOSTRADOR',
                      rawOrder: order
                  });
              }
          }
      });

      // Sort by timestamp desc
      return events.sort((a, b) => b.timestamp - a.timestamp);

  }, [orders, timeFilter]);

  const filteredExpenses = useMemo(() => {
      const now = new Date();
      // ... same date logic ...
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const currentDay = now.getDay(); 
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeekDate = new Date(now);
      startOfWeekDate.setDate(now.getDate() - daysToMonday);
      startOfWeekDate.setHours(0,0,0,0);
      const startOfWeek = startOfWeekDate.getTime();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

      const isDateInRange = (timestamp: number) => {
          if (timeFilter === 'today') return timestamp >= startOfToday;
          if (timeFilter === 'week') return timestamp >= startOfWeek;
          if (timeFilter === 'month') return timestamp >= startOfMonth;
          if (timeFilter === 'year') return timestamp >= startOfYear;
          return true;
      };

      return expenses.filter(e => isDateInRange(e.createdAt)).sort((a, b) => b.createdAt - a.createdAt);
  }, [expenses, timeFilter]);


  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    // 1. Income Analysis (Using Financial Events)
    let totalIncome = 0;
    let incomeCash = 0;
    let incomeCard = 0;
    let incomeTransfer = 0;
    
    // Category Breakdown (Best Effort based on Order Items in events)
    const categoryMap: Record<string, number> = {};

    financialEvents.forEach(event => {
        totalIncome += event.amount;
        
        if (event.method === 'cash') incomeCash += event.amount;
        else if (event.method === 'card') incomeCard += event.amount;
        else if (event.method === 'transfer') incomeTransfer += event.amount;

        // Attribute value to categories proportionally
        // This is an estimation since we split payments
        const order = event.rawOrder;
        const totalOrderVal = order.total || 1;
        const ratio = event.amount / totalOrderVal;

        order.items.forEach((item: any) => {
            const itemTotal = (item.appliedPrice * item.quantity) * ratio;
            const cat = item.category || 'OTROS';
            categoryMap[cat] = (categoryMap[cat] || 0) + itemTotal;
        });
    });

    // 2. Expense Analysis
    let totalExpenses = 0;
    filteredExpenses.forEach(e => totalExpenses += e.amount);

    return {
        income: {
            total: totalIncome,
            cash: incomeCash,
            card: incomeCard,
            transfer: incomeTransfer,
            categories: Object.entries(categoryMap).sort((a,b) => b[1] - a[1])
        },
        expense: {
            total: totalExpenses
        },
        net: totalIncome - totalExpenses
    };
  }, [financialEvents, filteredExpenses]);

  // --- Pagination Logic ---
  const paginatedIncome = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return financialEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [financialEvents, currentPage]);

  const totalPagesIncome = Math.ceil(financialEvents.length / ITEMS_PER_PAGE);

  const paginatedExpenses = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  const totalPagesExpenses = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);


  // --- Components ---

  const PaginationControls = ({ current, total, onPageChange }: any) => {
      if (total <= 1) return null;
      return (
          <div className="flex justify-center items-center gap-4 mt-4">
              <button 
                onClick={() => onPageChange(Math.max(1, current - 1))}
                disabled={current === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-50"
              >
                  <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-500">PÁGINA {current} DE {total}</span>
              <button 
                onClick={() => onPageChange(Math.min(total, current + 1))}
                disabled={current === total}
                className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-50"
              >
                  <ChevronRight className="w-4 h-4" />
              </button>
          </div>
      )
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 h-full overflow-y-auto">
      {/* Hidden Print Template */}
      <PrintableReport 
         activeTab={activeTab} 
         timeFilter={timeFilter} 
         stats={stats} 
         expensesList={filteredExpenses}
         incomeList={financialEvents}
      />

      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 uppercase">
            <PieChart className="w-8 h-8 text-indigo-600" />
            INFORMES
            </h1>
            <p className="text-slate-500 mt-1 text-sm uppercase">ANÁLISIS DETALLADO DE MOVIMIENTOS</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
             {/* Time Filter */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm">
                {['today', 'week', 'month', 'year'].map((f) => (
                    <button 
                    key={f}
                    onClick={() => setTimeFilter(f as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${timeFilter === f ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                    {f === 'today' ? 'HOY' : (f === 'week' ? 'SEMANA' : (f === 'month' ? 'MES' : 'AÑO'))}
                    </button>
                ))}
            </div>

            <Button onClick={handlePrint} className="uppercase shadow-lg bg-indigo-600 text-white border border-indigo-500">
                <Printer className="w-5 h-5" /> <span className="hidden sm:inline">IMPRIMIR / PDF</span>
            </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          <button 
            onClick={() => setActiveTab('income')}
            className={`flex-1 min-w-[140px] p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-transparent bg-white text-slate-400 hover:bg-slate-50'}`}
          >
              <TrendingUp className="w-6 h-6" />
              <span className="font-black uppercase tracking-wider text-sm">INGRESOS</span>
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 min-w-[140px] p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'expenses' ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-transparent bg-white text-slate-400 hover:bg-slate-50'}`}
          >
              <TrendingDown className="w-6 h-6" />
              <span className="font-black uppercase tracking-wider text-sm">GASTOS</span>
          </button>
          <button 
            onClick={() => setActiveTab('balance')}
            className={`flex-1 min-w-[140px] p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'balance' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-transparent bg-white text-slate-400 hover:bg-slate-50'}`}
          >
              <Activity className="w-6 h-6" />
              <span className="font-black uppercase tracking-wider text-sm">UTILIDAD</span>
          </button>
      </div>

      {/* --- INCOME VIEW --- */}
      {activeTab === 'income' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              
              {/* Total Banner */}
              <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-200 flex justify-between items-center">
                  <div>
                      <p className="font-bold opacity-80 uppercase text-sm mb-1">INGRESO BRUTO TOTAL</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tight font-mono">${stats.income.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                  </div>
                  <div className="bg-white/20 p-4 rounded-full">
                      <DollarSign className="w-8 h-8 text-white" />
                  </div>
              </div>

              {/* Transaction Detail Table */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" /> LISTADO DE TRANSACCIONES
                  </h3>
                  
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                              <tr>
                                  <th className="px-4 py-3 rounded-l-xl">FECHA</th>
                                  <th className="px-4 py-3">FOLIO</th>
                                  <th className="px-4 py-3">CONCEPTO</th>
                                  <th className="px-4 py-3">CLIENTE</th>
                                  <th className="px-4 py-3">MÉTODO</th>
                                  <th className="px-4 py-3 rounded-r-xl text-right">MONTO</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {paginatedIncome.length === 0 ? (
                                  <tr>
                                      <td colSpan={6} className="text-center py-8 text-slate-400 uppercase">Sin movimientos en este periodo</td>
                                  </tr>
                              ) : (
                                  paginatedIncome.map(event => (
                                        <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-slate-500">
                                                {new Date(event.timestamp).toLocaleDateString()}
                                                <span className="text-xs opacity-50 ml-1">{new Date(event.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold">#{event.orderId?.slice(-6)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${event.type === 'ANTICIPO' ? 'bg-amber-50 text-amber-700 border-amber-100' : (event.type === 'LIQUIDACIÓN' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100')}`}>
                                                    {event.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 uppercase text-xs font-bold text-slate-700 max-w-[150px] truncate">
                                                {event.customerName}
                                            </td>
                                            <td className="px-4 py-3 uppercase text-xs font-bold text-slate-600">{event.method}</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">${event.amount.toLocaleString()}</td>
                                        </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>

                  <PaginationControls 
                      current={currentPage} 
                      total={totalPagesIncome} 
                      onPageChange={setCurrentPage} 
                  />
              </div>

              {/* Breakdowns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payment Methods */}
                  <Card>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">MÉTODOS DE PAGO</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                            <span className="flex items-center gap-2 font-bold text-emerald-900"><Wallet className="w-4 h-4"/> EFECTIVO</span>
                            <span className="font-mono font-bold text-lg">${stats.income.cash.toLocaleString()}</span>
                        </div>
                         <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                            <span className="flex items-center gap-2 font-bold text-indigo-900"><CreditCard className="w-4 h-4"/> TARJETA</span>
                            <span className="font-mono font-bold text-lg">${stats.income.card.toLocaleString()}</span>
                        </div>
                         <div className="flex justify-between items-center p-3 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="flex items-center gap-2 font-bold text-slate-700"><ArrowUpRight className="w-4 h-4"/> TRANSFER</span>
                            <span className="font-mono font-bold text-lg">${stats.income.transfer.toLocaleString()}</span>
                        </div>
                      </div>
                  </Card>

                  {/* Categories */}
                  <Card>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">POR CATEGORÍA (ESTIMADO)</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {stats.income.categories.map(([cat, amount], idx) => (
                              <div key={cat} className="flex justify-between items-center p-2 border-b border-slate-50 last:border-0">
                                  <div className="flex items-center gap-3">
                                      <span className="font-bold text-slate-300 w-4 text-center text-xs">{idx + 1}</span>
                                      <span className="font-bold text-slate-600 uppercase text-xs">{cat}</span>
                                  </div>
                                  <span className="font-mono font-bold text-slate-800 text-sm">${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                          ))}
                      </div>
                  </Card>
              </div>
          </div>
      )}

      {/* --- EXPENSES VIEW --- */}
      {activeTab === 'expenses' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
               {/* Total Banner */}
               <div className="bg-rose-600 text-white p-6 rounded-3xl shadow-lg shadow-rose-200 flex justify-between items-center">
                  <div>
                      <p className="font-bold opacity-80 uppercase text-sm mb-1">TOTAL GASTOS</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tight font-mono">${stats.expense.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                  </div>
                  <div className="bg-white/20 p-4 rounded-full">
                      <TrendingDown className="w-8 h-8 text-white" />
                  </div>
              </div>

              {/* Expense List */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-bold text-slate-700 uppercase text-sm">DESGLOSE DE SALIDAS</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {paginatedExpenses.length === 0 ? (
                          <div className="p-10 text-center text-slate-400 uppercase">No hay gastos en este periodo</div>
                      ) : (
                          paginatedExpenses.map(exp => (
                              <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                  <div>
                                      <div className="font-bold text-slate-800 uppercase">{exp.concept}</div>
                                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(exp.createdAt).toLocaleDateString()}
                                          <span>•</span>
                                          {new Date(exp.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          {exp.registeredBy && <span className="bg-slate-100 px-1 rounded text-[9px] uppercase font-bold text-slate-500">{exp.registeredBy}</span>}
                                      </div>
                                  </div>
                                  <div className="font-mono font-bold text-rose-600 text-lg">
                                      -${exp.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  <PaginationControls 
                      current={currentPage} 
                      total={totalPagesExpenses} 
                      onPageChange={setCurrentPage} 
                  />
              </div>
          </div>
      )}

      {/* --- BALANCE / UTILITY VIEW --- */}
      {activeTab === 'balance' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              {/* High Level KPI */}
              <div className={`p-6 rounded-3xl border-2 shadow-xl text-center ${stats.net >= 0 ? 'bg-slate-900 border-slate-900 text-white' : 'bg-rose-50 border-rose-500 text-rose-900'}`}>
                  <p className="text-sm font-bold uppercase opacity-60 mb-2">UTILIDAD NETA FINAL (GANANCIA)</p>
                  <h3 className="text-5xl font-black font-mono tracking-tight">
                      ${stats.net.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </h3>
                  <div className="mt-4 flex flex-col md:flex-row justify-center gap-2 md:gap-6 text-xs font-bold uppercase opacity-80">
                      <span className="flex items-center justify-center gap-2"><ArrowUpRight className="w-4 h-4"/> INGRESOS: ${stats.income.total.toLocaleString()}</span>
                      <span className="hidden md:inline">|</span>
                      <span className="flex items-center justify-center gap-2"><TrendingDown className="w-4 h-4"/> GASTOS: ${stats.expense.total.toLocaleString()}</span>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* INCOME DETAILS SECTION */}
                  <div className="space-y-4">
                      <h3 className="text-lg font-bold text-emerald-700 uppercase flex items-center gap-2 border-b border-emerald-200 pb-2">
                          <ArrowUpRight className="w-5 h-5" /> DETALLE DE INGRESOS
                      </h3>
                      
                      {/* Income Breakdown Widgets (Utility View) */}
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                          <div className="text-xs font-bold text-emerald-800 uppercase mb-2">TOTAL INGRESOS</div>
                          <div className="text-3xl font-black font-mono text-emerald-700 mb-4">${stats.income.total.toLocaleString()}</div>
                          
                          <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-2 rounded-xl border border-emerald-100/50 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">EFECTIVO</div>
                                    <div className="text-sm font-bold text-slate-700">${stats.income.cash.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-emerald-100/50 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">TARJETA</div>
                                    <div className="text-sm font-bold text-slate-700">${stats.income.card.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-emerald-100/50 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">TRANSF</div>
                                    <div className="text-sm font-bold text-slate-700">${stats.income.transfer.toLocaleString()}</div>
                                </div>
                          </div>
                      </div>
                      
                      {/* Detailed Table for Balance View */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <div className="p-2 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase">LISTADO DE INGRESOS</div>
                          <table className="w-full text-left text-xs">
                              <thead className="bg-white text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                                  <tr>
                                      <th className="px-3 py-2">Fecha</th>
                                      <th className="px-3 py-2">Concepto</th>
                                      <th className="px-3 py-2 text-right">Monto</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {paginatedIncome.map(event => (
                                      <tr key={event.id}>
                                          <td className="px-3 py-2 text-slate-500 font-mono">
                                              {new Date(event.timestamp).toLocaleDateString()}
                                          </td>
                                          <td className="px-3 py-2 font-bold text-slate-700 uppercase truncate max-w-[100px]">
                                              {event.type}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono font-bold">
                                              ${event.amount.toLocaleString()}
                                          </td>
                                      </tr>
                                  ))}
                                  {paginatedIncome.length === 0 && (
                                      <tr><td colSpan={3} className="text-center py-4 text-slate-400">Sin ingresos</td></tr>
                                  )}
                              </tbody>
                          </table>
                          <div className="p-2 border-t border-slate-100">
                              <PaginationControls 
                                current={currentPage} 
                                total={totalPagesIncome} 
                                onPageChange={setCurrentPage} 
                            />
                          </div>
                      </div>
                  </div>

                  {/* EXPENSE DETAILS SECTION */}
                  <div className="space-y-4">
                      <h3 className="text-lg font-bold text-rose-700 uppercase flex items-center gap-2 border-b border-rose-200 pb-2">
                          <TrendingDown className="w-5 h-5" /> DETALLE DE GASTOS
                      </h3>

                      {/* Expense Summary Widget */}
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                          <div className="text-xs font-bold text-rose-800 uppercase mb-1">TOTAL GASTOS</div>
                          <div className="text-3xl font-black font-mono text-rose-700">-${stats.expense.total.toLocaleString()}</div>
                      </div>
                      
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                           <div className="p-2 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase">LISTADO DE SALIDAS</div>
                           <table className="w-full text-left text-xs">
                              <thead className="bg-white text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                                  <tr>
                                      <th className="px-3 py-2">Fecha</th>
                                      <th className="px-3 py-2">Concepto</th>
                                      <th className="px-3 py-2 text-right">Monto</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {paginatedExpenses.map(exp => (
                                      <tr key={exp.id}>
                                          <td className="px-3 py-2 text-slate-500 font-mono">
                                              {new Date(exp.createdAt).toLocaleDateString()}
                                          </td>
                                          <td className="px-3 py-2 font-bold text-slate-700 uppercase truncate max-w-[100px]">
                                              {exp.concept}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">
                                              -${exp.amount.toLocaleString()}
                                          </td>
                                      </tr>
                                  ))}
                                  {paginatedExpenses.length === 0 && (
                                      <tr><td colSpan={3} className="text-center py-4 text-slate-400">Sin gastos</td></tr>
                                  )}
                              </tbody>
                          </table>
                          <div className="p-2 border-t border-slate-100">
                             <PaginationControls 
                                current={currentPage} 
                                total={totalPagesExpenses} 
                                onPageChange={setCurrentPage} 
                            />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Reports;
