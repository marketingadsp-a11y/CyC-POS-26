
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutGrid, ShoppingCart, History, Users, Settings as SettingsIcon, BarChart3, Receipt, RotateCcw, BoxSelect, Search, Clock, AlertTriangle, CheckCircle, X, Wallet, CalendarClock, Shirt, Plus, DollarSign } from 'lucide-react';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Tickets from './pages/Tickets';
import Returns from './pages/Returns';
import Login from './pages/Login';
import Expenses from './pages/Expenses';
import Reservations from './pages/Reservations';
import { User, Order, SystemSettings, Product, UserPermissions } from './types';
import { getOrders, updateOrder, updateCustomer, getSystemSettings, addProduct, generateProductCode, subscribeToUser } from './services/dataService';
import { Modal, Input, Button, Badge, Select } from './components/UI';

// --- MENU CONFIGURATION ---
// This acts as the master list of all available modules.
// The 'permissionKey' connects the route to the UserPermissions interface.
type PermissionKey = keyof UserPermissions | 'ALWAYS_ALLOWED';

interface MenuItemConfig {
    path: string;
    icon: any;
    label: string;
    permissionKey: PermissionKey;
    superAdminOnly?: boolean; // For legacy check
}

export const MENU_ITEMS: MenuItemConfig[] = [
    { path: '/', icon: ShoppingCart, label: 'Venta', permissionKey: 'canAccessPOS' },
    { path: '/reservations', icon: CalendarClock, label: 'Apartados', permissionKey: 'ALWAYS_ALLOWED' },
    { path: '/returns', icon: RotateCcw, label: 'Devol.', permissionKey: 'ALWAYS_ALLOWED' }, // Everyone can see returns list usually, specific actions protected inside
    { path: '/tickets', icon: Receipt, label: 'Recibos', permissionKey: 'ALWAYS_ALLOWED' },
    { path: '/inventory', icon: LayoutGrid, label: 'Stock', permissionKey: 'ALWAYS_ALLOWED' }, // Everyone can see stock, editing is protected inside
    { path: '/customers', icon: Users, label: 'Clientes', permissionKey: 'ALWAYS_ALLOWED' },
    { path: '/expenses', icon: Wallet, label: 'Gastos', permissionKey: 'canManageExpenses' },
    { path: '/reports', icon: BarChart3, label: 'Informes', permissionKey: 'canViewReports' },
    { path: '/settings', icon: SettingsIcon, label: 'Ajustes', permissionKey: 'canManageSettings' },
];

// Icon Map for Nav Component
const NavItem: React.FC<{ to: string, icon: any, label: string }> = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all duration-300 w-full ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}>
      <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
      <span className="text-[10px] font-medium uppercase text-center leading-none">{label}</span>
    </Link>
  );
};

