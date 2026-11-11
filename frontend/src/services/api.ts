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
  Ingredient,
} from '../../../shared/types/index.ts';

const STORAGE_KEYS = {
  ORDER_STATUS: 'aroma_order_status_overrides_v1',
  CREATED_ORDERS: 'aroma_created_orders_v1',
  CURRENT_USER_ID: 'aroma_current_user_id_v1',
  CREATED_INGREDIENTS: 'aroma_created_ingredients_v1',
  CREATED_PRODUCTS: 'aroma_created_products_v1',
  PRODUCT_OVERRIDES: 'aroma_product_overrides_v1',
};

function getCreatedProductsLocal(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREATED_PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCreatedProductLocal(product: Product): void {
  try {
    const current = getCreatedProductsLocal().filter((p) => p.id !== product.id);
    current.unshift(product);
    localStorage.setItem(STORAGE_KEYS.CREATED_PRODUCTS, JSON.stringify(current));
  } catch {
    // ignore
  }
}

function getProductOverridesLocal(): Record<string, Partial<Product>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCT_OVERRIDES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProductOverrideLocal(id: string, updates: Partial<Product>): void {
  try {
    const current = getProductOverridesLocal();
    current[id] = { ...(current[id] || {}), ...updates };
    localStorage.setItem(STORAGE_KEYS.PRODUCT_OVERRIDES, JSON.stringify(current));

    const created = getCreatedProductsLocal();
    const idx = created.findIndex((p) => p.id === id);
    if (idx !== -1) {
      created[idx] = { ...created[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.CREATED_PRODUCTS, JSON.stringify(created));
    }
  } catch {
    // ignore
  }
}

function applyProductOverrides(serverProducts: Product[], includeInactive: boolean): Product[] {
  const createdLocal = getCreatedProductsLocal();
  const overrides = getProductOverridesLocal();
  const mergedMap = new Map<string, Product>();

  for (const prod of serverProducts) {
    mergedMap.set(prod.id, { ...prod });
  }
  for (const localProd of createdLocal) {
    if (!mergedMap.has(localProd.id)) {
      mergedMap.set(localProd.id, { ...localProd });
    }
  }

  const result: Product[] = [];
  for (const prod of mergedMap.values()) {
    const ov = overrides[prod.id];
    const finalProd = ov ? { ...prod, ...ov } : prod;
    if (includeInactive || finalProd.status === 'ativo') {
      result.push(finalProd);
    }
  }

  return result;
}

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
    localStorage.removeItem(STORAGE_KEYS.CREATED_INGREDIENTS);
    localStorage.removeItem(STORAGE_KEYS.CREATED_PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCT_OVERRIDES);
  } catch {
    // ignore
  }
}

function getCreatedIngredientsLocal(): Ingredient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREATED_INGREDIENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCreatedIngredientLocal(ingredient: Ingredient): void {
  try {
    const current = getCreatedIngredientsLocal().filter((i) => i.id !== ingredient.id);
    current.unshift(ingredient);
    localStorage.setItem(STORAGE_KEYS.CREATED_INGREDIENTS, JSON.stringify(current));
  } catch {
    // ignore
  }
}

