/**
 * Enterprise ERP System - Multi-Industry Business Management Platform
 * Vanilla TypeScript Implementation
 */

import './index.css';

// --- Types & Interfaces ---

type IndustryMode = 'PHARMACY' | 'GROCERY' | 'RETAIL';
type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';
type View = 'dashboard' | 'inventory' | 'sales' | 'purchase' | 'crm' | 'suppliers' | 'accounting' | 'reports' | 'alerts';

interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    cost: number;
    mode: IndustryMode;
    // Dynamic fields
    expiryDate?: string;
    batchNumber?: string;
    size?: string;
    color?: string;
    bulkUnit?: string;
}

interface Sale {
    id: string;
    date: number;
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    total: number;
    tax: number;
    discount: number;
    status: 'PAID' | 'PARTIAL' | 'DUE';
    paidAmount: number;
}

interface Purchase {
    id: string;
    date: number;
    supplierId: string;
    items: { productId: string; quantity: number; cost: number }[];
    total: number;
    status: 'RECEIVED' | 'PENDING';
}

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    balance: number;
}

interface Supplier {
    id: string;
    name: string;
    contact: string;
    category: string;
}

// --- State Management ---

class Store {
    mode: IndustryMode = 'GROCERY';
    role: UserRole = 'ADMIN';
    currentView: View = 'dashboard';
    inventorySearch: string = '';
    salesSearch: string = '';
    cart: { productId: string; quantity: number }[] = [];
    
    products: Product[] = [];
    sales: Sale[] = [];
    purchases: Purchase[] = [];
    customers: Customer[] = [];
    suppliers: Supplier[] = [];
    
    notifications: { id: string; message: string; type: 'success' | 'error' | 'warning' }[] = [];

    constructor() {
        this.load();
        if (this.products.length === 0) this.seed();
    }

    load() {
        const data = localStorage.getItem('erp_data');
        if (data) {
            const parsed = JSON.parse(data);
            this.products = parsed.products || [];
            this.sales = parsed.sales || [];
            this.purchases = parsed.purchases || [];
            this.customers = parsed.customers || [];
            this.suppliers = parsed.suppliers || [];
            this.mode = parsed.mode || 'GROCERY';
            this.role = parsed.role || 'ADMIN';
            this.currentView = parsed.currentView || 'dashboard';
        }
    }

    save() {
        const data = {
            products: this.products,
            sales: this.sales,
            purchases: this.purchases,
            customers: this.customers,
            suppliers: this.suppliers,
            mode: this.mode,
            role: this.role,
            currentView: this.currentView
        };
        localStorage.setItem('erp_data', JSON.stringify(data));
    }

    addProduct(product: Omit<Product, 'id'>) {
        const newProduct = {
            ...product,
            id: 'P' + Math.random().toString(36).substr(2, 9)
        };
        this.products.push(newProduct);
        this.save();
        this.notify(`Product "${product.name}" added successfully`);
    }