// Layout Component
const MainLayout: React.FC<{ 
  user: User, 
  setUser: (u: User | null) => void, 
  settings: SystemSettings | null,
  onOpenQuickReturn: () => void,
  onOpenQuickRegister: () => void
}> = ({ user, setUser, settings, onOpenQuickReturn, onOpenQuickRegister }) => {
  const location = useLocation();
  const isPos = location.pathname === '/';
  
  // Dynamic FAB Position
  const fabReturnClass = isPos 
    ? "top-24 right-4 lg:top-6 lg:right-[390px]" 
    : "bottom-36 lg:bottom-10 right-6 lg:right-10";

  const fabRegisterClass = isPos
    ? "top-24 right-20 lg:top-6 lg:right-[460px]" // Desktop: Left of Return
    : "bottom-52 lg:bottom-28 right-6 lg:right-10"; // Mobile: Stacked above

  // --- DYNAMIC MENU SORTING & FILTERING ---
  const visibleMenuItems = useMemo(() => {
      // 1. Determine the base order
      let items = [...MENU_ITEMS];

      // If user has a custom order defined, sort the items based on that
      if (user.menuOrder && user.menuOrder.length > 0) {
          items.sort((a, b) => {
              const indexA = user.menuOrder!.indexOf(a.path);
              const indexB = user.menuOrder!.indexOf(b.path);
              
              // If both found, sort by index
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              // If A found but B not, A comes first
              if (indexA !== -1) return -1;
              // If B found but A not, B comes first
              if (indexB !== -1) return 1;
              // If neither found, keep original relative order (or push to end)
              return 0;
          });
      }

      // 2. Filter by Permissions
      return items.filter(item => {
          // If super admin (hardcoded), show everything
          if (user.role === 'admin') return true;

          // Always allowed items
          if (item.permissionKey === 'ALWAYS_ALLOWED') return true;

          // Check specific permission
          return user.permissions?.[item.permissionKey] === true;
      });

  }, [user]);

  const canAccessPOS = user.role === 'admin' || user.permissions?.canAccessPOS;
  const canManageInventory = user.role === 'admin' || user.permissions?.canManageInventory;
  const canViewReports = user.role === 'admin' || user.permissions?.canViewReports;
  const canManageSettings = user.role === 'admin' || user.permissions?.canManageSettings;
  const canManageExpenses = user.role === 'admin' || user.permissions?.canManageExpenses;

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 font-sans pb-36 lg:pb-0 lg:pl-24 relative">
        {/* Desktop Sidebar / Mobile Bottom Bar (2 Rows on Mobile) */}
        <nav className="fixed bottom-0 left-0 w-full lg:w-24 lg:h-full bg-white border-t lg:border-t-0 lg:border-r border-slate-200 z-40 flex flex-col lg:flex-col items-center justify-center lg:justify-center gap-1 lg:gap-6 p-2 lg:p-6 shadow-2xl lg:shadow-none overflow-y-auto hide-scrollbar">
          <div className="hidden lg:flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-auto shadow-lg shadow-indigo-300 flex-shrink-0 overflow-hidden">
             {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
             ) : (
                <span className="text-white font-bold text-xl">CyC</span>
             )}
          </div>
          
          {/* Mobile: Grid 5 cols (forces 2 rows). Desktop: Flex Col */}
          <div className="grid grid-cols-5 lg:flex lg:flex-col w-full gap-y-2 gap-x-1 lg:gap-4 justify-items-center">
            {visibleMenuItems.map(item => (
                <NavItem key={item.path} to={item.path} icon={item.icon} label={item.label} />
            ))}
          </div>

          <div 
            className="hidden lg:flex mt-auto w-10 h-10 rounded-full bg-slate-100 items-center justify-center font-bold text-indigo-600 cursor-pointer hover:bg-rose-100 hover:text-rose-600 transition-colors flex-shrink-0" 
            title={`Cerrar sesión de ${user.name}`} 
            onClick={() => setUser(null)}
          >
            {user.name.charAt(0)}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="h-screen overflow-hidden">
          <Routes>
            <Route path="/" element={canAccessPOS ? <POS onOpenQuickAdd={(name) => onOpenQuickRegister()} /> : <Navigate to="/tickets" />} /> 
            <Route path="/returns" element={<Returns />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/tickets" element={<Tickets user={user} />} />
            <Route path="/inventory" element={<Inventory user={user} />} />
            <Route path="/customers" element={<Customers user={user} />} />
            
            {/* Protected Routes */}
            <Route path="/expenses" element={canManageExpenses ? <Expenses user={user} /> : <Navigate to="/" />} />
            <Route path="/reports" element={canViewReports ? <Reports /> : <Navigate to="/" />} />
            <Route path="/settings" element={canManageSettings ? <Settings user={user} /> : <Navigate to="/" />} />
          </Routes>
        </main>

        {/* --- FLOATING ACTION BUTTON (QUICK REGISTER) --- */}
        {(canAccessPOS || canManageInventory) && (
            <button 
                onClick={onOpenQuickRegister}
                className={`fixed ${fabRegisterClass} z-50 bg-indigo-600 text-white p-4 rounded-full shadow-2xl shadow-indigo-600/40 hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-[#f3f4f6] group`}
                title="Registrar Disfraz Rápido"
            >
                <Shirt className="w-6 h-6" />
                <span className="absolute right-2 top-0 -mt-2 -mr-2 bg-rose-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                </span>
            </button>
        )}

        {/* --- FLOATING ACTION BUTTON (QUICK RETURN) --- */}
        {canAccessPOS && (
            <button 
                onClick={onOpenQuickReturn}
                className={`fixed ${fabReturnClass} z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl shadow-slate-900/40 hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-[#f3f4f6] group`}
                title="Devolución Rápida"
            >
                <RotateCcw className="w-6 h-6 group-hover:-rotate-90 transition-transform" />
                {!isPos && (
                <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    DEVOLUCIÓN RÁPIDA
                </span>
                )}
            </button>
        )}
    </div>
  );
};

