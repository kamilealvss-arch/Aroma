import type {
  Product,
  ProductStatus,
  StockAlert,
  Order,
  AuditLog,
  AuditActionType,
  SystemUser,
  DailyDashboardMetrics,
  DaySalesSummary,
  ABCCurveItem,
  CustomerLoyaltyItem
} from '../types/index.ts';

/**
 * Formata valor monetário em Real Brasileiro
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Gera um ID único simples
 */
export function generateUniqueId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Cria um registro de auditoria formatado
 */
export function createAuditLog(
  user: SystemUser,
  actionType: AuditActionType,
  targetEntity: 'Produto' | 'Estoque' | 'Pedido' | 'Sistema',
  details: string,
  targetId?: string,
  oldValue?: string | number | null,
  newValue?: string | number | null
): AuditLog {
  return {
    id: generateUniqueId('log'),
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    actionType,
    targetEntity,
    targetId,
    details,
    oldValue: oldValue !== undefined ? oldValue : null,
    newValue: newValue !== undefined ? newValue : null,
  };
}

/**
 * REQUISITO 4 (PONTO DE OURO): Exclusão Lógica
 * Em vez de remover do banco, marca status = 'inativo'.
 * Mantém o produto para integridade de relatórios e histórico de vendas.
 */
export function softDeleteProduct(
  product: Product,
  user: SystemUser
): { updatedProduct: Product; auditLog: AuditLog } {
  const updatedProduct: Product = {
    ...product,
    status: 'inativo',
    updatedAt: new Date().toISOString(),
  };

  const auditLog = createAuditLog(
    user,
    'EXCLUSAO_LOGICA',
    'Produto',
    `Exclusão lógica: Produto "${product.name}" marcado como inativo pelo usuário ${user.name} (${user.role}). O histórico de vendas foi preservado.`,
    product.id,
    'ativo',
    'inativo'
  );

  return { updatedProduct, auditLog };
}

/**
 * Reativação de produto previamente inativado
 */
export function restoreProduct(
  product: Product,
  user: SystemUser
): { updatedProduct: Product; auditLog: AuditLog } {
  const updatedProduct: Product = {
    ...product,
    status: 'ativo',
    updatedAt: new Date().toISOString(),
  };

  const auditLog = createAuditLog(
    user,
    'REATIVACAO_PRODUTO',
    'Produto',
    `Reativação: Produto "${product.name}" reativado no cardápio pelo usuário ${user.name} (${user.role}).`,
    product.id,
    'inativo',
    'ativo'
  );

  return { updatedProduct, auditLog };
}

/**
 * REQUISITO 11: Auditoria de Alteração de Preço
 * Se o preço subir ou descer, registra com detalhes exatos:
 * "Preço do Café alterado de R$ 5,00 para R$ 6,00 pelo usuário Carlos em DD/MM/AAAA"
 */
