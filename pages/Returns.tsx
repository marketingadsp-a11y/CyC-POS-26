
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
  const handleQuickReturn = async (order: Order) => {
    if(!confirm(`¿Confirmar recepción de artículos del Ticket #${order.id}?`)) return;

    try {
        await updateOrder(order.id!, {
            status: 'returned',
            returnedAt: Date.now()
        });
        
        alert("Devolución registrada correctamente.");
        loadData(); // Reload to update lists
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
      
      const isReturned = o.status === 'returned' || o.status === 'returned_late';
      
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
                         <th className="px-6 py-4">Contacto</th> {/* NEW COLUMN */}
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
                                             {rentalItems.slice(0, 2).map((item, i) => (
                                                 <span key={i} className="text-slate-600 uppercase text-xs">• {item.name}</span>
                                             ))}
                                             {rentalItems.length > 2 && (
                                                 <span className="text-[10px] text-slate-400 italic">+ {rentalItems.length - 2} más</span>
                                             )}
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
