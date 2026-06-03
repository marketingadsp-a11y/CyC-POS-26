
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, where, Timestamp, deleteDoc, doc, writeBatch, updateDoc, setDoc, getDoc, runTransaction, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Product, Order, Customer, User, SystemSettings, Expense, Coupon, Category } from '../types';

// Helper to generate a random code between 4 and 6 digits
export const generateProductCode = (): string => {
  const min = 1000;
  const max = 999999;
  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return num.toString();
};

// Helper to recursively strip undefined values from objects
const stripUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = stripUndefined(value);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

// --- Storage / Images (Compressed) ---

const compressImage = (file: File, maxWidth = 1024, maxHeight = 1024): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Export as JPEG with 70% quality
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Image compression failed'));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const uploadToImgBB = async (file: File, apiKey: string): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('ImgBB upload failed');
    }
    
    const result = await response.json();
    return result.data.url;
};

export const uploadProductImage = async (file: File, imgbbKey?: string): Promise<string> => {
  try {
    if (imgbbKey) {
        return await uploadToImgBB(file, imgbbKey);
    }

    // Fallback to Firebase Storage
    const compressedBlob = await compressImage(file);
    const storageRef = ref(storage, `products/${Date.now()}_opt.jpg`);
    const snapshot = await uploadBytes(storageRef, compressedBlob);
    return await getDownloadURL(snapshot.ref);
  } catch (e) {
    console.error("Error uploading image: ", e);
    throw e;
  }
};

export const uploadAppLogo = async (file: File, imgbbKey?: string): Promise<string> => {
  try {
    if (imgbbKey) {
        return await uploadToImgBB(file, imgbbKey);
    }

    const compressedBlob = await compressImage(file, 512, 512);
    const storageRef = ref(storage, `branding/logo_${Date.now()}.jpg`);
    const snapshot = await uploadBytes(storageRef, compressedBlob);
    return await getDownloadURL(snapshot.ref);
  } catch (e) {
    console.error("Error uploading logo: ", e);
    throw e;
  }
};

// --- Products ---

export const addProduct = async (product: Omit<Product, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "products"), product);
    return { ...product, id: docRef.id };
  } catch (e) {
    console.error("Error adding product: ", e);
    throw e;
  }
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  try {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, product);
  } catch (e) {
    console.error("Error updating product: ", e);
    throw e;
  }
};

export const getProducts = async (): Promise<Product[]> => {
  try {
    const q = query(collection(db, "products"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (e) {
    console.error("Error fetching products: ", e);
    return [];
  }
};

export const deleteProduct = async (id: string) => {
    try {
        await deleteDoc(doc(db, "products", id));
    } catch (e) {
        console.error("Error deleting product", e);
        throw e;
    }
}

export const importProductsBatch = async (products: Omit<Product, 'id'>[]) => {
  try {
    const batch = writeBatch(db);
    const collectionRef = collection(db, "products");
    const chunk = products.slice(0, 500);

    chunk.forEach(prod => {
      const docRef = doc(collectionRef);
      batch.set(docRef, prod);
    });

    await batch.commit();
    return chunk.length;
  } catch (e) {
    console.error("Error batch importing: ", e);
    throw e;
  }
}

// Bulk Delete Function
export const bulkDeleteProducts = async (category?: string) => {
    try {
        let q;
        if (category && category !== 'TODOS') {
            q = query(collection(db, "products"), where("category", "==", category));
        } else {
            q = query(collection(db, "products"));
        }

        const snapshot = await getDocs(q);
        
        // Firestore batches can only handle 500 operations. We need to chunk it.
        const CHUNK_SIZE = 450; 
        const chunks = [];
        
        for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
            chunks.push(snapshot.docs.slice(i, i + CHUNK_SIZE));
        }

        let deletedCount = 0;

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            deletedCount += chunk.length;
        }

        return deletedCount;

    } catch (e) {
        console.error("Error bulk deleting: ", e);
        throw e;
    }
}

// --- Categories Management ---

export const getCategories = async (): Promise<Category[]> => {
    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    } catch (e) {
        console.error("Error getting categories", e);
        return [];
    }
}

