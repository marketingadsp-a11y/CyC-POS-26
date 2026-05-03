import React, { useState, useEffect, useMemo } from 'react';
import { CalendarClock, Search, CheckCircle, User, Phone, Calendar, ArrowRight, X, AlertCircle } from 'lucide-react';
import { Order } from '../types';
import { getOrders, updateOrder } from '../services/dataService';
import { Button, Input, Modal, Badge } from '../components/UI';

const Reservations: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Finalize Modal
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const allOrders = await getOrders();
        // Filter reservations: Status 'reservation'
        const reservations = allOrders.filter(o => o.status === 'reservation');
        setOrders(reservations);
        setLoading(false);
    };

    const filteredReservations = useMemo(() => {
        const q = searchQuery.toUpperCase();
        return orders.filter(o => 
            o.id?.includes(q) ||
            o.customer?.name.includes(q) || 
            o.customer?.phone.includes(q)
        );
    }, [orders, searchQuery]);

    const handleCardClick = (order: Order) => {
        setSelectedOrder(order);
        setPaymentMethod('cash');
        setShowModal(true);
    };

    const handleFinalize = async () => {
        if (!selectedOrder || !selectedOrder.id) return;

        try {
            // Update order to 'pending' (active) and set finalizedAt
            // 'pending' is the status for active rentals/sales in this system based on POS.tsx
            await updateOrder(selectedOrder.id, {
                status: 'pending',
                finalizedAt: Date.now(),
                paymentMethod: paymentMethod, 
                remainingBalance: 0
            });
            
            alert("Apartado liquidado y entregado.");
            setShowModal(false);
            loadData();
        } catch (e) {
            console.error(e);
            alert("Error al finalizar apartado.");
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 uppercase">
                    <CalendarClock className="w-8 h-8 text-amber-500" />
                    APARTADOS
                </h1>
                <p className="text-slate-500 mt-1 text-sm uppercase">GESTIÓN DE RESERVAS Y LIQUIDACIONES</p>
            </header>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="BUSCAR POR FOLIO O NOMBRE DE CLIENTE..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all uppercase"
                />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pb-24">
                {loading ? (
                    <div className="text-center py-10 text-slate-400 uppercase">CARGANDO APARTADOS...</div>
                ) : filteredReservations.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 uppercase flex flex-col items-center">
                        <CalendarClock className="w-12 h-12 mb-2 opacity-20" />
                        NO SE ENCONTRARON APARTADOS PENDIENTES
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReservations.map(order => (
                            <div 
                                key={order.id} 
                                onClick={() => handleCardClick(order)}
                                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer active:scale-95 group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <Badge color="amber">APARTADO</Badge>
                                        <div className="font-mono font-black text-slate-800 text-3xl mt-2 tracking-tighter">#{order.id?.slice(-6)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold uppercase text-slate-400">ENTREGA</div>
                                        <div className="font-bold text-indigo-600 text-lg">
                                            {order.rentalStartDate ? new Date(order.rentalStartDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-bold text-slate-800 uppercase truncate">{order.customer?.name}</div>
                                        <div className="text-xs text-slate-500 font-mono">{order.customer?.phone}</div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase text-slate-400">PENDIENTE DE PAGO</div>
                                            <div className="text-2xl font-black text-rose-500 font-mono">
                                                ${(order.remainingBalance || 0).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold uppercase text-slate-400">ANTICIPO</div>
                                            <div className="text-sm font-bold text-emerald-600 font-mono">
                                                ${(order.downPayment || 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Finalize Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="LIQUIDAR APARTADO">
                {selectedOrder && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                             <div className="flex justify-between items-center mb-2">
                                 <h3 className="font-bold text-slate-700 uppercase">RESUMEN</h3>
                                 <span className="font-mono text-slate-400">#{selectedOrder.id}</span>
                             </div>
                             <div className="text-2xl font-bold text-slate-800 uppercase mb-1">{selectedOrder.customer?.name}</div>
                             <div className="text-xs text-slate-500 uppercase">
                                 {selectedOrder.items.length} ARTÍCULOS: {selectedOrder.items.map(i => i.name).join(', ').substring(0, 50)}...
                             </div>
                        </div>

                        <div className="text-center py-4">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">MONTO A LIQUIDAR</div>
                            <div className="text-5xl font-black text-slate-800 font-mono tracking-tight">
                                ${(selectedOrder.remainingBalance || 0).toFixed(2)}
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">MÉTODO DE PAGO</label>
                             <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-3 rounded-lg font-bold uppercase text-sm transition-all ${paymentMethod === 'cash' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                                    EFECTIVO
                                </button>
                                <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-3 rounded-lg font-bold uppercase text-sm transition-all ${paymentMethod === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                                    TARJETA
                                </button>
                                <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-3 rounded-lg font-bold uppercase text-sm transition-all ${paymentMethod === 'transfer' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                                    TRANSFER
                                </button>
                            </div>
                        </div>

                        <div className="pt-2 grid grid-cols-2 gap-4">
                            <Button variant="secondary" onClick={() => setShowModal(false)} className="uppercase h-12">CANCELAR</Button>
                            <Button onClick={handleFinalize} className="uppercase h-12 shadow-xl">
                                <CheckCircle className="w-5 h-5" /> CONFIRMAR ENTREGA
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Reservations;