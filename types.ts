
export enum AppTab {
  DASHBOARD = 'Dashboard',
  PRODUCTS = 'Products',
  POS = 'POS',
  PURCHASES = 'Purchases',
  INVOICES = 'Invoices',
  CUSTOMERS = 'Customers',
  DEBTORS = 'Debtors Hub',
  SUPPLIERS = 'Suppliers',
  STOCK = 'Stock Adjustments',
  FINANCES = 'Income & Expenses',
  ACCOUNTING = 'Accounting',
  AUDIT = 'Audit Trail',
  DAILY_CLOSING = 'Daily Closing',
  REPORTS = 'Reports',
  AI = 'AI Insights',
  DATABASE = 'Cloud Database',
  ROLES = 'User Roles',
  SETTINGS = 'Settings'
}

export enum Currency {
  USD = 'USD',
  ETB = 'ETB'
}

export enum PaymentMethod {
  CASH = 'Cash',
  BANK = 'Bank Transfer',
  MOBILE_MONEY = 'Mobile Money',
  DEBT = 'Debt',
  PARTIAL = 'Partial Payment'
}

export enum AccountType {
  ASSET = 'Asset',
  FIXED_ASSET = 'Fixed Asset',
  EQUITY = 'Equity',
  OTHER_CURRENT_ASSET = 'Other Current Asset',
  LIABILITY = 'Liability'
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  category: string;
  image?: string; // Base64
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  id: string; // Phone number as ID
  name: string;
  phone: string;
  photo?: string; // Base64
  debtBalance: number;
  loyaltyPoints: number;
  history: string[]; // Transaction IDs
}

export interface Supplier {
  id: string; // Phone number as ID
  name: string;
  contact: string;
  phone: string;
  balance: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: Currency;
  exchangeRate: number;
  paymentMethod: PaymentMethod;
  accountId?: string; // Track which ledger account received the funds
  paymentDetails?: {
    cash: number;
    debt: number;
    bank: number;
    mobile: number;
  };
  customerId?: string;
  timestamp: number;
  type: 'SALE' | 'RETURN' | 'DEBT_PAYMENT';
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: Currency;
  timestamp: number;
  accountId: string; // REQUIRED: Source of funds
  receipt?: string; // Base64
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  type: 'DAMAGE' | 'LOST' | 'EXPIRED' | 'RETURN_TO_VENDOR' | 'STOCK_IN';
  quantity: number;
  timestamp: number;
  reason: string;
  supplierId?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: number;
  user: string;
}

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  CASHIER = 'Cashier'
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
  isActive: boolean;
  avatar?: string;
}

export interface AppSettings {
  businessName: string;
  businessLogo?: string;
  exchangeRate: number;
  taxRate: number;
  defaultCurrency: Currency;
  authUsername?: string;
  authPassword?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  currentUser: {
    name: string;
    role: UserRole;
    avatar?: string;
  };
  syncSettings?: {
    autoSyncCloud?: boolean;
    lastSyncedAt?: number;
    dataVersion?: number;
  };
}

export interface AppData {
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  stockAdjustments: StockAdjustment[];
  auditLogs: AuditLog[];
  settings: AppSettings;
  users: UserProfile[];
  accounts: Account[];
  lastModified?: number;
}
