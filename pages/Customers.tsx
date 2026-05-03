
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Pencil, Trash2, Phone, MapPin, History, Receipt, Clock, CheckCircle, AlertTriangle, Eraser, Map as MapIcon, Table as TableIcon, Info } from 'lucide-react';
import { Customer, User, Order } from '../types';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getOrders } from '../services/dataService';
import { Button, Input, Modal, Card, Badge } from '../components/UI';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

const CustomerMarker = ({ customer, onOpenHistory }: { customer: Customer, onOpenHistory: (c: Customer) => void }) => {
    const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
    const [markerRef, marker] = useAdvancedMarkerRef();
    const [infoOpen, setInfoOpen] = useState(false);

    useEffect(() => {
        if (!customer.address) return;

        const geocoder = new google.maps.Geocoder();
        const addressToGeocode = customer.address.toUpperCase().includes('CIUDAD GUZMAN') 
            ? customer.address 
            : `${customer.address}, CIUDAD GUZMAN, JALISCO, CP 49000, MEXICO`;

        geocoder.geocode({ address: addressToGeocode }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location;
                setPosition({ lat: loc.lat(), lng: loc.lng() });
            }
        });
    }, [customer.address]);

    if (!position) return null;

    return (
        <>
            <AdvancedMarker 
                ref={markerRef}
                position={position} 
                title={customer.name}
                onClick={() => setInfoOpen(true)}
            >
                <Pin 
                    background={customer.balance && customer.balance < 0 ? '#e11d48' : '#4f46e5'} 
                    glyphColor="#fff" 
                    borderColor="#fff"
                />
            </AdvancedMarker>
            {infoOpen && (
                <InfoWindow 
                    anchor={marker} 
                    onCloseClick={() => setInfoOpen(false)}
                >
                    <div className="p-1 min-w-[180px] font-sans">
                        <div className="font-bold text-slate-800 uppercase text-xs mb-1">{customer.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                        </div>
                        
                        {(customer.balance || 0) < 0 ? (
                            <div className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-bold mb-3 border border-rose-100 flex justify-between">
                                <span>ADEUDO</span>
                                <span>${Math.abs(customer.balance || 0).toFixed(2)}</span>
                            </div>
                        ) : (
                            <div className="bg-slate-50 text-slate-400 px-2 py-1 rounded text-[10px] font-bold mb-3 border border-slate-100 text-center">
                                SIN DEUDAS
                            </div>
                        )}

                        <button 
                            onClick={() => {
                                setInfoOpen(false);
                                onOpenHistory(customer);
                            }}
                            className="w-full bg-indigo-600 text-white text-[9px] font-bold py-1.5 rounded uppercase hover:bg-indigo-700 transition-colors"
                        >
                            Ver Historial
                        </button>
                    </div>
                </InfoWindow>
            )}
        </>
    );
};