export const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
        const q = query(collection(db, "categories"), where("name", "==", category.name));
        const snapshot = await getDocs(q);
        // If it exists, just return it, don't throw error (idempotent)
        if(!snapshot.empty) {
            return { id: snapshot.docs[0].id, ...category };
        }

        const docRef = await addDoc(collection(db, "categories"), category);
        return { id: docRef.id, ...category };
    } catch(e) {
        throw e;
    }
}

export const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
        const docRef = doc(db, "categories", id);
        await updateDoc(docRef, data);
    } catch (e) {
        console.error("Error updating category", e);
        throw e;
    }
}

export const deleteCategory = async (id: string) => {
    try {
        await deleteDoc(doc(db, "categories", id));
    } catch (e) {
        throw e;
    }
}

// Powerful function: Renames category in 'categories' collection AND updates all products with that category
export const renameCategoryGlobal = async (categoryId: string, oldName: string, newName: string, newImageUrl?: string) => {
    try {
        // 1. Update the category document
        const catRef = doc(db, "categories", categoryId);
        const updatePayload: any = { name: newName };
        if (newImageUrl) updatePayload.imageUrl = newImageUrl;
        
        await updateDoc(catRef, updatePayload);

        // 2. Find all products with the old category name
        // Note: This only updates the name string in products, not the image (products don't store category image)
        return await batchUpdateCategoryInProducts(oldName, newName);
    } catch (e) {
        console.error("Error renaming category global", e);
        throw e;
    }
}

// Updates products only (useful when the category doesn't exist in the 'categories' collection yet)
export const batchUpdateCategoryInProducts = async (oldName: string, newName: string) => {
    try {
        // If names are the same, skip update
        if (oldName === newName) return 0;

        const q = query(collection(db, "products"), where("category", "==", oldName));
        const snapshot = await getDocs(q);

        const CHUNK_SIZE = 450;
        const chunks = [];
        for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
            chunks.push(snapshot.docs.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => {
                batch.update(doc.ref, { category: newName });
            });
            await batch.commit();
        }
        return snapshot.docs.length;
    } catch (e) {
        console.error("Error batch updating product categories", e);
        throw e;
    }
}


// --- Orders ---

export const createOrder = async (order: Omit<Order, 'id'>) => {
  try {
    const cleanOrder = stripUndefined(order);
    const settingsRef = doc(db, "settings", "global");

    // Use a transaction to ensure unique, sequential IDs
    const newId = await runTransaction(db, async (transaction) => {
        // 1. Read current settings
        const settingsDoc = await transaction.get(settingsRef);
        let nextSeq = 1;
        let prefix = '26'; // Default prefix year 26

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            nextSeq = data.nextTicketSequence || 1;
            prefix = data.ticketPrefix || '26';
        }

        // 2. Generate new ID: Prefix + Padded Sequence (e.g. 26 + 0001 = 260001)
        const formattedId = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
        const orderRef = doc(db, "orders", formattedId);

        // 3. Create the order
        transaction.set(orderRef, {
            ...cleanOrder,
            id: formattedId,
            createdAt: Timestamp.now().toMillis()
        });

        // 4. Update the sequence for the next order
        transaction.set(settingsRef, { 
            nextTicketSequence: nextSeq + 1,
            ticketPrefix: prefix // Ensure prefix exists if it didn't before
        }, { merge: true });

        return formattedId;
    });
    
    return { ...cleanOrder, id: newId };
  } catch (e) {
    console.error("Error creating order: ", e);
    throw e;
  }
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
    try {
      const docRef = doc(db, "orders", id);
      await updateDoc(docRef, data);
    } catch (e) {
      console.error("Error updating order: ", e);
      throw e;
    }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (e) {
    console.error("Error fetching orders: ", e);
    return [];
  }
};

// --- Expenses ---

export const addExpense = async (expense: Omit<Expense, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "expenses"), expense);
    return { ...expense, id: docRef.id };
  } catch (e) {
    console.error("Error adding expense", e);
    throw e;
  }
};

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
  } catch (e) {
    console.error("Error fetching expenses", e);
    return [];
  }
};

