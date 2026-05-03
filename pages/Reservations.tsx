
import React, { useState, useEffect } from 'react';
import { CalendarClock, Search, ArrowRight, User, ShoppingBag, CheckCircle, CreditCard, DollarSign, Wallet, ArrowUpRight } from 'lucide-react';
import { Button, Input, Modal, Badge } from '../components/UI';
import { Order } from '../types';
import { getOrders, updateOrder } from '../services/dataService';

const Reservations: React.FC = () => {
    const [reservations, setReservations] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal State
    const [selectedReservation, setSelectedReservation] = useState<Order | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [amountTendered, setAmountTendered] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getOrders();
        // Filter only 'reservation' status
        const list = data.filter(o => o.status === 'reservation');
        // Sort by delivery date (soonest first)
        list.sort((a, b) => (a.rentalStartDate || 0) - (b.rentalStartDate || 0));
        setReservations(list);
        setLoading(false);
    };

    const handleOpenPayment = (order: Order) => {
        setSelectedReservation(order);
        setPaymentMethod('cash');
        setAmountTendered(''); // Clear input, user must type remaining or tendered amount
        setShowPaymentModal(true);
    };

    const confirmFinalize = async () => {
        if (!selectedReservation || !selectedReservation.id) return;
        
        const balance = selectedReservation.remainingBalance || 0;
        const tendered = parseFloat(amountTendered) || 0;

        if (paymentMethod === 'cash' && tendered < balance) {
            alert("El monto recibido es menor al saldo pendiente.");
            return;
        }

        try {
            // Update Status to Pending (Active Rental)
            // CRITICAL: We record 'finalizedAt' to track when the remaining balance was paid.
            // We do NOT clear remainingBalance in the DB object yet, so reports can read it later.
            await updateOrder(selectedReservation.id, {
                status: 'pending',
                finalizedAt: Date.now(), // Marks the date of second payment
                // Note: We keep remainingBalance > 0 in the record to know how much was paid on this date.
            });

            alert(`Apartado liquidado. El disfraz ahora está en RENTA ACTIVA.`);
            setShowPaymentModal(false);
            setSelectedReservation(null);
            loadData();

        } catch (e) {
            alert("Error al finalizar el apartado.");
        }
    };

    const filteredReservations = reservations.filter(r => 
        r.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
            <header className="mb-6 flex flex-col md:flex-row justify-between items-end md:items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 uppercase">
                        <CalendarClock className="w-8 h-8 text-indigo-600" />
                        APARTADOS
                    </h1>
                    <p className="text-slate-500 mt-2 uppercase">GESTIÓN DE DISFRACES RESERVADOS</p>
                </div>
            </header>

            {/* Search */}
            <div className="relative mb-6 flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="BUSCAR POR TICKET O CLIENTE..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all uppercase placeholder:normal-case"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-24">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">CARGANDO...</div>
                ) : filteredReservations.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                        <CalendarClock className="w-16 h-16 mb-4 opacity-30" />
                        <span className="uppercase">NO HAY APARTADOS PENDIENTES</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReservations.map(order => (
                            <div key={order.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <Badge color="amber">APARTADO</Badge>
                                        {/* Large Ticket ID */}
                                        <div className="font-mono font-black text-slate-800 text-4xl mt-2 tracking-tighter">#{order.id?.slice(-6)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold uppercase text-slate-400">ENTREGA</div>
                                        <div className="font-bold text-indigo-600 text-lg">
                                            {new Date(order.rentalStartDate || 0).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-bold text-slate-800 uppercase truncate">{order.customer?.name}</div>
                                        <div className="text-xs text-slate-500">{order.customer?.phone}</div>
                                    </div>
                                </div>

                                <div className="flex-1 mb-4">
                                    <div className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                                        <ShoppingBag className="w-3 h-3" /> ARTÍCULOS ({order.items.length})
                                    </div>
                                    <div className="space-y-1">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="text-sm text-slate-600 uppercase truncate">• {item.name}</div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4 mt-auto">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500">TOTAL ORDEN</span>
                                        <span className="font-bold text-slate-700">${order.total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="text-slate-500">ANTICIPO</span>
                                        <span className="font-bold text-emerald-600">-${(order.downPayment || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl mb-4">
                                        <span className="font-bold text-indigo-800 text-sm uppercase">RESTA POR PAGAR</span>
                                        <span className="font-black text-indigo-700 text-xl font-mono">${(order.remainingBalance || 0).toFixed(2)}</span>
                                    </div>

                                    <Button onClick={() => handleOpenPayment(order)} className="w-full uppercase shadow-lg">
                                        LIQUIDAR Y ENTREGAR <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* PAYMENT MODAL */}
            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="LIQUIDAR APARTADO">
                 <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">SALDO PENDIENTE</div>
                        <div className="text-4xl font-black text-slate-800 font-mono">${(selectedReservation?.remainingBalance || 0).toFixed(2)}</div>
                    </div>

                    {/* Payment Method Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm transition-all ${paymentMethod === 'cash' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
                            EFECTIVO
                        </button>
                        <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm transition-all ${paymentMethod === 'card' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
                            TARJETA
                        </button>
                        <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm transition-all ${paymentMethod === 'transfer' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
                            TRANSFER
                        </button>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="space-y-2">
                             <Input 
                                label="DINERO RECIBIDO" 
                                placeholder="$0.00" 
                                type="number"
                                className="text-2xl font-bold text-center"
                                value={amountTendered}
                                onChange={(e) => setAmountTendered(e.target.value)}
                                autoFocus
                            />
                            {parseFloat(amountTendered) >= (selectedReservation?.remainingBalance || 0) && (
                                <div className="text-center text-emerald-600 font-bold uppercase bg-emerald-50 p-2 rounded-lg">
                                    CAMBIO: ${(parseFloat(amountTendered) - (selectedReservation?.remainingBalance || 0)).toFixed(2)}
                                </div>
                            )}
                        </div>
                    )}

                    {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
                        <div className="text-center py-4 text-slate-400">
                             {paymentMethod === 'card' ? <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50"/> : <ArrowUpRight className="w-12 h-12 mx-auto mb-2 opacity-50"/>}
                             <p className="uppercase text-sm">PROCESAR COBRO EXTERNO</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <Button variant="secondary" onClick={() => setShowPaymentModal(false)} className="uppercase">CANCELAR</Button>
                        <Button onClick={confirmFinalize} className="uppercase shadow-lg">CONFIRMAR ENTREGA</Button>
                    </div>
                 </div>
            </Modal>
        </div>
    );
};

export default Reservations;
