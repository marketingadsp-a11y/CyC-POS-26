
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Order, CartItem, SystemSettings } from '../types';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden font-medium rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300",
    secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50",
    danger: "bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100/50"
  };

  const sizes = "px-6 py-3 text-sm sm:text-base";

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <input 
      className={`bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase placeholder:normal-case ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative">
      <select 
        className={`w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
      </div>
    </div>
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`glass-panel rounded-3xl p-6 shadow-sm border border-white/50 ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'indigo' | 'green' | 'rose' | 'amber' }> = ({ children, color = 'indigo' }) => {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${colors[color]}`}>
      {children}
    </span>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  
  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 uppercase">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Custom Touch Date Picker ---

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  title: string;
}

export const DatePickerModal: React.FC<DatePickerProps> = ({ isOpen, onClose, onSelect, title }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const handleDayClick = (day: number) => {
    // Format YYYY-MM-DD
    const strMonth = (month + 1).toString().padStart(2, '0');
    const strDay = day.toString().padStart(2, '0');
    onSelect(`${year}-${strMonth}-${strDay}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
          <div>
            <h3 className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-1">{title}</h3>
            <div className="text-3xl font-bold">
              {monthNames[month]} {year}
            </div>
          </div>
          <button onClick={onClose} className="bg-white/20 p-2 rounded-full hover:bg-white/30 active:scale-95 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
           <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-slate-100 rounded-xl active:bg-slate-200 text-slate-600">
             <ChevronLeft className="w-6 h-6" />
           </button>
           <span className="font-bold text-slate-700 uppercase">{monthNames[month]}</span>
           <button onClick={() => changeMonth(1)} className="p-3 hover:bg-slate-100 rounded-xl active:bg-slate-200 text-slate-600">
             <ChevronRight className="w-6 h-6" />
           </button>
        </div>

        {/* Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 mb-2 text-center">
             {['D','L','M','M','J','V','S'].map(d => (
               <div key={d} className="text-xs font-bold text-slate-400 py-1">{d}</div>
             ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all active:scale-90 ${
                    isToday 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                      : 'hover:bg-slate-100 text-slate-700 bg-slate-50'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- RECEIPT TEMPLATES (21.5cm x 8.7cm) ---

export const ReceiptV1: React.FC<{ order: Order, businessName: string, businessTagline: string, currentUser: any }> = ({ order, businessName, businessTagline, currentUser }) => {
    const hasRentals = order.items.some(i => i.transactionType === 'rent');
    const dateObj = new Date(order.createdAt);
    const formattedDate = dateObj.toLocaleDateString();
    const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Determine what monetary values to show
    const isReservation = order.status === 'reservation';
    const isFinalized = order.status !== 'reservation' && order.downPayment !== undefined;
    
    // Default: Total Payment
    let displayLabel = "TOTAL";
    let displayAmount = order.total;
    let subInfo = null;

    if (isReservation) {
        displayLabel = "ANTICIPO";
        displayAmount = order.downPayment || 0;
        subInfo = (
            <div className="text-[9px] text-right mt-1 font-bold">
                <div className="text-slate-400">TOTAL ORDEN: ${order.total.toFixed(2)}</div>
                <div className="text-rose-600">RESTA: ${(order.remainingBalance || 0).toFixed(2)}</div>
            </div>
        );
    } else if (isFinalized) {
        // It was a reservation, now picked up
        displayLabel = "LIQUIDACIÓN";
        displayAmount = order.remainingBalance || 0;
        subInfo = (
            <div className="text-[9px] text-right mt-1 font-bold">
                <div className="text-slate-400">TOTAL: ${order.total.toFixed(2)}</div>
                <div className="text-emerald-600">ANTICIPO PREVIO: -${(order.downPayment || 0).toFixed(2)}</div>
            </div>
        );
    }

    // DISCOUNT LOGIC FOR V1
    const discountValue = order.discount || 0;
    const subtotal = order.total + discountValue;

    return (
      <div 
        className="w-[21.5cm] h-[8.7cm] p-4 flex gap-4 text-slate-900 box-border overflow-hidden bg-white relative" 
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* WATERMARK FOR REFUND */}
        {order.status === 'refunded' && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-10">
                 <div className="border-4 border-slate-900 p-4 text-6xl font-black transform -rotate-12 uppercase">
                     REEMBOLSADO
                 </div>
             </div>
        )}

        {/* COLUMN 1: Business Info, Folio, Meta (25%) */}
        <div className="w-1/4 flex flex-col justify-between border-r-2 border-slate-900 pr-4">
          <div>
            {businessName && (
                <h1 className="text-xl font-black uppercase tracking-tight leading-none mb-1">{businessName}</h1>
            )}
            {businessTagline && (
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-4">{businessTagline}</p>
            )}
            
            <div className="mb-2">
              <span className="block text-[10px] font-bold uppercase text-slate-400">FOLIO DE TICKET</span>
              <span className="block text-3xl font-black text-slate-900 leading-none tracking-tight">#{order.id?.slice(-6) || '000000'}</span>
            </div>
            
            {/* QR Code */}
            <div className="mt-1">
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`} 
                    alt="QR" 
                    className="w-24 h-24"
                />
            </div>
          </div>

          <div className="text-[10px] space-y-1">
             <div className="flex justify-between border-b border-slate-300 pb-1">
               <span>FECHA:</span> <span className="font-bold">{formattedDate}</span>
             </div>
             <div className="flex justify-between border-b border-slate-300 pb-1">
               <span>HORA:</span> <span className="font-bold">{formattedTime}</span>
             </div>
             <div className="flex justify-between">
               <span>ATENDIÓ:</span> <span className="font-bold uppercase truncate max-w-[80px]">{currentUser.name}</span>
             </div>
          </div>
        </div>

        {/* COLUMN 2: Items List (45%) */}
        <div className="w-[45%] flex flex-col border-r-2 border-slate-900 pr-4">
          <div className="text-[10px] font-black uppercase border-b-2 border-slate-900 pb-1 mb-2 flex justify-between">
            <span>Descripción</span>
            <span>Importe</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
             <div className="space-y-1">
                {order.items.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] leading-tight items-start">
                    <div className="w-[80%]">
                      <span className="font-bold mr-1">{item.quantity}</span>
                      <span className="uppercase">{item.name.substring(0, 25)}</span>
                      {item.transactionType === 'rent' && <span className="ml-1 font-bold px-1 bg-slate-200 rounded-[2px] text-[8px]">R</span>}
                    </div>
                    <div className="font-mono font-bold">
                       ${(item.appliedPrice * item.quantity).toFixed(0)}
                    </div>
                  </div>
                ))}
                {order.items.length > 6 && (
                  <div className="text-[9px] italic text-center mt-1">
                    ... y {order.items.length - 6} artículos más.
                  </div>
                )}
             </div>
          </div>
          
          <div className="mt-auto pt-1 border-t border-slate-300">
             {/* If there's a discount, show Subtotal row first */}
             {discountValue > 0 && !isReservation && (
                 <>
                    <div className="flex justify-between items-end text-[10px] font-bold text-slate-400 mb-0.5">
                        <span>SUBTOTAL</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-end text-[10px] font-bold text-rose-600 mb-1 border-b border-dashed border-slate-200 pb-1">
                        <span>DESCUENTO ({order.discountReason || 'CUPÓN'})</span>
                        <span>-${discountValue.toFixed(2)}</span>
                    </div>
                 </>
             )}

             <div className="flex justify-between items-end">
                <div className="text-[10px] text-slate-500 font-bold">
                    {displayLabel}
                </div>
                <div className="text-xl font-black">
                    ${displayAmount.toFixed(2)}
                </div>
             </div>
             {subInfo}
          </div>
        </div>

        {/* COLUMN 3: Client & Dates (30%) */}
        <div className="w-[30%] flex flex-col justify-between">
            <div className="mb-2">
               <div className="text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200 pb-0.5 mb-1">CLIENTE</div>
               
               {/* Full Customer Details */}
               <div className="text-xs font-black uppercase leading-tight mb-0.5">
                 {order.customer?.name || 'VENTA DE MOSTRADOR'}
               </div>
               
               {order.customer?.phone && (
                   <div className="text-[9px] font-mono text-slate-600 mb-0.5">
                       Tel: {order.customer.phone}
                   </div>
               )}
               
               {order.customer?.address && (
                   <div className="text-[8px] uppercase leading-tight text-slate-500 mt-0.5 break-words">
                       {order.customer.address}
                   </div>
               )}
            </div>

            {hasRentals && (order.rentalStartDate || order.rentalEndDate) && (
              <div className="bg-slate-100 p-2 rounded-lg border border-slate-300">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span>ENTREGA:</span>
                    <span className="font-bold">{new Date(order.rentalStartDate!).toLocaleDateString()}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1 mt-1">
                    <span className="block text-[8px] font-bold uppercase text-center mb-0.5">FECHA DE DEVOLUCIÓN</span>
                    <span className="block text-2xl font-black text-center leading-none">
                      {new Date(order.rentalEndDate!).toLocaleDateString(undefined, {day: 'numeric', month: 'short'}).toUpperCase()}
                    </span>
                    <span className="block text-[8px] text-center text-slate-500 mt-1">{new Date(order.rentalEndDate!).getFullYear()}</span>
                  </div>
              </div>
            )}

            <div className="text-[8px] text-center text-slate-400 mt-auto pt-2">
              GRACIAS POR SU PREFERENCIA
            </div>
        </div>
      </div>
    );
};

