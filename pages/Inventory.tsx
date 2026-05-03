
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, RefreshCw, Box, Tag, DollarSign, Layers, Search, Trash2, ArrowLeft, Upload, FileUp, LayoutGrid, List, Pencil, ImagePlus, X, Lock, Tags, AlertCircle } from 'lucide-react';
import { Button, Input, Select, Card, Badge, Modal } from '../components/UI';
import { Product, Variation, User, Category } from '../types';
import { generateProductCode, addProduct, getProducts, deleteProduct, importProductsBatch, updateProduct, uploadProductImage, getCategories, addCategory, deleteCategory, renameCategoryGlobal, batchUpdateCategoryInProducts, getSystemSettings } from '../services/dataService';

const Inventory: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  // Default to 'table' (List view) as requested
  const [displayMode, setDisplayMode] = useState<'grid' | 'table'>('table'); 
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  // DB Categories
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODOS'); // New: Category Filter
  
  const canManageInventory = user.role === 'admin' || user.permissions?.canManageInventory;

  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image Upload State
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Category Manager State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  // editingCategory can now be a real category (with id) or a product-inferred one (no id)
  const [editingCategory, setEditingCategory] = useState<Category | { name: string, count?: number, isRegistered?: boolean } | null>(null);
  // Category Image State
  const catImageUploadRef = useRef<HTMLInputElement>(null);
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);


  // Form State
  const initialFormState: Partial<Product> = {
    code: '',
    name: '',
    description: '',
    salePrice: 0,
    rentalPrice: 0,
    category: 'DISFRACES',
    stock: 1,
    variations: [],
    isRentalAvailable: true,
    isSaleAvailable: false,
    imageUrl: '',
  };
  const [formData, setFormData] = useState<Partial<Product>>(initialFormState);

  // New Variation Input State
  const [newVarName, setNewVarName] = useState('');
  const [newVarRent, setNewVarRent] = useState('');
  const [newVarSale, setNewVarSale] = useState('');

  // Load Data
  const loadData = async () => {
      setLoading(true);
      const [pData, cData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(pData);
      setDbCategories(cData);
      setLoading(false);
  };

  useEffect(() => {
    if (view === 'list') {
        loadData();
    }
  }, [view]);

  // --- Category Merging Logic ---
  // Returns a list of all categories: Official DB Categories + Categories inferred from products (CSV imports)
  const allManageableCategories = useMemo(() => {
      const catMap = new Map<string, { id?: string, name: string, imageUrl?: string, count: number, isRegistered: boolean }>();
      
      // 1. Add Official DB Categories
      dbCategories.forEach(c => {
          catMap.set(c.name, { id: c.id, name: c.name, imageUrl: c.imageUrl, count: 0, isRegistered: true });
      });

      // 2. Scan Products to find categories not in DB
      products.forEach(p => {
          const cName = p.category ? p.category.toUpperCase().trim() : 'SIN CATEGORÍA';
          if (!cName) return;

          if (!catMap.has(cName)) {
              // It's an "inferred" category (imported from CSV but not created in system)
              catMap.set(cName, { name: cName, count: 0, isRegistered: false });
          }
          
          const entry = catMap.get(cName);
          if (entry) entry.count++;
      });

      return Array.from(catMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [products, dbCategories]);

  // For Filter Dropdown (Includes 'TODOS')
  const categoriesForFilter = useMemo(() => {
      return ['TODOS', ...allManageableCategories.map(c => c.name)];
  }, [allManageableCategories]);

  // For Form Dropdown
  const formCategories = useMemo(() => {
      // Ensure defaults exist visually
      const defaults = ['DISFRACES', 'ACCESORIOS', 'DECORACIÓN', 'VENTA GENERAL'];
      const combined = new Set([...defaults, ...allManageableCategories.map(c => c.name)]);
      return Array.from(combined).sort();
  }, [allManageableCategories]);

  // Actions
  const handleNewProduct = () => {
      setFormData({ ...initialFormState, code: generateProductCode() });
      setImageFile(null);
      setImagePreview(null);
      setView('form');
  };

  const handleEditProduct = (product: Product) => {
      if (!canManageInventory) return;
      
      setFormData({ ...product });
      setImageFile(null);
      setImagePreview(product.imageUrl || null);
      setView('form');
  };

  const generateCode = () => {
    setFormData(prev => ({ ...prev, code: generateProductCode() }));
  };

  // --- Category Management ---
  const handleCatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCatImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCatImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCatImage = () => {
      setCatImageFile(null);
      setCatImagePreview(null);
      if(catImageUploadRef.current) catImageUploadRef.current.value = '';
  };

  const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newCategoryName.trim()) return;
      const finalName = newCategoryName.toUpperCase().trim();
      
      try {
          let imageUrl = (editingCategory as Category)?.imageUrl || '';

          if (catImageFile) {
              const settings = await getSystemSettings();
              imageUrl = await uploadProductImage(catImageFile, settings.imgbbKey); // Reusing product image upload logic
          } else if (catImagePreview === null && (editingCategory as Category)?.imageUrl) {
              // User cleared the image
              imageUrl = '';
          }

          if (editingCategory) {
               // EDIT / RENAME LOGIC
               let count = 0;
               if ((editingCategory as any).id) {
                   // It's a registered category, use standard global rename/update
                   count = await renameCategoryGlobal((editingCategory as any).id, editingCategory.name, finalName, imageUrl);
               } else {
                   // It's an inferred category (product-only). 
                   // 1. Rename inside products
                   count = await batchUpdateCategoryInProducts(editingCategory.name, finalName);
                   // 2. "Register" it officially so it becomes permanent
                   await addCategory({ name: finalName, imageUrl });
               }
               alert(`Categoría actualizada. Se actualizaron ${count} productos.`);
               setEditingCategory(null);
          } else {
               // CREATE NEW
               await addCategory({ name: finalName, imageUrl });
               alert("Categoría creada.");
          }
          setNewCategoryName('');
          handleRemoveCatImage();
          loadData();
      } catch (e: any) {
          alert(e.message || "Error al guardar categoría");
      }
  };

  const startEditCategory = (cat: any) => {
      setEditingCategory(cat);
      setNewCategoryName(cat.name);
      setCatImagePreview(cat.imageUrl || null);
      setCatImageFile(null);
  };

  const handleDeleteCategory = async (id: string) => {
      if(confirm("¿Eliminar esta categoría de la lista? Los productos que la usan NO se eliminarán.")) {
          await deleteCategory(id);
          loadData();
      }
  };

  // --- Image Handling ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if(imageUploadRef.current) imageUploadRef.current.value = '';
  };

  // --- Variations ---

  const handleVariationAdd = () => {
    if (!newVarName.trim()) return;

    const newVariation: Variation = {
      name: newVarName.trim().toUpperCase(),
    };

    if (newVarRent) newVariation.rentalPrice = parseFloat(newVarRent);
    if (newVarSale) newVariation.salePrice = parseFloat(newVarSale);

    setFormData(prev => ({
      ...prev,
      variations: [...(prev.variations || []), newVariation]
    }));

    setNewVarName('');
    setNewVarRent('');
    setNewVarSale('');
  };

  const removeVariation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations?.filter((_, i) => i !== index)
    }));
  };

  const handleDelete = async (id: string) => {
      if(confirm('¿Estás seguro de eliminar este artículo? Esta acción no se puede deshacer.')) {
          await deleteProduct(id);
          // Optimistic UI update
          setProducts(prev => prev.filter(p => p.id !== id));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    setLoading(true);
    try {
      let finalImageUrl = formData.imageUrl;

      // Upload image if a new file exists
      if (imageFile) {
        const settings = await getSystemSettings();
        finalImageUrl = await uploadProductImage(imageFile, settings.imgbbKey);
      }

      const productData = { ...formData, imageUrl: finalImageUrl };

      if (formData.id) {
          // Update
          await updateProduct(formData.id, productData);
          alert('Producto actualizado exitosamente');
      } else {
          // Create
          await addProduct(productData as Product);
          alert('Producto guardado exitosamente');
      }
      setView('list');
      loadData(); // Reload to refresh categories list if a new one was added (though here we only select existing)
    } catch (error) {
      console.error(error);
      alert('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  // --- CSV Import Logic ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseLoyverseCSV = (text: string) => {
    const splitCSVLine = (str: string) => {
        const matches = [];
        let inQuote = false;
        let buffer = '';
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (c === '"') {
                inQuote = !inQuote;
            } else if (c === ',' && !inQuote) {
                matches.push(buffer);
                buffer = '';
            } else {
                buffer += c;
            }
        }
        matches.push(buffer);
        return matches.map(m => m.trim().replace(/^"|"$/g, '').replace(/""/g, '"').toUpperCase());
    };

    const lines = text.split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase());
    
    const idxHandle = headers.findIndex(h => h === 'handle');
    const idxName = headers.findIndex(h => h === 'nombre');
    const idxCat = headers.findIndex(h => h === 'categoria');
    const idxRef = headers.findIndex(h => h === 'ref');
    const idxDesc = headers.findIndex(h => h.includes('descripción'));
    const idxPrice = headers.findIndex(h => h.includes('precio'));
    const idxStock = headers.findIndex(h => h.includes('en inventario') || h.includes('stock'));
    const idxOpt1Val = headers.findIndex(h => h === 'opción 1 valor' || h === 'option1 value');

    if (idxHandle === -1 || idxName === -1) {
        console.error("Columnas faltantes: Handle o Nombre son requeridas.");
        return [];
    }

    const grouped: Record<string, any[]> = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const row = splitCSVLine(line);
        if (row.length <= idxHandle) continue;

        const handle = row[idxHandle];
        if (!handle) continue;

        if (!grouped[handle]) {
            grouped[handle] = [];
        }
        grouped[handle].push(row);
    }

    const products: Partial<Product>[] = [];

    Object.keys(grouped).forEach(handle => {
        const rows = grouped[handle];
        const mainRow = rows[0]; 
        const nameRow = rows.find(r => r[idxName]) || mainRow;
        
        const productName = nameRow[idxName] || 'SIN NOMBRE';
        const category = (idxCat > -1 ? nameRow[idxCat] : 'VENTA GENERAL') || 'VENTA GENERAL';
        const description = idxDesc > -1 ? nameRow[idxDesc] : '';
        const code = (idxRef > -1 && mainRow[idxRef]) ? mainRow[idxRef] : handle;

        const variations: Variation[] = [];
        let totalStock = 0;
        let basePrice = 0;

        rows.forEach(row => {
            const stockVal = idxStock > -1 ? parseFloat(row[idxStock]) : 0;
            const priceValString = idxPrice > -1 ? row[idxPrice] : '0';
            const priceVal = isNaN(parseFloat(priceValString)) ? 0 : parseFloat(priceValString);

            if (!isNaN(stockVal)) totalStock += stockVal;

            const optVal = idxOpt1Val > -1 ? row[idxOpt1Val] : '';
            
            if (optVal) {
                variations.push({
                    name: optVal.toUpperCase(),
                    salePrice: priceVal,
                    rentalPrice: 0 
                });
            } else {
                if (priceVal > 0) basePrice = priceVal;
            }
        });

        if (basePrice === 0 && variations.length > 0) {
            basePrice = variations[0].salePrice || 0;
        }

        products.push({
            name: productName.toUpperCase(),
            code: code,
            category: category.toUpperCase(),
            description: description.toUpperCase(),
            stock: totalStock,
            salePrice: basePrice,
            rentalPrice: 0,
            isSaleAvailable: true,
            isRentalAvailable: false,
            variations: variations
        });
    });

    return products;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Por favor sube un archivo CSV válido.');
        return;
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const parsedProducts = parseLoyverseCSV(text);
            
            if (parsedProducts.length === 0) {
                alert('No se encontraron productos válidos.');
                setLoading(false);
                return;
            }

            const count = await importProductsBatch(parsedProducts as Omit<Product, 'id'>[]);
            alert(`¡Importación exitosa! Se guardaron ${count} productos.`);
            loadData();
            
        } catch (error) {
            console.error(error);
            alert('Hubo un error al procesar el archivo.');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    reader.readAsText(file);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery);
    const matchesCategory = categoryFilter === 'TODOS' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-6 flex justify-between items-center flex-shrink-0">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Box className="w-8 h-8 text-indigo-600" />
            INVENTARIO
            {!canManageInventory && <Lock className="w-5 h-5 text-slate-400" />}
            </h1>
            <p className="text-slate-500 mt-1 text-sm uppercase">{view === 'list' ? 'Gestión de existencias' : (formData.id ? 'Editar Producto' : 'Nuevo registro')}</p>
        </div>
        
        {/* Only Admin Actions */}
        {canManageInventory && (
            <div className="flex gap-2">
                {view === 'list' ? (
                    <>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".csv" 
                        />
                        <Button variant="secondary" onClick={() => setShowCategoryModal(true)} className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                             <Tags className="w-5 h-5" /> <span className="hidden sm:inline">CATEGORÍAS</span>
                        </Button>
                        <Button variant="secondary" onClick={handleImportClick} disabled={loading}>
                            <FileUp className="w-5 h-5" /> <span className="hidden sm:inline">IMPORTAR</span>
                        </Button>
                        <Button onClick={handleNewProduct} className="shadow-xl shadow-indigo-200">
                            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">NUEVO</span>
                        </Button>
                    </>
                ) : (
                    <Button variant="secondary" onClick={() => setView('list')}>
                        <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline">VOLVER</span>
                    </Button>
                )}
            </div>
        )}
      </header>

      {view === 'list' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
              {/* Filter Bar */}
              <div className="mb-6 flex flex-col md:flex-row gap-4 flex-shrink-0">
                  <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input 
                          type="text" 
                          placeholder="BUSCAR POR CÓDIGO, NOMBRE..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all uppercase placeholder:normal-case"
                      />
                  </div>
                  <div className="flex gap-2">
                     <div className="w-48">
                        <select 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full h-full bg-white border border-slate-200 text-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer uppercase"
                        >
                            {categoriesForFilter.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                     </div>
                     <div className="flex bg-white rounded-2xl p-1 border border-slate-200">
                         <button 
                            onClick={() => setDisplayMode('table')}
                            className={`p-3 rounded-xl transition-all ${displayMode === 'table' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            title="Vista de Lista"
                         >
                             <List className="w-5 h-5" />
                         </button>
                         <button 
                            onClick={() => setDisplayMode('grid')}
                            className={`p-3 rounded-xl transition-all ${displayMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            title="Vista de Cuadrícula"
                         >
                             <LayoutGrid className="w-5 h-5" />
                         </button>
                     </div>
                  </div>
              </div>

              {/* Data Display */}
              <div className="flex-1 overflow-y-auto pb-24">
                  {displayMode === 'grid' ? (
                    // Updated grid columns to 4 on large screens and 5 on extra large
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map(product => (
                            <Card 
                                key={product.id} 
                                className={`group hover:border-indigo-200 transition-all duration-300 relative ${canManageInventory ? 'cursor-pointer active:scale-95' : ''} p-0 overflow-hidden`}
                            >
                                <div onClick={() => handleEditProduct(product)}>
                                    <div className="relative">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover bg-slate-100" />
                                        ) : (
                                            <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-300">
                                                <Box className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <Badge color={product.category === 'DISFRACES' ? 'indigo' : 'amber'}>{product.category}</Badge>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-1">
                                             <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{product.name}</h3>
                                             <div className="flex flex-col items-end gap-1">
                                                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{product.code}</span>
                                                <div className="flex gap-1">
                                                    {product.isRentalAvailable && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded border border-indigo-100">RENTA</span>}
                                                    {product.isSaleAvailable && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">VENTA</span>}
                                                </div>
                                             </div>
                                        </div>
                                        
                                        <p className="text-sm text-slate-500 mb-4 line-clamp-1">{product.description || 'SIN DESCRIPCIÓN'}</p>

                                        <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-auto">
                                            <div>
                                                <div className="text-xs text-slate-400 font-semibold uppercase">Stock</div>
                                                <div className="text-lg font-bold text-slate-800">{product.stock}</div>
                                            </div>
                                            <div className="text-right">
                                                {product.isRentalAvailable && <div className="text-sm text-indigo-600 font-semibold">R: ${product.rentalPrice}</div>}
                                                {product.isSaleAvailable && <div className="text-sm text-emerald-600 font-semibold">V: ${product.salePrice}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {canManageInventory && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); product.id && handleDelete(product.id); }}
                                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md text-slate-300 hover:text-rose-500 active:text-rose-600 active:scale-90 transition-all z-10"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-5 h-5"/>
                                    </button>
                                )}
                            </Card>
                        ))}
                    </div>
                  ) : (
                    // TABLE VIEW
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Imagen</th>
                                        <th className="px-6 py-4">Código</th>
                                        <th className="px-6 py-4">Nombre</th>
                                        <th className="px-6 py-4">Categoría</th>
                                        <th className="px-6 py-4">Stock</th>
                                        <th className="px-6 py-4 text-right">Renta</th>
                                        <th className="px-6 py-4 text-right">Venta</th>
                                        {canManageInventory && <th className="px-6 py-4">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProducts.map(product => (
                                        <tr key={product.id} className="hover:bg-indigo-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Box className="w-full h-full p-2 text-slate-300" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-mono text-slate-600">{product.code}</span>
                                                    <div className="flex gap-1">
                                                        {product.isRentalAvailable && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">RENTA</span>}
                                                        {product.isSaleAvailable && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">VENTA</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800">
                                                {product.name}
                                                {product.variations && product.variations.length > 0 && (
                                                    <div className="text-xs text-slate-400 font-normal mt-1">
                                                        {product.variations.length} Variaciones
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge color={product.category === 'DISFRACES' ? 'indigo' : 'amber'}>{product.category}</Badge>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">{product.stock}</td>
                                            <td className="px-6 py-4 text-right text-indigo-600 font-medium">
                                                {product.isRentalAvailable ? `$${product.rentalPrice}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                                                {product.isSaleAvailable ? `$${product.salePrice}` : '-'}
                                            </td>
                                            {canManageInventory && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => handleEditProduct(product)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => product.id && handleDelete(product.id)}
                                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  )}

                  {filteredProducts.length === 0 && (
                      <div className="py-12 text-center text-slate-400">
                          {loading ? 'PROCESANDO...' : 'NO SE ENCONTRARON ARTÍCULOS'}
                      </div>
                  )}
              </div>
          </div>
      ) : (
        /* Form View */
        <div className="flex-1 overflow-y-auto pb-24">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                <Card className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 uppercase">
                        {formData.id ? 'Editar Producto' : 'Crear Nuevo Producto'}
                    </h3>
                    {formData.id && (
                        <span className="text-xs font-mono text-slate-400">ID: {formData.id}</span>
                    )}
                </div>

                {/* Main Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Image Uploader */}
                    <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1.5">Imagen</label>
                        <div 
                            className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all relative overflow-hidden group"
                            onClick={() => imageUploadRef.current?.click()}
                        >
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-bold uppercase">CAMBIAR IMAGEN</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                                        className="absolute top-2 right-2 p-1 bg-white rounded-full text-rose-500 shadow-sm z-20"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <ImagePlus className="w-10 h-10 text-slate-300 mb-2" />
                                    <span className="text-xs text-slate-400 font-bold uppercase">SUBIR FOTO</span>
                                </>
                            )}
                            <input 
                                type="file" 
                                ref={imageUploadRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                         {/* Code Section */}
                         <div className="grid grid-cols-1 gap-6">
                            <div className="flex items-end gap-2">
                                <Input 
                                    label="CÓDIGO (ALEATORIO)" 
                                    value={formData.code} 
                                    readOnly 
                                    className="bg-slate-50 font-mono text-lg tracking-widest text-center"
                                />
                                <Button type="button" variant="secondary" onClick={generateCode} className="mb-[1px]">
                                    <RefreshCw className="w-5 h-5" />
                                </Button>
                            </div>
                            
                            <Input 
                                label="NOMBRE DEL ARTÍCULO" 
                                value={formData.name} 
                                onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                                placeholder="EJ. TRAJE DE SPIDERMAN"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input 
                                label="DESCRIPCIÓN" 
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value.toUpperCase()})}
                                placeholder="DETALLES DEL ESTADO, MATERIAL, ETC."
                            />
                            <Select 
                                label="CATEGORÍA"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                            >
                                {formCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>


                {/* Pricing */}
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> PRECIOS BASE
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-all">
                        <input 
                            type="checkbox" 
                            checked={formData.isRentalAvailable}
                            onChange={(e) => setFormData({...formData, isRentalAvailable: e.target.checked})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700 uppercase">DISPONIBLE RENTA</span>
                        </label>
                        {formData.isRentalAvailable && (
                        <Input 
                            type="number" 
                            label="COSTO RENTA BASE" 
                            placeholder="0.00"
                            value={formData.rentalPrice || ''}
                            onChange={(e) => setFormData({...formData, rentalPrice: parseFloat(e.target.value)})}
                        />
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-all">
                        <input 
                            type="checkbox" 
                            checked={formData.isSaleAvailable}
                            onChange={(e) => setFormData({...formData, isSaleAvailable: e.target.checked})}
                            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-700 uppercase">DISPONIBLE VENTA</span>
                        </label>
                        {formData.isSaleAvailable && (
                        <Input 
                            type="number" 
                            label="COSTO VENTA BASE" 
                            placeholder="0.00"
                            value={formData.salePrice || ''}
                            onChange={(e) => setFormData({...formData, salePrice: parseFloat(e.target.value)})}
                        />
                        )}
                    </div>
                    </div>
                </div>

                {/* Variations */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">VARIACIONES (TALLAS/COLORES)</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
                    <div className="md:col-span-2">
                        <Input 
                        label="NOMBRE (EJ. TALLA XL)" 
                        value={newVarName}
                        onChange={e => setNewVarName(e.target.value.toUpperCase())}
                        />
                    </div>
                    {formData.isRentalAvailable && (
                        <div>
                        <Input 
                            label="PRECIO RENTA (OPCIONAL)" 
                            type="number" 
                            placeholder={`BASE: $${formData.rentalPrice || 0}`}
                            value={newVarRent}
                            onChange={e => setNewVarRent(e.target.value)}
                            className="text-sm"
                        />
                        </div>
                    )}
                    {formData.isSaleAvailable && (
                        <div>
                        <Input 
                            label="PRECIO VENTA (OPCIONAL)" 
                            type="number" 
                            placeholder={`BASE: $${formData.salePrice || 0}`}
                            value={newVarSale}
                            onChange={e => setNewVarSale(e.target.value)}
                            className="text-sm"
                        />
                        </div>
                    )}
                    <div className="md:col-span-4 flex justify-end">
                        <Button type="button" variant="secondary" onClick={handleVariationAdd} disabled={!newVarName}>
                        <Plus className="w-4 h-4" /> AGREGAR VARIACIÓN
                        </Button>
                    </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {formData.variations?.map((v, i) => (
                        <span key={i} className="bg-white border border-slate-200 pl-3 pr-2 py-2 rounded-xl text-sm flex items-center gap-3 shadow-sm">
                            <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{v.name}</span>
                            <span className="text-[10px] text-slate-500 flex gap-2">
                                {v.rentalPrice && <span className="text-indigo-600">R: ${v.rentalPrice}</span>}
                                {v.salePrice && <span className="text-emerald-600">V: ${v.salePrice}</span>}
                                {!v.rentalPrice && !v.salePrice && <span>PRECIO BASE</span>}
                            </span>
                            </div>
                            <button 
                            type="button"
                            onClick={() => removeVariation(i)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                            >
                            &times;
                            </button>
                        </span>
                        ))}
                        {(!formData.variations || formData.variations.length === 0) && (
                        <span className="text-sm text-slate-400 italic">SIN VARIACIONES REGISTRADAS.</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1">
                    <Input 
                    type="number" 
                    label="STOCK INICIAL GENERAL" 
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                    min="1"
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setView('list')}>
                        CANCELAR
                    </Button>
                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                        {loading ? 'GUARDANDO...' : (formData.id ? 'ACTUALIZAR ARTÍCULO' : 'GUARDAR ARTÍCULO')}
                    </Button>
                </div>
                </Card>
            </form>
        </div>
      )}

      {/* --- CATEGORY MANAGER MODAL --- */}
      <Modal isOpen={showCategoryModal} onClose={() => {setShowCategoryModal(false); setEditingCategory(null); setNewCategoryName(''); handleRemoveCatImage();}} title="ADMINISTRAR CATEGORÍAS">
          <div className="space-y-6">
              {/* Form */}
              <form onSubmit={handleAddCategory} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex gap-4">
                      {/* Image Preview / Upload */}
                      <div 
                        className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 overflow-hidden relative group flex-shrink-0"
                        onClick={() => catImageUploadRef.current?.click()}
                      >
                           {catImagePreview ? (
                               <>
                                <img src={catImagePreview} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImagePlus className="w-6 h-6 text-white"/>
                                </div>
                               </>
                           ) : (
                               <ImagePlus className="w-6 h-6 text-slate-300" />
                           )}
                           <input type="file" ref={catImageUploadRef} className="hidden" accept="image/*" onChange={handleCatImageSelect}/>
                      </div>
                      
                      <div className="flex-1">
                          <Input 
                              label={editingCategory ? "RENOMBRAR / EDITAR" : "NUEVA CATEGORÍA"}
                              placeholder="EJ. HALLOWEEN"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                              autoFocus
                          />
                      </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="shadow-lg flex-1">
                        {editingCategory ? 'GUARDAR CAMBIOS' : 'CREAR CATEGORÍA'}
                    </Button>
                    {editingCategory && (
                        <Button type="button" variant="secondary" onClick={() => {setEditingCategory(null); setNewCategoryName(''); handleRemoveCatImage();}}>
                            CANCELAR
                        </Button>
                    )}
                  </div>
              </form>

              {editingCategory && (
                  <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl flex items-start gap-2">
                      <Lock className="w-4 h-4 flex-shrink-0" />
                      <span>
                          <strong>ATENCIÓN:</strong> Si renombra una categoría que ya está en uso, todos los productos asociados se actualizarán automáticamente.
                      </span>
                  </div>
              )}

              {/* List */}
              <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">LISTADO DE CATEGORÍAS (INCLUYE IMPORTADAS)</h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {allManageableCategories.map((cat, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 group transition-all">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                      {cat.imageUrl ? (
                                          <img src={cat.imageUrl} className="w-full h-full object-cover" />
                                      ) : (
                                          <Box className="w-full h-full p-2 text-slate-300" />
                                      )}
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="font-bold text-slate-700 uppercase flex items-center gap-2 text-sm">
                                          {cat.name}
                                          {!cat.isRegistered && (
                                              <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded border border-amber-200" title="Categoría inferida de productos, no registrada oficialmente">AUTO</span>
                                          )}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-bold">
                                          {cat.count} PRODUCTOS
                                      </span>
                                  </div>
                              </div>
                              <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEditCategory(cat)} className="p-1.5 hover:bg-slate-50 rounded text-slate-400 hover:text-indigo-600 transition-colors" title="Renombrar / Editar Foto">
                                      <Pencil className="w-4 h-4" />
                                  </button>
                                  {cat.isRegistered && (
                                      <button onClick={() => cat.id && handleDeleteCategory(cat.id)} className="p-1.5 hover:bg-slate-50 rounded text-slate-400 hover:text-rose-500 transition-colors" title="Eliminar de lista oficial">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                      {allManageableCategories.length === 0 && (
                          <div className="text-center py-8 text-slate-400 text-sm">NO HAY CATEGORÍAS REGISTRADAS</div>
                      )}
                  </div>
              </div>
          </div>
      </Modal>

    </div>
  );
};

export default Inventory;