    updateProduct(id: string, updates: Partial<Product>) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updates };
            this.save();
            this.notify(`Product "${this.products[index].name}" updated successfully`);
        }
    }

    deleteProduct(id: string) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            this.products = this.products.filter(p => p.id !== id);
            this.save();
            this.notify(`Product "${product.name}" deleted successfully`, 'warning');
        }
    }

    addToCart(productId: string) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const cartItem = this.cart.find(item => item.productId === productId);
        const currentQty = cartItem ? cartItem.quantity : 0;
        
        if (currentQty + 1 > product.quantity) {
            this.notify(`Only ${product.quantity} items available in stock`, 'error');
            return;
        }

        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            this.cart.push({ productId, quantity: 1 });
        }
        renderApp();
    }

    removeFromCart(productId: string) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        renderApp();
    }

    updateCartQuantity(productId: string, quantity: number) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        if (quantity > product.quantity) {
            this.notify(`Only ${product.quantity} items available in stock`, 'error');
            return;
        }

        if (quantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        const cartItem = this.cart.find(item => item.productId === productId);
        if (cartItem) {
            cartItem.quantity = quantity;
            renderApp();
        }
    }

    processSale(customerId: string = 'C1', status: 'PAID' | 'DUE' = 'PAID') {
        if (this.cart.length === 0) return;

        const items = this.cart.map(item => {
            const product = this.products.find(p => p.id === item.productId)!;
            return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.price
            };
        });

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        const sale: Sale = {
            id: 'S' + Math.random().toString(36).substr(2, 9),
            date: Date.now(),
            customerId,
            items,
            total,
            tax,
            discount: 0,
            status,
            paidAmount: status === 'PAID' ? total : 0
        };

        // Deduct stock
        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.productId);
            if (product) {
                product.quantity -= item.quantity;
            }
        });

        this.sales.push(sale);

        // Update customer balance if DUE
        if (status === 'DUE') {
            const customer = this.customers.find(c => c.id === customerId);
            if (customer) {
                customer.balance += total;
            }
        }

        this.cart = [];
        this.save();
        this.notify(`Sale completed: $${total.toFixed(2)}`);
        renderApp();
    }

    addSupplier(supplier: Omit<Supplier, 'id'>) {
        const newSupplier = {
            ...supplier,
            id: 'SUP' + Math.random().toString(36).substr(2, 9)
        };
        this.suppliers.push(newSupplier);
        this.save();
        this.notify(`Supplier "${supplier.name}" added successfully`);
        renderApp();
    }

    updateSupplier(id: string, updates: Partial<Supplier>) {
        const index = this.suppliers.findIndex(s => s.id === id);
        if (index !== -1) {
            this.suppliers[index] = { ...this.suppliers[index], ...updates };
            this.save();
            this.notify(`Supplier "${this.suppliers[index].name}" updated successfully`);
            renderApp();
        }
    }

    deleteSupplier(id: string) {
        const supplier = this.suppliers.find(s => s.id === id);
        if (supplier) {
            this.suppliers = this.suppliers.filter(s => s.id !== id);
            this.save();
            this.notify(`Supplier "${supplier.name}" deleted successfully`, 'warning');
            renderApp();
        }
    }

    addCustomer(customer: Omit<Customer, 'id' | 'balance'>) {
        const newCustomer = {
            ...customer,
            id: 'CUST' + Math.random().toString(36).substr(2, 9),
            balance: 0
        };
        this.customers.push(newCustomer);
        this.save();
        this.notify(`Customer "${customer.name}" added successfully`);
        renderApp();
    }

    updateCustomer(id: string, updates: Partial<Customer>) {
        const index = this.customers.findIndex(c => c.id === id);
        if (index !== -1) {
            this.customers[index] = { ...this.customers[index], ...updates };
            this.save();
            this.notify(`Customer "${this.customers[index].name}" updated successfully`);
            renderApp();
        }
    }

    deleteCustomer(id: string) {
        const customer = this.customers.find(c => c.id === id);
        if (customer) {
            this.customers = this.customers.filter(c => c.id !== id);
            this.save();
            this.notify(`Customer "${customer.name}" deleted successfully`, 'warning');
            renderApp();
        }
    }

    addPurchase(purchase: Omit<Purchase, 'id' | 'date'>) {
        const newPurchase: Purchase = {
            ...purchase,
            id: 'PUR' + Math.random().toString(36).substr(2, 9),
            date: Date.now()
        };

        // Increase stock
        newPurchase.items.forEach(item => {
            const product = this.products.find(p => p.id === item.productId);
            if (product) {
                product.quantity += item.quantity;
                // Update cost price if it changed? Usually yes in ERP
                product.cost = item.cost;
            }
        });

        this.purchases.push(newPurchase);
        this.save();
        this.notify(`Purchase order #${newPurchase.id.substr(0, 6)} received`);
        renderApp();
    }

    seed() {
        this.suppliers = [
            { id: 'S1', name: 'Global Foods Inc', contact: 'supply@globalfoods.com', category: 'Grocery' },
            { id: 'S2', name: 'MediCorp Pharmaceuticals', contact: 'orders@medicorp.com', category: 'Pharmacy' },
            { id: 'S3', name: 'TrendStyle Apparel', contact: 'sales@trendstyle.com', category: 'Retail' }
        ];
        this.customers = [
            { id: 'C1', name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', balance: 0 },
            { id: 'C2', name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321', balance: 50 }
        ];
        this.products = [
            { id: 'P1', sku: 'GR-001', name: 'Organic Milk', category: 'Dairy', quantity: 50, price: 4.5, cost: 3.0, mode: 'GROCERY' },
            { id: 'P2', sku: 'PH-001', name: 'Amoxicillin 500mg', category: 'Antibiotics', quantity: 100, price: 15.0, cost: 8.0, mode: 'PHARMACY', expiryDate: '2026-12-31', batchNumber: 'B123' },
            { id: 'P3', sku: 'RT-001', name: 'Cotton T-Shirt', category: 'Clothing', quantity: 30, price: 25.0, cost: 12.0, mode: 'RETAIL', size: 'L', color: 'Blue' }
        ];
        this.save();
    }

    notify(message: string, type: 'success' | 'error' | 'warning' = 'success') {
        const id = Math.random().toString(36).substr(2, 9);
        this.notifications.push({ id, message, type });
        renderNotifications();
        setTimeout(() => {
            this.notifications = this.notifications.filter(n => n.id !== id);
            renderNotifications();
        }, 3000);
    }
}

const store = new Store();

// --- Icons (SVG Strings) ---

const ICONS = {
    dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
    inventory: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    sales: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
    purchase: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    crm: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    suppliers: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    accounting: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    reports: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
    alerts: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
    plus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`,
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    logo: `<svg viewBox="0 0 100 100" class="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 5 L90 27.5 V72.5 L50 95 L10 72.5 V27.5 Z" fill="none" stroke="white" stroke-width="8" stroke-linejoin="round"/>
        <path d="M50 25 L75 40 V60 L50 75 L25 60 V40 Z" fill="white" opacity="0.8"/>
        <circle cx="90" cy="27.5" r="5" fill="#f97316"/>
        <circle cx="10" cy="72.5" r="5" fill="#f97316"/>
    </svg>`
};

// --- Rendering Logic ---

function renderApp() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="flex h-screen overflow-hidden">
            ${renderSidebar()}
            <div class="flex-1 flex flex-col overflow-hidden">
                ${renderTopbar()}
                <main id="main-content" class="flex-1 overflow-y-auto p-8 bg-gray-50">
                    ${renderView()}
                </main>
            </div>
        </div>
        <div id="notification-container" class="fixed bottom-8 right-8 z-50 flex flex-col gap-2"></div>
        <div id="modal-container" class="fixed inset-0 z-40 hidden bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"></div>
    `;

    attachGlobalEvents();
}

function renderSidebar() {
    const lowStockCount = store.products.filter(p => p.quantity < 10).length;
    const expiringCount = store.products.filter(p => p.expiryDate && isExpiringSoon(p.expiryDate)).length;
    const dueCount = store.sales.filter(s => s.status === 'DUE').length;
    const totalAlerts = lowStockCount + expiringCount + dueCount;

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
        { id: 'inventory', label: 'Inventory', icon: ICONS.inventory },
        { id: 'sales', label: 'Sales & POS', icon: ICONS.sales },
        { id: 'purchase', label: 'Procurement', icon: ICONS.purchase },
        { id: 'crm', label: 'Customers', icon: ICONS.crm },
        { id: 'suppliers', label: 'Suppliers', icon: ICONS.suppliers },
        { id: 'accounting', label: 'Accounting', icon: ICONS.accounting },
        { id: 'reports', label: 'Reports', icon: ICONS.reports },
        { id: 'alerts', label: 'Alerts', icon: ICONS.alerts, badge: totalAlerts > 0 ? totalAlerts : null },
    ];

    return `
        <aside class="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
            <div class="p-6 flex items-center gap-3 border-b border-gray-100">
                <div class="w-10 h-10 bg-indigo-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
                    ${ICONS.logo}
                </div>
                <div>
                    <h1 class="font-black text-xl text-gray-900 leading-none tracking-tight">Trade<span class="text-teal-500">Core</span></h1>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Enterprise ERP</p>
                </div>
            </div>
            <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                ${menuItems.map(item => `
                    <button 
                        data-view="${item.id}"
                        class="nav-link w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${store.currentView === item.id ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}"
                    >
                        <div class="flex items-center gap-3">
                            ${item.icon}
                            <span>${item.label}</span>
                        </div>
                        ${item.badge ? `<span class="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">${item.badge}</span>` : ''}
                    </button>
                `).join('')}
            </nav>
            <div class="p-4 border-t border-gray-100">
                <div class="bg-gray-50 p-4 rounded-2xl">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Industry Mode</p>
                    <select id="mode-selector" class="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="GROCERY" ${store.mode === 'GROCERY' ? 'selected' : ''}>Grocery Mode</option>
                        <option value="PHARMACY" ${store.mode === 'PHARMACY' ? 'selected' : ''}>Pharmacy Mode</option>
                        <option value="RETAIL" ${store.mode === 'RETAIL' ? 'selected' : ''}>Retail Mode</option>
                    </select>
                </div>
            </div>
        </aside>
    `;
}

function renderTopbar() {
    const lowStockCount = store.products.filter(p => p.quantity < 10).length;
    const expiringCount = store.products.filter(p => p.expiryDate && isExpiringSoon(p.expiryDate)).length;
    const dueCount = store.sales.filter(s => s.status === 'DUE').length;
    const totalAlerts = lowStockCount + expiringCount + dueCount;

    return `
        <header class="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
            <div class="flex items-center gap-4 flex-1 max-w-xl">
                <div class="relative w-full group">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        ${ICONS.search}
                    </span>
                    <input id="global-search" type="text" placeholder="Search ERP (SKU, Customer, Invoice...)" class="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm" autocomplete="off">
                    
                    <!-- Search Results Dropdown -->
                    <div id="search-results" class="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 hidden max-h-[400px] overflow-y-auto z-50">
                        <!-- Results will be injected here -->
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-6">
                <button data-view="alerts" class="nav-link relative p-2 text-gray-500 hover:bg-gray-50 rounded-xl transition-all">
                    ${ICONS.bell}
                    ${totalAlerts > 0 ? `<span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>` : ''}
                </button>
                <div class="h-8 w-[1px] bg-gray-200"></div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <p class="text-sm font-bold text-gray-900">Admin User</p>
                        <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">${store.role}</p>
                    </div>
                    <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 border border-gray-200">
                        ${ICONS.user}
                    </div>
                </div>
            </div>
        </header>
    `;
}

