
import React, { useState, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Shield, Trash2, UserPlus, Key, DollarSign, Save, AlertTriangle, Check, Pencil, X, Hash, TicketPercent, Plus, Percent, ToggleRight, ToggleLeft, LogOut, ArrowUp, ArrowDown, GripVertical, Menu, Smartphone, RefreshCw } from 'lucide-react';
import { Button, Input, Card, Select, Modal } from '../components/UI';
import { User, Product, UserPermissions, Coupon } from '../types';
import { getUsers, addUser, updateUser, deleteUser, getSystemSettings, updateSystemSettings, getProducts, bulkDeleteProducts, getCoupons, addCoupon, deleteCoupon, updateCoupon, resetUserSession, resetAllUserSessions, performFactoryReset, uploadAppLogo } from '../services/dataService';
import { MENU_ITEMS } from '../App'; // Import MENU_ITEMS to know available routes

const defaultPermissions: UserPermissions = {
    canAccessPOS: true, // Default to true for most staff
    canViewReports: false,
    canManageSettings: false,
    canManageInventory: false,
    canManageUsers: false,
    canRefund: false,
    canDeleteCustomers: false,
    canManageExpenses: false,
    canApplyDiscounts: false, // Default false
    canSettleDebt: false // Default false
};

const Settings: React.FC<{ user: User }> = ({ user }) => {
  // Check Super Admin via prop
  const isSuperAdmin = user.code === '012004';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Settings
  const [lateFee, setLateFee] = useState<string>('50');
  const [extraDayPrice, setExtraDayPrice] = useState<string>('50');
  const [cardFee, setCardFee] = useState<string>('0');
  const [businessName, setBusinessName] = useState<string>('');
  const [businessTagline, setBusinessTagline] = useState<string>('');
  const [receiptTemplate, setReceiptTemplate] = useState<'v1'|'v2'>('v1');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [pwaIconUrl, setPwaIconUrl] = useState<string>('');
  const [imgbbKey, setImgbbKey] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Ticket Sequence Settings
  const [ticketPrefix, setTicketPrefix] = useState<string>('26');
  const [nextSequence, setNextSequence] = useState<string>('1');

  // Coupon State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'amount'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState('');

  // User Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userCode, setUserCode] = useState('');
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(defaultPermissions);
  
  // Custom Menu Order State
  const [customMenuEnabled, setCustomMenuEnabled] = useState(false);
  const [currentMenuOrder, setCurrentMenuOrder] = useState<string[]>([]);

  // Bulk Delete State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedDeleteCategory, setSelectedDeleteCategory] = useState('TODOS');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Factory Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [u, s, p, c] = await Promise.all([getUsers(), getSystemSettings(), getProducts(), getCoupons()]);
    setUsers(u);
    setLateFee(s.defaultLateFee.toString());
    setExtraDayPrice(s.pricePerExtraDay?.toString() || '0');
    setCardFee(s.cardFeePercentage?.toString() || '0');
    setBusinessName(s.businessName || ''); // Allow empty
    setBusinessTagline(s.businessTagline || ''); // Allow empty
    setReceiptTemplate(s.receiptTemplate || 'v1');
    setTicketPrefix(s.ticketPrefix || '26');
    setNextSequence(s.nextTicketSequence?.toString() || '1');
    setLogoUrl(s.logoUrl || '');
    setPwaIconUrl(s.pwaIconUrl || '');
    setImgbbKey(s.imgbbKey || '');
    setAllProducts(p);
    setCoupons(c);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
     const cats = new Set(allProducts.map(p => p.category).filter(Boolean));
     return ['TODOS', ...Array.from(cats).sort()];
  }, [allProducts]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingLogo(true);
      try {
          const url = await uploadAppLogo(file, imgbbKey);
          setLogoUrl(url);
          // Also set as PWA icon if empty
          if (!pwaIconUrl) setPwaIconUrl(url);
          alert("Logotipo subido. Guarde los cambios para aplicar.");
      } catch (error) {
          alert("Error al subir el logotipo.");
      } finally {
          setIsUploadingLogo(false);
      }
  };

  const handleSaveSettings = async () => {
      const fee = parseFloat(lateFee);
      const dayPrice = parseFloat(extraDayPrice);
      const card = parseFloat(cardFee);
      const nextSeq = parseInt(nextSequence);
      
      if (isNaN(fee) || isNaN(dayPrice) || isNaN(card)) { alert("Montos inválidos"); return; }
      if (isNaN(nextSeq) || nextSeq < 1) { alert("El número de folio debe ser mayor a 0"); return; }
      
      // Validation for businessName removed to allow empty values
      if (!ticketPrefix.trim()) { alert("El prefijo del ticket es requerido"); return; }
      
      try {
          await updateSystemSettings({ 
              defaultLateFee: fee,
              pricePerExtraDay: dayPrice,
              cardFeePercentage: card,
              businessName: businessName.toUpperCase(),
              businessTagline: businessTagline.toUpperCase(),
              receiptTemplate: receiptTemplate,
              ticketPrefix: ticketPrefix,
              nextTicketSequence: nextSeq,
              logoUrl: logoUrl,
              pwaIconUrl: pwaIconUrl,
              imgbbKey: imgbbKey
          });
          alert("Ajustes guardados. Si cambió el icono PWA, recargue la página.");
          loadData(); // Reload to ensure sync
      } catch (e) {
          alert("Error al guardar ajustes.");
      }
  };

  // --- Coupon Handlers ---
  const handleCreateCoupon = async (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseFloat(newCouponValue);
      if(!newCouponCode || isNaN(val) || val <= 0) {
          alert("Datos inválidos");
          return;
      }

      try {
          await addCoupon({
              code: newCouponCode.toUpperCase(),
              type: newCouponType,
              value: val,
              isActive: true
          });
          setNewCouponCode('');
          setNewCouponValue('');
          setShowCouponModal(false);
          loadData();
      } catch (e: any) {
          alert(e.message || "Error al crear cupón");
      }
  };

  const handleDeleteCoupon = async (id: string) => {
      if(confirm("¿Eliminar cupón?")) {
          await deleteCoupon(id);
          loadData();
      }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
      if (coupon.id) {
          await updateCoupon(coupon.id, { isActive: !coupon.isActive });
          setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
      }
  };


  // --- User Management Handlers ---

  const openNewUserModal = () => {
      setEditingUser(null);
      setUserName('');
      setUserCode('');
      setUserPermissions(defaultPermissions);
      setCustomMenuEnabled(false);
      // Default order based on MENU_ITEMS
      setCurrentMenuOrder(MENU_ITEMS.map(i => i.path));
      setShowUserModal(true);
  };

  const openEditUserModal = (user: User) => {
      setEditingUser(user);
      setUserName(user.name);
      setUserCode(user.code);
      setUserPermissions({ ...defaultPermissions, ...(user.permissions || {}) });
      
      if (user.menuOrder && user.menuOrder.length > 0) {
          setCustomMenuEnabled(true);
          // Merge user order with any potentially new default items
          const savedOrder = user.menuOrder;
          const defaultItems = MENU_ITEMS.map(i => i.path);
          // Keep saved order, append any missing new items at the end
          const merged = [...savedOrder, ...defaultItems.filter(p => !savedOrder.includes(p))];
          setCurrentMenuOrder(merged);
      } else {
          setCustomMenuEnabled(false);
          setCurrentMenuOrder(MENU_ITEMS.map(i => i.path));
      }
      
      setShowUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || userCode.length !== 4) {
      alert("NOMBRE REQUERIDO Y EL CÓDIGO DEBE SER DE 4 DÍGITOS.");
      return;
    }

    try {
      const userData = { 
          name: userName, 
          code: userCode,
          permissions: userPermissions,
          role: 'staff' as const,
          // Only save custom order if enabled
          menuOrder: customMenuEnabled ? currentMenuOrder : []
      };

      if (editingUser && editingUser.id) {
          await updateUser(editingUser.id, userData);
          alert("USUARIO ACTUALIZADO.");
      } else {
          await addUser(userData);
          alert("USUARIO REGISTRADO.");
      }

      setShowUserModal(false);
      loadData();
    } catch (e) {
      alert("ERROR AL GUARDAR.");
    }
  };

  // Reorder Handlers
  const moveMenuItem = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === currentMenuOrder.length - 1) return;

      const newOrder = [...currentMenuOrder];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      
      setCurrentMenuOrder(newOrder);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("¿ELIMINAR ACCESO DE USUARIO?")) {
      await deleteUser(id);
      loadData();
    }
  };

  // --- FORCE LOGOUT HANDLERS ---
  const handleForceLogoutUser = async (userId: string, userName: string) => {
      if(confirm(`¿Cerrar la sesión de ${userName}? Si está usando el sistema, será desconectado inmediatamente.`)) {
          try {
              await resetUserSession(userId);
              alert("Sesión cerrada correctamente.");
          } catch(e) {
              alert("Error al cerrar sesión.");
          }
      }
  };

  const handleForceLogoutAll = async () => {
      if(confirm("¿CERRAR SESIÓN DE TODOS LOS USUARIOS? \n\nEsto desconectará a todo el personal inmediatamente para obligarlos a iniciar sesión de nuevo.")) {
          try {
              await resetAllUserSessions();
              alert("Todas las sesiones han sido cerradas.");
          } catch(e) {
              alert("Error al procesar.");
          }
      }
  };

  const togglePermission = (key: keyof UserPermissions) => {
      setUserPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Bulk Delete Handlers
  const confirmBulkDelete = async () => {
      if (deletePin !== '012004') {
          alert("CÓDIGO DE SEGURIDAD INCORRECTO.");
          setDeletePin('');
          return;
      }

      setIsDeleting(true);
      try {
          const count = await bulkDeleteProducts(selectedDeleteCategory);
          alert(`ELIMINACIÓN COMPLETADA. SE BORRARON ${count} PRODUCTOS.`);
          setShowDeleteModal(false);
          setDeletePin('');
          loadData();
      } catch (e) {
          console.error(e);
          alert("ERROR AL ELIMINAR. REVISE LA CONSOLA.");
      } finally {
          setIsDeleting(false);
      }
  };

  // Factory Reset Handler
  const handleFactoryReset = async () => {
      if (resetPin !== '012004') {
          alert("CÓDIGO DE SEGURIDAD INCORRECTO.");
          setResetPin('');
          return;
      }

      setIsResetting(true);
      try {
          await performFactoryReset();
          alert("¡SISTEMA REINICIADO EXITOSAMENTE! \n\nTodos los datos operativos han sido borrados. La aplicación se recargará ahora.");
          window.location.reload();
      } catch(e) {
          console.error(e);
          alert("Error crítico al reiniciar sistema. Contacte soporte.");
          setIsResetting(false);
      }
  };

  // Helper for Permission Switch
  const PermissionSwitch = ({ label, pKey }: { label: string, pKey: keyof UserPermissions }) => (
      <div 
        onClick={() => togglePermission(pKey)}
        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${userPermissions[pKey] ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}
      >
          <span className={`text-xs font-bold uppercase ${userPermissions[pKey] ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span>
          <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${userPermissions[pKey] ? 'bg-indigo-600' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${userPermissions[pKey] ? 'translate-x-4' : 'translate-x-0'}`}></div>
          </div>
      </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 h-full overflow-y-auto">
       <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 uppercase">
          <SettingsIcon className="w-8 h-8 text-indigo-600" />
          AJUSTES
        </h1>
        <p className="text-slate-500 mt-2 uppercase">CONFIGURACIÓN DEL SISTEMA Y USUARIOS</p>
      </header>

      <div className="space-y-8">
        
        {/* SUPER ADMIN FORCE LOGOUT SECTION - MOVED TO TOP */}
        {isSuperAdmin && (
            <Card className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h4 className="font-bold uppercase flex items-center gap-2 text-lg text-yellow-400">
                            <Shield className="w-6 h-6" /> SEGURIDAD DE SESIONES
                        </h4>
                        <p className="text-xs text-indigo-200 mt-2 max-w-md">
                            Fuerza el cierre de sesión de todo el personal. Útil para garantizar seguridad o tras actualizaciones de permisos. Los usuarios deberán volver a ingresar su código.
                        </p>
                    </div>
                    <Button 
                        variant="danger" 
                        onClick={handleForceLogoutAll} 
                        className="w-full md:w-auto py-3 px-6 shadow-none border border-rose-400/50 bg-rose-600 hover:bg-rose-700"
                    >
                        <LogOut className="w-5 h-5 mr-2" />
                        CERRAR SESIÓN A TODOS
                    </Button>
                </div>
            </Card>
        )}

        {/* General Config */}
        <Card>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 uppercase">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              CONFIGURACIÓN GENERAL
            </h3>
            
            <div className="space-y-6">
                {/* Branding & Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                    <div>
                        <Input 
                             label="NOMBRE DEL NEGOCIO"
                             value={businessName}
                             onChange={(e) => setBusinessName(e.target.value.toUpperCase())}
                             placeholder="EJ. CYC POS 26"
                        />
                    </div>
                    <div>
                        <Input 
                             label="SLOGAN / SUBTÍTULO"
                             value={businessTagline}
                             onChange={(e) => setBusinessTagline(e.target.value.toUpperCase())}
                             placeholder="EJ. DISFRACES & ACCESORIOS"
                        />
                        <p className="text-xs text-slate-400 mt-1 uppercase">* Aparece debajo del nombre en el ticket.</p>
                    </div>
                    
                    {/* LOGOS */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">LOGOTIPO DEL NEGOCIO</label>
                            
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="w-24 h-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 relative group">
                                    {logoUrl ? (
                                        <>
                                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Button size="sm" variant="danger" onClick={() => setLogoUrl('')} className="h-8 w-8 p-0 rounded-full">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-slate-300 flex flex-col items-center">
                                            <Plus className="w-8 h-8" />
                                            <span className="text-[10px] uppercase font-bold">SUBIR</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleLogoUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={isUploadingLogo}
                                    />
                                    {isUploadingLogo && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 space-y-3 w-full">
                                    <Input 
                                        label="URL DEL LOGOTIPO (PANTALLA DE VENTA)"
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        placeholder="HTTPS://..."
                                    />
                                    <p className="text-[10px] text-slate-400 uppercase">* Se recomienda un logo con fondo transparente (PNG).</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Smartphone className="w-4 h-4 text-slate-500" />
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">URL ICONO DE APLICACIÓN (PWA / INSTALACIÓN)</label>
                            </div>
                            <Input 
                                value={pwaIconUrl}
                                onChange={(e) => setPwaIconUrl(e.target.value)}
                                placeholder="HTTPS://... (PNG CUADRADO RECOMENDADO)"
                            />
                            <p className="text-xs text-slate-400 mt-1 uppercase">* Icono que se usará al instalar la app en el celular/escritorio.</p>
                        </div>

                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                            <label className="text-xs font-black text-indigo-600 uppercase mb-2 block">CONFIGURACIÓN IMGBB (HOSTING DE IMÁGENES)</label>
                            <Input 
                                value={imgbbKey}
                                onChange={(e) => setImgbbKey(e.target.value)}
                                placeholder="INGRESE SU API KEY DE IMGBB"
                                type="password"
                            />
                            <p className="text-[10px] text-indigo-500 mt-2 font-bold uppercase">
                                * SI ESTÁ PRESENTE, LAS IMÁGENES SE SUBIRÁN A IMGBB EN LUGAR DE FIREBASE STORAGE.
                                <a href="https://api.imgbb.com/" target="_blank" rel="noreferrer" className="ml-1 underline">OBTENER API KEY AQUÍ</a>
                            </p>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Select 
                            label="DISEÑO DE RECIBO"
                            value={receiptTemplate}
                            onChange={(e) => setReceiptTemplate(e.target.value as 'v1' | 'v2')}
                        >
                            <option value="v1">DISEÑO V1 (CLÁSICO)</option>
                            <option value="v2">DISEÑO V2 (MINIMALISTA)</option>
                        </Select>
                        <p className="text-xs text-slate-400 mt-1 uppercase">* Formato de impresión (21.5 x 8.7cm).</p>
                    </div>
                </div>

                {/* Ticket Sequence Settings */}
                <div className="pb-6 border-b border-slate-100">
                     <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Hash className="w-4 h-4" /> CONFIGURACIÓN DE FOLIOS
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div>
                            <Input 
                                label="PREFIJO DE FOLIO"
                                placeholder="EJ. 26"
                                value={ticketPrefix}
                                onChange={(e) => setTicketPrefix(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Prefijo que antecede al número (Ej. Año).</p>
                        </div>
                        <div>
                            <Input 
                                label="SIGUIENTE NÚMERO DE FOLIO"
                                type="number"
                                placeholder="1"
                                value={nextSequence}
                                onChange={(e) => setNextSequence(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">El próximo ticket será: {ticketPrefix}{nextSequence.padStart(4, '0')}</p>
                        </div>
                     </div>
                     <div className="bg-amber-50 text-amber-800 p-3 rounded-xl mt-3 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Modifique el "Siguiente Número" solo si necesita reiniciar o corregir la secuencia de tickets.</span>
                     </div>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Input 
                            label="RECARGO POR ATRASO (MULTA)"
                            type="number"
                            placeholder="50.00"
                            value={lateFee}
                            onChange={(e) => setLateFee(e.target.value)}
                        />
                    </div>
                    <div>
                        <Input 
                            label="PRECIO POR DÍA EXTRA DE RENTA"
                            type="number"
                            placeholder="50.00"
                            value={extraDayPrice}
                            onChange={(e) => setExtraDayPrice(e.target.value)}
                        />
                    </div>
                     <div>
                        <Input 
                            label="COMISIÓN POR TARJETA (%)"
                            type="number"
                            placeholder="0"
                            value={cardFee}
                            onChange={(e) => setCardFee(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveSettings} className="w-full md:w-auto">
                        <Save className="w-5 h-5" /> GUARDAR CAMBIOS
                    </Button>
                </div>
            </div>
        </Card>

        {/* --- COUPONS SECTION --- */}
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 uppercase">
                    <TicketPercent className="w-5 h-5 text-indigo-600" />
                    CUPONES Y DESCUENTOS
                </h3>
                <Button onClick={() => setShowCouponModal(true)} variant="secondary" className="shadow-none border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                    <Plus className="w-4 h-4" /> NUEVO CUPÓN
                </Button>
            </div>

            <div className="space-y-3">
                {coupons.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 uppercase text-sm italic">
                        NO HAY CUPONES REGISTRADOS
                    </div>
                ) : (
                    coupons.map(coupon => (
                        <div key={coupon.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${coupon.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    {coupon.type === 'percentage' ? <Percent className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className={`font-bold text-lg font-mono tracking-widest ${coupon.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                        {coupon.code}
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">
                                        DESCUENTO: {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleToggleCoupon(coupon)}
                                    className={`p-2 rounded-lg transition-colors ${coupon.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                    title={coupon.isActive ? "Desactivar" : "Activar"}
                                >
                                    {coupon.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                </button>
                                <button 
                                    onClick={() => coupon.id && handleDeleteCoupon(coupon.id)}
                                    className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>

        {/* --- DANGER ZONE (INVENTORY) --- */}
        <Card className="border-rose-200 bg-rose-50/30">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-rose-800 uppercase">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                ZONA DE PELIGRO - INVENTARIO
            </h3>
            <p className="text-sm text-slate-600 mb-6">
                Seleccione una categoría para eliminar TODOS sus productos, o seleccione 'TODOS' para vaciar el inventario completo. Esta acción requiere un PIN de seguridad.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <Select 
                        label="SELECCIONAR CATEGORÍA A ELIMINAR" 
                        value={selectedDeleteCategory}
                        onChange={(e) => setSelectedDeleteCategory(e.target.value)}
                        className="border-rose-200"
                    >
                        <option value="TODOS">⚠️ TODO EL INVENTARIO</option>
                        {categories.filter(c => c !== 'TODOS').map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                </div>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)} className="w-full md:w-auto uppercase">
                    <Trash2 className="w-5 h-5" /> ELIMINAR MASIVAMENTE
                </Button>
            </div>
        </Card>

        {/* --- USER MANAGEMENT --- */}
        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-lg font-bold text-slate-800 uppercase flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    GESTIÓN DE USUARIOS
                </h3>
                <Button onClick={openNewUserModal} className="shadow-lg">
                    <UserPlus className="w-5 h-5" /> NUEVO
                </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {/* Super Admin Display */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-bold uppercase">CRISTOBAL</div>
                            <div className="text-xs opacity-80 uppercase">SUPER ADMINISTRADOR</div>
                        </div>
                    </div>
                    <div className="bg-black/20 px-3 py-1 rounded-lg font-mono text-sm tracking-widest">
                        ******
                    </div>
                </div>

                {/* Dynamic Users */}
                {loading ? (
                    <div className="text-center py-4 text-slate-400 uppercase">CARGANDO...</div>
                ) : users.map(user => (
                    <div key={user.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold uppercase">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 uppercase">{user.name}</div>
                                <div className="text-xs text-slate-400 flex items-center gap-1 uppercase">
                                    <Key className="w-3 h-3" /> PIN: {user.code}
                                </div>
                            </div>
                        </div>

                        {/* Permissions Badge Preview */}
                        <div className="flex flex-wrap gap-1">
                            {user.permissions?.canAccessPOS && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold border border-emerald-100">POS</span>}
                            {user.permissions?.canManageInventory && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">INV</span>}
                            {user.permissions?.canViewReports && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">INF</span>}
                            {user.permissions?.canRefund && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">$</span>}
                            {user.permissions?.canManageSettings && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">CFG</span>}
                            {user.permissions?.canManageExpenses && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">GST</span>}
                            {user.permissions?.canApplyDiscounts && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">%</span>}
                            {user.permissions?.canSettleDebt && <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold border border-rose-100">DEUDA</span>}
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto">
                            {isSuperAdmin && (
                                <button 
                                    onClick={() => user.id && handleForceLogoutUser(user.id, user.name)}
                                    className="p-2 bg-slate-50 rounded-xl text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-all border border-slate-200"
                                    title="Forzar cierre de sesión"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            )}
                            <button 
                                onClick={() => openEditUserModal(user)}
                                className="p-2 bg-slate-50 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => user.id && handleDeleteUser(user.id)}
                                className="p-2 bg-slate-50 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-200"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {users.length === 0 && !loading && (
                    <div className="text-center py-8 text-slate-400 text-sm uppercase">
                    NO HAY OTROS USUARIOS REGISTRADOS.
                    </div>
                )}
            </div>
        </div>

        {/* --- FACTORY RESET SECTION (DANGER) --- */}
        <Card className="bg-red-900 text-white border-0 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                <Trash2 className="w-64 h-64" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-2xl font-black uppercase flex items-center gap-2 text-white mb-2">
                        <AlertTriangle className="w-8 h-8" /> REINICIO DE FÁBRICA
                    </h3>
                    <p className="text-red-200 text-sm max-w-lg">
                        Esta acción borrará TODOS los Productos, Clientes, Ventas, Gastos y Cupones. <br/>
                        La aplicación volverá a su estado inicial ("de cero"). Los usuarios registrados NO se borrarán.
                    </p>
                </div>
                <Button 
                    variant="ghost" 
                    onClick={() => setShowResetModal(true)} 
                    className="w-full md:w-auto bg-white text-red-900 hover:bg-red-50 border-0 py-4 px-8 font-black uppercase shadow-lg"
                >
                    <RefreshCw className="w-5 h-5 mr-2" /> REINICIAR DATOS
                </Button>
            </div>
        </Card>

      </div>

      {/* ... Modals (No changes to others) ... */}
      {/* Coupon Modal */}
      <Modal isOpen={showCouponModal} onClose={() => setShowCouponModal(false)} title="NUEVO CUPÓN">
          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2">
              <Input 
                 label="CÓDIGO (EJ. PROMOHALLOWEEN)"
                 value={newCouponCode}
                 onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
                 placeholder="CÓDIGO"
                 autoFocus
              />
              <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="TIPO DE DESCUENTO"
                    value={newCouponType}
                    onChange={(e: any) => setNewCouponType(e.target.value)}
                  >
                      <option value="percentage">PORCENTAJE (%)</option>
                      <option value="amount">CANTIDAD FIJA ($)</option>
                  </Select>
                  <Input 
                    label="VALOR"
                    type="number"
                    value={newCouponValue}
                    onChange={e => setNewCouponValue(e.target.value)}
                    placeholder="0"
                  />
              </div>
              <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowCouponModal(false)} className="flex-1 uppercase">CANCELAR</Button>
                  <Button type="submit" className="flex-[2] uppercase">GUARDAR CUPÓN</Button>
              </div>
          </form>
      </Modal>

      {/* Security PIN Modal (Delete Inventory) */}
      <Modal isOpen={showDeleteModal} onClose={() => {setShowDeleteModal(false); setDeletePin('');}} title="SEGURIDAD REQUERIDA">
          <div className="space-y-4">
              <div className="bg-rose-100 text-rose-800 p-4 rounded-xl text-sm font-bold flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6" />
                  <div>
                      ESTÁ A PUNTO DE ELIMINAR: <br/>
                      <span className="text-lg underline">{selectedDeleteCategory === 'TODOS' ? 'TODO EL INVENTARIO' : `CATEGORÍA ${selectedDeleteCategory}`}</span>
                  </div>
              </div>
              <p className="text-slate-600 text-sm">Ingrese el código de autorización para confirmar esta acción irreversible.</p>
              
              <Input 
                  label="PIN DE SEGURIDAD" 
                  type="password" 
                  placeholder="******" 
                  value={deletePin} 
                  onChange={(e) => setDeletePin(e.target.value)}
                  autoFocus
                  className="text-center text-xl tracking-widest font-mono"
              />

              <div className="pt-4 grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => {setShowDeleteModal(false); setDeletePin('');}} disabled={isDeleting}>CANCELAR</Button>
                  <Button variant="danger" onClick={confirmBulkDelete} disabled={isDeleting}>
                      {isDeleting ? 'ELIMINANDO...' : 'CONFIRMAR BORRADO'}
                  </Button>
              </div>
          </div>
      </Modal>

      {/* FACTORY RESET MODAL */}
      <Modal isOpen={showResetModal} onClose={() => {setShowResetModal(false); setResetPin('');}} title="⚠️ PELIGRO: REINICIO TOTAL">
          <div className="space-y-6">
              <div className="bg-red-600 text-white p-4 rounded-xl text-sm font-bold shadow-lg animate-pulse">
                  ESTÁ A PUNTO DE BORRAR TODA LA INFORMACIÓN DEL NEGOCIO. <br/>
                  ESTA ACCIÓN NO SE PUEDE DESHACER.
              </div>
              
              <div className="text-slate-600 text-sm space-y-2">
                  <p>Se eliminarán permanentemente:</p>
                  <ul className="list-disc pl-5 font-bold">
                      <li>Inventario de Productos</li>
                      <li>Base de Datos de Clientes</li>
                      <li>Historial de Ventas y Tickets</li>
                      <li>Gastos Registrados</li>
                      <li>Configuración de Folios</li>
                  </ul>
              </div>
              
              <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">INGRESE CÓDIGO MAESTRO PARA CONFIRMAR</label>
                  <Input 
                      type="password" 
                      placeholder="******" 
                      value={resetPin} 
                      onChange={(e) => setResetPin(e.target.value)}
                      autoFocus
                      className="text-center text-2xl tracking-widest font-mono border-red-300 focus:ring-red-500"
                  />
              </div>

              <div className="pt-4 grid grid-cols-1 gap-3">
                  <Button 
                    onClick={handleFactoryReset} 
                    disabled={isResetting || resetPin.length < 6}
                    className="w-full bg-red-600 hover:bg-red-700 text-white shadow-xl py-4 uppercase font-black"
                  >
                      {isResetting ? 'BORRANDO SISTEMA...' : 'CONFIRMAR BORRADO TOTAL'}
                  </Button>
                  <Button variant="secondary" onClick={() => {setShowResetModal(false); setResetPin('');}} disabled={isResetting} className="uppercase">
                      CANCELAR OPERACIÓN
                  </Button>
              </div>
          </div>
      </Modal>

      {/* User Create/Edit Modal */}
      <Modal 
        isOpen={showUserModal} 
        onClose={() => setShowUserModal(false)} 
        title={editingUser ? "EDITAR USUARIO" : "NUEVO USUARIO"}
      >
          <form onSubmit={handleUserSubmit} className="space-y-6 pt-2">
              <div className="space-y-4">
                  <Input 
                        label="NOMBRE DEL PERSONAL"
                        placeholder="EJ. MARIANA"
                        value={userName}
                        onChange={e => setUserName(e.target.value.toUpperCase())}
                  />
                  <Input 
                        label="CÓDIGO DE ACCESO (4 DÍGITOS)"
                        type="number"
                        placeholder="1234"
                        maxLength={4}
                        value={userCode}
                        onChange={e => setUserCode(e.target.value.slice(0, 4))}
                  />
              </div>

              {/* Permissions Grid */}
              <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">PERMISOS DE ACCESO</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <PermissionSwitch label="ACCESO PUNTO DE VENTA" pKey="canAccessPOS" />
                      <PermissionSwitch label="VER REPORTES" pKey="canViewReports" />
                      <PermissionSwitch label="MODIFICAR AJUSTES" pKey="canManageSettings" />
                      <PermissionSwitch label="GESTIONAR INVENTARIO" pKey="canManageInventory" />
                      <PermissionSwitch label="GESTIONAR USUARIOS" pKey="canManageUsers" />
                      <PermissionSwitch label="HACER REEMBOLSOS" pKey="canRefund" />
                      <PermissionSwitch label="ELIMINAR CLIENTES" pKey="canDeleteCustomers" />
                      <PermissionSwitch label="GESTIONAR GASTOS" pKey="canManageExpenses" />
                      <PermissionSwitch label="APLICAR DESCUENTOS" pKey="canApplyDiscounts" />
                      <PermissionSwitch label="LIQUIDAR DEUDAS MANUALMENTE" pKey="canSettleDebt" />
                  </div>
              </div>

              {/* Custom Menu Order Section */}
              <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Menu className="w-4 h-4" /> ORGANIZACIÓN DEL MENÚ
                      </h4>
                      <button 
                          type="button"
                          onClick={() => setCustomMenuEnabled(!customMenuEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${customMenuEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customMenuEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                  </div>

                  {customMenuEnabled ? (
                      <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-60 overflow-y-auto">
                          {currentMenuOrder.map((path, index) => {
                              // Find config for this path
                              const config = MENU_ITEMS.find(m => m.path === path);
                              if(!config) return null;

                              return (
                                  <div key={path} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                      <div className="flex items-center gap-3">
                                          <GripVertical className="w-4 h-4 text-slate-300" />
                                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase">
                                              <config.icon className="w-4 h-4 text-indigo-500" />
                                              {config.label}
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                          <button 
                                              type="button" 
                                              onClick={() => moveMenuItem(index, 'up')}
                                              disabled={index === 0}
                                              className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                          >
                                              <ArrowUp className="w-4 h-4" />
                                          </button>
                                          <button 
                                              type="button" 
                                              onClick={() => moveMenuItem(index, 'down')}
                                              disabled={index === currentMenuOrder.length - 1}
                                              className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                          >
                                              <ArrowDown className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 uppercase">
                          SE UTILIZARÁ EL ORDEN POR DEFECTO DE LA APLICACIÓN.
                      </div>
                  )}
              </div>

              <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowUserModal(false)} className="flex-1 uppercase">CANCELAR</Button>
                  <Button type="submit" className="flex-[2] uppercase">
                      {editingUser ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO'}
                  </Button>
              </div>
          </form>
      </Modal>
    </div>
  );
};

export default Settings;