export function updateProductWithAudit(
  existingProduct: Product,
  updates: Partial<Product>,
  user: SystemUser
): { updatedProduct: Product; auditLogs: AuditLog[] } {
  const auditLogs: AuditLog[] = [];
  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  // Checa alteração de preço (Requisito 11)
  if (updates.price !== undefined && updates.price !== existingProduct.price) {
    const oldPriceFormatted = formatCurrencyBRL(existingProduct.price);
    const newPriceFormatted = formatCurrencyBRL(updates.price);
    const detailMsg = `Preço do produto "${existingProduct.name}" alterado de ${oldPriceFormatted} para ${newPriceFormatted} pelo usuário ${user.name} (${user.role}) em ${dateFormatted}.`;
    
    auditLogs.push(
      createAuditLog(
        user,
        'PRECO_ALTERADO',
        'Produto',
        detailMsg,
        existingProduct.id,
        existingProduct.price,
        updates.price
      )
    );
  }

  // Checa ajuste manual de estoque
  if (updates.stockQuantity !== undefined && updates.stockQuantity !== existingProduct.stockQuantity) {
    const diff = updates.stockQuantity - existingProduct.stockQuantity;
    const sign = diff > 0 ? `+${diff}` : `${diff}`;
    const detailMsg = `Estoque de "${existingProduct.name}" ajustado de ${existingProduct.stockQuantity} para ${updates.stockQuantity} (${sign} un.) por ${user.name} (${user.role}).`;
    
    auditLogs.push(
      createAuditLog(
        user,
        'ESTOQUE_AJUSTADO',
        'Estoque',
        detailMsg,
        existingProduct.id,
        existingProduct.stockQuantity,
        updates.stockQuantity
      )
    );
  }

  // Log geral se outras propriedades mudaram sem log específico
  if (auditLogs.length === 0) {
    auditLogs.push(
      createAuditLog(
        user,
        'PRODUTO_ATUALIZADO',
        'Produto',
        `Dados do produto "${updates.name || existingProduct.name}" atualizados por ${user.name} (${user.role}).`,
        existingProduct.id
      )
    );
  }

  const updatedProduct: Product = {
    ...existingProduct,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return { updatedProduct, auditLogs };
}

/**
 * REQUISITO 19 (RF04): Alerta no Dashboard de Avisos de Estoque Baixo
 * Se chegar a zero: "Esgotado"
 * Se chegar a <= minStockThreshold (ex: 5 unidades): "Atenção: Necessário repor [Produto]"
 */
export function checkStockAlerts(products: Product[]): StockAlert[] {
  const alerts: StockAlert[] = [];

  // Apenas produtos ativos recebem alertas de reposição de estoque
  for (const product of products) {
    if (product.status !== 'ativo') continue;

    if (product.stockQuantity <= 0) {
      alerts.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        currentStock: product.stockQuantity,
        minStockThreshold: product.minStockThreshold,
        isOutOfStock: true,
        severity: 'critico',
        message: `Atenção Crítica: "${product.name}" está ESGOTADO no cardápio! Necessário repor imediatamente.`,
      });
    } else if (product.stockQuantity <= product.minStockThreshold) {
      alerts.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        currentStock: product.stockQuantity,
        minStockThreshold: product.minStockThreshold,
        isOutOfStock: false,
        severity: 'atencao',
        message: `Atenção: Necessário repor "${product.name}" (restam apenas ${product.stockQuantity} un., mínimo: ${product.minStockThreshold}).`,
      });
    }
  }

  // Ordena os críticos primeiro, depois por menor quantidade em estoque
  return alerts.sort((a, b) => {
    if (a.isOutOfStock && !b.isOutOfStock) return -1;
    if (!a.isOutOfStock && b.isOutOfStock) return 1;
    return a.currentStock - b.currentStock;
  });
}

/**
 * REQUISITO 5 & RF04: Baixa Automática no Estoque
 * Toda vez que um pedido é finalizado pelo cliente e sai para entrega/balcão,
 * o sistema subtrai automaticamente os itens do estoque.
 */
export function deductStockForOrder(
  order: Order,
  products: Product[],
  user: SystemUser
): { updatedProducts: Product[]; updatedOrder: Order; auditLogs: AuditLog[] } {
  if (order.stockDeducted) {
    return { updatedProducts: products, updatedOrder: order, auditLogs: [] };
  }

  const auditLogs: AuditLog[] = [];
  const updatedProducts = products.map((prod) => {
    const itemInOrder = order.items.find((item) => item.productId === prod.id);
    if (!itemInOrder) return prod;

    const newStock = Math.max(0, prod.stockQuantity - itemInOrder.quantity);
    const detailMsg = `Baixa automática de estoque: Pedido #${order.orderNumber} (${order.customerName}) subtraiu ${itemInOrder.quantity} un. de "${prod.name}". Estoque atual: ${newStock}.`;

    auditLogs.push(
      createAuditLog(
        user,
        'ESTOQUE_AJUSTADO',
        'Estoque',
        detailMsg,
        prod.id,
        prod.stockQuantity,
        newStock
      )
    );

    return {
      ...prod,
      stockQuantity: newStock,
      updatedAt: new Date().toISOString(),
    };
  });

  const updatedOrder: Order = {
    ...order,
    stockDeducted: true,
    updatedAt: new Date().toISOString(),
  };

  return { updatedProducts, updatedOrder, auditLogs };
}

