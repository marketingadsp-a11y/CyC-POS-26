
import React, { useState, useEffect } from 'react';
import { CalendarClock, Search, ArrowRight, User, ShoppingBag, CheckCircle, CreditCard, DollarSign, Wallet, ArrowUpRight, ChevronDown, ChevronUp, Info, Phone, Calendar, Smartphone, Banknote, Delete, X } from 'lucide-react';
import { Button, Input, Modal, Badge } from '../components/UI';
import { Order, SystemSettings } from '../types';
import { getOrders, updateOrder, getSystemSettings } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';

const Reservations: React.FC = () => {
    const [reservations, setReservations] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [selectedReservation, setSelectedReservation] = useState<Order | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [showFullBankCard, setShowFullBankCard] = useState(false);
    
    // Image Preview State
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    
    // Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [amountTendered, setAmountTendered] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [ordersData, settingsData] = await Promise.all([
            getOrders(),
            getSystemSettings()
        ]);
        
        setSettings(settingsData);
        // Filter only 'reservation' status
        const list = ordersData.filter(o => o.status === 'reservation');
        // Sort by delivery date (soonest first)
        list.sort((a, b) => (a.rentalStartDate || 0) - (b.rentalStartDate || 0));
        setReservations(list);
        setLoading(false);
    };

    const handleKeypadPress = (val: string) => {
        if (val === 'BACK') {
            setAmountTendered(prev => prev.slice(0, -1));
        } else if (val === '.') {
            if (!amountTendered.includes('.')) {
                setAmountTendered(prev => prev + val);
            }
        } else {
            // Prevent multiple leading zeros
            if (amountTendered === '0' && val !== '.') {
                setAmountTendered(val);
            } else {
                setAmountTendered(prev => prev + val);
            }
        }
    };

    const handleOpenPayment = (order: Order) => {
        setSelectedReservation(order);
        setPaymentMethod('cash');
        setAmountTendered('');
        setShowDetailsModal(false);
        setShowPaymentModal(true);
    };

    const handleOpenDetails = (order: Order) => {
        setSelectedReservation(order);
        setShowDetailsModal(true);
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

    const filteredReservations = reservations.filter(r => {
        const matchesQuery = 
            r.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.customer?.phone.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!filterDate) return matchesQuery;
        
        // Match specific date
        const reservationDate = new Date(r.rentalStartDate || 0).toISOString().split('T')[0];
        return matchesQuery && reservationDate === filterDate;
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-end md:items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                        <CalendarClock className="w-10 h-10 text-indigo-600" />
                        Apartados
                    </h1>
                    <p className="text-slate-400 mt-1 uppercase text-xs font-black tracking-widest">Gestión Centralizada de Reservaciones y Liquidaciones</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <div className="px-4 py-2 bg-white rounded-xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Pendientes</span>
                        <span className="text-lg font-black text-slate-800 leading-none">{reservations.length}</span>
                    </div>
                </div>
            </header>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-6 mb-10 items-end flex-shrink-0">
                <div className="flex-1 w-full relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-2">Buscador Inteligente</label>
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text"
                            placeholder="BUSCAR POR CLIENTE, TELÉFONO O FOLIO DE TICKET..."
                            className="w-full bg-white border border-slate-200 rounded-3xl py-5 pl-14 pr-6 text-sm font-bold uppercase tracking-tight focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-full md:w-64">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-2">Filtrar por Entrega</label>
                    <div className="relative">
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input 
                            type="date"
                            className="w-full bg-white border border-slate-200 rounded-3xl py-5 pl-12 pr-6 text-sm font-bold uppercase focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all shadow-sm appearance-none"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                        {filterDate && (
                            <button 
                                onClick={() => setFilterDate('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                            >
                                <Delete className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col mb-20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24">Folio</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Entrega</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumen</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Cuenta</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Saldo</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                                <th className="px-4 py-5 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredReservations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center max-w-xs mx-auto">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                                <CalendarClock className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <h3 className="text-slate-800 font-black uppercase tracking-tight text-xl mb-2">Todo al día</h3>
                                            <p className="text-slate-400 text-sm font-medium">No se encontraron apartados pendientes que coincidan con tu búsqueda.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredReservations.map(order => (
                                    <tr 
                                        key={order.id}
                                        onClick={() => handleOpenDetails(order)}
                                        className={`group cursor-pointer transition-all hover:bg-slate-50/80 ${selectedReservation?.id === order.id && showDetailsModal ? 'bg-indigo-50/40' : ''}`}
                                    >
                                        <td className="px-6 py-6 transition-colors">
                                            <span className="font-mono font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">
                                                #{order.id?.slice(-5)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800 uppercase text-sm leading-tight mb-1">{order.customer?.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                                    <Phone className="w-3 h-3" /> {order.customer?.phone}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="inline-flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrega</span>
                                                <Badge color={ (order.rentalStartDate || 0) < Date.now() ? 'rose' : 'blue' } className="font-mono text-xs py-1 px-2">
                                                    {new Date(order.rentalStartDate || 0).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase()}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                    {order.items.slice(0, 3).map((item, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className={`w-7 h-7 rounded-lg ring-2 ring-white bg-slate-100 overflow-hidden flex-shrink-0 relative group/item ${item.imageUrl ? 'cursor-zoom-in' : ''}`}
                                                            title={item.name}
                                                            onClick={() => {
                                                                if (item.imageUrl) {
                                                                    setPreviewImageUrl(item.imageUrl);
                                                                    setShowImageModal(true);
                                                                }
                                                            }}
                                                        >
                                                            {item.imageUrl ? (
                                                                <img src={item.imageUrl} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" referrerPolicy="no-referrer" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                                    <ShoppingBag className="w-3.5 h-3.5 text-slate-300" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {order.items.length > 3 && (
                                                        <div className="w-7 h-7 rounded-lg ring-2 ring-white bg-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                                                            +{order.items.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                                    {order.items.length} {order.items.length === 1 ? 'Art.' : 'Arts.'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</span>
                                                <span className="font-black text-slate-500 text-sm">${order.total.toFixed(2)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pendiente</span>
                                                <div className="bg-amber-400/10 px-2 py-1 rounded-md">
                                                    <span className="font-black text-amber-700 font-mono text-base">${(order.remainingBalance || 0).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <Badge color="amber" className="text-[9px] px-2 py-0.5 font-black tracking-widest">
                                                POR LIQUIDAR
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-6" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleOpenDetails(order)} 
                                                className="w-10 h-10 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group/btn"
                                                title="Ver Detalles"
                                            >
                                                <Info className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ORDER DETAILS MODAL - ULTRA COMPACT VIEW */}
            <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="RESUMEN DE APARTADO" maxWidth="max-w-4xl">
                {selectedReservation && (
                    <div className="p-1">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-1 px-4 pb-6">
                            {/* Left: Compact Items List */}
                            <div className="md:col-span-7 space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Artículos en Reserva</h4>
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{selectedReservation.items.length} TOTAL</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {selectedReservation.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl group/card">
                                            <div 
                                                className={`w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 ${item.imageUrl ? 'cursor-zoom-in' : ''}`}
                                                onClick={() => {
                                                    if (item.imageUrl) {
                                                        setPreviewImageUrl(item.imageUrl);
                                                        setShowImageModal(true);
                                                    }
                                                }}
                                            >
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} className="w-full h-full object-cover hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ShoppingBag className="w-6 h-6 text-slate-200" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-black text-slate-800 uppercase truncate text-xs tracking-tight leading-none mb-1">{item.name}</div>
                                                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">SKU: {item.id?.slice(-5).toUpperCase()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-indigo-600 text-sm font-mono tracking-tighter leading-none">${(item.appliedPrice || 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Streamlined Info */}
                            <div className="md:col-span-5 flex flex-col gap-4 mt-4 md:mt-0 md:pl-6 md:border-l md:border-slate-100">
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Información del Cliente</div>
                                        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-400 uppercase text-[9px]">Nombre</span>
                                                <span className="font-black text-slate-800 uppercase">{selectedReservation.customer?.name}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-400 uppercase text-[9px]">Teléfono</span>
                                                <span className="font-black text-slate-800">{selectedReservation.customer?.phone}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-400 uppercase text-[9px]">Fecha Entrega</span>
                                                <span className="font-black text-indigo-600">{new Date(selectedReservation.rentalStartDate || 0).toLocaleDateString().toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 rounded-3xl p-5 text-center shadow-lg shadow-indigo-100">
                                        <div className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.2em] mb-1">Total Saldo Pendiente</div>
                                        <div className="text-4xl font-black text-white font-mono tracking-tighter leading-none mb-1">
                                            ${(selectedReservation.remainingBalance || 0).toFixed(2)}
                                        </div>
                                        <div className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">A pagar por: {selectedReservation.customer?.name.split(' ')[0]}</div>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-2">
                                    <button 
                                        onClick={() => handleOpenPayment(selectedReservation)} 
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-indigo-200"
                                    >
                                        LIQUIDAR Y ENTREGAR <ArrowRight className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setShowDetailsModal(false)}
                                        className="w-full py-3 bg-white text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                                    >
                                        Cerrar Detalles
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* IMAGE PREVIEW MODAL */}
            <AnimatePresence>
                {showImageModal && (
                    <div 
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
                        onClick={() => setShowImageModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-4xl w-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setShowImageModal(false)}
                                className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <img 
                                src={previewImageUrl || ''} 
                                className="w-full h-auto max-h-[85vh] object-contain rounded-3xl shadow-2xl ring-4 ring-white/10" 
                                referrerPolicy="no-referrer"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PAYMENT MODAL */}
            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="LIQUIDAR APARTADO" maxWidth="max-w-[1500px]">
                 <div className="flex flex-col md:flex-row gap-6">
                    {/* LEFT SIDE: Info & Payment Methods */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resumen de Cuenta</div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500 font-bold uppercase text-xs">Total de la Orden</span>
                                <span className="font-bold text-slate-700">${(selectedReservation?.total || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-500 font-bold uppercase text-xs">Anticipo Pagado</span>
                                <span className="font-bold text-emerald-600">-${(selectedReservation?.downPayment || 0).toFixed(2)}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-slate-800 font-black uppercase text-sm">Saldo Pendiente</span>
                                <span className="text-4xl font-black text-indigo-700 font-mono">${(selectedReservation?.remainingBalance || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Method Tabs */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                            <button 
                                onClick={() => {
                                    setPaymentMethod('cash');
                                    setAmountTendered('');
                                }} 
                                className={`py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'bg-white shadow-xl text-indigo-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Wallet className="w-5 h-5" /> EFECTIVO
                            </button>
                            <button 
                                onClick={() => {
                                    setPaymentMethod('card');
                                    setAmountTendered((selectedReservation?.remainingBalance || 0).toString());
                                }} 
                                className={`py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'bg-white shadow-xl text-indigo-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <CreditCard className="w-5 h-5" /> TARJETA
                            </button>
                            <button 
                                onClick={() => {
                                    setPaymentMethod('transfer');
                                    setAmountTendered((selectedReservation?.remainingBalance || 0).toString());
                                }} 
                                className={`py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex flex-col items-center gap-1 ${paymentMethod === 'transfer' ? 'bg-white shadow-xl text-indigo-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ArrowUpRight className="w-5 h-5" /> TRANSFER
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Button variant="secondary" onClick={() => setShowPaymentModal(false)} className="uppercase py-4 font-black tracking-widest">CANCELAR</Button>
                            <Button 
                                onClick={confirmFinalize} 
                                className="uppercase shadow-2xl py-4 font-black tracking-widest ring-4 ring-indigo-50"
                                disabled={paymentMethod === 'cash' && (!amountTendered || parseFloat(amountTendered) < (selectedReservation?.remainingBalance || 0))}
                            >
                                <CheckCircle className="w-5 h-5 mr-2" /> FINALIZAR ENTREGA
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT SIDE: Keypad or Bank Card */}
                    <div className="flex-1 bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col border border-slate-800">
                        <div className="absolute top-2 right-8 text-white/5 font-black text-8xl italic select-none">POS</div>
                        
                        {paymentMethod === 'transfer' ? (
                            /* TRANSFER MODE: BANK CARD VIEW */
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="text-center mb-8">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4">
                                        MUESTRA LA SIGUIENTE TARJETA AL CLIENTE PARA LA TRANSFERENCIA
                                    </label>
                                    
                                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden text-left aspect-[1.6/1]">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                            {settings?.logoUrl ? (
                                                <img src={settings.logoUrl} className="w-32 h-32 object-contain" referrerPolicy="no-referrer" />
                                            ) : (
                                                <CreditCard className="w-32 h-32" />
                                            )}
                                        </div>
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex items-center gap-3">
                                                {settings?.logoUrl && <img src={settings.logoUrl} className="w-10 h-10 object-contain brightness-0 invert" referrerPolicy="no-referrer" />}
                                                <span className="text-2xl font-black italic tracking-widest uppercase">{settings?.bankName || 'BANCO'}</span>
                                            </div>
                                            <div className="w-14 h-10 bg-amber-400 rounded-lg opacity-80 shadow-inner" />
                                        </div>
                                        <div className="mb-8">
                                            <div className="text-[10px] opacity-60 uppercase mb-1 font-black tracking-widest">Número de Tarjeta / CLABE</div>
                                            <div className="text-2xl font-mono tracking-[0.1em] font-black">{settings?.bankAccountNumber || '0000 0000 0000 0000'}</div>
                                        </div>
                                        <div className="flex justify-between items-end mt-auto">
                                            <div>
                                                <div className="text-[10px] opacity-60 uppercase mb-1 font-black tracking-widest">Titular</div>
                                                <div className="text-sm font-black uppercase tracking-tight">{settings?.bankAccountName || 'TITULAR DE LA CUENTA'}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] opacity-60 uppercase mb-1 font-black tracking-widest">Importe</div>
                                                <div className="text-xl font-black font-mono tracking-tight">${(selectedReservation?.remainingBalance || 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    variant="ghost" 
                                    onClick={() => setShowFullBankCard(true)}
                                    className="bg-white/5 hover:bg-white/10 text-white uppercase text-xs font-black border border-white/5 py-4 rounded-2xl"
                                >
                                    <Smartphone className="w-5 h-5 mr-3 text-indigo-400" /> VISTA PANTALLA COMPLETA
                                </Button>
                            </div>
                        ) : (
                            /* NORMAL MODE: KEYPAD */
                            <>
                                <div className="mb-8 relative z-10">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4 text-center">
                                        TECLEE MONTO RECIBIDO
                                    </label>
                                    <div className="text-center flex items-center justify-center gap-3">
                                        <span className="text-indigo-400 text-3xl font-black">$</span>
                                        <span className="text-6xl font-black text-white font-mono tracking-tighter">
                                            {amountTendered || '0'}
                                        </span>
                                        <motion.span 
                                            animate={{ opacity: [0, 1, 0] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            className="inline-block w-1.5 h-14 bg-indigo-500 ml-1"
                                        />
                                    </div>
                                    {paymentMethod === 'cash' && amountTendered && parseFloat(amountTendered) >= (selectedReservation?.remainingBalance || 0) && (
                                        <div className="mt-4 text-center">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">SU CAMBIO ES DE</span>
                                            <span className="text-2xl font-black text-emerald-400 font-mono italic">
                                                ${(parseFloat(amountTendered) - (selectedReservation?.remainingBalance || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-8 relative z-10 flex-1">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'BACK'].map((key) => (
                                        <button
                                            key={key.toString()}
                                            onClick={() => handleKeypadPress(key.toString())}
                                            className={`rounded-[1.5rem] flex items-center justify-center text-2xl font-black transition-all active:scale-90 ${
                                                key === 'BACK' 
                                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20' 
                                                : 'bg-white/5 text-white border border-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            {key === 'BACK' ? <Delete className="w-8 h-8" /> : key}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                 </div>
            </Modal>

            {/* FULL SCREEN BANK CARD MODAL */}
            <Modal isOpen={showFullBankCard} onClose={() => setShowFullBankCard(false)} title="DATOS BANCARIOS" maxWidth="max-w-4xl">
                <div className="flex flex-col items-center py-8">
                    <div className="bg-gradient-to-br from-indigo-700 to-slate-900 w-full max-w-2xl rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden ring-8 ring-indigo-50">
                        <div className="absolute top-0 right-0 p-16 opacity-10">
                             {settings?.logoUrl ? (
                                <img src={settings.logoUrl} className="w-80 h-80 object-contain" referrerPolicy="no-referrer" />
                            ) : (
                                <Banknote className="w-80 h-80" />
                            )}
                        </div>
                        <div className="flex justify-between items-start mb-16">
                            <span className="text-4xl font-black italic tracking-widest uppercase">{settings?.bankName || 'BANCO'}</span>
                            <div className="w-20 h-16 bg-amber-400 rounded-xl shadow-lg opacity-90" />
                        </div>
                        <div className="mb-20">
                            <div className="text-sm opacity-60 uppercase mb-4 tracking-widest font-black">Número de Tarjeta / CLABE</div>
                            <div className="text-4xl md:text-5xl font-mono tracking-[0.1em] font-black drop-shadow-lg">
                                {settings?.bankAccountNumber || '0000 0000 0000 0000'}
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-sm opacity-60 uppercase mb-2 tracking-widest font-black">Titular de la Cuenta</div>
                                <div className="text-2xl font-black uppercase tracking-tight">{settings?.bankAccountName || 'TITULAR'}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm opacity-60 uppercase mb-2 tracking-widest font-black">Importe de Liquidación</div>
                                <div className="text-4xl font-black">${(selectedReservation?.remainingBalance || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    <p className="mt-12 text-slate-400 font-bold uppercase tracking-widest text-sm">MUESTRA ESTA TARJETA PARA RECIBIR LA TRANSFERENCIA</p>
                    <Button 
                        onClick={() => setShowFullBankCard(false)}
                        className="mt-8 py-4 px-12 bg-slate-900 text-white rounded-full uppercase font-black tracking-widest text-lg shadow-2xl"
                    >
                        CERRAR VISTA
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Reservations;
