
import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Search, Clock, AlertTriangle, CheckCircle, Calendar, User, ShoppingBag, ArrowRight, X, Receipt, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order, Customer } from '../types';
import { getOrders, updateOrder, updateCustomer, getSystemSettings } from '../services/dataService';
import { Button, Input, Modal, Card, Badge } from '../components/UI';

const Returns: React.FC = () => {
  const navigate = useNavigate();
  // We keep all orders to show history, and filtered rentals for the main table
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [activeRentals, setActiveRentals] = useState<Order[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');

  // Return/Late Fee Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [lateFeeAmount, setLateFeeAmount] = useState('');

  // Quick Return Selective Modal
  const [showQuickReturnModal, setShowQuickReturnModal] = useState(false);
  const [returnMode, setReturnMode] = useState<'all' | 'partial'>('all');
  const [itemsToReturn, setItemsToReturn] = useState<number[]>([]); // Array of indices in selectedOrder.items

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getOrders();
    setAllOrders(data);
    
    // Filter only orders that contain rentals for the main view
    const rentals = data.filter(o => o.items.some(i => i.transactionType === 'rent'));
    setActiveRentals(rentals);
    
    setLoading(false);
  };

  const getRentalStatus = (order: Order) => {
    if (order.status === 'returned' || order.status === 'returned_late') {
        return { status: 'returned', label: 'DEVUELTO', color: 'green' as const, late: order.status === 'returned_late' };
    }

    const now = Date.now();
    const end = order.rentalEndDate || 0;
    
    if (now > end) {
        return { status: 'late', label: 'CON ATRASO', color: 'rose' as const, late: true };
    }

    return { status: 'active', label: 'EN TIEMPO', color: 'indigo' as const, late: false };
  };

  // Immediate Action: Mark as returned (Clean)
  const handleQuickReturn = (order: Order) => {
    setSelectedOrder(order);
    const rentalIndices = order.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.transactionType === 'rent' && !item.returnedAt)
      .map(({ index }) => index);
    
    setItemsToReturn(rentalIndices); 
    setReturnMode('all'); // Default to everything
    setShowQuickReturnModal(true);
  };

  const confirmQuickReturn = async () => {
    if (!selectedOrder) return;

    // Determine which indices to return based on mode
    let targetIndices = itemsToReturn;
    if (returnMode === 'all') {
        targetIndices = selectedOrder.items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.transactionType === 'rent' && !item.returnedAt)
            .map(({ index }) => index);
    }

    if (targetIndices.length === 0) return;

    try {
        const updatedItems = [...selectedOrder.items];
        const returnTimestamp = Date.now();
        
        targetIndices.forEach(index => {
            updatedItems[index] = { ...updatedItems[index], returnedAt: returnTimestamp };
        });

        // Check if ALL rental items are now returned
        const allRentalsReturned = updatedItems
            .filter(i => i.transactionType === 'rent')
            .every(i => i.returnedAt);

        const updateData: Partial<Order> = {
            items: updatedItems,
        };

        if (allRentalsReturned) {
            updateData.status = 'returned';
            updateData.returnedAt = returnTimestamp;
        }

        await updateOrder(selectedOrder.id!, updateData as any);
        
        setShowQuickReturnModal(false);
        setSelectedOrder(null);
        alert("Devolución registrada correctamente.");
        loadData();
    } catch (e) {
        alert("Error al registrar devolución.");
    }
  };

  // Open Modal for Late Fee
  const handleLateReturnClick = async (order: Order) => {
      setSelectedOrder(order);
      // Fetch Default Fee and calculate by days
      const now = Date.now();
      const settings = await getSystemSettings();
      const perDayFee = settings.defaultLateFee || 50;
      
      if (order.rentalEndDate && now > order.rentalEndDate) {
          const diffTime = now - order.rentalEndDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setLateFeeAmount((diffDays * perDayFee).toString());
      } else {
          setLateFeeAmount(perDayFee.toString()); // Fallback if manually clicked but not late by date
      }
      
      setShowReturnModal(true);
  };

  // Open History Modal
  const handleCustomerHistoryClick = (e: React.MouseEvent, customer: Customer | undefined) => {
      e.stopPropagation();
      if (!customer) return;
      setHistoryCustomer(customer);
      setShowHistoryModal(true);
  };

  const processLateReturn = async (payLater: boolean) => {
    if (!selectedOrder?.id) return;
    const fee = parseFloat(lateFeeAmount);
    if (isNaN(fee) || fee <= 0) { alert("Monto inválido"); return; }
    
    try {
        // 1. Mark Order as Returned Late
        const updateData = {
            status: 'returned_late',
            returnedAt: Date.now(),
            lateFee: fee
        };
        await updateOrder(selectedOrder.id, updateData as any);

        // 2. ALWAYS Apply Debt to Customer (Persistence Requirement)
        // This ensures if they cancel at POS, the debt remains.
        let updatedCustomer = selectedOrder.customer;
        if (selectedOrder.customer && selectedOrder.customer.id) {
            const currentBalance = selectedOrder.customer.balance || 0;
            const newBalance = currentBalance - fee;
            
            await updateCustomer(selectedOrder.customer.id, {
                balance: newBalance
            });
            
            // Update local object to pass to POS
            updatedCustomer = { ...selectedOrder.customer, balance: newBalance };
        }

        if (payLater) {
            // Just notify and finish
            alert(`Devolución registrada. Deuda de $${fee} cargada a ${selectedOrder.customer?.name}`);
            await loadData();
            setShowReturnModal(false);
            setSelectedOrder(null);
        } else {
            // Pay Now: Redirect to POS
            // Pass the customer with the NEW negative balance
            navigate('/', { 
                state: { 
                    action: 'pay_late_fee', 
                    customer: updatedCustomer,
                    amount: fee,
                    refTicket: selectedOrder.id
                } 
            });
        }

    } catch (error) {
        console.error(error);
        alert("Error al procesar devolución.");
    }
  };

  // Filter Logic
  const filteredOrders = activeRentals.filter(o => {
      const matchesSearch = 
        o.id?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // An order is "Returned" if its status is already returned OR if EVERY rental item has a returnedAt
      const allRentedItemsReturned = o.items
        .filter(i => i.transactionType === 'rent')
        .every(i => i.returnedAt);

      const isReturned = o.status === 'returned' || o.status === 'returned_late' || allRentedItemsReturned;
      
      if (viewMode === 'active') return matchesSearch && !isReturned;
      return matchesSearch && isReturned;
  });

  // Calculate history for modal
  const customerHistoryList = useMemo(() => {
      if (!historyCustomer) return [];
      return allOrders.filter(o => o.customer?.id === historyCustomer.id);
  }, [historyCustomer, allOrders]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col">
       <header className="mb-6 flex flex-col md:flex-row justify-between items-end md:items-center gap-4 flex-shrink-0">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 uppercase">
            <RotateCcw className="w-8 h-8 text-indigo-600" />
            DEVOLUCIONES
           </h1>
           <p className="text-slate-500 mt-2 uppercase">CONTROL DE RENTAS Y ENTREGAS</p>
        </div>
        
        {/* Toggle View */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm">
            <button 
                onClick={() => setViewMode('active')}
                className={`px-6 py-2 rounded-xl text-sm font-bold uppercase transition-all ${viewMode === 'active' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                Pendientes
            </button>
            <button 
                onClick={() => setViewMode('history')}
                className={`px-6 py-2 rounded-xl text-sm font-bold uppercase transition-all ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                Historial
            </button>
        </div>
      </header>

      {/* Search */}
      <div className="relative mb-6 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
              type="text" 
              placeholder="BUSCAR POR TICKET O NOMBRE DE CLIENTE..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all uppercase placeholder:normal-case"
          />
      </div>

      {/* Dense Table View */}
      <div className="flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="overflow-x-auto flex-1">
             <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10">
                     <tr>
                         <th className="px-6 py-4">Ticket</th>
                         <th className="px-6 py-4">Cliente</th>
                         <th className="px-6 py-4">Contacto</th>
                         <th className="px-6 py-4">Artículos en Renta</th>
                         <th className="px-6 py-4">Fecha Entrega</th>
                         <th className="px-6 py-4">Fecha Devolución</th>
                         <th className="px-6 py-4 text-center">Estado</th>
                         {viewMode === 'active' && <th className="px-6 py-4 text-right">Acción</th>}
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm">
                     {loading ? (
                         <tr><td colSpan={8} className="p-10 text-center text-slate-400">CARGANDO...</td></tr>
                     ) : filteredOrders.length === 0 ? (
                         <tr><td colSpan={8} className="p-20 text-center text-slate-400 uppercase font-bold opacity-50">NO HAY REGISTROS EN ESTA VISTA</td></tr>
                     ) : (
                         filteredOrders.map(order => {
                             const status = getRentalStatus(order);
                             const rentalItems = order.items.filter(i => i.transactionType === 'rent');
                             
                             return (
                                 <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                                     <td className="px-6 py-4 font-mono text-slate-500">
                                         #{order.id}
                                     </td>
                                     <td className="px-6 py-4">
                                         {/* CLICKABLE NAME */}
                                         <button 
                                            onClick={(e) => handleCustomerHistoryClick(e, order.customer)}
                                            className="font-bold text-slate-800 uppercase hover:text-indigo-600 hover:underline text-left"
                                            title="Ver historial del cliente"
                                         >
                                            {order.customer?.name}
                                         </button>
                                     </td>
                                     <td className="px-6 py-4 font-mono text-slate-600">
                                         {order.customer?.phone || '-'}
                                     </td>
                                     <td className="px-6 py-4">
                                         <div className="flex flex-col gap-1">
                                             {rentalItems.map((item, i) => (
                                                 <div key={i} className="flex items-center gap-2">
                                                     <span className={`text-xs uppercase ${item.returnedAt ? 'text-emerald-500 line-through opacity-50' : 'text-slate-600'}`}>
                                                        • {item.name}
                                                     </span>
                                                     {item.returnedAt && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                                 </div>
                                             ))}
                                         </div>
                                     </td>
                                     <td className="px-6 py-4 text-slate-500">
                                         {new Date(order.rentalStartDate || 0).toLocaleDateString()}
                                     </td>
                                     <td className="px-6 py-4">
                                         <div className={`font-mono font-bold ${status.late && viewMode === 'active' ? 'text-rose-600' : 'text-slate-800'}`}>
                                            {new Date(order.rentalEndDate || 0).toLocaleDateString()}
                                         </div>
                                     </td>
                                     <td className="px-6 py-4 text-center">
                                         <Badge color={status.color}>{status.label}</Badge>
                                     </td>
                                     {viewMode === 'active' && (
                                         <td className="px-6 py-4 text-right">
                                             <div className="flex justify-end gap-2">
                                                 {status.late ? (
                                                     <button 
                                                        onClick={() => handleLateReturnClick(order)}
                                                        className="bg-rose-100 text-rose-700 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-rose-200 transition-colors shadow-sm flex items-center gap-2"
                                                     >
                                                         <AlertTriangle className="w-4 h-4" /> REGISTRAR ATRASO
                                                     </button>
                                                 ) : (
                                                     <button 
                                                        onClick={() => handleQuickReturn(order)}
                                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 flex items-center gap-2"
                                                     >
                                                         <CheckCircle className="w-4 h-4" /> RECIBIR
                                                     </button>
                                                 )}
                                             </div>
                                         </td>
                                     )}
                                 </tr>
                             );
                         })
                     )}
                 </tbody>
             </table>
          </div>
      </div>

      {/* Late Fee Modal */}
      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="DEVOLUCIÓN CON ATRASO">
         <div className="space-y-6">
             <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
                 <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                 <div className="flex-1">
                     <h4 className="font-bold text-rose-800 uppercase flex justify-between">
                         Artículos Atrasados
                         {selectedOrder?.rentalEndDate && (
                             <span className="text-[10px] bg-rose-200 px-2 py-0.5 rounded-full text-rose-700">
                                 {Math.ceil((Date.now() - selectedOrder.rentalEndDate) / (1000 * 60 * 60 * 24))} DÍAS
                             </span>
                         )}
                     </h4>
                     <p className="text-sm text-rose-600">
                         Cliente: <strong>{selectedOrder?.customer?.name}</strong><br/>
                         Vencimiento: {new Date(selectedOrder?.rentalEndDate || 0).toLocaleDateString()}
                     </p>
                 </div>
             </div>

             <Input 
                label="MONTO DE RECARGO / MULTA" 
                placeholder="$0.00" 
                type="number" 
                autoFocus
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(e.target.value)}
                className="text-lg font-bold"
             />
             <div className="text-xs text-slate-500">
                 * Al confirmar, se registrará el adeudo en la cuenta del cliente automáticamente.
             </div>

             <div className="grid grid-cols-1 gap-3 pt-2">
                 <Button onClick={() => processLateReturn(false)} className="w-full uppercase py-4 shadow-xl">
                    <ShoppingBag className="w-5 h-5" /> COBRAR AHORA (IR A CAJA)
                 </Button>
                 <Button onClick={() => processLateReturn(true)} variant="secondary" className="w-full uppercase py-4">
                    <User className="w-5 h-5" /> CARGAR A CUENTA DEL CLIENTE
                 </Button>
             </div>
         </div>
      </Modal>

      {/* Quick Return Details Modal */}
      <Modal isOpen={showQuickReturnModal} onClose={() => setShowQuickReturnModal(false)} title="DEVOLUCIÓN DE ARTÍCULOS">
         <div className="space-y-6">
             <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-[0.05] -rotate-12">
                     <ShoppingBag className="w-24 h-24" />
                 </div>
                 <div className="relative z-10">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Cliente</div>
                    <div className="text-xl font-black text-slate-800 uppercase leading-none">{selectedOrder?.customer?.name}</div>
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-mono">
                        <Receipt className="w-3.5 h-3.5" /> TICKET #{selectedOrder?.id?.slice(-8).toUpperCase()}
                    </div>
                 </div>
             </div>

             {/* Mode Selector */}
             <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-[1.25rem] border border-slate-200">
                <button 
                    onClick={() => setReturnMode('all')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${returnMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <CheckCircle className="w-4 h-4" /> Todo
                </button>
                <button 
                    onClick={() => setReturnMode('partial')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${returnMode === 'partial' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <AlertTriangle className="w-4 h-4" /> Parcial
                </button>
             </div>

             <div className="space-y-3">
                 {returnMode === 'all' ? (
                     <div className="space-y-3">
                         <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Artículos a recibir (Todos)</div>
                         <div className="space-y-2">
                             {selectedOrder?.items
                                .filter(i => i.transactionType === 'rent' && !i.returnedAt)
                                .map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                        <span className="font-black text-emerald-900 uppercase text-xs truncate flex-1">{item.name}</span>
                                        <Badge color="green" className="text-[9px]">OK</Badge>
                                    </div>
                                ))
                             }
                             {selectedOrder?.items.filter(i => i.transactionType === 'rent' && !i.returnedAt).length === 0 && (
                                 <div className="text-center py-4 text-slate-400 uppercase text-xs italic">No hay artículos pendientes de devolución</div>
                             )}
                         </div>
                     </div>
                 ) : (
                    <>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center px-1">
                            <span>Artículos entregados hoy</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        const pending = selectedOrder?.items
                                            .map((item, idx) => ({ item, idx }))
                                            .filter(({ item }) => item.transactionType === 'rent' && !item.returnedAt)
                                            .map(({ idx }) => idx) || [];
                                        setItemsToReturn(pending);
                                    }}
                                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase"
                                >
                                    Todos
                                </button>
                                <span className="text-slate-200">|</span>
                                <button 
                                    onClick={() => setItemsToReturn([])}
                                    className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase"
                                >
                                    Ninguno
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
                            {selectedOrder?.items.filter(i => i.transactionType === 'rent').map((item, i) => {
                                const originalIndex = selectedOrder.items.indexOf(item);
                                const isSelected = itemsToReturn.includes(originalIndex) || !!item.returnedAt;
                                const alreadyReturned = !!item.returnedAt;

                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => {
                                            if (alreadyReturned) return;
                                            setItemsToReturn(prev => 
                                                prev.includes(originalIndex) 
                                                    ? prev.filter(idx => idx !== originalIndex)
                                                    : [...prev, originalIndex]
                                            );
                                        }}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                            alreadyReturned 
                                                ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                                                : itemsToReturn.includes(originalIndex)
                                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                                    : 'bg-white border-slate-100 hover:border-indigo-100'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors ${
                                            alreadyReturned || itemsToReturn.includes(originalIndex)
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'bg-white border-slate-200 text-transparent'
                                        }`}>
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-black uppercase text-xs truncate ${alreadyReturned || itemsToReturn.includes(originalIndex) ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {item.name}
                                            </div>
                                            <div className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                                                {alreadyReturned ? 'Recibido Anteriormente' : itemsToReturn.includes(originalIndex) ? 'Entrega Actual' : 'Pendiente'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                 )}
             </div>

             <div className="pt-2 space-y-3">
                 <Button 
                    disabled={returnMode === 'partial' && itemsToReturn.length === 0}
                    onClick={confirmQuickReturn} 
                    className={`w-full uppercase py-6 shadow-2xl text-base font-black tracking-widest transition-all ${returnMode === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : ''}`}
                >
                    {returnMode === 'all' ? 'CONFIRMAR ENTREGA COMPLETA' : `RECIBIR ${itemsToReturn.length} ARTÍCULOS`}
                 </Button>
                 <button 
                    onClick={() => setShowQuickReturnModal(false)}
                    className="w-full py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                 >
                    Cancelar
                 </button>
             </div>
         </div>
      </Modal>

      {/* History Modal (Similar to Customers Page) */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`HISTORIAL: ${historyCustomer?.name}`}
      >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
             {customerHistoryList.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 uppercase">SIN MOVIMIENTOS REGISTRADOS</div>
             ) : (
                 customerHistoryList.map(order => (
                     <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                 <div className="font-bold text-slate-800 flex items-center gap-2">
                                     <Receipt className="w-4 h-4 text-slate-400" />
                                     TICKET #{order.id?.slice(-6)}
                                 </div>
                                 <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                             </div>
                             <div className="font-mono font-bold text-slate-700">${order.total.toFixed(2)}</div>
                         </div>
                         <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
                             {order.items.map((item, i) => (
                                 <div key={i} className="flex justify-between">
                                     <span className="uppercase">{item.name}</span>
                                     <span className="text-slate-400">x{item.quantity}</span>
                                 </div>
                             ))}
                         </div>
                         <div className="mt-2 text-right">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${order.status === 'refunded' ? 'bg-amber-100 text-amber-700' : (order.status.includes('returned') ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700')}`}>
                                 {order.status === 'refunded' ? 'REEMBOLSADO' : (order.status.includes('returned') ? 'FINALIZADO' : 'ACTIVO')}
                             </span>
                         </div>
                     </div>
                 ))
             )}
          </div>
          <div className="pt-4">
               <Button variant="secondary" onClick={() => setShowHistoryModal(false)} className="w-full uppercase">CERRAR</Button>
          </div>
      </Modal>
    </div>
  );
};

export default Returns;
