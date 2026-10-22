import {
  Product,
  SystemUser,
  Order,
  AuditLog,
  StockAlert,
  DailyDashboardMetrics,
  DaySalesSummary,
  ABCCurveItem,
  CustomerLoyaltyItem,
} from '../../../shared/types/index.ts';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let errMsg = `Erro na requisição (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) errMsg = data.error;
    } catch {
      // Ignora erro de parse
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Usuários
  getUsers: () => request<SystemUser[]>('/api/users'),
  getCurrentUser: () => request<SystemUser>('/api/currentUser'),
  switchUser: (userId: string) =>
    request<SystemUser>('/api/switchUser', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Produtos
  getProducts: (includeInactive: boolean = false) =>
    request<Product[]>(`/api/products?includeInactive=${includeInactive}`),
  createProduct: (data: Partial<Product>) =>
    request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, updates: Partial<Product>) =>
    request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  // ⭐ Exclusão Lógica
  softDeleteProduct: (id: string) =>
    request<{ message: string; product: Product }>(`/api/products/${id}`, {
      method: 'DELETE',
    }),
  restoreProduct: (id: string) =>
    request<{ message: string; product: Product }>(`/api/products/${id}/restore`, {
      method: 'POST',
    }),

  // Estoque
  adjustStock: (id: string, newStock: number, reason?: string) =>
    request<Product>(`/api/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ newStock, reason }),
    }),
  getStockAlerts: () => request<StockAlert[]>('/api/stock/alerts'),

  // Pedidos
  getOrders: () => request<Order[]>('/api/orders'),
  createOrder: (data: {
    customerName: string;
    customerPhone?: string;
    tableOrTakeaway: string;
    consumptionType?: Order['consumptionType'];
    notes?: string;
    paymentMethod: Order['paymentMethod'];
    items: Array<{ productId: string; quantity: number; notes?: string }>;
  }) =>
    request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderStatus: (id: string, status: Order['status']) =>
    request<Order>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Dashboard
  getDashboardData: () =>
    request<{
      metrics: DailyDashboardMetrics;
      last7Days: DaySalesSummary[];
      alerts: StockAlert[];
      recentOrders: Order[];
    }>('/api/dashboard'),

  // Relatórios
  getSalesReport: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    return request<{
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      totalOrders: number;
      averageTicket: number;
      orders: Order[];
      itemsSoldSummary: Array<{
        productId: string;
        productName: string;
        quantity: number;
        totalRevenue: number;
        totalProfit: number;
      }>;
    }>(`/api/reports/sales?${params.toString()}`);
  },
  getABCCurveReport: () =>
    request<{
      items: ABCCurveItem[];
      classASummary: { count: number; revenue: number };
      classBSummary: { count: number; revenue: number };
      classCSummary: { count: number; revenue: number };
      totalRevenue: number;
    }>('/api/reports/abc-curve'),
  getCustomerReport: () =>
    request<CustomerLoyaltyItem[]>('/api/reports/customers'),

  // Auditoria
  getAuditLogs: (type?: string, search?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    return request<AuditLog[]>(`/api/audit-logs?${params.toString()}`);
  },

  resetDemo: () => request<{ message: string }>('/api/reset-demo', { method: 'POST' }),
};