const Customers: React.FC<{ user: User }> = ({ user }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [orders, setOrders] = useState<Order[]>([]); // Store orders for history
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Edit/New Form Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Form Data
  const [formData, setFormData] = useState<Partial<Customer>>({
      name: '',
      phone: '',
      address: ''
  });

  const canDelete = user.role === 'admin' || user.permissions?.canDeleteCustomers;
  const canSettleDebt = user.role === 'admin' || user.permissions?.canSettleDebt;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const [cData, oData] = await Promise.all([getCustomers(), getOrders()]);
      setCustomers(cData);
      setOrders(oData);
      setLoading(false);
  };

  const handleAddNew = () => {
      setSelectedCustomer(null);
      setFormData({ name: '', phone: '', address: '' });
      setShowFormModal(true);
  };

  const handleEdit = (e: React.MouseEvent, customer: Customer) => {
      e.stopPropagation(); // Prevent opening history
      setSelectedCustomer(customer);
      setFormData({ ...customer });
      setShowFormModal(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Prevent opening history
      if (!canDelete) return;
      if (confirm("¿Eliminar cliente? Esta acción no se puede deshacer.")) {
          await deleteCustomer(id);
          loadData();
      }
  };

  // Open History Modal
  const handleViewHistory = (customer: Customer) => {
      setViewingCustomer(customer);
      setShowHistoryModal(true);
  };

  // Manually settle debt
  const handleSettleDebt = async () => {
      if (!viewingCustomer || !viewingCustomer.id) return;
      
      const debtAmount = Math.abs(viewingCustomer.balance || 0);
      
      if(confirm(`¿Estás seguro de LIQUIDAR la deuda de $${debtAmount.toFixed(2)}?\n\nEsta acción restablecerá el saldo a $0.00.`)) {
          try {
              await updateCustomer(viewingCustomer.id, { balance: 0 });
              alert("Deuda liquidada correctamente.");
              
              // Update local state
              const updatedCustomer = { ...viewingCustomer, balance: 0 };
              setViewingCustomer(updatedCustomer);
              setCustomers(prev => prev.map(c => c.id === viewingCustomer.id ? updatedCustomer : c));
              
          } catch(e) {
              alert("Error al liquidar deuda.");
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // MANDATORY FIELDS VALIDATION
    if (!formData.name || !formData.phone || !formData.address) {
        alert("Todos los campos (Nombre, Teléfono y Dirección) son obligatorios.");
        return;
    }

    try {
        const customerPayload = {
            name: formData.name.toUpperCase(),
            phone: formData.phone,
            address: formData.address.toUpperCase(),
            balance: formData.balance // Preserve balance
        };

        if (selectedCustomer && selectedCustomer.id) {
            await updateCustomer(selectedCustomer.id, customerPayload);
            alert("Cliente actualizado");
        } else {
            await addCustomer(customerPayload as Customer);
            alert("Cliente registrado");
        }
        setShowFormModal(false);
        loadData();
    } catch (e) {
        console.error(e);
        alert('Error al guardar cliente');
    }
  };

  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery)
  );

  // Compute history for the viewing customer
  const customerHistory = useMemo(() => {
      if (!viewingCustomer) return [];
      return orders
        .filter(o => o.customer?.id === viewingCustomer.id)
        .sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, viewingCustomer]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
       <header className="mb-6 flex justify-between items-center flex-shrink-0">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 uppercase">
            <Users className="w-8 h-8 text-indigo-600" />
            CLIENTES
            </h1>
            <p className="text-slate-500 mt-1 text-sm uppercase">DIRECTORIO Y SALDOS</p>
        </div>
        <Button onClick={handleAddNew} className="shadow-lg">
            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">NUEVO</span>
        </Button>
      </header>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 flex-shrink-0">
          <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                  type="text" 
                  placeholder="BUSCAR POR NOMBRE O TELÉFONO..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all uppercase"
              />
          </div>
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm self-start md:self-stretch">
              <button 
                onClick={() => setViewMode('table')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                  <TableIcon className="w-4 h-4" /> <span className="hidden sm:inline uppercase">TABLA</span>
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                  <MapIcon className="w-4 h-4" /> <span className="hidden sm:inline uppercase">MAPA</span>
              </button>
          </div>
      </div>

      {viewMode === 'table' ? (
          /* Professional Table Container */
          <div className="flex-1 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col mb-24 lg:mb-8">
              <div className="overflow-x-auto min-h-0">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Cliente</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Contacto</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Ubicación</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">Estado de Cuenta</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 text-center">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredCustomers.map(customer => {
                              const balance = customer.balance || 0;
                              return (
                                  <tr key={customer.id} className="hover:bg-indigo-50/30 transition-colors group">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black text-lg uppercase flex-shrink-0">
                                                  {customer.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-slate-800 uppercase line-clamp-1">{customer.name}</div>
                                                  <div className="text-[10px] font-mono text-slate-400 uppercase">ID: {customer.id?.slice(-6)}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-2 text-slate-600 text-sm font-mono whitespace-nowrap">
                                              <Phone className="w-3.5 h-3.5 text-slate-300" />
                                              {customer.phone}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-start gap-2 text-slate-600 text-[11px] max-w-[200px] uppercase leading-tight">
                                              <MapPin className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                                              <span className="line-clamp-2">{customer.address}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {balance < 0 ? (
                                              <div className="inline-flex flex-col items-end">
                                                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter mb-0.5">ADEUDO</span>
                                                  <span className="font-mono font-bold text-rose-600 text-sm bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                                                      ${Math.abs(balance).toFixed(2)}
                                                  </span>
                                              </div>
                                          ) : balance > 0 ? (
                                              <div className="inline-flex flex-col items-end">
                                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter mb-0.5">A FAVOR</span>
                                                  <span className="font-mono font-bold text-emerald-600 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                      ${balance.toFixed(2)}
                                                  </span>
                                              </div>
                                          ) : (
                                              <span className="text-[10px] font-bold text-slate-300 uppercase italic">Sin Saldo</span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center justify-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                              <button 
                                                  onClick={() => handleViewHistory(customer)}
                                                  title="Historial"
                                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
                                              >
                                                  <History className="w-4 h-4" />
                                              </button>
                                              <button 
                                                  onClick={(e) => handleEdit(e, customer)}
                                                  title="Editar"
                                                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
                                              >
                                                  <Pencil className="w-4 h-4" />
                                              </button>
                                              {canDelete && (
                                                  <button 
                                                      onClick={(e) => customer.id && handleDelete(e, customer.id)}
                                                      title="Eliminar"
                                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
                                                  >
                                                      <Trash2 className="w-4 h-4" />
                                                  </button>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
              
              {(filteredCustomers.length === 0 && !loading) && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-300 uppercase">
                      <Users className="w-16 h-16 mb-4 opacity-10" />
                      <p className="font-bold tracking-widest text-xs">No se encontraron clientes</p>
                  </div>
              )}
          </div>
      ) : (
          /* Map View Container */
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-24 lg:mb-8 relative flex flex-col">
              {!GOOGLE_MAPS_API_KEY ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-amber-500" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 uppercase mb-2">Se requiere API Key de Google Maps</h2>
                      <p className="text-slate-500 text-sm max-w-md uppercase leading-relaxed mb-8">
                        Para visualizar el mapa de clientes, necesitas configurar tu GOOGLE_MAPS_PLATFORM_KEY en los secretos de la aplicación.
                      </p>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left w-full max-w-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Instrucciones de configuración:</p>
                          <ol className="text-xs text-slate-600 space-y-3 uppercase font-medium">
                              <li className="flex gap-3">
                                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px]">1</span>
                                  <span>Obtén una API Key en <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" className="text-indigo-600 underline">GCP Console</a></span>
                              </li>
                              <li className="flex gap-3">
                                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px]">2</span>
                                  <span>Ve a Ajustes (⚙️) → Secrets</span>
                              </li>
                              <li className="flex gap-3">
                                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px]">3</span>
                                  <span>Agrega <code>GOOGLE_MAPS_PLATFORM_KEY</code> con tu llave</span>
                              </li>
                          </ol>
                      </div>
                  </div>
              ) : (
                  <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                      <div className="flex-1 relative">
                          <Map
                              defaultCenter={{ lat: 19.7047, lng: -103.4617 }} // Ciudad Guzman center
                              defaultZoom={14}
                              mapId="DEMO_MAP_ID"
                              className="w-full h-full"
                              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                          >
                              {filteredCustomers.map(c => (
                                  <CustomerMarker 
                                      key={c.id} 
                                      customer={c} 
                                      onOpenHistory={(customer) => handleViewHistory(customer)} 
                                  />
                              ))}
                          </Map>
                          
                          {/* Map Overlay Stats */}
                          <div className="absolute top-4 left-4 z-10 pointer-events-none">
                              <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-200 px-4 py-2 rounded-xl">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Clientes Visibles</p>
                                  <p className="text-lg font-black text-slate-800 leading-none">{filteredCustomers.length}</p>
                              </div>
                          </div>

                          <div className="absolute bottom-4 left-4 right-4 z-10 lg:left-4 lg:right-auto pointer-events-none">
                              <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-200 p-4 rounded-2xl max-w-sm pointer-events-auto">
                                  <div className="flex items-center gap-2 mb-2">
                                      <Info className="w-4 h-4 text-indigo-600" />
                                      <span className="text-[10px] font-bold text-slate-800 uppercase">Simbología del Mapa</span>
                                  </div>
                                  <div className="flex gap-4">
                                      <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full bg-indigo-600 border border-white"></div>
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">Saldo Regular</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full bg-rose-600 border border-white"></div>
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">Con Adeudo</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </APIProvider>
              )}
          </div>
      )}

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={viewingCustomer ? `HISTORIAL: ${viewingCustomer.name}` : 'HISTORIAL'}
      >
          {viewingCustomer && (
              <div className="space-y-6">
                  {/* Balance Header */}
                  <div className={`p-6 rounded-2xl text-center border-2 transition-colors duration-500 ${
                      (viewingCustomer.balance || 0) < 0 
                      ? 'bg-rose-50 border-rose-200 text-rose-800' 
                      : ((viewingCustomer.balance || 0) > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600')
                  }`}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1">ESTADO DE CUENTA</p>
                      <h2 className="text-4xl font-black font-mono">
                          {(viewingCustomer.balance || 0) < 0 ? '-' : ''}${Math.abs(viewingCustomer.balance || 0).toFixed(2)}
                      </h2>
                      <p className="text-xs font-bold uppercase mt-2 opacity-70">
                          {(viewingCustomer.balance || 0) < 0 ? 'DEBE AL NEGOCIO' : ((viewingCustomer.balance || 0) > 0 ? 'SALDO A FAVOR' : 'CUENTA EN CEROS')}
                      </p>

                      {/* Manual Debt Settlement Button */}
                      {(viewingCustomer.balance || 0) < 0 && canSettleDebt && (
                          <div className="mt-4 pt-4 border-t border-rose-200/50">
                              <Button 
                                  onClick={handleSettleDebt} 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 border-2 border-emerald-500"
                              >
                                  <Eraser className="w-4 h-4 mr-2" /> LIQUIDAR DEUDA MANUALMENTE
                              </Button>
                              <p className="text-[10px] mt-2 opacity-60">
                                  Esta acción pondrá el saldo en $0.00 inmediatamente.
                              </p>
                          </div>
                      )}
                  </div>

                  {/* History List */}
                  <div>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <History className="w-4 h-4" /> ÚLTIMOS MOVIMIENTOS
                      </h4>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                          {customerHistory.length === 0 ? (
                              <div className="text-center py-8 text-slate-400 text-xs uppercase border-2 border-dashed border-slate-100 rounded-xl">
                                  Sin historial registrado
                              </div>
                          ) : (
                              customerHistory.map(order => {
                                  const isLate = order.status === 'late' || order.status === 'returned_late';
                                  const isActive = order.status === 'pending' || order.status === 'reservation';
                                  
                                  return (
                                      <div key={order.id} className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                                          <div className="flex justify-between items-start mb-2">
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <Receipt className="w-3 h-3 text-slate-400" />
                                                      <span className="font-bold text-slate-800 text-sm">FOLIO #{order.id?.slice(-6)}</span>
                                                  </div>
                                                  <span className="text-[10px] text-slate-500">{new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                              </div>
                                              <div className="text-right">
                                                  <div className="font-mono font-bold text-slate-800">${order.total.toFixed(2)}</div>
                                                  <Badge color={isLate ? 'rose' : (isActive ? 'amber' : 'green')}>
                                                      {isLate ? 'ATRASO' : (isActive ? 'ACTIVO' : 'FINALIZADO')}
                                                  </Badge>
                                              </div>
                                          </div>
                                          
                                          {/* Items Summary */}
                                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg space-y-1">
                                              {order.items.slice(0, 3).map((item, idx) => (
                                                  <div key={idx} className="flex justify-between uppercase">
                                                      <span className="truncate max-w-[200px]">{item.name}</span>
                                                      <span className="text-slate-400">x{item.quantity}</span>
                                                  </div>
                                              ))}
                                              {order.items.length > 3 && (
                                                  <div className="text-[9px] text-slate-400 italic text-center pt-1">+ {order.items.length - 3} artículos más</div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })
                          )}
                      </div>
                  </div>
                  
                  <div className="pt-2">
                      <Button variant="secondary" onClick={() => setShowHistoryModal(false)} className="w-full uppercase">CERRAR DETALLE</Button>
                  </div>
              </div>
          )}
      </Modal>

      {/* Form Modal */}
      <Modal 
        isOpen={showFormModal} 
        onClose={() => setShowFormModal(false)} 
        title={selectedCustomer ? "EDITAR CLIENTE" : "NUEVO CLIENTE"}
      >
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <Input 
                  label="NOMBRE COMPLETO" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  placeholder="EJ. JUAN PÉREZ"
                  autoFocus
              />
              <Input 
                  label="TELÉFONO" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="10 DÍGITOS"
                  type="tel"
              />
              <Input 
                  label="DIRECCIÓN" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value.toUpperCase()})}
                  placeholder="CALLE, NÚMERO, COLONIA"
              />
              
              <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowFormModal(false)} className="flex-1 uppercase">CANCELAR</Button>
                  <Button type="submit" className="flex-[2] uppercase">GUARDAR</Button>
              </div>
          </form>
      </Modal>
    </div>
  );
};

export default Customers;