/**
 * REQUISITO 8: Dashboard Gerencial
 * - Faturamento do Dia
 * - Quantidade de Pedidos Hoje
 * - Ticket Médio
 * - Lucro Estimado
 */
export function calculateDailyMetrics(
  orders: Order[],
  products: Product[],
  todayDateStr?: string
): DailyDashboardMetrics {
  const targetDatePrefix = todayDateStr || new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter((order) => {
    return (
      order.createdAt.startsWith(targetDatePrefix) &&
      order.status !== 'cancelado'
    );
  });

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayOrdersCount = todayOrders.length;
  const todayAverageTicket =
    todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0;
  const todayTotalCost = todayOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
  const todayProfit = todayRevenue - todayTotalCost;

  const alerts = checkStockAlerts(products);
  const lowStockAlertsCount = alerts.filter((a) => !a.isOutOfStock).length;
  const outOfStockCount = alerts.filter((a) => a.isOutOfStock).length;

  return {
    todayRevenue,
    todayOrdersCount,
    todayAverageTicket,
    todayProfit,
    lowStockAlertsCount,
    outOfStockCount,
  };
}

/**
 * Gráfico simples: Vendas nos últimos 7 dias
 */
export function calculateLast7DaysSales(
  orders: Order[],
  baseDate?: Date
): DaySalesSummary[] {
  const result: DaySalesSummary[] = [];
  const reference = baseDate ? new Date(baseDate) : new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(reference);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
      .format(d)
      .replace('.', '');
    const dayMonth = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const label = `${dayName.toUpperCase()} ${dayMonth}`;

    const dayOrders = orders.filter(
      (o) => o.createdAt.startsWith(dateStr) && o.status !== 'cancelado'
    );
    const revenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    result.push({
      date: dateStr,
      label,
      revenue,
      ordersCount: dayOrders.length,
    });
  }

  return result;
}

/**
 * REQUISITO 10: Relatório 1 - Vendas por Período
 */
