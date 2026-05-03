
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, Printer, Clock, Receipt, User, Calendar, CreditCard, ShoppingBag, ChevronRight, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order, CartItem, SystemSettings, User as UserType } from '../types';
import { getOrders, getSystemSettings, updateOrder } from '../services/dataService';
import { Button, Modal, Input, Badge, ReceiptTemplate, ReceiptV1, ReceiptV2 } from '../components/UI';

const Tickets: React.FC<{ user: UserType }> = ({ user }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings>();

  const canRefund = user.role === 'admin' || user.permissions?.canRefund;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const [data, s] = await Promise.all([getOrders(), getSystemSettings()]);
      setOrders(data);
      setSettings(s);
      setLoading(false);
  }

  // Determine Rental Status for an Order
  const getRentalStatus = (order: Order) => {
      if (order.status === 'refunded') return { status: 'refunded', label: 'REEMBOLSADO', color: 'amber' as const, late: false };
      
      if (order.status === 'reservation') return { status: 'reservation', label: 'APARTADO', color: 'amber' as const, late: false };

      if (!order.items.some(i => i.transactionType === 'rent')) return null; // Not a rental
      
      // If manually marked as returned
      if (order.status === 'returned' || order.status === 'returned_late') {
          return { status: 'returned', label: 'DEVUELTO', color: 'green' as const, late: order.status === 'returned_late' };
      }

      const now = Date.now();
      const end = order.rentalEndDate || 0;
      
      // Add a small buffer (e.g., end of the day) if needed, but here we assume strict timestamp
      if (now > end) {
          return { status: 'late', label: 'ATRASO', color: 'rose' as const, late: true };
      }

      return { status: 'active', label: 'RENTADO', color: 'indigo' as const, late: false };
  };

  // Group orders by Date
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    
    // Filter first
    const filtered = orders.filter(o => 
       o.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       o.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       o.total.toString().includes(searchQuery)
    );

    filtered.forEach(order => {
      const dateKey = new Date(order.createdAt).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      // Capitalize first letter
      const formattedDate = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);
      
      if (!groups[formattedDate]) {
        groups[formattedDate] = [];
      }
      groups[formattedDate].push(order);
    });

    return groups;
  }, [orders, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleRefund = async () => {
      if (!selectedOrder) return;
      if (!confirm(`¿Estás seguro de REEMBOLSAR el ticket #${selectedOrder.id}? \n\nEsta acción no elimina el registro, pero lo marcará como reembolsado y se descontará de los reportes.`)) return;

      try {
          await updateOrder(selectedOrder.id!, { status: 'refunded' });
          alert("Ticket marcado como reembolsado.");
          setSelectedOrder(prev => prev ? { ...prev, status: 'refunded' } : null);
          loadData();
      } catch (e) {
          alert("Error al procesar reembolso.");
      }
  };

  // Dynamic Preview Component
  const TicketPreview = useMemo(() => {
      if (!selectedOrder) return null;
      const props = {
          order: selectedOrder,
          businessName: settings?.businessName || 'CyC POS 26',
          businessTagline: settings?.businessTagline || 'DISFRACES & ACCESORIOS',
          currentUser: user
      };

      return settings?.receiptTemplate === 'v2' 
        ? <ReceiptV2 {...props} /> 
        : <ReceiptV1 {...props} />;
  }, [selectedOrder, settings, user]);

  return (
    <div className="flex h-full flex-col lg:flex-row bg-white overflow-hidden">
      {/* Shared Receipt Component (Visible only when Printing) */}
      <ReceiptTemplate order={selectedOrder} settings={settings} />

      {/* LEFT PANEL: Ticket List - REDUCED WIDTH */}
      <div className={`w-full lg:w-[280px] xl:w-[320px] flex flex-col border-r border-slate-200 bg-white h-full transition-all duration-300 ${selectedOrder ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-3 bg-indigo-600 text-white flex justify-between items-center flex-shrink-0">
             <div className="flex items-center gap-2">
                 <Receipt className="w-5 h-5" />
                 <h1 className="text-lg font-bold uppercase">Recibos</h1>
             </div>
             <div className="text-[10px] font-mono bg-indigo-500 px-1.5 py-0.5 rounded">
                 {orders.length}
             </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="BUSCAR..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none uppercase"
                />
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
            {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs uppercase">Cargando...</div>
            ) : Object.keys(groupedOrders).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs uppercase">Sin resultados</div>
            ) : (
                Object.entries(groupedOrders).map(([date, dateOrders]) => (
                    <div key={date}>
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-indigo-600 uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10 backdrop-blur-sm bg-slate-50/90 truncate">
                            {date}
                        </div>
                        {(dateOrders as Order[]).map(order => {
                            const rStatus = getRentalStatus(order);
                            return (
                                <div 
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`px-3 py-3 border-b border-slate-50 cursor-pointer hover:bg-indigo-50 transition-colors flex justify-between items-center group relative ${selectedOrder?.id === order.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`p-2 rounded-full flex-shrink-0 ${order.status === 'refunded' ? 'bg-amber-100 text-amber-600' : (order.status.includes('returned') ? 'bg-emerald-100 text-emerald-600' : (rStatus?.status === 'late' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'))}`}>
                                            {order.items.length > 2 ? <ShoppingBag className="w-4 h-4"/> : <Receipt className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-800 text-sm truncate">
                                                ${order.total.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center flex-wrap gap-1 mt-0.5">
                                                <span>#{order.id?.slice(-4)}</span>
                                                {rStatus && (
                                                    <span className={`font-bold px-1 rounded-[4px] leading-none py-0.5 ${rStatus.color === 'rose' ? 'bg-rose-100 text-rose-600' : (rStatus.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600')}`}>
                                                        {rStatus.label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right pl-1">
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
        </div>
      </div>

      {/* RIGHT PANEL: Details / Receipt Preview */}
      <div className={`flex-1 bg-slate-100 relative flex flex-col h-full ${!selectedOrder ? 'hidden lg:flex' : 'flex'}`}>
          {selectedOrder ? (
            <>
                {/* Mobile Header for Right Panel */}
                <div className="lg:hidden bg-white p-4 flex items-center gap-3 border-b border-slate-200">
                    <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="p-2">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <span className="font-bold text-slate-800">DETALLE DEL TICKET</span>
                </div>

                {/* Toolbar */}
                <div className="p-4 flex justify-between items-center bg-white border-b border-slate-200 shadow-sm z-20">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-slate-800 uppercase">
                            VISTA PREVIA
                        </h2>
                        {selectedOrder.status === 'refunded' && (
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1 bg-amber-50 w-fit px-2 py-0.5 rounded border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> TICKET REEMBOLSADO
                            </span>
                        )}
                        {selectedOrder.status === 'reservation' && (
                            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-200">
                                <Clock className="w-3 h-3" /> APARTADO ACTIVO
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {/* ONLY AUTHORIZED USERS CAN REFUND */}
                        {selectedOrder.status !== 'refunded' && canRefund && (
                            <Button variant="danger" onClick={handleRefund} className="uppercase shadow-none bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100">
                                <RotateCcw className="w-4 h-4" /> <span className="hidden md:inline">REEMBOLSAR</span>
                            </Button>
                        )}
                        <Button onClick={handlePrint} className="uppercase shadow-lg">
                            <Printer className="w-5 h-5" /> <span className="hidden md:inline">IMPRIMIR</span>
                        </Button>
                    </div>
                </div>

                {/* Receipt Container Preview (Scaled Visual) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center bg-slate-100/50">
                    {/* Adjusted Scaling to ensure full visibility on smaller screens */}
                    <div className="scale-[0.55] sm:scale-[0.65] md:scale-[0.75] xl:scale-100 origin-top shadow-2xl transition-all duration-300 mt-4">
                         {TicketPreview}
                    </div>
                </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Receipt className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-400 uppercase mb-2">Ningún ticket seleccionado</h2>
                <p className="text-center max-w-xs text-sm uppercase">Selecciona una transacción de la lista para ver el recibo detallado</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default Tickets;
