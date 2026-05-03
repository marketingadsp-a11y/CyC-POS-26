
export interface Variation {
  name: string;
  rentalPrice?: number;
  salePrice?: number;
}

export interface Product {
  id?: string;
  code: string; // 4 to 6 digits
  name: string;
  description: string;
  salePrice: number;
  rentalPrice: number;
  category: string;
  stock: number;
  variations: Variation[]; 
  isRentalAvailable: boolean;
  isSaleAvailable: boolean;
  imageUrl?: string; // New field for product image
}

export interface Category {
  id?: string;
  name: string;
  imageUrl?: string; // New field for category image
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address?: string; 
  balance?: number; // Positive = Credit (rare), Negative = Debt
}

export interface UserPermissions {
  canAccessPOS: boolean; // New: Access to the Point of Sale screen
  canViewReports: boolean;
  canManageSettings: boolean; // Global settings
  canManageInventory: boolean; // Add/Edit/Delete products
  canManageUsers: boolean; // Add/Edit/Delete users
  canRefund: boolean; // Perform refunds
  canDeleteCustomers: boolean; // Delete customers
  canManageExpenses: boolean; // Access Expenses module
  canApplyDiscounts: boolean; // New: Apply coupons in POS
  canSettleDebt: boolean; // New: Manually clear customer debt
}

export interface User {
  id?: string;
  name: string;
  code: string; // 4 digits typically
  role?: 'admin' | 'staff'; // Kept for legacy/fallback
  permissions?: UserPermissions; // Granular permissions
  sessionToken?: string; // New: Used to validate active session
  menuOrder?: string[]; // New: Custom order of menu paths
}

export interface SystemSettings {
  id?: string;
  defaultLateFee: number;
  pricePerExtraDay: number;
  cardFeePercentage: number;
  businessName?: string; // New: Custom business name
  businessTagline?: string; // New: Custom slogan/subtitle
  receiptTemplate?: 'v1' | 'v2'; // New: Template selector
  ticketPrefix?: string; // e.g. "26"
  nextTicketSequence?: number; // e.g. 1 (will result in 260001)
  logoUrl?: string; // New: Logo URL for POS empty state
  pwaIconUrl?: string; // New: Logo URL for PWA Manifest and Favicon
  imgbbKey?: string; // New: API Key for ImgBB integrations
}

export interface Expense {
  id?: string;
  concept: string;
  amount: number;
  createdAt: number;
  registeredBy?: string;
}

export interface Coupon {
  id?: string;
  code: string;
  type: 'percentage' | 'amount'; // % or $
  value: number;
  isActive: boolean;
}

export type TransactionType = 'sale' | 'rent';

export interface CartItem extends Product {
  cartId: string; // Unique ID for the item in cart
  transactionType: TransactionType;
  quantity: number;
  selectedVariation?: Variation;
  appliedPrice: number; // The actual price used for this item (base or variation)
}

export interface Order {
  id?: string;
  items: CartItem[];
  customer?: Customer; // Required if there are rentals
  total: number;
  status: 'pending' | 'completed' | 'returned' | 'late' | 'returned_late' | 'refunded' | 'reservation';
  createdAt: number; // Timestamp
  rentalStartDate?: number;
  rentalEndDate?: number;
  returnedAt?: number; // When it was actually returned
  lateFee?: number; // Fee charged if returned late
  paymentMethod?: 'cash' | 'card' | 'transfer';
  
  // Discount Fields
  discount?: number;
  discountReason?: string;

  // Reservation Fields
  downPayment?: number; // Amount paid upfront
  remainingBalance?: number; // Amount pending to pay
  finalizedAt?: number; // When the reservation was paid in full/picked up
}