export const ReceiptV2: React.FC<{ order: Order, businessName: string, businessTagline: string, currentUser: any }> = ({ order, businessName, businessTagline, currentUser }) => {
    const hasRentals = order.items.some(i => i.transactionType === 'rent');
    const dateObj = new Date(order.createdAt);
    
    // Determine what monetary values to show
    const isReservation = order.status === 'reservation';
    const isFinalized = order.status !== 'reservation' && order.downPayment !== undefined;
    
    let displayLabel = "TOTAL";
    let displayAmount = order.total;
    let subInfo = null;

    if (isReservation) {
        displayLabel = "ANTICIPO";
        displayAmount = order.downPayment || 0;
        subInfo = (
            <div className="flex justify-between text-[9px] font-bold mt-1 opacity-80">
               <span>RESTANTE:</span>
               <span>${(order.remainingBalance || 0).toFixed(2)}</span>
            </div>
        );
    } else if (isFinalized) {
        displayLabel = "LIQUIDACIÓN";
        displayAmount = order.remainingBalance || 0;
        subInfo = (
            <div className="flex justify-between text-[9px] font-bold mt-1 opacity-80">
               <span>ANTICIPO:</span>
               <span>-${(order.downPayment || 0).toFixed(2)}</span>
            </div>
        );
    }

    // DISCOUNT LOGIC FOR V2
    const discountValue = order.discount || 0;
    const subtotal = order.total + discountValue;

    return (
      <div 
        className="w-[21.5cm] h-[8.7cm] flex text-slate-900 box-border overflow-hidden bg-white relative" 
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
          {/* WATERMARK FOR REFUND */}
         {order.status === 'refunded' && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-10">
                 <div className="border-4 border-slate-900 p-4 text-6xl font-black transform -rotate-12 uppercase">
                     REEMBOLSADO
                 </div>
             </div>
         )}

         {/* LEFT BAR: Business & Big Info (30%) */}
         <div className="w-[30%] h-full bg-slate-900 text-white p-4 flex flex-col justify-between">
            <div>
                {businessName && (
                    <h1 className="text-xl font-bold uppercase leading-tight mb-2 tracking-tight">{businessName}</h1>
                )}
                {businessTagline && (
                    <p className="text-[8px] font-bold uppercase opacity-60 mb-2 tracking-wider">{businessTagline}</p>
                )}
                <div className="h-0.5 w-8 bg-white/30 mb-2"></div>
                <p className="text-[10px] font-mono opacity-70 uppercase">
                    ATENDIÓ: {currentUser.name}
                </p>
                <p className="text-[10px] font-mono opacity-70 uppercase">
                    {dateObj.toLocaleDateString()}
                </p>
                <p className="text-[10px] font-mono opacity-70 uppercase">
                    {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            
            <div>
                <span className="block text-[9px] font-bold uppercase text-white/50 tracking-widest">FOLIO</span>
                <span className="block text-2xl font-mono font-bold tracking-wider mb-2">#{order.id?.slice(-6) || '000000'}</span>
                
                {/* QR Code */}
                <div className="bg-white p-1 w-fit rounded-sm">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`} 
                        alt="QR" 
                        className="w-24 h-24"
                    />
                </div>
            </div>
         </div>

         {/* RIGHT AREA: Content (70%) */}
         <div className="w-[70%] h-full p-4 flex flex-col relative">
             
             {/* Header Strip with Expanded Customer Details */}
             <div className="flex justify-between items-start border-b-2 border-slate-900 border-dashed pb-2 mb-2">
                 <div className="max-w-[75%]">
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">CLIENTE</span>
                     <span className="text-xs font-black uppercase block leading-tight">
                        {order.customer?.name || 'MOSTRADOR'}
                     </span>
                     {order.customer?.phone && (
                        <span className="text-[9px] font-mono block text-slate-600 mt-0.5">
                            Tel: {order.customer.phone}
                        </span>
                     )}
                     {order.customer?.address && (
                        <span className="text-[8px] uppercase block text-slate-500 leading-tight mt-0.5 break-words">
                            {order.customer.address}
                        </span>
                     )}
                 </div>
                 <div className="text-right">
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">MÉTODO</span>
                     <span className="text-xs font-bold uppercase block">{order.paymentMethod || 'EFECTIVO'}</span>
                 </div>
             </div>

             {/* Items Grid */}
             <div className="flex-1 overflow-hidden">
                <div className="grid grid-cols-12 gap-1 text-[9px] font-bold text-slate-400 uppercase mb-1 border-b border-slate-100 pb-1">
                    <div className="col-span-1 text-center">CANT</div>
                    <div className="col-span-8">DESCRIPCIÓN</div>
                    <div className="col-span-3 text-right">TOTAL</div>
                </div>
                <div className="space-y-1.5">
                    {order.items.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-1 text-[10px] leading-none items-center">
                            <div className="col-span-1 text-center font-bold bg-slate-100 rounded py-0.5">{item.quantity}</div>
                            <div className="col-span-8 uppercase font-medium truncate">
                                {item.name}
                                {item.transactionType === 'rent' && <span className="ml-1 text-[8px] text-indigo-600 bg-indigo-50 px-1 rounded font-bold">RENTA</span>}
                            </div>
                            <div className="col-span-3 text-right font-mono font-bold">${(item.appliedPrice * item.quantity).toFixed(0)}</div>
                        </div>
                    ))}
                    {order.items.length > 5 && (
                        <div className="text-[9px] text-center text-slate-400 italic pt-1">
                            + {order.items.length - 5} artículos adicionales
                        </div>
                    )}
                </div>
             </div>

             {/* Footer Strip */}
             <div className="mt-auto pt-2 border-t-2 border-slate-900 border-dashed flex justify-between items-end">
                {/* Rental Info */}
                <div>
                   {hasRentals && order.rentalEndDate ? (
                       <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">DEVOLUCIÓN</span>
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 rounded">
                                {new Date(order.rentalEndDate).toLocaleDateString()}
                            </span>
                       </div>
                   ) : (
                       <div className="text-[9px] text-slate-400 font-bold uppercase italic">GRACIAS POR SU COMPRA</div>
                   )}
                </div>

                {/* Total Block */}
                <div className="text-right bg-slate-900 text-white px-4 py-2 rounded-tl-xl rounded-br-md -mb-4 -mr-4 shadow-lg min-w-[140px] flex flex-col items-end justify-center">
                    
                    {/* Discount Line for V2 */}
                    {discountValue > 0 && !isReservation && (
                        <div className="w-full text-[9px] font-bold opacity-80 flex justify-between border-b border-white/20 pb-1 mb-1">
                            <span>DESC:</span>
                            <span className="text-emerald-300">-${discountValue.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        <span className="text-[10px] font-bold opacity-70 mb-1">{displayLabel}</span>
                        <span className="text-2xl font-bold font-mono tracking-tight leading-none">${displayAmount.toFixed(2)}</span>
                    </div>
                    {subInfo}
                </div>
             </div>
         </div>
      </div>
    );
};

export const ReceiptTemplate: React.FC<{ order: Order | null, settings?: SystemSettings }> = ({ order, settings }) => {
  // Retrieve user name from localStorage
  const currentUser = useMemo(() => {
    try {
        const u = localStorage.getItem('cyc_pos_user');
        return u ? JSON.parse(u) : { name: 'CAJERO' };
    } catch(e) { return { name: 'CAJERO' }; }
  }, []);

  if (!order) return null;

  // Use nullish coalescing to allow empty strings to pass through if set in DB
  const businessName = settings?.businessName ?? 'CyC POS 26';
  const businessTagline = settings?.businessTagline ?? 'DISFRACES & ACCESORIOS';
  const template = settings?.receiptTemplate || 'v1';

  return (
    <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
      <style>
        {`
          @media print {
            @page {
              size: 21.5cm 8.7cm; /* Custom Receipt Size */
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      
      {template === 'v1' ? (
          <ReceiptV1 order={order} businessName={businessName} businessTagline={businessTagline} currentUser={currentUser} />
      ) : (
          <ReceiptV2 order={order} businessName={businessName} businessTagline={businessTagline} currentUser={currentUser} />
      )}
    </div>
  );
};