export const deleteExpense = async (id: string) => {
  try {
    await deleteDoc(doc(db, "expenses", id));
  } catch (e) {
    console.error("Error deleting expense", e);
    throw e;
  }
};

// --- Coupons ---

export const getCoupons = async (): Promise<Coupon[]> => {
    try {
        const q = query(collection(db, "coupons"), orderBy("code"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
    } catch (e) {
        console.error("Error fetching coupons", e);
        return [];
    }
}

export const addCoupon = async (coupon: Coupon) => {
    try {
        // Check uniqueness
        const q = query(collection(db, "coupons"), where("code", "==", coupon.code));
        const snap = await getDocs(q);
        if(!snap.empty) {
            throw new Error("El código ya existe");
        }
        const docRef = await addDoc(collection(db, "coupons"), coupon);
        return { ...coupon, id: docRef.id };
    } catch (e) {
        throw e;
    }
}

export const deleteCoupon = async (id: string) => {
    try {
        await deleteDoc(doc(db, "coupons", id));
    } catch (e) {
        console.error("Error deleting coupon", e);
        throw e;
    }
}

export const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    try {
        await updateDoc(doc(db, "coupons", id), data);
    } catch (e) {
        console.error("Error updating coupon", e);
        throw e;
    }
}


// --- Customers ---

export const getCustomers = async (): Promise<Customer[]> => {
    try {
      const q = query(collection(db, "customers"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    } catch (e) {
      console.error("Error fetching customers", e);
      return [];
    }
}

export const addCustomer = async (customer: Customer) => {
    try {
        const docRef = await addDoc(collection(db, "customers"), { ...customer, balance: 0 });
        return { ...customer, balance: 0, id: docRef.id };
    } catch(e) {
        console.error("Error adding customer", e);
        throw e;
    }
}

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
  try {
    const docRef = doc(db, "customers", id);
    await updateDoc(docRef, customer);
  } catch (e) {
    console.error("Error updating customer: ", e);
    throw e;
  }
};

export const deleteCustomer = async (id: string) => {
    try {
        await deleteDoc(doc(db, "customers", id));
    } catch (e) {
        console.error("Error deleting customer", e);
        throw e;
    }
}

// --- Users (Auth) ---

export const getUsers = async (): Promise<User[]> => {
  try {
    const q = query(collection(db, "users"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (e) {
    console.error("Error fetching users", e);
    return [];
  }
}

export const getUserByCode = async (code: string): Promise<User | null> => {
  try {
    const q = query(collection(db, "users"), where("code", "==", code));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  } catch (e) {
    console.error("Error fetching user by code", e);
    return null;
  }
}

export const addUser = async (user: User) => {
  try {
      const docRef = await addDoc(collection(db, "users"), user);
      return { ...user, id: docRef.id };
  } catch(e) {
      console.error("Error adding user", e);
      throw e;
  }
}

export const updateUser = async (id: string, user: Partial<User>) => {
  try {
    const docRef = doc(db, "users", id);
    await updateDoc(docRef, user);
  } catch (e) {
    console.error("Error updating user", e);
    throw e;
  }
}

export const deleteUser = async (id: string) => {
  try {
      await deleteDoc(doc(db, "users", id));
  } catch (e) {
      console.error("Error deleting user", e);
      throw e;
  }
}

// --- Session Management ---

// Listen to user changes (for forced logout)
export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  return onSnapshot(doc(db, "users", userId), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ id: docSnapshot.id, ...docSnapshot.data() } as User);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to user:", error);
  });
};

export const resetUserSession = async (userId: string) => {
    try {
        const newSessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await updateUser(userId, { sessionToken: newSessionToken });
    } catch(e) {
        console.error("Error resetting session", e);
        throw e;
    }
}

export const resetAllUserSessions = async () => {
    try {
        const users = await getUsers();
        const batch = writeBatch(db);
        users.forEach(u => {
            if(u.id) {
                const newSessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
                const ref = doc(db, "users", u.id);
                batch.update(ref, { sessionToken: newSessionToken });
            }
        });
        await batch.commit();
    } catch(e) {
        console.error("Error resetting all sessions", e);
        throw e;
    }
}

// --- Settings ---

export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const docRef = doc(db, "settings", "global");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
          defaultLateFee: data.defaultLateFee || 50,
          pricePerExtraDay: data.pricePerExtraDay || 0,
          cardFeePercentage: data.cardFeePercentage || 0,
          // Use nullish coalescing (??) to allow empty strings from DB to pass through
          businessName: data.businessName ?? 'CyC POS 26',
          businessTagline: data.businessTagline ?? 'DISFRACES & ACCESORIOS',
          receiptTemplate: data.receiptTemplate || 'v1',
          ticketPrefix: data.ticketPrefix || '26',
          nextTicketSequence: data.nextTicketSequence || 1,
          logoUrl: data.logoUrl || '',
          pwaIconUrl: data.pwaIconUrl || '',
          imgbbKey: data.imgbbKey || '',
          bankName: data.bankName || '',
          bankAccountName: data.bankAccountName || '',
          bankAccountNumber: data.bankAccountNumber || '',
          zettleScheme: data.zettleScheme || 'zettle'
      } as SystemSettings;
    } else {
      // Return default
      return { 
          defaultLateFee: 50, 
          pricePerExtraDay: 50, 
          cardFeePercentage: 0, 
          businessName: 'CyC POS 26',
          businessTagline: 'DISFRACES & ACCESORIOS', 
          receiptTemplate: 'v1',
          ticketPrefix: '26',
          nextTicketSequence: 1,
          logoUrl: '',
          pwaIconUrl: '',
          imgbbKey: '',
          bankName: '',
          bankAccountName: '',
          bankAccountNumber: '',
          zettleScheme: 'zettle'
      };
    }
  } catch (e) {
    console.error("Error getting settings", e);
    return { 
        defaultLateFee: 50, 
        pricePerExtraDay: 50, 
        cardFeePercentage: 0, 
        businessName: 'CyC POS 26', 
        businessTagline: 'DISFRACES & ACCESORIOS', 
        receiptTemplate: 'v1',
        ticketPrefix: '26',
        nextTicketSequence: 1,
        logoUrl: '',
        pwaIconUrl: '',
        imgbbKey: '',
        bankName: '',
        bankAccountName: '',
        bankAccountNumber: '',
        zettleScheme: 'zettle'
    };
  }
}

