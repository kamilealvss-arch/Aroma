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

const STORAGE_KEYS = {
  ORDER_STATUS: 'aroma_order_status_overrides_v1',
  CREATED_ORDERS: 'aroma_created_orders_v1',
  CURRENT_USER_ID: 'aroma_current_user_id_v1',
};

interface OrderStatusOverride {
  status: Order['status'];
  updatedAt: string;
  startedPreparingAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

function getOrderStatusOverrides(): Record<string, OrderStatusOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDER_STATUS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOrderStatusOverride(orderId: string, override: OrderStatusOverride): void {
  try {
    const current = getOrderStatusOverrides();
    current[orderId] = override;
    localStorage.setItem(STORAGE_KEYS.ORDER_STATUS, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
}

function getCreatedOrdersLocal(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREATED_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCreatedOrderLocal(order: Order): void {
  try {
    const current = getCreatedOrdersLocal().filter((o) => o.id !== order.id);
    current.unshift(order);
    localStorage.setItem(STORAGE_KEYS.CREATED_ORDERS, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
}

function clearLocalOverrides(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ORDER_STATUS);
    localStorage.removeItem(STORAGE_KEYS.CREATED_ORDERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  } catch {
    // ignore
  }
}

function applyOrderOverrides(serverOrders: Order[]): Order[] {
  const statusOverrides = getOrderStatusOverrides();
  const createdLocal = getCreatedOrdersLocal();

  const mergedMap = new Map<string, Order>();
  for (const ord of serverOrders) {
    mergedMap.set(ord.id, { ...ord });
  }
  for (const localOrd of createdLocal) {
    if (!mergedMap.has(localOrd.id)) {
      mergedMap.set(localOrd.id, { ...localOrd });
    }
  }

  const result: Order[] = [];
  for (const ord of mergedMap.values()) {
    const override = statusOverrides[ord.id];
    if (override) {
      result.push({
        ...ord,
        status: override.status,
        updatedAt: override.updatedAt,
        startedPreparingAt: override.startedPreparingAt ?? ord.startedPreparingAt,
        readyAt: override.readyAt ?? ord.readyAt,
        deliveredAt: override.deliveredAt ?? ord.deliveredAt,
      });
    } else {
      result.push(ord);
    }
  }

  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

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
  getCurrentUser: async () => {
    const user = await request<SystemUser>('/api/currentUser');
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (savedId && savedId !== user.id) {
        const users = await request<SystemUser[]>('/api/users');
        const found = users.find((u) => u.id === savedId);
        if (found) return found;
      }
    } catch {
      // ignore
    }
    return user;
  },
  switchUser: async (userId: string) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    } catch {
      // ignore
    }
    return request<SystemUser>('/api/switchUser', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

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
  getOrders: async () => {
    const serverOrders = await request<Order[]>('/api/orders');
    return applyOrderOverrides(serverOrders);
  },
  createOrder: async (data: {
    customerName: string;
    customerPhone?: string;
    tableOrTakeaway: string;
    consumptionType?: Order['consumptionType'];
    notes?: string;
    paymentMethod: Order['paymentMethod'];
    items: Array<{ productId: string; quantity: number; notes?: string }>;
  }) => {
    const created = await request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    saveCreatedOrderLocal(created);
    return created;
  },
  updateOrderStatus: async (id: string, status: Order['status']) => {
    const now = new Date().toISOString();
    const existingOverrides = getOrderStatusOverrides();
    const prev = existingOverrides[id];

    saveOrderStatusOverride(id, {
      status,
      updatedAt: now,
      startedPreparingAt: status === 'preparando' ? now : prev?.startedPreparingAt,
      readyAt: status === 'pronto' ? now : prev?.readyAt,
      deliveredAt: status === 'entregue' ? now : prev?.deliveredAt,
    });

    try {
      return await request<Order>(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch {
      // Se outra instância serverless não tiver o pedido recém-criado em RAM, mantém o estado local sincronizado
      const all = applyOrderOverrides([]);
      const fallback = all.find((o) => o.id === id);
      if (fallback) return fallback;
      throw new Error('Pedido não encontrado');
    }
  },

  // Dashboard
  getDashboardData: async () => {
    const data = await request<{
      metrics: DailyDashboardMetrics;
      last7Days: DaySalesSummary[];
      alerts: StockAlert[];
      recentOrders: Order[];
    }>('/api/dashboard');
    return {
      ...data,
      recentOrders: applyOrderOverrides(data.recentOrders),
    };
  },

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

  resetDemo: async () => {
    clearLocalOverrides();
    return request<{ message: string }>('/api/reset-demo', { method: 'POST' });
  },
};