function renderView() {
    switch (store.currentView) {
        case 'dashboard': return renderDashboard();
        case 'inventory': return renderInventory();
        case 'sales': return renderSales();
        case 'purchase': return renderPurchase();
        case 'crm': return renderCRM();
        case 'suppliers': return renderSuppliers();
        case 'accounting': return renderAccounting();
        case 'reports': return renderReports();
        case 'alerts': return renderAlerts();
        default: return renderDashboard();
    }
}

function renderDashboard() {
    const revenue = store.sales.reduce((sum, s) => sum + s.total, 0);
    const invValue = store.products.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    const lowStock = store.products.filter(p => p.quantity < 10).length;

    // Calculate monthly sales for the trend chart
    const now = new Date();
    const monthlySales = Array(12).fill(0).map((_, i) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();
        
        return store.sales.reduce((sum, s) => {
            const saleDate = new Date(s.date);
            if (saleDate.getMonth() === month && saleDate.getFullYear() === year) {
                return sum + s.total;
            }
            return sum;
        }, 0);
    });

    const maxMonthlySale = Math.max(...monthlySales, 1000); // Minimum scale of 1000

    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Executive Dashboard</h2>
                    <p class="text-gray-500 font-medium">Real-time performance overview for ${store.mode.toLowerCase()} operations</p>
                </div>
                <div class="flex gap-3">
                    <button data-view="reports" class="nav-link px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all">View Reports</button>
                    <button data-view="sales" class="nav-link px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">New Sale</button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${renderStatCard('Total Revenue', '$' + revenue.toLocaleString(), 'indigo', ICONS.accounting)}
                ${renderStatCard('Total Orders', store.sales.length, 'emerald', ICONS.sales)}
                ${renderStatCard('Inventory Value', '$' + invValue.toLocaleString(), 'blue', ICONS.inventory)}
                ${renderStatCard('Low Stock Alerts', lowStock, 'orange', ICONS.alerts)}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="text-lg font-bold text-gray-900">Sales Trend (Last 12 Months)</h3>
                        <div class="flex gap-2">
                            <span class="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Live Data</span>
                        </div>
                    </div>
                    <div class="h-64 flex items-end gap-2 px-2">
                        ${monthlySales.map(val => {
                            const h = (val / maxMonthlySale) * 100;
                            return `
                                <div class="flex-1 bg-indigo-100 rounded-t-lg relative group transition-all hover:bg-indigo-600" style="height: ${Math.max(h, 5)}%">
                                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">$${val.toFixed(0)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="flex justify-between mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        ${Array(6).fill(0).map((_, i) => {
                            const d = new Date(now.getFullYear(), now.getMonth() - (11 - i * 2), 1);
                            return `<span>${d.toLocaleString('default', { month: 'short' })}</span>`;
                        }).join('')}
                    </div>
                </div>

                <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                    <h3 class="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
                    <div class="space-y-6">
                        ${store.sales.slice(-5).reverse().map(sale => `
                            <div class="flex gap-4">
                                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                    ${ICONS.sales}
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-gray-900">New Sale: $${sale.total}</p>
                                    <p class="text-xs text-gray-500">Invoice #${sale.id.substr(0, 6)}</p>
                                    <p class="text-[10px] text-gray-400 mt-1">${new Date(sale.date).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        `).join('')}
                        ${store.sales.length === 0 ? '<p class="text-center py-8 text-gray-400 text-sm">No recent activity</p>' : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStatCard(label: string, value: any, color: string, icon: string) {
    const colors: any = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-orange-50 text-orange-600'
    };
    return `
        <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
            <div class="w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                ${icon}
            </div>
            <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">${label}</p>
            <p class="text-2xl font-black text-gray-900 mt-1">${value}</p>
        </div>
    `;
}

function renderInventory() {
    let filtered = store.products.filter(p => p.mode === store.mode);
    
    if (store.inventorySearch) {
        const search = store.inventorySearch.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) || 
            p.sku.toLowerCase().includes(search) ||
            p.category.toLowerCase().includes(search)
        );
    }

    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Inventory Management</h2>
                    <p class="text-gray-500 font-medium">${filtered.length} products in ${store.mode.toLowerCase()} catalog</p>
                </div>
                <button id="add-product-btn" class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                    ${ICONS.plus}
                    <span>Add Product</span>
                </button>
            </div>

            <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
                    <div class="relative flex-1 max-w-md">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">${ICONS.search}</span>
                        <input type="text" id="inventory-search" value="${store.inventorySearch}" placeholder="Filter by Name, SKU or Category..." class="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    </div>
                    <div class="flex gap-2">
                        <button class="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all">${ICONS.reports}</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th class="px-8 py-4">Product / SKU</th>
                                <th class="px-8 py-4">Category</th>
                                <th class="px-8 py-4">Stock</th>
                                <th class="px-8 py-4">Cost / Price</th>
                                ${store.mode === 'PHARMACY' ? '<th class="px-8 py-4">Expiry</th>' : ''}
                                ${store.mode === 'RETAIL' ? '<th class="px-8 py-4">Variants</th>' : ''}
                                <th class="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${filtered.map(p => `
                                <tr class="hover:bg-gray-50/50 transition-colors group">
                                    <td class="px-8 py-5">
                                        <p class="font-bold text-gray-900">${p.name}</p>
                                        <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">${p.sku}</p>
                                    </td>
                                    <td class="px-8 py-5">
                                        <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase">${p.category}</span>
                                    </td>
                                    <td class="px-8 py-5">
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold ${p.quantity < 10 ? 'text-red-600' : 'text-gray-900'}">${p.quantity}</span>
                                            ${p.quantity < 10 ? '<span class="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Low</span>' : ''}
                                        </div>
                                    </td>
                                    <td class="px-8 py-5">
                                        <p class="text-xs text-gray-400 font-bold">$${p.cost} <span class="text-gray-200">/</span> <span class="text-gray-900">$${p.price}</span></p>
                                    </td>
                                    ${store.mode === 'PHARMACY' ? `<td class="px-8 py-5 text-xs font-bold text-gray-600">${p.expiryDate || '-'}</td>` : ''}
                                    ${store.mode === 'RETAIL' ? `<td class="px-8 py-5 text-xs font-bold text-gray-600">${p.size || '-'}/${p.color || '-'}</td>` : ''}
                                    <td class="px-8 py-5 text-right">
                                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button data-id="${p.id}" class="edit-product-btn p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">Edit</button>
                                            <button data-id="${p.id}" class="delete-product-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderSales() {
    let filteredProducts = store.products.filter(p => p.mode === store.mode);
    if (store.salesSearch) {
        const search = store.salesSearch.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(search) || 
            p.sku.toLowerCase().includes(search)
        );
    }

    const cartItems = store.cart.map(item => {
        const product = store.products.find(p => p.id === item.productId)!;
        return { ...item, product };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    return `
        <div class="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Sales & POS</h2>
                    <p class="text-gray-500 font-medium">Process orders and generate invoices</p>
                </div>
            </div>

            <div class="flex-1 flex gap-8 min-h-0">
                <div class="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <div class="p-6 border-b border-gray-100 flex items-center gap-4">
                        <div class="relative flex-1">
                            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">${ICONS.search}</span>
                            <input type="text" id="pos-search" value="${store.salesSearch}" placeholder="Search products to add..." class="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        ${filteredProducts.map(p => `
                            <button data-id="${p.id}" class="pos-add-to-cart p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left group active:scale-95">
                                <p class="font-bold text-gray-900 group-hover:text-indigo-700">${p.name}</p>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">${p.sku}</p>
                                <div class="flex items-center justify-between mt-4">
                                    <p class="text-lg font-black text-gray-900">$${p.price}</p>
                                    <p class="text-[10px] font-bold ${p.quantity < 10 ? 'text-red-500' : 'text-gray-400'}">${p.quantity} in stock</p>
                                </div>
                            </button>
                        `).join('')}
                        ${filteredProducts.length === 0 ? '<div class="col-span-full text-center py-12 text-gray-400">No products found</div>' : ''}
                    </div>
                </div>

                <div class="w-96 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="font-bold text-gray-900">Current Order</h3>
                        <span class="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase">${cartItems.length} Items</span>
                    </div>
                    <div class="p-6 border-b border-gray-50">
                        <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Customer</label>
                        <select id="pos-customer-select" class="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                            ${store.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 space-y-4">
                        ${cartItems.length === 0 ? `
                            <div class="text-center py-12 text-gray-400">
                                <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    ${ICONS.sales}
                                </div>
                                <p class="text-sm font-bold">Cart is empty</p>
                                <p class="text-xs">Add products to start a sale</p>
                            </div>
                        ` : cartItems.map(item => `
                            <div class="flex gap-3 group">
                                <div class="flex-1">
                                    <p class="text-sm font-bold text-gray-900">${item.product.name}</p>
                                    <p class="text-[10px] font-bold text-gray-400">$${item.product.price} x ${item.quantity}</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="flex items-center bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                        <button data-id="${item.productId}" class="pos-qty-minus p-1 hover:bg-gray-100 text-gray-500 transition-all">-</button>
                                        <span class="px-2 text-xs font-bold text-gray-900 min-w-[24px] text-center">${item.quantity}</span>
                                        <button data-id="${item.productId}" class="pos-qty-plus p-1 hover:bg-gray-100 text-gray-500 transition-all">+</button>
                                    </div>
                                    <button data-id="${item.productId}" class="pos-remove-item p-1 text-gray-300 hover:text-red-500 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                        <div class="space-y-2">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Subtotal</span>
                                <span class="font-bold text-gray-900">$${subtotal.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Tax (5%)</span>
                                <span class="font-bold text-gray-900">$${tax.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between text-lg pt-2 border-t border-gray-200">
                                <span class="font-black text-gray-900">Total</span>
                                <span class="font-black text-indigo-600">$${total.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button id="pos-checkout-due" class="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50" ${cartItems.length === 0 ? 'disabled' : ''}>
                                Mark Due
                            </button>
                            <button id="pos-checkout-paid" class="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50" ${cartItems.length === 0 ? 'disabled' : ''}>
                                Checkout Paid
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Placeholder for other views
function renderPurchase() {
    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Procurement & Purchase</h2>
                    <p class="text-gray-500 font-medium">Manage stock replenishment and supplier orders</p>
                </div>
                <button id="add-purchase-btn" class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                    ${ICONS.plus}
                    <span>New Purchase Order</span>
                </button>
            </div>

            <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-6 border-b border-gray-100">
                    <h3 class="font-bold text-gray-900">Purchase History</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th class="px-8 py-4">Order ID</th>
                                <th class="px-8 py-4">Date</th>
                                <th class="px-8 py-4">Supplier</th>
                                <th class="px-8 py-4">Items</th>
                                <th class="px-8 py-4">Total Amount</th>
                                <th class="px-8 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${store.purchases.map(p => {
                                const supplier = store.suppliers.find(s => s.id === p.supplierId);
                                return `
                                    <tr class="hover:bg-gray-50/50 transition-colors">
                                        <td class="px-8 py-5 font-bold text-indigo-600 uppercase text-xs">#${p.id.substr(0, 6)}</td>
                                        <td class="px-8 py-5 text-sm text-gray-600">${new Date(p.date).toLocaleDateString()}</td>
                                        <td class="px-8 py-5 font-bold text-gray-900">${supplier?.name || 'Unknown'}</td>
                                        <td class="px-8 py-5 text-sm text-gray-600">${p.items.length} items</td>
                                        <td class="px-8 py-5 font-black text-gray-900">$${p.total.toFixed(2)}</td>
                                        <td class="px-8 py-5">
                                            <span class="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">${p.status}</span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${store.purchases.length === 0 ? '<tr><td colspan="6" class="px-8 py-12 text-center text-gray-400">No purchase history found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderSuppliers() {
    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Supplier Management</h2>
                    <p class="text-gray-500 font-medium">${store.suppliers.length} active business partners</p>
                </div>
                <button id="add-supplier-btn" class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                    ${ICONS.plus}
                    <span>Add Supplier</span>
                </button>
            </div>

            <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th class="px-8 py-4">Supplier Name</th>
                                <th class="px-8 py-4">Category</th>
                                <th class="px-8 py-4">Contact Info</th>
                                <th class="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${store.suppliers.map(s => `
                                <tr class="hover:bg-gray-50/50 transition-colors group">
                                    <td class="px-8 py-5">
                                        <p class="font-bold text-gray-900">${s.name}</p>
                                        <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">ID: ${s.id}</p>
                                    </td>
                                    <td class="px-8 py-5">
                                        <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase">${s.category}</span>
                                    </td>
                                    <td class="px-8 py-5 text-sm text-gray-600">${s.contact}</td>
                                    <td class="px-8 py-5 text-right">
                                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button data-id="${s.id}" class="edit-supplier-btn p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">Edit</button>
                                            <button data-id="${s.id}" class="delete-supplier-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            ${store.suppliers.length === 0 ? '<tr><td colspan="4" class="px-8 py-12 text-center text-gray-400">No suppliers found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderPurchaseForm() {
    const suppliers = store.suppliers;
    const products = store.products.filter(p => p.mode === store.mode);

    return `
        <form id="purchase-form" class="space-y-6">
            <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Select Supplier</label>
                <select name="supplierId" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Choose a supplier...</option>
                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
            </div>

            <div class="space-y-4">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Order Items</label>
                <div id="purchase-items-container" class="space-y-4">
                    <div class="grid grid-cols-12 gap-4 items-end">
                        <div class="col-span-6 space-y-1">
                            <label class="text-[10px] font-bold text-gray-400">Product</label>
                            <select name="productId[]" required class="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                <option value="">Select product...</option>
                                ${products.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-span-3 space-y-1">
                            <label class="text-[10px] font-bold text-gray-400">Qty</label>
                            <input type="number" name="quantity[]" required min="1" class="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                        </div>
                        <div class="col-span-3 space-y-1">
                            <label class="text-[10px] font-bold text-gray-400">Unit Cost ($)</label>
                            <input type="number" name="cost[]" required step="0.01" class="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                        </div>
                    </div>
                </div>
                <button type="button" id="add-item-row" class="text-xs font-bold text-indigo-600 hover:text-indigo-700">+ Add another item</button>
            </div>

            <div class="pt-6 flex gap-4">
                <button type="button" class="cancel-modal-btn flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" class="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Complete Purchase</button>
            </div>
        </form>
    `;
}

function renderSupplierForm(supplier?: Supplier) {
    return `
        <form id="supplier-form" class="space-y-6">
            ${supplier ? `<input type="hidden" name="id" value="${supplier.id}">` : ''}
            <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Supplier Name</label>
                <input type="text" name="name" value="${supplier?.name || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Contact (Email/Phone)</label>
                <input type="text" name="contact" value="${supplier?.contact || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                <input type="text" name="category" value="${supplier?.category || ''}" required placeholder="e.g. Beverages, Electronics..." class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div class="pt-6 flex gap-4">
                <button type="button" class="cancel-modal-btn flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" class="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                    ${supplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
            </div>
        </form>
    `;
}

function renderCustomerForm(customer?: Customer) {
    return `
        <form id="customer-form" class="space-y-6">
            ${customer ? `<input type="hidden" name="id" value="${customer.id}">` : ''}
            <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                <input type="text" name="name" value="${customer?.name || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                <input type="email" name="email" value="${customer?.email || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                <input type="text" name="phone" value="${customer?.phone || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div class="pt-6 flex gap-4">
                <button type="button" class="cancel-modal-btn flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" class="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                    ${customer ? 'Update Customer' : 'Save Customer'}
                </button>
            </div>
        </form>
    `;
}
function renderCRM() {
    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Customer Management</h2>
                    <p class="text-gray-500 font-medium">${store.customers.length} registered customers</p>
                </div>
                <button id="add-customer-btn" class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                    ${ICONS.plus}
                    <span>Add Customer</span>
                </button>
            </div>

            <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th class="px-8 py-4">Customer Name</th>
                                <th class="px-8 py-4">Contact Details</th>
                                <th class="px-8 py-4">Outstanding Balance</th>
                                <th class="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${store.customers.map(c => `
                                <tr class="hover:bg-gray-50/50 transition-colors group">
                                    <td class="px-8 py-5">
                                        <p class="font-bold text-gray-900">${c.name}</p>
                                        <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">ID: ${c.id}</p>
                                    </td>
                                    <td class="px-8 py-5">
                                        <p class="text-sm text-gray-900 font-medium">${c.email}</p>
                                        <p class="text-xs text-gray-400">${c.phone}</p>
                                    </td>
                                    <td class="px-8 py-5 font-black ${c.balance > 0 ? 'text-red-600' : 'text-emerald-600'}">$${c.balance.toFixed(2)}</td>
                                    <td class="px-8 py-5 text-right">
                                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button data-id="${c.id}" class="edit-customer-btn p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">Edit</button>
                                            <button data-id="${c.id}" class="delete-customer-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            ${store.customers.length === 0 ? '<tr><td colspan="4" class="px-8 py-12 text-center text-gray-400">No customers found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
function renderAccounting() {
    const totalIncome = store.sales.reduce((sum, s) => sum + s.total, 0);
    const totalExpenses = store.purchases.reduce((sum, p) => sum + p.total, 0);
    const netProfit = totalIncome - totalExpenses;
    const cashBalance = totalIncome - totalExpenses; // Simplified cash flow

    // Combine sales and purchases into a single transaction ledger
    const transactions = [
        ...store.sales.map(s => ({
            id: s.id,
            date: s.date,
            type: 'INCOME',
            category: 'Sale',
            amount: s.total,
            status: s.status,
            ref: `INV-${s.id.substr(0, 6).toUpperCase()}`
        })),
        ...store.purchases.map(p => ({
            id: p.id,
            date: p.date,
            type: 'EXPENSE',
            category: 'Purchase',
            amount: p.total,
            status: 'PAID',
            ref: `PO-${p.id.substr(0, 6).toUpperCase()}`
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Accounting & Finance</h2>
                    <p class="text-gray-500 font-medium">Real-time financial ledger and cash flow tracking</p>
                </div>
                <div class="flex gap-3">
                    <button data-view="reports" class="nav-link px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-95">View Reports</button>
                    <button data-view="sales" class="nav-link px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">New Sale</button>
                </div>
            </div>

            <!-- Financial Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">${ICONS.sales}</div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Income (Sales)</p>
                    <h3 class="text-3xl font-black text-gray-900">$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    <p class="mt-4 text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <span>↑ 8.4%</span>
                        <span class="text-gray-400 font-medium">from last period</span>
                    </p>
                </div>
                <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">${ICONS.purchase}</div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Expenses (Purchases)</p>
                    <h3 class="text-3xl font-black text-gray-900">$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    <p class="mt-4 text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <span>${store.purchases.length} Transactions</span>
                    </p>
                </div>
                <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group ${netProfit >= 0 ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">${ICONS.accounting}</div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Net Profit / Loss</p>
                    <h3 class="text-3xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}">$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    <p class="mt-4 text-xs font-bold text-gray-500">Current operating margin</p>
                </div>
            </div>

            <!-- Transaction Ledger -->
            <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="font-bold text-gray-900">General Ledger</h3>
                    <div class="flex gap-2">
                        <button class="px-3 py-1.5 bg-gray-50 text-gray-600 text-[10px] font-black rounded-lg uppercase hover:bg-gray-100 transition-all">All</button>
                        <button class="px-3 py-1.5 text-gray-400 text-[10px] font-black rounded-lg uppercase hover:bg-gray-50 transition-all">Income</button>
                        <button class="px-3 py-1.5 text-gray-400 text-[10px] font-black rounded-lg uppercase hover:bg-gray-50 transition-all">Expenses</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th class="px-8 py-4">Date</th>
                                <th class="px-8 py-4">Reference</th>
                                <th class="px-8 py-4">Category</th>
                                <th class="px-8 py-4">Type</th>
                                <th class="px-8 py-4">Amount</th>
                                <th class="px-8 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${transactions.map(t => `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-8 py-5 text-sm text-gray-600">${new Date(t.date).toLocaleDateString()}</td>
                                    <td class="px-8 py-5 font-bold text-gray-900">${t.ref}</td>
                                    <td class="px-8 py-5 text-sm text-gray-500">${t.category}</td>
                                    <td class="px-8 py-5">
                                        <span class="px-2 py-1 ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'} text-[10px] font-black rounded-lg uppercase">${t.type}</span>
                                    </td>
                                    <td class="px-8 py-5 font-black ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-gray-900'}">
                                        ${t.type === 'INCOME' ? '+' : '-'}$${t.amount.toFixed(2)}
                                    </td>
                                    <td class="px-8 py-5">
                                        <span class="px-2 py-1 ${t.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'} text-[10px] font-black rounded-lg uppercase">${t.status}</span>
                                    </td>
                                </tr>
                            `).join('')}
                            ${transactions.length === 0 ? '<tr><td colspan="6" class="px-8 py-12 text-center text-gray-400">No transactions recorded</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
function renderReports() {
    const totalSales = store.sales.reduce((sum, s) => sum + s.total, 0);
    const totalPurchases = store.purchases.reduce((sum, p) => sum + p.total, 0);
    const profit = totalSales - totalPurchases;
    const inventoryValue = store.products.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    const lowStockItems = store.products.filter(p => p.quantity < 10);

    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Reports & Analytics</h2>
                    <p class="text-gray-500 font-medium">Financial summary and inventory health</p>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
                    <h3 class="text-2xl font-black text-gray-900">$${totalSales.toFixed(2)}</h3>
                    <div class="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                        <span>↑ 12%</span>
                        <span class="text-gray-400 font-medium">vs last month</span>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Purchases</p>
                    <h3 class="text-2xl font-black text-gray-900">$${totalPurchases.toFixed(2)}</h3>
                    <div class="mt-4 flex items-center gap-2 text-indigo-600 text-xs font-bold">
                        <span>${store.purchases.length} Orders</span>
                        <span class="text-gray-400 font-medium">processed</span>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Profit</p>
                    <h3 class="text-2xl font-black ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}">$${profit.toFixed(2)}</h3>
                    <div class="mt-4 flex items-center gap-2 text-gray-400 text-xs font-medium">
                        <span>Sales - Purchases</span>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inventory Value</p>
                    <h3 class="text-2xl font-black text-indigo-600">$${inventoryValue.toFixed(2)}</h3>
                    <div class="mt-4 flex items-center gap-2 text-gray-400 text-xs font-medium">
                        <span>Asset valuation</span>
                    </div>
                </div>
            </div>

            <!-- Detailed Tables -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <!-- Low Stock Report -->
                <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="font-bold text-gray-900">Low Stock Report</h3>
                        <span class="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-lg uppercase">${lowStockItems.length} Items</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th class="px-6 py-4">Product</th>
                                    <th class="px-6 py-4">Stock</th>
                                    <th class="px-6 py-4">Value</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${lowStockItems.map(p => `
                                    <tr>
                                        <td class="px-6 py-4">
                                            <p class="font-bold text-gray-900 text-sm">${p.name}</p>
                                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${p.sku}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <span class="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg">${p.quantity}</span>
                                        </td>
                                        <td class="px-6 py-4 font-bold text-gray-900 text-sm">$${(p.cost * p.quantity).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                ${lowStockItems.length === 0 ? '<tr><td colspan="3" class="px-6 py-12 text-center text-gray-400">No low stock items</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Recent Sales Summary -->
                <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="font-bold text-gray-900">Recent Sales Performance</h3>
                        <button data-view="sales" class="nav-link text-xs font-bold text-indigo-600 hover:underline">View All</button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th class="px-6 py-4">Invoice</th>
                                    <th class="px-6 py-4">Amount</th>
                                    <th class="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${store.sales.slice(-5).reverse().map(s => `
                                    <tr>
                                        <td class="px-6 py-4">
                                            <p class="font-bold text-gray-900 text-sm">#${s.id.substr(0, 6)}</p>
                                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${new Date(s.date).toLocaleDateString()}</p>
                                        </td>
                                        <td class="px-6 py-4 font-bold text-gray-900 text-sm">$${s.total.toFixed(2)}</td>
                                        <td class="px-6 py-4">
                                            <span class="px-2 py-1 ${s.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'} text-[10px] font-black rounded-lg uppercase">${s.status}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${store.sales.length === 0 ? '<tr><td colspan="3" class="px-6 py-12 text-center text-gray-400">No sales recorded</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}
function isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
}

function renderAlerts() {
    const lowStock = store.products.filter(p => p.quantity < 10);
    const expiring = store.products.filter(p => p.expiryDate && isExpiringSoon(p.expiryDate));
    const duePayments = store.sales.filter(s => s.status === 'DUE');
    const totalAlerts = lowStock.length + expiring.length + duePayments.length;

    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Alerts & Notifications</h2>
                    <p class="text-gray-500 font-medium">${totalAlerts} critical items require your attention</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Low Stock Alerts -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="font-bold text-gray-900 flex items-center gap-2">
                            <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                            Low Stock Items
                        </h3>
                        <span class="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-lg uppercase">${lowStock.length}</span>
                    </div>
                    <div class="space-y-3">
                        ${lowStock.map(p => `
                            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-red-200 transition-all group">
                                <div class="flex justify-between items-start mb-2">
                                    <p class="font-bold text-gray-900 group-hover:text-red-600 transition-colors">${p.name}</p>
                                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${p.sku}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <p class="text-sm text-gray-500 font-medium">Current Stock: <span class="text-red-600 font-bold">${p.quantity}</span></p>
                                    <button data-view="inventory" class="nav-link text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Restock</button>
                                </div>
                            </div>
                        `).join('')}
                        ${lowStock.length === 0 ? '<div class="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-sm">No low stock items</div>' : ''}
                    </div>
                </div>

                <!-- Expiry Alerts -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="font-bold text-gray-900 flex items-center gap-2">
                            <span class="w-2 h-2 bg-orange-500 rounded-full"></span>
                            Expiring Soon
                        </h3>
                        <span class="px-2 py-1 bg-orange-50 text-orange-600 text-[10px] font-black rounded-lg uppercase">${expiring.length}</span>
                    </div>
                    <div class="space-y-3">
                        ${expiring.map(p => {
                            const expiry = new Date(p.expiryDate!);
                            const diff = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return `
                                <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 transition-all group">
                                    <div class="flex justify-between items-start mb-2">
                                        <p class="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">${p.name}</p>
                                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${p.sku}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <p class="text-sm text-gray-500 font-medium">Expires in: <span class="text-orange-600 font-bold">${diff} days</span></p>
                                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${p.expiryDate}</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${expiring.length === 0 ? '<div class="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-sm">No items expiring soon</div>' : ''}
                    </div>
                </div>

                <!-- Due Payment Alerts -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="font-bold text-gray-900 flex items-center gap-2">
                            <span class="w-2 h-2 bg-indigo-500 rounded-full"></span>
                            Pending Payments
                        </h3>
                        <span class="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase">${duePayments.length}</span>
                    </div>
                    <div class="space-y-3">
                        ${duePayments.map(s => {
                            const customer = store.customers.find(c => c.id === s.customerId);
                            return `
                                <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all group">
                                    <div class="flex justify-between items-start mb-2">
                                        <p class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">${customer?.name || 'Walk-in Customer'}</p>
                                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">#${s.id.substr(0, 6)}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <p class="text-sm text-gray-500 font-medium">Amount Due: <span class="text-indigo-600 font-bold">$${s.total.toFixed(2)}</span></p>
                                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${new Date(s.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${duePayments.length === 0 ? '<div class="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-sm">No pending payments</div>' : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- Event Handlers ---

function attachGlobalEvents() {
    // We use event delegation on document.body to handle most interactions
    // This avoids duplicate listeners when re-rendering parts of the UI
    if ((window as any).eventsAttached) return;
    (window as any).eventsAttached = true;

    document.body.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        
        if (target.id === 'global-search') {
            const query = target.value.toLowerCase().trim();
            const resultsContainer = document.getElementById('search-results');
            if (!resultsContainer) return;

            if (query.length < 2) {
                resultsContainer.classList.add('hidden');
                return;
            }

            const products = store.products.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)).slice(0, 5);
            const customers = store.customers.filter(c => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)).slice(0, 5);
            const sales = store.sales.filter(s => s.id.toLowerCase().includes(query)).slice(0, 5);

            if (products.length === 0 && customers.length === 0 && sales.length === 0) {
                resultsContainer.innerHTML = `<div class="p-8 text-center text-gray-400 text-sm">No results found for "${query}"</div>`;
            } else {
                resultsContainer.innerHTML = `
                    <div class="p-2 space-y-4">
                        ${products.length > 0 ? `
                            <div>
                                <p class="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Products</p>
                                ${products.map(p => `
                                    <button data-view="inventory" class="nav-link w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-xl transition-all text-left">
                                        <div>
                                            <p class="font-bold text-gray-900 text-sm">${p.name}</p>
                                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${p.sku}</p>
                                        </div>
                                        <span class="text-xs font-bold text-indigo-600">$${p.price.toFixed(2)}</span>
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${customers.length > 0 ? `
                            <div>
                                <p class="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customers</p>
                                ${customers.map(c => `
                                    <button data-view="crm" class="nav-link w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-xl transition-all text-left">
                                        <div>
                                            <p class="font-bold text-gray-900 text-sm">${c.name}</p>
                                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${c.email}</p>
                                        </div>
                                        <span class="text-[10px] font-black ${c.balance > 0 ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-widest">$${c.balance.toFixed(2)}</span>
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${sales.length > 0 ? `
                            <div>
                                <p class="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoices</p>
                                ${sales.map(s => `
                                    <button data-view="sales" class="nav-link w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-xl transition-all text-left">
                                        <div>
                                            <p class="font-bold text-gray-900 text-sm">#${s.id.substr(0, 8).toUpperCase()}</p>
                                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${new Date(s.date).toLocaleDateString()}</p>
                                        </div>
                                        <span class="text-xs font-bold text-gray-900">$${s.total.toFixed(2)}</span>
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            resultsContainer.classList.remove('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        const resultsContainer = document.getElementById('search-results');
        const searchInput = document.getElementById('global-search');
        if (resultsContainer && searchInput && !resultsContainer.contains(e.target as Node) && e.target !== searchInput) {
            resultsContainer.classList.add('hidden');
        }
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Navigation
        const navLink = target.closest('.nav-link') as HTMLElement;
        if (navLink) {
            const view = navLink.dataset.view as View;
            store.currentView = view;
            store.save();
            renderApp();
            return;
        }

        // Add Product Button
        const addProductBtn = target.closest('#add-product-btn');
        if (addProductBtn) {
            showModal('Add New Product', renderProductForm());
            return;
        }

        // Delete Product
        const deleteBtn = target.closest('.delete-product-btn') as HTMLElement;
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (id && confirm('Are you sure you want to delete this product?')) {
                store.deleteProduct(id);
                renderApp();
            }
            return;
        }

        // Edit Product
        const editBtn = target.closest('.edit-product-btn') as HTMLElement;
        if (editBtn) {
            const id = editBtn.dataset.id;
            const product = store.products.find(p => p.id === id);
            if (product) {
                showModal('Edit Product', renderProductForm(product));
            }
            return;
        }

        // POS: Add to Cart
        const posAddBtn = target.closest('.pos-add-to-cart') as HTMLElement;
        if (posAddBtn) {
            const id = posAddBtn.dataset.id;
            if (id) store.addToCart(id);
            return;
        }

        // POS: Remove Item
        const posRemoveBtn = target.closest('.pos-remove-item') as HTMLElement;
        if (posRemoveBtn) {
            const id = posRemoveBtn.dataset.id;
            if (id) store.removeFromCart(id);
            return;
        }

        // POS: Qty Minus
        const posMinusBtn = target.closest('.pos-qty-minus') as HTMLElement;
        if (posMinusBtn) {
            const id = posMinusBtn.dataset.id;
            if (id) {
                const item = store.cart.find(i => i.productId === id);
                if (item) store.updateCartQuantity(id, item.quantity - 1);
            }
            return;
        }

        // POS: Qty Plus
        const posPlusBtn = target.closest('.pos-qty-plus') as HTMLElement;
        if (posPlusBtn) {
            const id = posPlusBtn.dataset.id;
            if (id) {
                const item = store.cart.find(i => i.productId === id);
                if (item) store.updateCartQuantity(id, item.quantity + 1);
            }
            return;
        }

        // POS: Checkout
        const checkoutPaidBtn = target.closest('#pos-checkout-paid');
        if (checkoutPaidBtn) {
            const customerId = (document.getElementById('pos-customer-select') as HTMLSelectElement)?.value || 'C1';
            store.processSale(customerId, 'PAID');
            return;
        }

        const checkoutDueBtn = target.closest('#pos-checkout-due');
        if (checkoutDueBtn) {
            const customerId = (document.getElementById('pos-customer-select') as HTMLSelectElement)?.value || 'C1';
            store.processSale(customerId, 'DUE');
            return;
        }

        // Purchase: New Purchase Order
        const addPurchaseBtn = target.closest('#add-purchase-btn');
        if (addPurchaseBtn) {
            showModal('New Purchase Order', renderPurchaseForm());
            return;
        }

        // Supplier: Add Supplier
        const addSupplierBtn = target.closest('#add-supplier-btn');
        if (addSupplierBtn) {
            showModal('Add New Supplier', renderSupplierForm());
            return;
        }

        // Supplier: Edit Supplier
        const editSupplierBtn = target.closest('.edit-supplier-btn') as HTMLElement;
        if (editSupplierBtn) {
            const id = editSupplierBtn.dataset.id;
            const supplier = store.suppliers.find(s => s.id === id);
            if (supplier) {
                showModal('Edit Supplier', renderSupplierForm(supplier));
            }
            return;
        }

        // Supplier: Delete Supplier
        const deleteSupplierBtn = target.closest('.delete-supplier-btn') as HTMLElement;
        if (deleteSupplierBtn) {
            const id = deleteSupplierBtn.dataset.id;
            if (id && confirm('Are you sure you want to delete this supplier?')) {
                store.deleteSupplier(id);
            }
            return;
        }

        // Customer: Add Customer
        const addCustomerBtn = target.closest('#add-customer-btn');
        if (addCustomerBtn) {
            showModal('Add New Customer', renderCustomerForm());
            return;
        }

        // Customer: Edit Customer
        const editCustomerBtn = target.closest('.edit-customer-btn') as HTMLElement;
        if (editCustomerBtn) {
            const id = editCustomerBtn.dataset.id;
            const customer = store.customers.find(c => c.id === id);
            if (customer) {
                showModal('Edit Customer', renderCustomerForm(customer));
            }
            return;
        }

        // Customer: Delete Customer
        const deleteCustomerBtn = target.closest('.delete-customer-btn') as HTMLElement;
        if (deleteCustomerBtn) {
            const id = deleteCustomerBtn.dataset.id;
            if (id && confirm('Are you sure you want to delete this customer?')) {
                store.deleteCustomer(id);
            }
            return;
        }

        // Purchase Form: Add Row
        const addItemRowBtn = target.closest('#add-item-row');
        if (addItemRowBtn) {
            const container = document.getElementById('purchase-items-container');
            if (container) {
                const products = store.products.filter(p => p.mode === store.mode);
                const newRow = document.createElement('div');
                newRow.className = 'grid grid-cols-12 gap-4 items-end';
                newRow.innerHTML = `
                    <div class="col-span-6 space-y-1">
                        <select name="productId[]" required class="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                            <option value="">Select product...</option>
                            ${products.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-span-3 space-y-1">
                        <input type="number" name="quantity[]" required min="1" class="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    </div>
                    <div class="col-span-3 space-y-1">
                        <input type="number" name="cost[]" required step="0.01" class="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    </div>
                `;
                container.appendChild(newRow);
            }
            return;
        }

        // Close Modal
        const closeModalBtn = target.closest('#close-modal') || target.closest('.cancel-modal-btn');
        if (closeModalBtn) {
            hideModal();
            return;
        }
    });

    document.body.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;

        // Mode Selector
        if (target.id === 'mode-selector') {
            store.mode = (target as HTMLSelectElement).value as IndustryMode;
            store.save();
            renderApp();
            store.notify(`Switched to ${store.mode.toLowerCase()} mode`);
        }
    });

    document.body.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;

        // Inventory Search
        if (target.id === 'inventory-search') {
            store.inventorySearch = (target as HTMLInputElement).value;
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = renderView();
            }
        }

        // POS Search
        if (target.id === 'pos-search') {
            store.salesSearch = (target as HTMLInputElement).value;
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = renderView();
            }
        }
    });

    document.body.addEventListener('submit', (e) => {
        const target = e.target as HTMLElement;
        const id = target.getAttribute('id');
        // Use getAttribute to avoid DOM clobbering issues with form.id
        if (id === 'product-form') {
            handleProductSubmit(e);
        } else if (id === 'purchase-form') {
            handlePurchaseSubmit(e);
        } else if (id === 'supplier-form') {
            handleSupplierSubmit(e);
        }
    });
}

function renderNotifications() {
    const container = document.getElementById('notification-container');
    if (!container) return;

    container.innerHTML = store.notifications.map(n => `
        <div class="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 ${
            n.type === 'success' ? 'bg-gray-900 text-white' : 
            n.type === 'error' ? 'bg-red-600 text-white' : 
            'bg-orange-500 text-white'
        }">
            <span class="font-bold text-sm">${n.message}</span>
        </div>
    `).join('');
}

function showModal(title: string, content: string) {
    const container = document.getElementById('modal-container');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 class="text-xl font-black text-gray-900">${title}</h3>
                <button id="close-modal" class="p-2 hover:bg-gray-100 rounded-xl transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
            </div>
            <div class="p-8">
                ${content}
            </div>
        </div>
    `;
    container.classList.remove('hidden');

    document.getElementById('close-modal')?.addEventListener('click', hideModal);
}

function handleProductSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const id = formData.get('productId')?.toString();
    const name = formData.get('name')?.toString() || '';
    const category = formData.get('category')?.toString() || '';
    const sku = formData.get('sku')?.toString() || '';
    const cost = parseFloat(formData.get('cost')?.toString() || '0');
    const price = parseFloat(formData.get('price')?.toString() || '0');
    const quantity = parseInt(formData.get('quantity')?.toString() || '0');

    if (!name || !category || !sku) {
        store.notify('Please fill in all required fields', 'error');
        return;
    }

    const productData: any = {
        name,
        category,
        sku,
        cost,
        price,
        quantity,
        mode: store.mode
    };

    if (store.mode === 'PHARMACY') {
        productData.expiryDate = formData.get('expiryDate')?.toString();
    }
    if (store.mode === 'RETAIL') {
        productData.size = formData.get('size')?.toString();
        productData.color = formData.get('color')?.toString();
    }

    try {
        if (id && id.trim() !== '') {
            store.updateProduct(id, productData);
        } else {
            store.addProduct(productData);
        }
        hideModal();
        renderApp();
    } catch (error) {
        console.error('Error saving product:', error);
        store.notify('Failed to save product', 'error');
    }
}

function handleSupplierSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const id = formData.get('id')?.toString();

    const supplierData = {
        name: formData.get('name')?.toString() || '',
        contact: formData.get('contact')?.toString() || '',
        category: formData.get('category')?.toString() || ''
    };

    if (id) {
        store.updateSupplier(id, supplierData);
    } else {
        store.addSupplier(supplierData);
    }
    hideModal();
}

function handleCustomerSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const id = formData.get('id')?.toString();

    const customerData = {
        name: formData.get('name')?.toString() || '',
        email: formData.get('email')?.toString() || '',
        phone: formData.get('phone')?.toString() || ''
    };

    if (id) {
        store.updateCustomer(id, customerData);
    } else {
        store.addCustomer(customerData);
    }
    hideModal();
}

function handlePurchaseSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const supplierId = formData.get('supplierId')?.toString() || '';
    const productIds = formData.getAll('productId[]').map(id => id.toString());
    const quantities = formData.getAll('quantity[]').map(q => parseInt(q.toString()));
    const costs = formData.getAll('cost[]').map(c => parseFloat(c.toString()));

    const items = productIds.map((id, index) => ({
        productId: id,
        quantity: quantities[index],
        cost: costs[index]
    })).filter(item => item.productId && item.quantity > 0);

    if (items.length === 0) {
        store.notify('Please add at least one valid item', 'error');
        return;
    }

    const total = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

    store.addPurchase({
        supplierId,
        items,
        total,
        status: 'RECEIVED'
    });

    hideModal();
}

function hideModal() {
    const container = document.getElementById('modal-container');
    if (container) container.classList.add('hidden');
}

function renderProductForm(product?: Product) {
    return `
        <form id="product-form" class="space-y-6">
            <input type="hidden" name="productId" value="${product?.id || ''}">
            <div class="grid grid-cols-2 gap-6">
                <div class="col-span-2 space-y-2">
                    <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Product Name</label>
                    <input type="text" name="name" value="${product?.name || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <input type="text" name="category" value="${product?.category || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-black text-gray-400 uppercase tracking-widest">SKU</label>
                    <input type="text" name="sku" value="${product?.sku || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Cost ($)</label>
                    <input type="number" name="cost" value="${product?.cost || ''}" required step="0.01" class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Price ($)</label>
                    <input type="number" name="price" value="${product?.price || ''}" required step="0.01" class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Initial Stock</label>
                    <input type="number" name="quantity" value="${product?.quantity || ''}" required class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                ${store.mode === 'PHARMACY' ? `
                    <div class="space-y-2">
                        <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Expiry Date</label>
                        <input type="date" name="expiryDate" value="${product?.expiryDate || ''}" class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                ` : ''}
                ${store.mode === 'RETAIL' ? `
                    <div class="space-y-2">
                        <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Size</label>
                        <input type="text" name="size" value="${product?.size || ''}" class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Color</label>
                        <input type="text" name="color" value="${product?.color || ''}" class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                ` : ''}
            </div>
            <div class="pt-6 flex gap-4">
                <button type="button" class="cancel-modal-btn flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" class="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Save Product</button>
            </div>
        </form>
    `;
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});
