
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Calendar, Trash2, Plus, Minus, X, CreditCard, Banknote, ArrowUpRight, Tag, RotateCcw, UserPlus, Save, ArrowLeft, LayoutGrid, ListFilter, Percent, ChevronLeft, Box, DollarSign, Layers, Shirt, Clock, Pencil, MapPin, CheckCircle, Printer, RefreshCw, AlertTriangle, Smartphone, Delete } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Input, Modal, DatePickerModal, Badge, ReceiptTemplate } from '../components/UI';
import { Product, Customer, CartItem, Variation, Coupon, Category, SystemSettings, Order } from '../types';
import { getProducts, getCustomers, createOrder, updateCustomer, getCoupons, addCustomer, getCategories, getSystemSettings } from '../services/dataService';

// Add Prop Interface
interface POSProps {
    onOpenQuickAdd?: (name: string) => void;
}

const POS: React.FC<POSProps> = ({ onOpenQuickAdd }) => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Data State
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);

    // View State
    const [viewMode, setViewMode] = useState<'categories' | 'all'>('categories');
    const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // For Drill-down in 'categories' view
    const [filterCategory, setFilterCategory] = useState<string>('TODOS'); // For Filter in 'all' view

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
    const [isApartadoMode, setIsApartadoMode] = useState(false);
    
    // Checkout Success State
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    // Customer Modal State
    const [customerViewMode, setCustomerViewMode] = useState<'search' | 'new' | 'edit'>('search');
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');

    // Dates for Rental
    const [rentalStartDate, setRentalStartDate] = useState<number | undefined>(undefined);
    const [rentalEndDate, setRentalEndDate] = useState<number | undefined>(undefined);

    // ZERO PRICE MODAL STATE
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [pendingItem, setPendingItem] = useState<{product: Product, variation?: Variation, type: 'sale' | 'rent'} | null>(null);
    const [manualPriceInput, setManualPriceInput] = useState('');

    // Internal helper for keypad inputs
    const handleKeypadPress = (val: string, current: string, setter: (v: string) => void) => {
        if (val === 'BACK') {
            setter(current.slice(0, -1));
        } else if (val === '.') {
            if (!current.includes('.')) setter(current + '.');
        } else {
            // Limit to 2 decimals if needed, but for entry just keep it simple
            if (current === '0') setter(val);
            else setter(current + val);
        }
    };

    // VARIATION SELECTION MODAL STATE
    const [showVariationModal, setShowVariationModal] = useState(false);
    const [selectedProductForVariations, setSelectedProductForVariations] = useState<Product | null>(null);

    // Modals
    const [showPaymentModal, setPaymentModalOpen] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
    
    // Payment Form
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'other'>('cash');
    const [showFullBankCard, setShowFullBankCard] = useState(false);
    
    // Discount
    const [appliedDiscount, setAppliedDiscount] = useState<{amount: number, reason: string} | null>(null);

    // Load Data
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const [p, c, cp, cats, s] = await Promise.all([
                getProducts(), 
                getCustomers(), 
                getCoupons(), 
                getCategories(), 
                getSystemSettings()
            ]);
            setProducts(p);
            setCustomers(c);
            setCoupons(cp);
            setCategories(cats);
            setSettings(s || null);
            setLoading(false);
        };
        init();
    }, []);

    // Check for incoming state (Late Fee Payment)
    useEffect(() => {
        if (location.state && location.state.action === 'pay_late_fee') {
            const { customer, amount, refTicket } = location.state;
            if (customer) {
                // If checking out a late fee, we select the customer AND add the debt item immediately
                handleSelectCustomer(customer, true, amount);
            }
        }
    }, [location.state]);

    // Reset customer modal state when closed/opened
    useEffect(() => {
        if (showCustomerModal) {
            setCustomerViewMode('search');
            setCustomerSearch('');
            setEditingCustomer(null);
        }
    }, [showCustomerModal]);

    // --- EXTRA DAY CALCULATION LOGIC ---
    useEffect(() => {
        if (!rentalStartDate || !rentalEndDate || !settings) return;

        // 1. Calculate Base Return Date (Standard 1 Day, skip Sunday)
        const startObj = new Date(rentalStartDate);
        const dayOfWeek = startObj.getDay(); // 0=Sun, 6=Sat
        
        let baseReturnTime = 0;
        const baseReturnObj = new Date(rentalStartDate);
        
        if (dayOfWeek === 6) { 
            // If Saturday -> Monday (Add 2 days)
            baseReturnObj.setDate(baseReturnObj.getDate() + 2);
        } else {
            // Normal -> Next Day
            baseReturnObj.setDate(baseReturnObj.getDate() + 1);
        }
        
        // Normalize time to avoid hour issues
        baseReturnObj.setHours(12,0,0,0);
        baseReturnTime = baseReturnObj.getTime();

        const actualReturnObj = new Date(rentalEndDate);
        actualReturnObj.setHours(12,0,0,0);
        const actualReturnTime = actualReturnObj.getTime();

        // 2. Count Extra Business Days
        let extraDaysCount = 0;
        
        if (actualReturnTime > baseReturnTime) {
            // Loop from Base (exclusive) to Actual (inclusive)
            const cursor = new Date(baseReturnTime);
            // Move cursor to first potential extra day
            cursor.setDate(cursor.getDate() + 1); 

            while (cursor.getTime() <= actualReturnTime) {
                if (cursor.getDay() !== 0) { // If NOT Sunday
                    extraDaysCount++;
                }
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        // 3. Update Cart with Extra Day Item
        setCart(prevCart => {
            const EXTRA_ITEM_ID = 'EXTRA_DAYS_AUTO_FEE';
            const cleanCart = prevCart.filter(item => item.cartId !== EXTRA_ITEM_ID);

            if (extraDaysCount > 0 && settings.pricePerExtraDay > 0) {
                const extraFeeItem: CartItem = {
                    cartId: EXTRA_ITEM_ID,
                    code: 'DIA-EXTRA',
                    name: `DÍAS EXTRA`, 
                    description: 'Cargo por extensión de renta',
                    category: 'CARGOS',
                    stock: 9999,
                    variations: [],
                    isRentalAvailable: false,
                    isSaleAvailable: true, 
                    salePrice: settings.pricePerExtraDay,
                    rentalPrice: 0,
                    transactionType: 'sale',
                    quantity: extraDaysCount,
                    appliedPrice: settings.pricePerExtraDay
                };
                return [...cleanCart, extraFeeItem];
            }
            
            return cleanCart;
        });

    }, [rentalStartDate, rentalEndDate, settings]);


    // Computed
    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.appliedPrice * item.quantity), 0);
    }, [cart]);

    const total = useMemo(() => {
        let base = cartTotal;
        if (appliedDiscount) base -= appliedDiscount.amount;
        return Math.max(0, base);
    }, [cartTotal, appliedDiscount]);

    const hasRentals = useMemo(() => cart.some(i => i.transactionType === 'rent'), [cart]);

    // Helper: Format Date like "06 FEB 26"
    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'SELECCIONAR';
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
        }).toUpperCase().replace('.', '');
    };

    // Cart Actions
    const addToCart = (product: Product, variation?: Variation, type: 'sale' | 'rent' = 'sale', manualPriceOverride?: number) => {
        // 1. Determine Price
        let price = manualPriceOverride;
        
        if (price === undefined) {
            if (variation) {
                const varPrice = type === 'sale' ? variation.salePrice : variation.rentalPrice;
                // If variation has a price explicitly set (including 0), use it
                // Note: 0 is explicitly checked later to trigger the manual price modal
                if (varPrice !== undefined) {
                    price = varPrice;
                } else {
                    // Fallback to product price if variation price is NOT DEFINED
                    price = type === 'sale' ? product.salePrice : product.rentalPrice;
                }
            } else {
                price = type === 'sale' ? product.salePrice : product.rentalPrice;
            }
        }

        const finalPrice = price || 0;

        // 2. Check for Zero Price (Trigger Modal)
        if (finalPrice === 0 && manualPriceOverride === undefined) {
            setPendingItem({ product, variation, type });
            setManualPriceInput('');
            setShowPriceModal(true);
            return;
        }

        // 3. Add to Cart
        const newItem: CartItem = {
            ...product,
            cartId: Math.random().toString(36).substr(2, 9),
            transactionType: type,
            quantity: 1,
            selectedVariation: variation,
            appliedPrice: finalPrice
        };

        setCart(prev => [...prev, newItem]);
    };

    const handleOpenVariations = (product: Product) => {
        setSelectedProductForVariations(product);
        setShowVariationModal(true);
    };

    const handleConfirmManualPrice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingItem) return;
        
        const price = parseFloat(manualPriceInput);
        if (isNaN(price) || price < 0) {
            alert("Ingrese un precio válido.");
            return;
        }

        addToCart(pendingItem.product, pendingItem.variation, pendingItem.type, price);
        
        // Cleanup
        setShowPriceModal(false);
        setPendingItem(null);
        setManualPriceInput('');
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(i => i.cartId !== cartId));
    };

    const updateQuantity = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const selectCoupon = (coupon: Coupon) => {
        let discountAmount = 0;
        if (coupon.type === 'percentage') {
            discountAmount = (cartTotal * coupon.value) / 100;
        } else {
            discountAmount = coupon.value;
        }

        // Cap discount at total
        discountAmount = Math.min(discountAmount, cartTotal);

        setAppliedDiscount({ amount: discountAmount, reason: coupon.code });
        setShowCouponModal(false);
    };

    const clearDiscount = () => {
        setAppliedDiscount(null);
    };

    // Dates
    const handleDateSelect = (dateStr: string) => {
        const timestamp = new Date(dateStr + 'T12:00:00').getTime(); // Noon to avoid timezone shifts
        
        if (datePickerMode === 'start') {
            setRentalStartDate(timestamp);
            
            // Auto-calculate return day based on Business Rules
            const startObj = new Date(timestamp);
            const dayOfWeek = startObj.getDay(); // 0=Sun, 1=Mon... 6=Sat
            
            const nextDay = new Date(timestamp);
            if (dayOfWeek === 6) {
                // Saturday -> Returns Monday (+2 days)
                nextDay.setDate(nextDay.getDate() + 2);
            } else {
                // Normal -> Returns Tomorrow (+1 day)
                nextDay.setDate(nextDay.getDate() + 1);
            }
            setRentalEndDate(nextDay.getTime());

        } else {
            // Setting End Date Manually
            setRentalStartDate(prev => prev || Date.now()); 
            setRentalEndDate(timestamp);
        }
    };

    // CUSTOMER SELECTION WITH DEBT AS CART ITEM
    const handleSelectCustomer = (c: Customer, forceDebtAdd: boolean = false, forcedAmount?: number) => {
        setCurrentCustomer(c);
        
        // Remove any previous debt items to avoid duplication/confusion
        setCart(prev => prev.filter(i => i.code !== 'ADEUDO'));

        // Logic to add Debt Item to Cart
        const addDebtToCart = (amount: number) => {
            const debtItem: CartItem = {
                cartId: `DEBT-${c.id}-${Date.now()}`,
                code: 'ADEUDO',
                name: 'SALDO PENDIENTE',
                description: 'Pago de adeudo anterior',
                category: 'CARGOS',
                stock: 1,
                variations: [],
                isRentalAvailable: false,
                isSaleAvailable: true,
                salePrice: amount,
                rentalPrice: 0,
                transactionType: 'sale',
                quantity: 1,
                appliedPrice: amount
            };
            setCart(prev => [...prev, debtItem]);
        };

        if (forceDebtAdd && forcedAmount) {
            addDebtToCart(forcedAmount);
        } else if (c.balance && c.balance < 0) {
            const debt = Math.abs(c.balance);
            // Prompt user
            if (window.confirm(`⚠️ ESTE CLIENTE TIENE UN ADEUDO DE $${debt.toFixed(2)}.\n\n¿Desea agregarlo al carrito para cobrarlo ahora?`)) {
                addDebtToCart(debt);
            }
        }

        setShowCustomerModal(false);
        setCustomerSearch('');
    };

    const handleRemoveCustomer = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentCustomer(null);
        // If customer is removed, remove their debt item from cart
        setCart(prev => prev.filter(i => i.code !== 'ADEUDO'));
    };

    // --- CARD FEE LOGIC ---
    const handlePaymentMethodChange = (method: 'cash' | 'card' | 'transfer' | 'other') => {
        setPaymentMethod(method);
        
        // Auto-fill amount paid for transfer/card if not already set or if it was 0
        if ((method === 'transfer' || method === 'card') && (!amountPaid || parseFloat(amountPaid) === 0)) {
            setAmountPaid(total.toFixed(2));
        }

        setCart(prevCart => {
            // 1. Remove existing card fee to calculate base total correctly
            const cleanCart = prevCart.filter(i => i.cartId !== 'CARD_FEE_SERVICE');

            if (method !== 'card' || !settings?.cardFeePercentage || settings.cardFeePercentage <= 0) {
                return cleanCart;
            }

            // 2. Calculate Subtotal (Sum of all items including debts/extras)
            const subtotal = cleanCart.reduce((sum, item) => sum + (item.appliedPrice * item.quantity), 0);
            
            // 3. Apply Discount logic to get true base amount
            const discountVal = appliedDiscount ? appliedDiscount.amount : 0;
            const taxableBase = Math.max(0, subtotal - discountVal);

            if (taxableBase <= 0) return cleanCart;

            // 4. Calculate Fee
            const feeAmount = taxableBase * (settings.cardFeePercentage / 100);

            // 5. Create Fee Item
            const feeItem: CartItem = {
                cartId: 'CARD_FEE_SERVICE',
                code: 'COMISION',
                name: 'SERVICIO',
                description: `Cargo del ${settings.cardFeePercentage}% por pago con tarjeta`,
                category: 'CARGOS',
                stock: 9999,
                variations: [],
                isRentalAvailable: false,
                isSaleAvailable: true,
                salePrice: feeAmount,
                rentalPrice: 0,
                transactionType: 'sale',
                quantity: 1,
                appliedPrice: feeAmount
            };

            return [...cleanCart, feeItem];
        });
    };

    // Payment Logic
    const handleOpenPayment = () => {
        if (cart.length === 0) return;
        
        // Combined check: Rentals OR Apartado require customer
        if ((hasRentals || isApartadoMode) && !currentCustomer) {
            alert(isApartadoMode ? "Es necesario seleccionar un cliente para apartar." : "Es necesario seleccionar un cliente para rentas.");
            setShowCustomerModal(true);
            return;
        }
  
        if (hasRentals && !rentalEndDate) {
            alert("Selecciona fecha de devolución.");
            setDatePickerMode('end');
            setShowDatePicker(true);
            return;
        }
  
        // RESET PAYMENT METHOD AND REMOVE FEES WHEN OPENING
        setPaymentMethod('cash');
        setCart(prev => prev.filter(i => i.cartId !== 'CARD_FEE_SERVICE'));

        setAmountPaid('');
        setPaymentModalOpen(true);
    };

    const handleClosePayment = () => {
        setPaymentModalOpen(false);
        // Remove fee when closing modal to prevent it sticking in cart if they continue shopping
        setCart(prev => prev.filter(i => i.cartId !== 'CARD_FEE_SERVICE'));
    };
  
    const handleCheckout = async () => {
        const paid = parseFloat(amountPaid) || 0;
        
        // Validation Logic
        if (isApartadoMode) {
            if (!currentCustomer) {
                alert("Para realizar un apartado es obligatorio asignar un cliente.");
                handleClosePayment(); 
                setShowCustomerModal(true); 
                return;
            }
  
            if (paid <= 0) {
                alert("Para apartar se requiere un anticipo mayor a 0.");
                return;
            }
        } else {
            // Standard Sale Mode
            if (Math.abs(paid - total) > 0.5 && paid < total) { 
                alert("Monto incompleto. Si es un abono, active la opción 'ES UN APARTADO'.");
                return;
            }
            if (paid <= 0 && total > 0) {
                alert("Ingrese monto pagado.");
                return;
            }
        }
  
        try {
            const finalItems = [...cart];
            
            // AUTOMATIC DEBT REPAYMENT LOGIC
            const debtItems = finalItems.filter(i => i.code === 'ADEUDO');
            if (debtItems.length > 0 && currentCustomer && currentCustomer.id) {
                const totalDebtPaid = debtItems.reduce((sum, i) => sum + (i.appliedPrice * i.quantity), 0);
                const newBalance = (currentCustomer.balance || 0) + totalDebtPaid;
                await updateCustomer(currentCustomer.id, { balance: newBalance });
                setCurrentCustomer(prev => prev ? { ...prev, balance: newBalance } : null);
            }

            const orderData: any = {
                items: finalItems,
                customer: currentCustomer || undefined,
                total: total,
                status: isApartadoMode ? 'reservation' : (hasRentals ? 'pending' : 'completed'), 
                createdAt: Date.now(),
                paymentMethod: paymentMethod,
                discount: appliedDiscount?.amount,
                discountReason: appliedDiscount?.reason
            };

            if (isApartadoMode) {
                orderData.status = 'reservation';
                orderData.downPayment = paid;
                orderData.remainingBalance = total - paid;
                orderData.rentalStartDate = rentalStartDate; 
                orderData.rentalEndDate = rentalEndDate;
            } else if (hasRentals) {
                orderData.status = 'pending';
                orderData.rentalStartDate = rentalStartDate || Date.now();
                orderData.rentalEndDate = rentalEndDate;
            } else {
                orderData.status = 'completed';
            }
            
            const newOrder = await createOrder(orderData);
            setLastOrder(newOrder);
            setPaymentModalOpen(false);

        } catch (e) {
            console.error(e);
            alert("Error al procesar la venta.");
        }
    };

    // Reset everything for new sale
    const handleNewSale = () => {
        setCart([]);
        setCurrentCustomer(null);
        setAppliedDiscount(null);
        setPaymentModalOpen(false);
        setIsApartadoMode(false);
        setRentalEndDate(undefined);
        setRentalStartDate(undefined);
        setLastOrder(null); // Closes Success Modal
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    // UI Helpers & Product Filtering
    const filteredProducts = useMemo(() => {
        let result = products;

        // Apply Availability Filter
        if (availabilityFilter === 'RENT') {
            result = result.filter(p => p.isRentalAvailable);
        } else if (availabilityFilter === 'SALE') {
            result = result.filter(p => p.isSaleAvailable);
        }

        if (searchQuery) {
            const q = searchQuery.toUpperCase();
            return result.filter(p => p.name.includes(q) || p.code.includes(q));
        }

        if (viewMode === 'categories') {
            if (selectedCategory) {
                 result = result.filter(p => p.category === selectedCategory);
            } else {
                return []; 
            }
        } else {
            if (filterCategory !== 'TODOS') {
                result = result.filter(p => p.category === filterCategory);
            }
        }

        return result;
    }, [products, searchQuery, viewMode, selectedCategory, filterCategory, availabilityFilter]);

    const availableCategories = useMemo(() => {
        const catMap = new Map<string, { name: string, imageUrl?: string }>();
        categories.forEach(c => {
            catMap.set(c.name, { name: c.name, imageUrl: c.imageUrl });
        });
        products.forEach(p => { 
            if(p.category && !catMap.has(p.category)) {
                catMap.set(p.category, { name: p.category });
            }
        });
        return Array.from(catMap.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [categories, products]);

    const [customerSearch, setCustomerSearch] = useState('');
    
    const modalCustomers = useMemo(() => {
        if (!customerSearch.trim()) return [];
        const q = customerSearch.toUpperCase();
        return customers.filter(c => c.name.includes(q) || c.phone.includes(q));
    }, [customers, customerSearch]);

    const handleSwitchToRegister = () => {
        setNewCustomerName(customerSearch);
        setNewCustomerPhone('');
        setNewCustomerAddress('');
        setCustomerViewMode('new');
        setEditingCustomer(null);
    };

    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setNewCustomerName(customer.name);
        setNewCustomerPhone(customer.phone);
        setNewCustomerAddress(customer.address || '');
        setCustomerViewMode('edit');
    };

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if(!newCustomerName.trim() || !newCustomerPhone.trim() || !newCustomerAddress.trim()) {
            alert("Faltan datos. El Nombre, Teléfono y Dirección son obligatorios.");
            return;
        }

        if(newCustomerPhone.length !== 10) {
            alert("El teléfono debe tener exactamente 10 dígitos numéricos.");
            return;
        }

        try {
            const customerPayload = {
                name: newCustomerName.toUpperCase().trim(),
                phone: newCustomerPhone.trim(),
                address: newCustomerAddress.toUpperCase().trim(),
                balance: editingCustomer?.balance || 0
            };

            if (customerViewMode === 'edit' && editingCustomer?.id) {
                await updateCustomer(editingCustomer.id, customerPayload);
                setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...customerPayload } : c));
                if (currentCustomer?.id === editingCustomer.id) {
                    setCurrentCustomer({ ...currentCustomer, ...customerPayload });
                }
                alert("Cliente actualizado exitosamente.");
            } else {
                const createdCustomer = await addCustomer(customerPayload);
                setCustomers(prev => [...prev, createdCustomer]);
                setCurrentCustomer(createdCustomer); 
                alert("Cliente registrado y asignado.");
            }
            
            setShowCustomerModal(false);
            setCustomerViewMode('search');
            setCustomerSearch('');
            setEditingCustomer(null);

        } catch(e) {
            console.error(e);
            alert("Error al guardar cliente.");
        }
    };

    return (
        <div className="flex h-full flex-col lg:flex-row bg-white overflow-hidden">
            
            {/* Hidden Receipt for Printing */}
            <ReceiptTemplate order={lastOrder} settings={settings || undefined} />

            {/* LEFT: Product Selection */}
            <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200 relative bg-slate-50/30">
                
                {/* Header: Search & View Toggle */}
                <div className="p-4 bg-white border-b border-slate-100 flex gap-4 items-center shadow-sm z-10">
                     {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl flex-shrink-0">
                        <button 
                            onClick={() => { setViewMode('categories'); setSelectedCategory(null); setAvailabilityFilter('ALL'); }}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'categories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Por Categorías"
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button 
                             onClick={() => { setViewMode('all'); setAvailabilityFilter('ALL'); }}
                             className={`p-2 rounded-lg transition-all ${viewMode === 'all' && availabilityFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                             title="Catálogo Completo"
                        >
                             <ListFilter className="w-5 h-5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                        <button 
                             onClick={() => { setViewMode('all'); setAvailabilityFilter('RENT'); }}
                             className={`p-2 rounded-lg transition-all ${viewMode === 'all' && availabilityFilter === 'RENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                             title="Sólo Renta"
                        >
                             <Shirt className="w-5 h-5" />
                        </button>
                        <button 
                             onClick={() => { setViewMode('all'); setAvailabilityFilter('SALE'); }}
                             className={`p-2 rounded-lg transition-all ${viewMode === 'all' && availabilityFilter === 'SALE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                             title="Sólo Venta"
                        >
                             <Tag className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder={viewMode === 'categories' && !selectedCategory ? "BUSCAR PRODUCTO (SALTA CATEGORÍAS)..." : "BUSCAR PRODUCTO..."} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim() && filteredProducts.length === 0 && onOpenQuickAdd) {
                                    onOpenQuickAdd(searchQuery);
                                }
                            }}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase transition-all focus:bg-white"
                        />
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* ... (Existing View Mode Logic) ... */}
                    {searchQuery ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                             {filteredProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onAdd={addToCart} 
                                    onOpenVariations={handleOpenVariations}
                                />
                             ))}
                             {filteredProducts.length === 0 && (
                                 <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                                     <div className="text-sm font-bold uppercase mb-4">No se encontraron productos</div>
                                     {onOpenQuickAdd && (
                                         <Button 
                                            onClick={() => onOpenQuickAdd(searchQuery)}
                                            className="uppercase shadow-lg bg-indigo-600 hover:bg-indigo-700 animate-in slide-in-from-bottom-2"
                                         >
                                             <Shirt className="w-5 h-5 mr-2" />
                                             REGISTRAR "{searchQuery}"
                                         </Button>
                                     )}
                                     <div className="text-[10px] text-slate-400 mt-2">TIP: Presiona ENTER para registrar rápido</div>
                                 </div>
                             )}
                        </div>
                    ) : (
                        <>
                            {viewMode === 'categories' && !selectedCategory && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                                    <button 
                                        onClick={() => setShowCouponModal(true)}
                                        className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex flex-col items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-95 transition-all group"
                                    >
                                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
                                            <Percent className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="font-bold uppercase text-sm tracking-wider">OFERTAS / CUPONES</span>
                                    </button>

                                    <button 
                                        onClick={() => setViewMode('all')}
                                        className="aspect-[4/3] rounded-3xl bg-slate-800 text-white flex flex-col items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all group"
                                    >
                                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
                                            <ListFilter className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="font-bold uppercase text-sm tracking-wider">VER TODO EL CATÁLOGO</span>
                                    </button>

                                    {availableCategories.map((cat, idx) => (
                                        <button 
                                            key={cat.name}
                                            onClick={() => setSelectedCategory(cat.name)}
                                            className="aspect-[4/3] rounded-3xl bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group relative overflow-hidden"
                                        >
                                            {cat.imageUrl ? (
                                                <>
                                                    <img src={cat.imageUrl} className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10" />
                                                    <span className="font-black text-white uppercase text-center px-4 z-20 text-lg leading-tight tracking-wide drop-shadow-md">
                                                        {cat.name}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white z-0" />
                                                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center z-10 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                                                        <Box className="w-7 h-7" />
                                                    </div>
                                                    <span className="font-bold text-slate-700 uppercase text-center px-4 z-10 text-sm leading-tight group-hover:text-indigo-700 transition-colors">
                                                        {cat.name}
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {viewMode === 'categories' && selectedCategory && (
                                <div className="animate-in slide-in-from-right-8 duration-300">
                                    <div className="flex items-center gap-3 mb-6">
                                        <button 
                                            onClick={() => setSelectedCategory(null)}
                                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            <ChevronLeft className="w-6 h-6 text-slate-500" />
                                        </button>
                                        <h2 className="text-2xl font-bold text-slate-800 uppercase">{selectedCategory}</h2>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {filteredProducts.map(product => (
                                            <ProductCard 
                                                key={product.id} 
                                                product={product} 
                                                onAdd={addToCart} 
                                                onOpenVariations={handleOpenVariations}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {viewMode === 'all' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 flex-shrink-0 hide-scrollbar">
                                        <button 
                                            onClick={() => setFilterCategory('TODOS')}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all border ${filterCategory === 'TODOS' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            TODOS
                                        </button>
                                        {availableCategories.map(cat => (
                                            <button 
                                                key={cat.name}
                                                onClick={() => setFilterCategory(cat.name)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all border ${filterCategory === cat.name ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                                         {filteredProducts.map(product => (
                                            <ProductCard 
                                                key={product.id} 
                                                product={product} 
                                                onAdd={addToCart} 
                                                onOpenVariations={handleOpenVariations}
                                            />
                                         ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT: Cart & Checkout */}
            <div className="w-full lg:w-[400px] xl:w-[450px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl shadow-slate-200 z-10">
                {/* Customer Bar */}
                <div 
                    className={`p-4 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${!currentCustomer ? 'bg-slate-50' : 'bg-indigo-50/50'}`}
                    onClick={() => setShowCustomerModal(true)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentCustomer ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 uppercase text-sm">{currentCustomer ? currentCustomer.name : 'SELECCIONAR CLIENTE'}</div>
                            <div className="text-xs text-slate-500 font-mono">{currentCustomer?.phone || 'CLIENTE MOSTRADOR'}</div>
                        </div>
                    </div>
                    {currentCustomer && (
                        <button 
                            onClick={handleRemoveCustomer}
                            className="p-1 text-slate-400 hover:text-rose-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Rental Dates (If Rentals present) */}
                {hasRentals && (
                    <div className="p-3 bg-indigo-50 border-b border-indigo-100 grid grid-cols-2 gap-2">
                        <div onClick={() => { setDatePickerMode('start'); setShowDatePicker(true); }} className="bg-white p-2 rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase block">ENTREGA</span>
                            <span className="text-sm font-bold text-indigo-900 block uppercase">
                                {formatDate(rentalStartDate || Date.now())}
                            </span>
                        </div>
                        <div onClick={() => { setDatePickerMode('end'); setShowDatePicker(true); }} className="bg-white p-2 rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase block">DEVOLUCIÓN</span>
                            <span className={`text-sm font-bold block uppercase ${rentalEndDate ? 'text-indigo-900' : 'text-slate-300'}`}>
                                {formatDate(rentalEndDate)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.map((item) => {
                        const isDebt = item.code === 'ADEUDO';
                        const isAutoFee = item.cartId === 'EXTRA_DAYS_AUTO_FEE';
                        return (
                            <div key={item.cartId} className={`flex justify-between items-center p-2 group hover:bg-slate-50 rounded-xl transition-colors ${isDebt ? 'bg-rose-50 border border-rose-200' : (isAutoFee ? 'bg-indigo-50/50 border border-dashed border-indigo-200' : '')}`}>
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className={`font-bold text-sm uppercase truncate flex items-center gap-1 ${isDebt ? 'text-rose-700' : 'text-slate-800'}`}>
                                        {isAutoFee && <Clock className="w-3 h-3 text-indigo-500"/>}
                                        {isDebt && <AlertTriangle className="w-3 h-3 text-rose-500"/>}
                                        {item.name} {item.selectedVariation ? `(${item.selectedVariation.name})` : ''}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Badge color={isDebt ? 'rose' : (item.transactionType === 'rent' ? 'indigo' : 'green')}>
                                            {isDebt ? 'ADEUDO' : (isAutoFee ? 'CARGO' : (item.transactionType === 'rent' ? 'RENTA' : 'VENTA'))}
                                        </Badge>
                                        <span className="font-mono">${item.appliedPrice} c/u</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-slate-100 rounded-lg">
                                        <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1 text-slate-500 hover:bg-slate-200 rounded-l-lg disabled:opacity-50" disabled={item.quantity <= 1}><Minus className="w-3 h-3" /></button>
                                        <span className="w-6 text-center text-xs font-bold px-1">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1 text-slate-500 hover:bg-slate-200 rounded-r-lg"><Plus className="w-3 h-3" /></button>
                                    </div>
                                    <div className="font-mono font-bold text-slate-800 w-16 text-right">
                                        ${(item.appliedPrice * item.quantity).toFixed(2)}
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartId)} className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {/* ... (Discount and Empty State remain same) ... */}
                    {appliedDiscount && (
                        <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-xl border border-emerald-100 animate-in slide-in-from-right">
                            <div className="flex-1">
                                <div className="font-bold text-emerald-800 text-sm uppercase flex items-center gap-2">
                                    <Tag className="w-3 h-3" /> CUPÓN: {appliedDiscount.reason}
                                </div>
                                <div className="text-[10px] text-emerald-600 font-bold uppercase">DESCUENTO APLICADO</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="font-mono font-bold text-emerald-700">-${appliedDiscount.amount.toFixed(2)}</div>
                                <button onClick={clearDiscount} className="text-emerald-400 hover:text-emerald-700 p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {cart.length === 0 && !appliedDiscount && (
                        <div className="h-60 flex flex-col items-center justify-center text-slate-300 opacity-60 px-6 text-center">
                            {settings?.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="w-32 h-32 object-contain mb-4 grayscale opacity-50" />
                            ) : (
                                <ShoppingCart className="w-12 h-12 mb-2" />
                            )}
                            <span className="text-sm font-bold uppercase">CARRITO VACÍO</span>
                            <p className="text-[10px] mt-2 max-w-[200px]">Agregue productos seleccionándolos del catálogo lateral.</p>
                        </div>
                    )}
                </div>

                {/* Footer Totals */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                    {!appliedDiscount && (
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowCouponModal(true)} 
                            className="w-full text-xs py-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
                        >
                            <Tag className="w-4 h-4 mr-1" /> AGREGAR DESCUENTO / CUPÓN
                        </Button>
                    )}

                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-bold uppercase text-xs">TOTAL A PAGAR</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800 font-mono tracking-tight">
                            ${total.toFixed(2)}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <button 
                            onClick={() => setIsApartadoMode(!isApartadoMode)}
                            className={`py-3 rounded-xl text-xs font-bold uppercase border-2 transition-all flex flex-col items-center justify-center gap-1 ${isApartadoMode ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-400 hover:bg-white'}`}
                        >
                            <Calendar className="w-4 h-4" />
                            ES APARTADO
                        </button>

                         <Button 
                            onClick={handleOpenPayment} 
                            disabled={total === 0} 
                            className="bg-slate-900 text-white shadow-xl shadow-slate-300 hover:bg-slate-800"
                        >
                            COBRAR <ArrowUpRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* CUSTOMER MODAL */}
            <Modal 
                isOpen={showCustomerModal} 
                onClose={() => setShowCustomerModal(false)} 
                title={customerViewMode === 'new' ? "REGISTRAR NUEVO CLIENTE" : (customerViewMode === 'edit' ? "EDITAR CLIENTE" : "SELECCIONAR CLIENTE")}
            >
                 {customerViewMode === 'search' ? (
                     <div className="space-y-4">
                        <Input 
                            placeholder="BUSCAR CLIENTE..." 
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value.toUpperCase())}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && modalCustomers.length === 0 && customerSearch.trim()) {
                                    handleSwitchToRegister();
                                }
                            }}
                        />
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {modalCustomers.map(c => (
                                <div key={c.id} className="flex gap-2 items-center">
                                    <div 
                                        onClick={() => handleSelectCustomer(c)}
                                        className="flex-1 p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 cursor-pointer flex justify-between items-center group transition-colors"
                                    >
                                        <div className="overflow-hidden">
                                            <div className="font-bold text-slate-800 uppercase truncate">{c.name}</div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                <span className="font-mono">{c.phone}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <div className="flex items-center gap-1 truncate max-w-[150px]">
                                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{c.address || 'SIN DIRECCIÓN'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {(c.balance || 0) < 0 && (
                                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded ml-2">DEUDA: ${Math.abs(c.balance || 0)}</span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditCustomer(c); }}
                                        className="p-3 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-xl transition-colors border border-slate-200"
                                        title="Editar datos"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            
                            {customerSearch.trim() !== '' && modalCustomers.length === 0 && (
                                <div className="text-center py-6">
                                    <div className="text-slate-400 text-xs mb-3">NO SE ENCONTRARON CLIENTES</div>
                                    <Button onClick={handleSwitchToRegister} className="w-full uppercase shadow-lg">
                                        <UserPlus className="w-5 h-5" /> REGISTRAR "{customerSearch}"
                                    </Button>
                                    <div className="text-[10px] text-slate-400 mt-2">TIP: Presiona ENTER para registrar rápido</div>
                                </div>
                            )}
                            
                            {customerSearch.trim() === '' && (
                                <div className="text-center text-slate-300 text-xs py-8 opacity-60">
                                    ESCRIBE PARA BUSCAR...
                                </div>
                            )}
                        </div>
                     </div>
                 ) : (
                     <form onSubmit={handleSaveCustomer} className="space-y-4 pt-2">
                        <Input 
                            label="NOMBRE COMPLETO" 
                            value={newCustomerName}
                            onChange={e => setNewCustomerName(e.target.value.toUpperCase())}
                            placeholder="EJ. JUAN PÉREZ"
                            autoFocus
                        />
                        <Input 
                            label="TELÉFONO" 
                            value={newCustomerPhone}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                if(val.length <= 10) setNewCustomerPhone(val);
                            }}
                            placeholder="10 DÍGITOS"
                            type="tel"
                            maxLength={10}
                        />
                        <Input 
                            label="DIRECCIÓN" 
                            value={newCustomerAddress}
                            onChange={e => setNewCustomerAddress(e.target.value.toUpperCase())}
                            placeholder="CALLE, NÚMERO, COLONIA"
                        />
                        
                        <div className="pt-4 flex gap-3">
                            <Button type="button" variant="secondary" onClick={() => setCustomerViewMode('search')} className="flex-1 uppercase">
                                <ArrowLeft className="w-4 h-4 mr-1" /> VOLVER
                            </Button>
                            <Button type="submit" className="flex-[2] uppercase shadow-xl">
                                <Save className="w-4 h-4" /> {customerViewMode === 'edit' ? 'GUARDAR CAMBIOS' : 'GUARDAR Y ASIGNAR'}
                            </Button>
                        </div>
                    </form>
                 )}
            </Modal>

            {/* VARIATION SELECTION MODAL */}
            <Modal 
                isOpen={showVariationModal} 
                onClose={() => { setShowVariationModal(false); setSelectedProductForVariations(null); }} 
                title="SELECCIONAR VARIANTE"
                hideHeader
            >
                {selectedProductForVariations && (
                    <div className="space-y-6">
                        <div className="text-center pb-4 border-b border-slate-100">
                            <h2 className="text-xl font-black text-slate-800 uppercase leading-tight mb-1">{selectedProductForVariations.name}</h2>
                            <span className="text-xs font-mono text-slate-400">{selectedProductForVariations.code}</span>
                        </div>

                        {/* NEW GRID LAYOUT FOR VARIATIONS */}
                        <div className="max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {selectedProductForVariations.variations.map((v, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between h-full hover:border-indigo-300 transition-colors">
                                        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                            <Layers className="w-4 h-4 text-slate-400" />
                                            <span className="font-bold text-slate-800 uppercase text-sm">{v.name}</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-2 mt-auto">
                                            {selectedProductForVariations.isRentalAvailable && (
                                                <button 
                                                    onClick={() => {
                                                        addToCart(selectedProductForVariations, v, 'rent');
                                                        setShowVariationModal(false);
                                                    }}
                                                    className="w-full bg-white border border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 py-2 rounded-xl font-bold uppercase transition-all shadow-sm flex items-center justify-between px-3"
                                                >
                                                    <span className="text-[10px] opacity-70">RENTA</span>
                                                    <span className="text-sm font-black">
                                                        {v.rentalPrice === 0 
                                                            ? 'DEFINIR' 
                                                            : `$${v.rentalPrice !== undefined ? v.rentalPrice : selectedProductForVariations.rentalPrice}`
                                                        }
                                                    </span>
                                                </button>
                                            )}
                                            {selectedProductForVariations.isSaleAvailable && (
                                                <button 
                                                    onClick={() => {
                                                        addToCart(selectedProductForVariations, v, 'sale');
                                                        setShowVariationModal(false);
                                                    }}
                                                    className="w-full bg-white border border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 py-2 rounded-xl font-bold uppercase transition-all shadow-sm flex items-center justify-between px-3"
                                                >
                                                    <span className="text-[10px] opacity-70">VENTA</span>
                                                    <span className="text-sm font-black">
                                                        {v.salePrice === 0 
                                                            ? 'DEFINIR' 
                                                            : `$${v.salePrice !== undefined ? v.salePrice : selectedProductForVariations.salePrice}`
                                                        }
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <Button variant="secondary" onClick={() => setShowVariationModal(false)} className="w-full uppercase">
                            CANCELAR
                        </Button>
                    </div>
                )}
            </Modal>

            {/* MANUAL PRICE MODAL (Zero Price Items) - Compact Version for iPad */}
            <Modal isOpen={showPriceModal} onClose={() => setShowPriceModal(false)} title="ASIGNAR PRECIO" hideHeader>
                <div className="flex flex-col gap-4">
                    {/* Compact Header & Display Area */}
                    <div className="bg-slate-900 rounded-2xl p-4 shadow-lg border border-slate-700">
                        <div className="flex justify-between items-start mb-1 overflow-hidden">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate max-w-[150px]">
                                {pendingItem?.product.name}
                            </span>
                            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 rounded-full font-bold">
                                {pendingItem?.type === 'rent' ? 'RENTA' : 'VENTA'}
                            </span>
                        </div>
                        
                        <div className="flex items-baseline justify-end gap-1">
                            <span className="text-xl font-bold text-slate-500">$</span>
                            <span className="text-4xl font-black text-white font-mono antialiased">
                                {manualPriceInput || '0'}
                                <motion.span 
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                    className="inline-block w-0.5 h-7 bg-indigo-500 ml-0.5"
                                />
                            </span>
                        </div>
                    </div>

                    {/* Highly Responsive Keypad */}
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'BACK'].map((key) => (
                            <button
                                key={key.toString()}
                                onClick={() => handleKeypadPress(key.toString(), manualPriceInput, setManualPriceInput)}
                                className={`h-14 rounded-xl flex items-center justify-center text-lg font-black transition-all active:scale-95 shadow-sm border ${
                                    key === 'BACK' 
                                    ? 'bg-rose-500 text-white border-rose-600' 
                                    : 'bg-white text-slate-700 border-slate-200'
                                }`}
                            >
                                {key === 'BACK' ? <Delete className="w-5 h-5" /> : key}
                            </button>
                        ))}
                    </div>

                    {/* Compact Action Row */}
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            onClick={() => {
                                setShowPriceModal(false);
                                setManualPriceInput('');
                            }} 
                            className="flex-1 py-3 text-xs uppercase font-bold"
                        >
                            SALIR
                        </Button>
                        <Button 
                            disabled={!manualPriceInput || parseFloat(manualPriceInput) <= 0}
                            onClick={() => {
                                if (!pendingItem) return;
                                addToCart(pendingItem.product, pendingItem.variation, pendingItem.type, parseFloat(manualPriceInput));
                                setShowPriceModal(false);
                                setPendingItem(null);
                                setManualPriceInput('');
                            }}
                            className="flex-[2] py-3 text-xs uppercase font-black bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                        >
                            AÑADIR A ORDEN
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* PAYMENT MODAL - Two Column Layout for iPad */}
            <Modal isOpen={showPaymentModal} onClose={() => handleClosePayment()} title={isApartadoMode ? "CONFIRMAR APARTADO" : "FINALIZAR VENTA"} maxWidth="max-w-[1500px]" hideHeader>
                 <div className="flex flex-col md:flex-row gap-6">
                    {/* LEFT SIDE: Payment Methods & Info */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">SELECCIONE MÉTODO DE PAGO</span>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handlePaymentMethodChange('cash')}
                                    className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all active:scale-95 ${paymentMethod === 'cash' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600'}`}
                                >
                                    <Banknote className="w-8 h-8" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">EFECTIVO</span>
                                </button>
                                <button 
                                    onClick={() => handlePaymentMethodChange('card')}
                                    className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all active:scale-95 ${paymentMethod === 'card' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600'}`}
                                >
                                    <CreditCard className="w-8 h-8" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">TARJETA</span>
                                </button>
                                <button 
                                    onClick={() => handlePaymentMethodChange('transfer')}
                                    className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all active:scale-95 ${paymentMethod === 'transfer' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600'}`}
                                >
                                    <ArrowUpRight className="w-8 h-8" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">TRANSF.</span>
                                </button>
                                <button 
                                    onClick={() => handlePaymentMethodChange('other')}
                                    className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all active:scale-95 ${paymentMethod === 'other' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600'}`}
                                >
                                    <Layers className="w-8 h-8" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">OTRO</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL A COBRAR</span>
                            <span className="text-4xl font-black text-indigo-600 font-mono tracking-tighter">${total.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <input 
                                type="checkbox" 
                                id="pwa-apartado" 
                                checked={isApartadoMode} 
                                onChange={(e) => setIsApartadoMode(e.target.checked)}
                                className="w-5 h-5 text-amber-600 rounded bg-white"
                            />
                            <label htmlFor="pwa-apartado" className="text-[11px] font-black text-amber-800 uppercase cursor-pointer select-none">REGISTRAR COMO APARTADO</label>
                        </div>
                    </div>

                    {/* RIGHT SIDE: Keypad or Bank Card */}
                    <div className="flex-1 bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col border border-slate-800">
                        <div className="absolute top-2 right-6 text-white/5 font-black text-7xl italic select-none">POS</div>
                        
                        {paymentMethod === 'transfer' ? (
                            /* TRANSFER MODE: BANK CARD VIEW */
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="text-center mb-6">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4">
                                        MUESTRA LA SIGUIENTE TARJETA AL CLIENTE PARA REALIZAR LA TRANSFERENCIA
                                    </label>
                                    
                                    <div className="bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden text-left aspect-[1.6/1] border border-white/10 group">
                                        {/* Glossy Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                        
                                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                            {settings?.logoUrl ? (
                                                <img src={settings.logoUrl} className="w-32 h-32 object-contain" referrerPolicy="no-referrer" />
                                            ) : (
                                                <CreditCard className="w-32 h-32" />
                                            )}
                                        </div>

                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                                                    {settings?.logoUrl ? (
                                                        <img src={settings.logoUrl} className="w-6 h-6 object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <Banknote className="w-6 h-6" />
                                                    )}
                                                </div>
                                                <span className="text-lg font-black italic tracking-widest uppercase">{settings?.bankName || 'BANCO'}</span>
                                            </div>
                                            {/* Smart Chip */}
                                            <div className="w-12 h-10 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-md shadow-inner flex items-center justify-between p-1.5 opacity-90">
                                                <div className="w-px h-full bg-black/10" />
                                                <div className="w-px h-full bg-black/10" />
                                                <div className="w-px h-full bg-black/10" />
                                            </div>
                                        </div>

                                        <div className="mt-4 mb-8 relative z-10">
                                            <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2 opacity-70">Número de Tarjeta / CLABE</div>
                                            <div className="text-xl font-mono tracking-[0.15em] font-black drop-shadow-md text-white">
                                                {settings?.bankAccountNumber || '0000 0000 0000 0000'}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end mt-auto relative z-10">
                                            <div className="min-w-0 flex-1 mr-2">
                                                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-1 opacity-70">Titular de la Cuenta</div>
                                                <div className="text-[11px] font-black uppercase tracking-tight leading-tight">{settings?.bankAccountName || 'TITULAR DE LA CUENTA'}</div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-1 opacity-70">Método</div>
                                                <div className="text-[10px] font-black uppercase bg-white/10 px-2 py-0.5 rounded border border-white/10">TRANSFER</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-6">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => setShowFullBankCard(true)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white uppercase text-[10px] font-black border border-white/5"
                                    >
                                        <Smartphone className="w-5 h-5 mr-2 text-indigo-400" /> MOSTRAR EN PANTALLA COMPLETA
                                    </Button>
                                </div>

                                {isApartadoMode && (
                                    <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2 text-center">CONFIRMAR MONTO DE ANTICIPO</label>
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-white text-xl font-mono">$</span>
                                            <input 
                                                type="number"
                                                value={amountPaid}
                                                onChange={(e) => setAmountPaid(e.target.value)}
                                                className="bg-transparent text-white text-3xl font-black font-mono w-32 text-center outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* NORMAL MODE: KEYPAD */
                            <>
                                <div className="mb-6 relative z-10">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2 text-center">
                                        {isApartadoMode ? 'ANTICIPO RECIBIDO' : 'TECLEE DINERO RECIBIDO'}
                                    </label>
                                    <div className="text-center flex items-center justify-center gap-2">
                                        <span className="text-indigo-400 text-2xl font-black">$</span>
                                        <span className="text-5xl font-black text-white font-mono tracking-tighter">
                                            {amountPaid || '0'}
                                        </span>
                                        <motion.span 
                                            animate={{ opacity: [0, 1, 0] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            className="inline-block w-1 h-10 bg-indigo-500 ml-1 align-middle"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-6 relative z-10">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'BACK'].map((key) => (
                                        <button
                                            key={key.toString()}
                                            onClick={() => handleKeypadPress(key.toString(), amountPaid, setAmountPaid)}
                                            className={`h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-95 ${
                                                key === 'BACK' 
                                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30' 
                                                : 'bg-white/5 text-white border border-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            {key === 'BACK' ? <Delete className="w-6 h-6" /> : key}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="mt-auto space-y-4 relative z-10">
                            {!isApartadoMode && paymentMethod === 'cash' && amountPaid && parseFloat(amountPaid) >= total && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">CAMBIO PARA CLIENTE:</span>
                                    <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">${(parseFloat(amountPaid) - total).toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => handleClosePayment()} className="flex-1 py-4 bg-white/5 border-white/10 text-white uppercase text-xs font-black">CANCELAR</Button>
                                <Button 
                                    className={`flex-[2] py-4 uppercase font-black text-xs shadow-xl ${
                                        (!amountPaid || parseFloat(amountPaid) <= 0 || (!isApartadoMode && parseFloat(amountPaid) < total))
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    }`}
                                    onClick={handleCheckout}
                                    disabled={!amountPaid || parseFloat(amountPaid) <= 0 || (!isApartadoMode && parseFloat(amountPaid) < total)}
                                >
                                    {isApartadoMode ? 'EMITIR APARTADO' : (paymentMethod === 'card' ? 'COBRO MANUAL' : 'COBRAR VENTA')}
                                </Button>
                            </div>
                        </div>
                    </div>
                 </div>
            </Modal>

                       <Modal isOpen={showFullBankCard} onClose={() => setShowFullBankCard(false)} title="DATOS BANCARIOS" maxWidth="max-w-5xl" hideHeader>
                <div className="flex flex-col items-center py-4 md:py-12 relative h-full">
                    <div className="bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-950 w-full max-w-4xl rounded-[3rem] p-8 md:p-12 lg:p-16 text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col min-h-[400px] md:min-h-[550px] border border-white/10 ring-[12px] ring-indigo-50/10">
                        {/* High Quality Gloss */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-40 pointer-events-none" />
                        
                        {/* Decorative background element */}
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

                        <div className="absolute top-0 right-0 p-16 opacity-5">
                             {settings?.logoUrl ? (
                                <img src={settings.logoUrl} className="w-96 h-96 object-contain" referrerPolicy="no-referrer" />
                            ) : (
                                <Banknote className="w-96 h-96" />
                            )}
                        </div>

                        <div className="flex justify-between items-start mb-8 md:mb-12 relative z-10">
                            <div className="flex flex-col gap-2">
                                <span className="text-3xl md:text-5xl font-black italic tracking-widest uppercase flex items-center gap-4">
                                    {settings?.logoUrl && <img src={settings.logoUrl} className="w-12 h-12 object-contain brightness-0 invert" referrerPolicy="no-referrer" />}
                                    {settings?.bankName || 'BANCO'}
                                </span>
                                <div className="text-[10px] md:text-xs font-black text-indigo-300/60 uppercase tracking-[0.3em] font-mono">Premium Account Business</div>
                            </div>
                            
                            {/* Premium Metallic Chip */}
                            <div className="w-20 md:w-28 h-14 md:h-20 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),_0_5px_25px_rgba(0,0,0,0.2)] opacity-95 flex items-center justify-between p-3 md:p-4">
                                <div className="w-px h-full bg-black/10 rounded-full" />
                                <div className="w-px h-full bg-black/10 rounded-full" />
                                <div className="w-px h-full bg-black/10 rounded-full" />
                                <div className="w-px h-full bg-black/10 rounded-full" />
                            </div>
                        </div>

                        <div className="mb-8 md:mb-16 relative z-10">
                            <div className="text-[11px] md:text-sm font-black text-indigo-300 uppercase mb-4 md:mb-6 tracking-[0.5em] opacity-80 flex items-center gap-3">
                                <span>Número de Tarjeta / CLABE</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>
                            <div className="text-3xl sm:text-4xl md:text-6xl font-mono tracking-[0.1em] font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] text-white bg-black/10 py-4 px-6 rounded-2xl border border-white/5 inline-block">
                                {settings?.bankAccountNumber || '0000 0000 0000 0000'}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end relative z-10 mt-auto gap-8">
                            <div className="min-w-0 flex-1 w-full">
                                <div className="text-[11px] md:text-sm font-black text-indigo-300 uppercase mb-3 md:mb-4 tracking-[0.3em] opacity-80">Titular de la Cuenta</div>
                                <div className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-tight border-l-4 border-indigo-500 pl-4 bg-white/5 py-3 rounded-r-xl truncate">
                                    {settings?.bankAccountName || 'TITULAR DE LA CUENTA'}
                                </div>
                            </div>
                            <div className="text-left md:text-right shrink-0 w-full md:w-auto">
                                <div className="text-[11px] md:text-sm font-black text-indigo-300 uppercase mb-3 md:mb-4 tracking-[0.3em] opacity-80">Importe Total</div>
                                <div className="text-4xl sm:text-5xl md:text-7xl font-black text-emerald-400 font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                                    ${total.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 md:mt-16 flex flex-col items-center gap-8 w-full max-w-xl">
                        <div className="flex items-center gap-4 w-full">
                            <div className="h-px flex-1 bg-slate-200" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] md:text-xs text-center">ESCANEÉ O TECLEE LOS DATOS PARA TRANSFERIR</p>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>
                        
                        <Button 
                            onClick={() => setShowFullBankCard(false)}
                            className="py-5 px-16 bg-slate-900 text-white rounded-full uppercase font-black tracking-widest text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
                        >
                            CERRAR VISTA
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* --- SUCCESS MODAL --- */}
            <Modal isOpen={!!lastOrder} onClose={handleNewSale} title="VENTA COMPLETADA" hideHeader>
                <div className="text-center space-y-6">
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 shadow-lg shadow-emerald-100">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">¡Venta Exitosa!</h2>
                        <div className="mt-2 text-slate-500 font-mono text-sm bg-slate-100 px-3 py-1 rounded-lg">
                            TICKET #{lastOrder?.id?.slice(-6)}
                        </div>
                    </div>

                    {/* SHOW RETURN DATE PROMINENTLY IF RENTAL */}
                    {lastOrder?.rentalEndDate && (
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl animate-in slide-in-from-bottom duration-500 delay-100">
                            <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">FECHA DE DEVOLUCIÓN</span>
                            <span className="block text-3xl font-black text-indigo-700 uppercase leading-none">
                                {new Date(lastOrder.rentalEndDate).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            <span className="block text-xs font-bold text-indigo-400 uppercase mt-1">
                                {new Date(lastOrder.rentalEndDate).getFullYear()}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 pt-2">
                        <Button onClick={handlePrintReceipt} className="uppercase py-4 shadow-lg bg-slate-900 hover:bg-slate-800">
                            <Printer className="w-5 h-5 mr-2" /> IMPRIMIR RECIBO
                        </Button>
                        <Button onClick={handleNewSale} variant="secondary" className="uppercase py-4 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                            <RefreshCw className="w-5 h-5 mr-2" /> NUEVA VENTA
                        </Button>
                    </div>
                </div>
            </Modal>
            
            {/* COUPON MODAL */}
            <Modal isOpen={showCouponModal} onClose={() => setShowCouponModal(false)} title="SELECCIONAR DESCUENTO">
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {coupons.filter(c => c.isActive).length === 0 ? (
                        <div className="text-center py-8 text-slate-400 uppercase">NO HAY CUPONES DISPONIBLES</div>
                    ) : (
                        coupons.filter(c => c.isActive).map(coupon => (
                            <button
                                key={coupon.id}
                                onClick={() => selectCoupon(coupon)}
                                className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl transition-all group"
                            >
                                <div className="text-left">
                                    <div className="font-bold text-slate-800 text-lg">{coupon.code}</div>
                                    <div className="text-xs text-slate-500 font-bold uppercase">
                                        DESCUENTO: {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                                    </div>
                                </div>
                                <div className="bg-white p-2 rounded-full text-slate-300 group-hover:text-indigo-600 transition-colors">
                                    <ArrowUpRight className="w-5 h-5 rotate-45" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </Modal>

            {/* DATE PICKER MODAL */}
            <DatePickerModal 
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelect={handleDateSelect}
                title={datePickerMode === 'start' ? 'FECHA DE ENTREGA' : 'FECHA DE DEVOLUCIÓN'}
            />

        </div>
    );
};

// --- Sub-component for Product Card ---
const ProductCard: React.FC<{ 
    product: Product, 
    onAdd: (p: Product, v?: Variation, t?: 'sale'|'rent') => void,
    onOpenVariations: (p: Product) => void
}> = ({ product, onAdd, onOpenVariations }) => {
    
    // Determine default action on card click
    const handleCardClick = () => {
        // If has variations, OPEN MODAL
        if (product.variations && product.variations.length > 0) {
            onOpenVariations(product);
            return;
        }

        // If simple product, Add directly
        if (product.isRentalAvailable) {
            onAdd(product, undefined, 'rent');
        } else if (product.isSaleAvailable) {
            onAdd(product, undefined, 'sale');
        }
    };

    const isMainlyCostume = product.category === 'DISFRACES';

    return (
        <div 
            onClick={handleCardClick}
            className={`
                bg-white rounded-3xl p-3 shadow-sm transition-all flex flex-col justify-between overflow-hidden relative cursor-pointer active:scale-95
                border-2 ${isMainlyCostume ? 'border-indigo-100 hover:border-indigo-400' : 'border-amber-100 hover:border-amber-400'}
            `}
        >
            <div className="relative">
                {/* Image placeholder or real image */}
                <div className="h-32 bg-slate-100 rounded-2xl mb-2 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/> : <Tag className="text-slate-300 w-8 h-8"/>}
                </div>
                <div className="font-bold text-slate-800 uppercase text-xs leading-tight mb-1 line-clamp-2 min-h-[2.5em]">{product.name}</div>
                <div className="text-[10px] text-slate-500 font-mono mb-2 flex flex-wrap items-center gap-1">
                    <span>{product.code}</span>
                    {product.isRentalAvailable && (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded border border-indigo-100">RENTA</span>
                    )}
                    {product.isSaleAvailable && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">VENTA</span>
                    )}
                </div>
            </div>
            
            {/* Footer info - Cleaned up (No Stock, No Hover Actions) */}
            <div className="mt-auto flex justify-start items-center">
                <Badge color={isMainlyCostume ? 'indigo' : 'amber'}>{product.category}</Badge>
            </div>
        </div>
    );
};

export default POS;