export const updateSystemSettings = async (settings: SystemSettings) => {
  try {
    const docRef = doc(db, "settings", "global");
    // Use setDoc with merge: true so we don't overwrite if we only send partial, 
    // although this function generally sends full object currently.
    await setDoc(docRef, settings, { merge: true });
  } catch (e) {
    console.error("Error saving settings", e);
    throw e;
  }
}

// --- FACTORY RESET (DESTRUCTIVE) ---
export const performFactoryReset = async () => {
    const collectionsToWipe = ['products', 'customers', 'orders', 'expenses', 'coupons', 'categories'];
    
    try {
        // 1. Wipe Operational Collections
        for (const colName of collectionsToWipe) {
            const q = query(collection(db, colName));
            const snapshot = await getDocs(q);
            
            // Delete in batches of 400 (limit is 500)
            const chunks = [];
            for (let i = 0; i < snapshot.docs.length; i += 400) {
                chunks.push(snapshot.docs.slice(i, i + 400));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
        }

        // 2. Reset System Settings to Defaults
        const defaultSettings: SystemSettings = {
            defaultLateFee: 50,
            pricePerExtraDay: 50,
            cardFeePercentage: 0,
            businessName: 'CyC POS 26',
            businessTagline: 'DISFRACES & ACCESORIOS',
            receiptTemplate: 'v1',
            ticketPrefix: '26',
            nextTicketSequence: 1,
            logoUrl: '',
            pwaIconUrl: '',
            imgbbKey: '',
            bankName: '',
            bankAccountName: '',
            bankAccountNumber: ''
        };
        await setDoc(doc(db, "settings", "global"), defaultSettings);

        return true;
    } catch (e) {
        console.error("Error during factory reset", e);
        throw e;
    }
}