const DEFAULT_ADDON_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing_addon_chantilly',
    name: 'Chantilly Artesanal Gourmet',
    category: 'Adicionais & Complementos',
    currentStock: 12.0,
    unit: 'L',
    minStockThreshold: 4.0,
    costPerUnit: 18.0,
    supplier: 'Doces & Delícias Artesanais',
    isAddonIngredient: true,
    updatedAt: '2026-10-28T10:00:00.000Z',
  },
  {
    id: 'ing_addon_caramelo',
    name: 'Calda de Caramelo Salgado Artesanal',
    category: 'Adicionais & Complementos',
    currentStock: 8.5,
    unit: 'kg',
    minStockThreshold: 3.0,
    costPerUnit: 24.0,
    supplier: 'Caramelo Real Gourmet',
    isAddonIngredient: true,
    updatedAt: '2026-10-28T11:00:00.000Z',
  },
  {
    id: 'ing_addon_gotas_chocolate',
    name: 'Gotas de Chocolate Belga 70%',
    category: 'Adicionais & Complementos',
    currentStock: 6.0,
    unit: 'kg',
    minStockThreshold: 2.5,
    costPerUnit: 65.0,
    supplier: 'Chocolates Callebaut Import',
    isAddonIngredient: true,
    updatedAt: '2026-10-25T14:00:00.000Z',
  },
  {
    id: 'ing_addon_shot_espresso',
    name: 'Dose Extra de Café Especial (Shot)',
    category: 'Adicionais & Complementos',
    currentStock: 15.0,
    unit: 'kg',
    minStockThreshold: 5.0,
    costPerUnit: 72.0,
    supplier: 'Fazenda Santa Maria - Mogiana',
    isAddonIngredient: true,
    updatedAt: '2026-10-28T09:00:00.000Z',
  },
  {
    id: 'ing_addon_leite_sem_lactose',
    name: 'Leite Vegetal / Sem Lactose',
    category: 'Adicionais & Complementos',
    currentStock: 14.0,
    unit: 'L',
    minStockThreshold: 6.0,
    costPerUnit: 16.5,
    supplier: 'Distribuidora PlantPower',
    isAddonIngredient: true,
    updatedAt: '2026-10-27T10:00:00.000Z',
  },
  {
    id: 'ing_addon_canela_po',
    name: 'Canela Especial do Ceilão em Pó',
    category: 'Adicionais & Complementos',
    currentStock: 2.5,
    unit: 'kg',
    minStockThreshold: 1.0,
    costPerUnit: 48.0,
    supplier: 'Especiarias do Oriente',
    isAddonIngredient: true,
    updatedAt: '2026-10-20T16:00:00.000Z',
  },
  {
    id: 'ing_addon_geleia_frutas',
    name: 'Geléia Artesanal de Frutas Vermelhas',
    category: 'Adicionais & Complementos',
    currentStock: 5.0,
    unit: 'kg',
    minStockThreshold: 2.0,
    costPerUnit: 32.0,
    supplier: 'Sítio das Frutas Artesanais',
    isAddonIngredient: true,
    updatedAt: '2026-10-26T12:00:00.000Z',
  },
  {
    id: 'ing_addon_requeijao',
    name: 'Requeijão Cremoso Artesanal (Bisnaga)',
    category: 'Adicionais & Complementos',
    currentStock: 9.0,
    unit: 'kg',
    minStockThreshold: 3.5,
    costPerUnit: 28.0,
    supplier: 'Laticínios Vale Verde',
    isAddonIngredient: true,
    updatedAt: '2026-10-25T14:30:00.000Z',
  },
  {
    id: 'ing_addon_bacon_crocante',
    name: 'Bacon Crocante em Cubos Dourados',
    category: 'Adicionais & Complementos',
    currentStock: 4.0,
    unit: 'kg',
    minStockThreshold: 2.0,
    costPerUnit: 38.0,
    supplier: 'Defumados Artesanais da Serra',
    isAddonIngredient: true,
    updatedAt: '2026-10-24T15:00:00.000Z',
  },
  {
    id: 'ing_addon_brigadeiro',
    name: 'Cobertura Artesanal de Brigadeiro Gourmet',
    category: 'Adicionais & Complementos',
    currentStock: 6.0,
    unit: 'kg',
    minStockThreshold: 2.0,
    costPerUnit: 32.0,
    supplier: 'Doces & Delícias Artesanais',
    isAddonIngredient: true,
    updatedAt: '2026-10-28T10:00:00.000Z',
  },
  {
    id: 'ing_addon_parmesao_ralado',
    name: 'Queijo Parmesão Ralado Especial',
    category: 'Adicionais & Complementos',
    currentStock: 7.0,
    unit: 'kg',
    minStockThreshold: 2.5,
    costPerUnit: 58.0,
    supplier: 'Queijaria Artesanal Mantiqueira',
    isAddonIngredient: true,
    updatedAt: '2026-10-26T16:00:00.000Z',
  },
];