// --- Quick Return Logic ---
const QuickReturnModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [activeRentals, setActiveRentals] = useState<Order[]>([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<Order | null>(null);
  const [lateFee, setLateFee] = useState('');
  const [step, setStep] = useState<'list' | 'confirm'>('list');
  
  // Partial Return States
  const [returnMode, setReturnMode] = useState<'all' | 'partial'>('all');
  const [itemsToReturn, setItemsToReturn] = useState<number[]>([]); // Array of indices in selectedReturnOrder.items

  useEffect(() => {
    if (isOpen) {
        setStep('list');
        setQuickSearch('');
        setReturnMode('all');
        setItemsToReturn([]);
        loadActiveRentals();
    }
  }, [isOpen]);

  const loadActiveRentals = async () => {
      setLoadingRentals(true);
      const allOrders = await getOrders();
      const active = allOrders.filter(o => 
          o.items.some(i => i.transactionType === 'rent') && 
          !o.status.includes('returned') &&
          o.status !== 'reservation'
      );
      setActiveRentals(active);
      setLoadingRentals(false);
  };

  const filteredRentals = useMemo(() => {
      const q = quickSearch.toUpperCase();
      return activeRentals.filter(o => 
          o.id?.includes(q) || 
          o.customer?.name.includes(q)
      );
  }, [activeRentals, quickSearch]);

  const handleCardClick = async (order: Order) => {
      setSelectedReturnOrder(order);
      
      // Default: Select all pending rentals
      const rentalIndices = order.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.transactionType === 'rent' && !item.returnedAt)
        .map(({ index }) => index);
      
      setItemsToReturn(rentalIndices);
      setReturnMode('all');

      const now = Date.now();
      const isLate = order.rentalEndDate && now > order.rentalEndDate;
      if (isLate && order.rentalEndDate) {
          const settings = await getSystemSettings();
          const diffTime = now - order.rentalEndDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const perDayFee = settings.defaultLateFee || 50;
          setLateFee((diffDays * perDayFee).toString());
      } else {
          setLateFee('0');
      }
      setStep('confirm');
  };

  const processQuickReturn = async (payNow: boolean) => {
      if (!selectedReturnOrder || !selectedReturnOrder.id) return;

      // Determine which indices to return based on mode
      let targetIndices = itemsToReturn;
      if (returnMode === 'all') {
          targetIndices = selectedReturnOrder.items
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => item.transactionType === 'rent' && !item.returnedAt)
              .map(({ index }) => index);
      }

      if (targetIndices.length === 0) return;

      const fee = parseFloat(lateFee) || 0;
      const isLate = fee > 0;
      const returnTimestamp = Date.now();

      try {
          const updatedItems = [...selectedReturnOrder.items];
          targetIndices.forEach(index => {
              updatedItems[index] = { ...updatedItems[index], returnedAt: returnTimestamp };
          });

          // Check if everything is returned
          const allReturned = updatedItems.every(i => i.transactionType !== 'rent' || !!i.returnedAt);

          // 1. Update Order Status
          const updateData: any = {
              items: updatedItems,
              status: allReturned ? (isLate ? 'returned_late' : 'returned') : 'partial_returned',
              returnedAt: returnTimestamp,
          };
          if (isLate) updateData.lateFee = fee;

          await updateOrder(selectedReturnOrder.id, updateData);

          let updatedCustomer = selectedReturnOrder.customer;
          if (isLate && selectedReturnOrder.customer?.id) {
               const currentBalance = selectedReturnOrder.customer.balance || 0;
               const newBalance = currentBalance - fee;
               await updateCustomer(selectedReturnOrder.customer.id, { balance: newBalance });
               updatedCustomer = { ...selectedReturnOrder.customer, balance: newBalance };
          }

          if (payNow && isLate) {
               navigate('/', { 
                  state: { 
                      action: 'pay_late_fee', 
                      customer: updatedCustomer,
                      amount: fee,
                      refTicket: selectedReturnOrder.id
                  } 
               });
               onClose();
          } else {
               if(isLate) alert(`Devolución registrada. Se cargó un adeudo de $${fee} a la cuenta del cliente.`);
               else alert("Devolución registrada correctamente.");
               onClose();
          }
      } catch (e) {
          alert("Error al procesar la devolución.");
      }
  };

  return (
      <Modal isOpen={isOpen} onClose={onClose} title="DEVOLUCIÓN RÁPIDA">
          <div className="h-[60vh] flex flex-col">
              {step === 'list' ? (
                  <>
                      <div className="mb-4 relative flex-shrink-0">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input 
                              type="number" 
                              placeholder="ESCANEAR ID TICKET..." 
                              value={quickSearch}
                              onChange={(e) => setQuickSearch(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-indigo-100 focus:border-indigo-500 text-2xl font-bold text-center tracking-widest outline-none transition-colors"
                              autoFocus
                          />
                      </div>
                      <div className="flex-1 overflow-y-auto p-1">
                          {loadingRentals ? (
                              <div className="text-center py-10 text-slate-400">CARGANDO...</div>
                          ) : filteredRentals.length === 0 ? (
                              <div className="text-center py-10 text-slate-400"><p>NO SE ENCONTRARON RENTAS</p></div>
                          ) : (
                              <div className="grid grid-cols-2 gap-3">
                                  {filteredRentals.map(order => {
                                      const isLate = order.rentalEndDate && Date.now() > order.rentalEndDate;
                                      return (
                                          <div key={order.id} onClick={() => handleCardClick(order)} className={`p-3 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 flex flex-col justify-between min-h-[140px] ${isLate ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                                              <div className="flex justify-between items-start"><span className={`font-mono font-black text-lg ${isLate ? 'text-rose-700' : 'text-slate-600'}`}>#{order.id}</span>{isLate && <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />}</div>
                                              <div className="my-2"><div className="font-bold text-slate-800 leading-tight uppercase line-clamp-2">{order.customer?.name}</div></div>
                                              <div className="flex items-end justify-between"><div className="text-xs text-slate-500">{order.items.filter(i => i.transactionType === 'rent').length} Item(s)</div></div>
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  </>
              ) : (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex-shrink-0">
                          <h3 className="font-bold text-slate-700 uppercase text-xs mb-1">Confirmar Ticket #{selectedReturnOrder?.id}</h3>
                          <div className="text-xl font-black text-slate-900 uppercase truncate">{selectedReturnOrder?.customer?.name}</div>
                      </div>

                      {/* Mode Selector */}
                      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-4 flex-shrink-0">
                        <button 
                            onClick={() => {
                                setReturnMode('all');
                                const pending = selectedReturnOrder?.items
                                    .map((item, idx) => ({ item, idx }))
                                    .filter(({ item }) => item.transactionType === 'rent' && !item.returnedAt)
                                    .map(({ idx }) => idx) || [];
                                setItemsToReturn(pending);
                            }}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${returnMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <CheckCircle className="w-3.5 h-3.5" /> Todo
                        </button>
                        <button 
                            onClick={() => setReturnMode('partial')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${returnMode === 'partial' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" /> Parcial
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto px-1 space-y-3 mb-4 custom-scrollbar">
                        {returnMode === 'all' ? (
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Se recibe todo lo pendiente</div>
                                {selectedReturnOrder?.items
                                    .filter(i => i.transactionType === 'rent' && !i.returnedAt)
                                    .map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            <span className="font-bold text-emerald-900 uppercase text-[11px] truncate flex-1">{item.name}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecciona artículos entregados</div>
                                {selectedReturnOrder?.items
                                    .filter(item => item.transactionType === 'rent')
                                    .map((item, i) => {
                                        const originalIndex = selectedReturnOrder.items.indexOf(item);
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
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                                    alreadyReturned 
                                                        ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                                                        : itemsToReturn.includes(originalIndex)
                                                            ? 'bg-indigo-50 border-indigo-200' 
                                                            : 'bg-white border-slate-100'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                                    alreadyReturned || itemsToReturn.includes(originalIndex)
                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                        : 'bg-white border-slate-200 text-transparent'
                                                }`}>
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold uppercase text-[11px] truncate ${alreadyReturned || itemsToReturn.includes(originalIndex) ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {item.name}
                                                    </div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase">
                                                        {alreadyReturned ? 'Recibido' : itemsToReturn.includes(originalIndex) ? 'Entregando' : 'Pendiente'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        )}

                        {parseFloat(lateFee) > 0 && (
                            <div className="mt-4">
                                <div className="bg-rose-100 text-rose-800 p-3 rounded-t-xl flex items-center justify-between font-bold text-xs">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5" /> ATRASO DETECTADO
                                    </div>
                                    <span className="text-[9px] bg-rose-200 px-2 py-0.5 rounded-full">
                                        {selectedReturnOrder?.rentalEndDate && Math.ceil((Date.now() - selectedReturnOrder.rentalEndDate) / (1000 * 60 * 60 * 24))} DÍAS
                                    </span>
                                </div>
                                <div className="bg-white border-x border-b border-rose-100 p-4 rounded-b-xl">
                                    <Input label="MULTA A COBRAR" type="number" value={lateFee} onChange={(e) => setLateFee(e.target.value)} className="text-xl font-bold text-rose-600" />
                                </div>
                            </div>
                        )}
                      </div>

                      <div className="mt-auto grid grid-cols-1 gap-2 flex-shrink-0">
                          {parseFloat(lateFee) > 0 ? (
                              <>
                                  <Button 
                                      disabled={returnMode === 'partial' && itemsToReturn.length === 0}
                                      onClick={() => processQuickReturn(true)} 
                                      className="py-3 uppercase shadow-lg text-sm"
                                  >
                                      COBRAR Y FINALIZAR
                                  </Button>
                                  <Button 
                                      disabled={returnMode === 'partial' && itemsToReturn.length === 0}
                                      onClick={() => processQuickReturn(false)} 
                                      variant="secondary" 
                                      className="py-3 uppercase border-rose-200 text-rose-600 text-sm"
                                  >
                                      CARGAR DEUDA
                                  </Button>
                              </>
                          ) : (
                              <Button 
                                  disabled={returnMode === 'partial' && itemsToReturn.length === 0}
                                  onClick={() => processQuickReturn(false)} 
                                  className={`py-4 uppercase text-sm ${returnMode === 'all' ? 'bg-emerald-600' : ''}`}
                              >
                                  {returnMode === 'all' ? 'CONFIRMAR TODO' : `ENTREGAR ${itemsToReturn.length} ART.`}
                              </Button>
                          )}
                          <Button variant="ghost" className="text-[10px]" onClick={() => setStep('list')}>VOLVER</Button>
                      </div>
                  </div>
              )}
          </div>
      </Modal>
  );
};

// --- Quick Register Modal ---
const QuickRegisterModal: React.FC<{ isOpen: boolean, onClose: () => void, onSuccess: () => void, initialName?: string }> = ({ isOpen, onClose, onSuccess, initialName = '' }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'rent' | 'sale'>('rent');
    const [price, setPrice] = useState('');
    const [size, setSize] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setName(initialName);
            setPrice('');
            setSize('');
            setType('rent');
        }
    }, [isOpen, initialName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price || !size) { alert("Campos obligatorios"); return; }
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) { alert("Precio inválido"); return; }

        setLoading(true);
        try {
            const productData: Omit<Product, 'id'> = {
                code: generateProductCode(),
                name: name.toUpperCase(),
                description: 'REGISTRO RÁPIDO',
                category: 'DISFRACES',
                stock: 1,
                isRentalAvailable: type === 'rent',
                isSaleAvailable: type === 'sale',
                rentalPrice: type === 'rent' ? numPrice : 0,
                salePrice: type === 'sale' ? numPrice : 0,
                variations: [{ name: size.toUpperCase(), rentalPrice: type === 'rent' ? numPrice : 0, salePrice: type === 'sale' ? numPrice : 0 }]
            };
            await addProduct(productData);
            alert("Registrado.");
            onSuccess();
            onClose();
        } catch (e) {
            alert("Error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="REGISTRO RÁPIDO">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <Input label="NOMBRE" value={name} onChange={e => setName(e.target.value.toUpperCase())} autoFocus />
                <div className="grid grid-cols-2 gap-4">
                    <Select label="TIPO" value={type} onChange={(e: any) => setType(e.target.value)}><option value="rent">RENTA</option><option value="sale">VENTA</option></Select>
                    <div className="relative"><Input label="PRECIO" type="number" value={price} onChange={e => setPrice(e.target.value)} /><DollarSign className="absolute right-3 top-9 w-4 h-4 text-slate-400" /></div>
                </div>
                <Input label="TALLA" value={size} onChange={e => setSize(e.target.value.toUpperCase())} />
                <div className="pt-4 flex gap-3"><Button variant="secondary" type="button" onClick={onClose} className="flex-1">CANCELAR</Button><Button type="submit" disabled={loading} className="flex-[2]">{loading ? '...' : 'REGISTRAR'}</Button></div>
            </form>
        </Modal>
    );
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('cyc_pos_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) { return null; }
  });

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isQuickReturnOpen, setIsQuickReturnOpen] = useState(false);
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [quickRegName, setQuickRegName] = useState('');
  
  // --- LOAD SYSTEM SETTINGS ---
  useEffect(() => {
    const loadSettings = async () => {
      const s = await getSystemSettings();
      setSettings(s);
    };
    loadSettings();
  }, []);

  // --- DYNAMIC PWA MANIFEST LOADER ---
  useEffect(() => {
      const applyPWASettings = async () => {
          if (!settings) return;
          try {
              const iconUrl = settings.pwaIconUrl;
              const appName = settings.businessName || "CyC POS 26";

              // 1. Update Title & Apple Meta Tags
              document.title = appName;
              const appleTitle = document.getElementById('apple-app-title');
              if (appleTitle) appleTitle.setAttribute('content', appName);

              if (iconUrl) {
                  // 2. Update Favicon & Apple Icon
                  const favicon = document.getElementById('app-icon') as HTMLLinkElement;
                  const appleIcon = document.getElementById('app-apple-icon') as HTMLLinkElement;
                  if(favicon) favicon.href = iconUrl;
                  if(appleIcon) appleIcon.href = iconUrl;

                  // 3. Generate Dynamic Manifest
                  const dynamicManifest = {
                      name: appName,
                      short_name: appName.substring(0, 12),
                      start_url: ".",
                      display: "standalone",
                      background_color: "#f3f4f6",
                      theme_color: "#4f46e5",
                      description: `Sistema de Punto de Venta para ${appName}`,
                      icons: [
                          {
                              src: iconUrl,
                              sizes: "192x192",
                              type: "image/png",
                              purpose: "any maskable"
                          },
                          {
                              src: iconUrl,
                              sizes: "512x512",
                              type: "image/png",
                              purpose: "any maskable"
                          }
                      ]
                  };

                  const stringManifest = JSON.stringify(dynamicManifest);
                  const blob = new Blob([stringManifest], {type: 'application/json'});
                  const manifestURL = URL.createObjectURL(blob);
                  
                  const manifestLink = document.getElementById('app-manifest') as HTMLLinkElement;
                  if (manifestLink) {
                      manifestLink.setAttribute('href', manifestURL);
                  }
              }
          } catch (e) {
              console.error("Error loading PWA settings", e);
          }
      };

      applyPWASettings();
  }, [settings]); // Depend on settings so it updates when they load

  useEffect(() => {
    if (!user || !user.id) return;
    const unsubscribe = subscribeToUser(user.id, (updatedUser) => {
        if (!updatedUser) { alert("Usuario eliminado."); setUser(null); return; }
        if (updatedUser.sessionToken && updatedUser.sessionToken !== user.sessionToken) { alert("Sesión expirada."); setUser(null); return; }
        setUser(prev => {
            const isDifferent = JSON.stringify(prev) !== JSON.stringify(updatedUser);
            return isDifferent ? updatedUser : prev;
        });
    });
    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (user) localStorage.setItem('cyc_pos_user', JSON.stringify(user));
    else localStorage.removeItem('cyc_pos_user');
  }, [user]);

  if (!user) return <Login onLogin={setUser} logoUrl={settings?.logoUrl} businessName={settings?.businessName} />;

  return (
    <HashRouter>
      <MainLayout 
        user={user} 
        setUser={setUser} 
        settings={settings}
        onOpenQuickReturn={() => setIsQuickReturnOpen(true)} 
        onOpenQuickRegister={() => { setQuickRegName(''); setIsQuickRegisterOpen(true); }} 
      />
      <QuickReturnModal isOpen={isQuickReturnOpen} onClose={() => setIsQuickReturnOpen(false)} />
      <QuickRegisterModal isOpen={isQuickRegisterOpen} onClose={() => setIsQuickRegisterOpen(false)} onSuccess={() => {}} initialName={quickRegName} />
    </HashRouter>
  );
};

export default App;