export function generateSalesReport(
  orders: Order[],
  startDateStr?: string,
  endDateStr?: string
) {
  const filtered = orders.filter((o) => {
    if (o.status === 'cancelado') return false;
    const orderDate = o.createdAt.slice(0, 10);
    if (startDateStr && orderDate < startDateStr) return false;
    if (endDateStr && orderDate > endDateStr) return false;
    return true;
  });

  const totalRevenue = filtered.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalCost = filtered.reduce((acc, o) => acc + (o.totalCost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const totalOrders = filtered.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Itens agregados vendidos
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number; cost: number }>();
  for (const order of filtered) {
    for (const item of order.items) {
      const existing = itemMap.get(item.productId) || {
        name: item.productName,
        quantity: 0,
        revenue: 0,
        cost: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.subtotal;
      existing.cost += (item.costPrice || 0) * item.quantity;
      itemMap.set(item.productId, existing);
    }
  }

  const itemsSoldSummary = Array.from(itemMap.entries()).map(([productId, val]) => ({
    productId,
    productName: val.name,
    quantity: val.quantity,
    totalRevenue: val.revenue,
    totalProfit: val.revenue - val.cost,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    totalOrders,
    averageTicket,
    orders: filtered,
    itemsSoldSummary,
  };
}

/**
 * REQUISITO 10: Relatório 2 - Curva ABC (Mais Vendidos / Giro de Estoque)
 * - Classe A: produtos de altíssimo impacto (até 80% do faturamento)
 * - Classe B: produtos de médio impacto (próximos 15%, acumula até 95%)
 * - Classe C: produtos de baixo giro / encalhados (últimos 5%)
 */
export function generateABCCurveReport(
  orders: Order[],
  products: Product[]
): {
  items: ABCCurveItem[];
  classASummary: { count: number; revenue: number };
  classBSummary: { count: number; revenue: number };
  classCSummary: { count: number; revenue: number };
  totalRevenue: number;
} {
  const nonCanceledOrders = orders.filter((o) => o.status !== 'cancelado');
  const revenueByProduct = new Map<string, { quantity: number; revenue: number }>();

  for (const order of nonCanceledOrders) {
    for (const item of order.items) {
      const cur = revenueByProduct.get(item.productId) || { quantity: 0, revenue: 0 };
      cur.quantity += item.quantity;
      cur.revenue += item.subtotal;
      revenueByProduct.set(item.productId, cur);
    }
  }

  const totalRevenue = Array.from(revenueByProduct.values()).reduce(
    (sum, val) => sum + val.revenue,
    0
  );

  // Mapeia todos os produtos (inclusive os com 0 vendas, que entram na classe C como encalhados)
  const itemsWithRevenue = products.map((prod) => {
    const sales = revenueByProduct.get(prod.id) || { quantity: 0, revenue: 0 };
    const percentage = totalRevenue > 0 ? (sales.revenue / totalRevenue) * 100 : 0;
    return {
      productId: prod.id,
      productName: prod.name,
      category: prod.category,
      quantitySold: sales.quantity,
      totalRevenue: sales.revenue,
      percentageOfRevenue: percentage,
      currentStock: prod.stockQuantity,
      status: prod.status,
    };
  });

  // Ordena por faturamento decrescente
  itemsWithRevenue.sort((a, b) => b.totalRevenue - a.totalRevenue);

  let cumulative = 0;
  const items: ABCCurveItem[] = [];

  for (const item of itemsWithRevenue) {
    cumulative += item.percentageOfRevenue;
    // Arredondamento para evitar imprecisões de float
    const cumulativeFixed = Number(Math.min(100, cumulative).toFixed(2));
    
    let classification: 'A' | 'B' | 'C' = 'C';
    if (cumulativeFixed <= 80 || items.length === 0) {
      classification = 'A';
    } else if (cumulativeFixed <= 95) {
      classification = 'B';
    } else {
      classification = 'C';
    }

    items.push({
      ...item,
      percentageOfRevenue: Number(item.percentageOfRevenue.toFixed(2)),
      cumulativePercentage: cumulativeFixed,
      classification,
    });
  }

  const classA = items.filter((i) => i.classification === 'A');
  const classB = items.filter((i) => i.classification === 'B');
  const classC = items.filter((i) => i.classification === 'C');

  return {
    items,
    classASummary: {
      count: classA.length,
      revenue: classA.reduce((s, i) => s + i.totalRevenue, 0),
    },
    classBSummary: {
      count: classB.length,
      revenue: classB.reduce((s, i) => s + i.totalRevenue, 0),
    },
    classCSummary: {
      count: classC.length,
      revenue: classC.reduce((s, i) => s + i.totalRevenue, 0),
    },
    totalRevenue,
  };
}

/**
 * REQUISITO 10: Relatório 3 - Clientes Fiéis (Quem mais comprou)
 */
export function generateCustomerReport(orders: Order[]): CustomerLoyaltyItem[] {
  const customerMap = new Map<string, {
    ordersCount: number;
    totalSpent: number;
    lastOrderDate: string;
    productCounts: Map<string, number>;
  }>();

  const validOrders = orders.filter((o) => o.status !== 'cancelado');

  for (const o of validOrders) {
    const key = o.customerName.trim() || 'Cliente Não Identificado';
    const existing = customerMap.get(key) || {
      ordersCount: 0,
      totalSpent: 0,
      lastOrderDate: o.createdAt,
      productCounts: new Map<string, number>(),
    };

    existing.ordersCount += 1;
    existing.totalSpent += o.totalAmount;
    if (o.createdAt > existing.lastOrderDate) {
      existing.lastOrderDate = o.createdAt;
    }

    for (const item of o.items) {
      const pCount = existing.productCounts.get(item.productName) || 0;
      existing.productCounts.set(item.productName, pCount + item.quantity);
    }

    customerMap.set(key, existing);
  }

  const result: CustomerLoyaltyItem[] = [];

  for (const [customerName, data] of customerMap.entries()) {
    // Acha o produto favorito
    let favoriteProduct = 'Nenhum';
    let maxQuantity = 0;
    for (const [prodName, qty] of data.productCounts.entries()) {
      if (qty > maxQuantity) {
        maxQuantity = qty;
        favoriteProduct = prodName;
      }
    }

    result.push({
      customerName,
      totalOrders: data.ordersCount,
      totalSpent: data.totalSpent,
      averageTicket: data.ordersCount > 0 ? data.totalSpent / data.ordersCount : 0,
      lastOrderDate: data.lastOrderDate,
      favoriteProduct: maxQuantity > 0 ? favoriteProduct : undefined,
    });
  }

  return result.sort((a, b) => b.totalSpent - a.totalSpent);
}

/**
 * Classifica os pedidos para as 4 colunas do Kanban do Barista
 */
export function classifyOrdersForKanban(orders: Order[]): {
  pendentes: Order[];
  emPreparo: Order[];
  prontos: Order[];
  entregues: Order[];
} {
  const pendentes: Order[] = [];
  const emPreparo: Order[] = [];
  const prontos: Order[] = [];
  const entregues: Order[] = [];

  for (const order of orders) {
    if (order.status === 'recebido') {
      pendentes.push(order);
    } else if (order.status === 'preparando') {
      emPreparo.push(order);
    } else if (order.status === 'pronto') {
      prontos.push(order);
    } else if (order.status === 'entregue') {
      entregues.push(order);
    }
  }

  // Ordena por ordem de chegada (mais antigos primeiro nas colunas de preparo)
  pendentes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  emPreparo.sort((a, b) => (a.startedPreparingAt || a.createdAt).localeCompare(b.startedPreparingAt || b.createdAt));
  prontos.sort((a, b) => (b.readyAt || b.updatedAt).localeCompare(a.readyAt || a.updatedAt));
  entregues.sort((a, b) => (b.deliveredAt || b.updatedAt).localeCompare(a.deliveredAt || a.updatedAt));

  return { pendentes, emPreparo, prontos, entregues };
}

/**
 * Calcula o tempo decorrido do pedido e urgência para o Barista
 */
export function formatElapsedTime(
  isoDateStr: string,
  nowDate: Date = new Date()
): {
  text: string;
  minutes: number;
  urgency: 'normal' | 'moderada' | 'urgente';
} {
  const orderTime = new Date(isoDateStr).getTime();
  const current = nowDate.getTime();
  const diffMs = Math.max(0, current - orderTime);
  const minutes = Math.floor(diffMs / (1000 * 60));

  let text = '⏱️ agora mesmo';
  if (minutes === 1) {
    text = '⏱️ 1 min atrás';
  } else if (minutes > 1 && minutes < 60) {
    text = `⏱️ ${minutes} min atrás`;
  } else if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    text = `⏱️ ${hours}h ${remainingMins}m atrás`;
  }

  let urgency: 'normal' | 'moderada' | 'urgente' = 'normal';
  if (minutes >= 15) {
    urgency = 'urgente';
  } else if (minutes >= 8) {
    urgency = 'moderada';
  }

  return { text, minutes, urgency };
}

/**
 * Transição de status do Barista com auditoria e timestamps
 */
export function advanceOrderStatusWithAudit(
  order: Order,
  user: SystemUser
): { updatedOrder: Order; auditLog: AuditLog; nextStatus: Order['status'] } {
  let nextStatus: Order['status'] = order.status;
  const now = new Date().toISOString();
  const updatedOrder = { ...order, updatedAt: now };

  if (order.status === 'recebido') {
    nextStatus = 'preparando';
    updatedOrder.status = 'preparando';
    updatedOrder.startedPreparingAt = now;
  } else if (order.status === 'preparando') {
    nextStatus = 'pronto';
    updatedOrder.status = 'pronto';
    updatedOrder.readyAt = now;
  } else if (order.status === 'pronto') {
    nextStatus = 'entregue';
    updatedOrder.status = 'entregue';
    updatedOrder.deliveredAt = now;
  }

  const auditLog = createAuditLog(
    user,
    'PEDIDO_FINALIZADO',
    'Pedido',
    `Barista ${user.name} (${user.role}) avançou Pedido #${order.orderNumber} (${order.customerName}) de "${order.status}" para "${nextStatus}".`,
    order.id,
    order.status,
    nextStatus
  );

  return { updatedOrder, auditLog, nextStatus };
}