function applyIngredientOverrides(serverIngredients: Ingredient[]): Ingredient[] {
  const local = getCreatedIngredientsLocal();
  const mergedMap = new Map<string, Ingredient>();

  for (const ing of local) {
    mergedMap.set(ing.id, ing);
  }
  for (const ing of serverIngredients) {
    mergedMap.set(ing.id, ing);
  }
  for (const addon of DEFAULT_ADDON_INGREDIENTS) {
    if (!mergedMap.has(addon.id)) {
      mergedMap.set(addon.id, addon);
    }
  }

  return Array.from(mergedMap.values());
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
  getProducts: async (includeInactive: boolean = false) => {
    const serverProducts = await request<Product[]>(`/api/products?includeInactive=true`);
    return applyProductOverrides(serverProducts, includeInactive);
  },
  createProduct: async (data: Partial<Product>) => {
    const created = await request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    saveCreatedProductLocal(created);
    return created;
  },
  updateProduct: async (id: string, updates: Partial<Product>) => {
    try {
      const updated = await request<Product>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      saveProductOverrideLocal(id, updated);
      return updated;
    } catch (err) {
      saveProductOverrideLocal(id, { ...updates, updatedAt: new Date().toISOString() });
      const all = applyProductOverrides([], true);
      const found = all.find((p) => p.id === id);
      if (found) return found;
      throw err;
    }
  },
  // ⭐ Exclusão Lógica
  softDeleteProduct: async (id: string) => {
    saveProductOverrideLocal(id, { status: 'inativo', updatedAt: new Date().toISOString() });
    return request<{ message: string; product: Product }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
  restoreProduct: async (id: string) => {
    saveProductOverrideLocal(id, { status: 'ativo', updatedAt: new Date().toISOString() });
    return request<{ message: string; product: Product }>(`/api/products/${id}/restore`, {
      method: 'POST',
    });
  },

  // Estoque
  adjustStock: async (id: string, newStock: number, reason?: string) => {
    const updated = await request<Product>(`/api/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ newStock, reason }),
    });
    saveProductOverrideLocal(id, { stockQuantity: updated.stockQuantity, updatedAt: updated.updatedAt });
    return updated;
  },
  getStockAlerts: () => request<StockAlert[]>('/api/stock/alerts'),

  // Ingredientes & Insumos
  getIngredients: async () => {
    try {
      const serverIngredients = await request<Ingredient[]>('/api/ingredients');
      return applyIngredientOverrides(serverIngredients);
    } catch {
      return applyIngredientOverrides(getCreatedIngredientsLocal());
    }
  },
  createIngredient: async (data: Omit<Ingredient, 'id' | 'updatedAt'>) => {
    try {
      const created = await request<Ingredient>('/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      saveCreatedIngredientLocal(created);
      return created;
    } catch {
      const fallback: Ingredient = {
        id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: data.name,
        category: data.category,
        unit: data.unit,
        currentStock: Number(data.currentStock) || 0,
        minStockThreshold: Number(data.minStockThreshold) || 0,
        costPerUnit: Number(data.costPerUnit) || 0,
        supplier: data.supplier,
        updatedAt: new Date().toISOString(),
      };
      saveCreatedIngredientLocal(fallback);
      return fallback;
    }
  },
  adjustIngredientStock: async (id: string, newStock: number, reason?: string) => {
    try {
      const res = await request<Ingredient>(`/api/ingredients/${id}/stock`, {
        method: 'POST',
        body: JSON.stringify({ newStock, reason }),
      });
      saveCreatedIngredientLocal(res);
      return res;
    } catch {
      const current = getCreatedIngredientsLocal();
      const target = current.find((i) => i.id === id);
      if (target) {
        target.currentStock = Math.max(0, newStock);
        target.updatedAt = new Date().toISOString();
        saveCreatedIngredientLocal(target);
        return target;
      }
      throw new Error('Insumo não encontrado');
    }
  },

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
    items: Array<{
      productId: string;
      quantity: number;
      notes?: string;
      selectedSize?: string;
      selectedAddons?: string[];
      addons?: Array<{ name: string; price: number }>;
      unitPrice?: number;
    }>;
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
