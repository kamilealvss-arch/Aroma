import { Product, SystemUser, Order, AuditLog, StockAlert } from '../../shared/types/index.ts';
import {
  initialProducts,
  initialUsers,
  generateSeedOrders,
  initialAuditLogs,
} from './seedData.ts';
import {
  softDeleteProduct,
  restoreProduct,
  updateProductWithAudit,
  checkStockAlerts,
  deductStockForOrder,
  createAuditLog,
  generateUniqueId,
} from '../../shared/logic/cafeRules.ts';

class DatabaseStore {
  private products: Product[] = [];
  private orders: Order[] = [];
  private auditLogs: AuditLog[] = [];
  private users: SystemUser[] = [];
  private currentUserId: string = 'usr_admin';
  private nextOrderNumber: number = 2000;

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.products = JSON.parse(JSON.stringify(initialProducts));
    this.users = JSON.parse(JSON.stringify(initialUsers));
    this.orders = generateSeedOrders();
    this.auditLogs = JSON.parse(JSON.stringify(initialAuditLogs));
    this.currentUserId = 'usr_admin';
    this.nextOrderNumber = 2000 + this.orders.length;
  }

  public getCurrentUser(): SystemUser {
    const user = this.users.find((u) => u.id === this.currentUserId);
    return user || this.users[0];
  }

  public setCurrentUser(userId: string): SystemUser {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado');
    this.currentUserId = userId;
    return user;
  }

  public getUsers(): SystemUser[] {
    return [...this.users];
  }

  // ===================== PRODUTOS =====================
  public getProducts(includeInactive: boolean = false): Product[] {
    if (includeInactive) {
      return [...this.products];
    }
    return this.products.filter((p) => p.status === 'ativo');
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Product['status'] }): Product {
    const currentUser = this.getCurrentUser();
    const id = generateUniqueId('prod');
    const now = new Date().toISOString();

    const newProduct: Product = {
      id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      costPrice: Number(data.costPrice || data.price * 0.4),
      category: data.category,
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600',
      stockQuantity: Number(data.stockQuantity || 0),
      minStockThreshold: Number(data.minStockThreshold || 5),
      status: data.status || 'ativo',
      createdAt: now,
      updatedAt: now,
    };

    this.products.unshift(newProduct);

    // Auditoria de criação
    const log = createAuditLog(
      currentUser,
      'NOVO_PRODUTO',
      'Produto',
      `Novo produto "${newProduct.name}" cadastrado por ${currentUser.name} (${currentUser.role}) com preço R$ ${newProduct.price.toFixed(2)} e estoque inicial de ${newProduct.stockQuantity} un.`,
      newProduct.id,
      null,
      newProduct.price
    );
    this.auditLogs.unshift(log);

    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const product = this.getProductById(id);
    if (!product) throw new Error('Produto não encontrado');

    const currentUser = this.getCurrentUser();
    const { updatedProduct, auditLogs } = updateProductWithAudit(
      product,
      updates,
      currentUser
    );

    const index = this.products.findIndex((p) => p.id === id);
    this.products[index] = updatedProduct;

    // Registra os logs de auditoria
    for (const log of auditLogs) {
      this.auditLogs.unshift(log);
    }

    return updatedProduct;
  }

  /**
   * ⭐ REQUISITO 4 (PONTO DE OURO): Exclusão Lógica
   * Não apaga do banco de dados para manter a integridade dos relatórios e vendas passadas!
   */
  public softDeleteProduct(id: string): Product {
    const product = this.getProductById(id);
    if (!product) throw new Error('Produto não encontrado');

    const currentUser = this.getCurrentUser();
    const { updatedProduct, auditLog } = softDeleteProduct(product, currentUser);

    const index = this.products.findIndex((p) => p.id === id);
    this.products[index] = updatedProduct;

    this.auditLogs.unshift(auditLog);
    return updatedProduct;
  }

  public restoreProduct(id: string): Product {
    const product = this.getProductById(id);
    if (!product) throw new Error('Produto não encontrado');

    const currentUser = this.getCurrentUser();
    const { updatedProduct, auditLog } = restoreProduct(product, currentUser);

    const index = this.products.findIndex((p) => p.id === id);
    this.products[index] = updatedProduct;

    this.auditLogs.unshift(auditLog);
    return updatedProduct;
  }

  // ===================== ESTOQUE =====================
  public adjustStock(id: string, newStock: number, reason?: string): Product {
    const product = this.getProductById(id);
    if (!product) throw new Error('Produto não encontrado');

    const currentUser = this.getCurrentUser();
    const oldStock = product.stockQuantity;
    const diff = newStock - oldStock;
    const sign = diff > 0 ? `+${diff}` : `${diff}`;
    
    product.stockQuantity = Math.max(0, newStock);
    product.updatedAt = new Date().toISOString();

    const reasonText = reason ? ` Motivo: "${reason}".` : '';
    const auditLog = createAuditLog(
      currentUser,
      'ESTOQUE_AJUSTADO',
      'Estoque',
      `Estoque de "${product.name}" alterado de ${oldStock} para ${newStock} un. (${sign} un.) pelo usuário ${currentUser.name} (${currentUser.role}).${reasonText}`,
      product.id,
      oldStock,
      newStock
    );
    this.auditLogs.unshift(auditLog);

    return { ...product };
  }

  public getStockAlerts(): StockAlert[] {
    return checkStockAlerts(this.products);
  }

  // ===================== PEDIDOS =====================
  public getOrders(): Order[] {
    // Retorna ordenados pelos mais recentes primeiro
    return [...this.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  /**
   * REQUISITO 5 & RF04: Criar Pedido com Baixa Automática no Estoque
   */
  public createOrder(data: {
    customerName: string;
    customerPhone?: string;
    tableOrTakeaway: string;
    consumptionType?: Order['consumptionType'];
    notes?: string;
    paymentMethod: Order['paymentMethod'];
    items: Array<{ productId: string; quantity: number; notes?: string }>;
  }): Order {
    const currentUser = this.getCurrentUser();
    const orderItems: Order['items'] = [];
    let totalAmount = 0;
    let totalCost = 0;

    // Valida itens e calcula valores
    for (const itemReq of data.items) {
      const product = this.getProductById(itemReq.productId);
      if (!product) {
        throw new Error(`Produto não encontrado (ID: ${itemReq.productId})`);
      }
      if (product.status !== 'ativo') {
        throw new Error(`O produto "${product.name}" não está ativo no cardápio.`);
      }
      if (product.stockQuantity < itemReq.quantity) {
        throw new Error(
          `Estoque insuficiente para "${product.name}". Solicitado: ${itemReq.quantity}, Disponível: ${product.stockQuantity}`
        );
      }

      const subtotal = product.price * itemReq.quantity;
      totalAmount += subtotal;
      totalCost += product.costPrice * itemReq.quantity;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        costPrice: product.costPrice,
        quantity: itemReq.quantity,
        subtotal,
        notes: itemReq.notes,
      });
    }

    const orderNumber = this.nextOrderNumber++;
    const now = new Date().toISOString();

    let consumptionType = data.consumptionType;
    if (!consumptionType) {
      const tableLower = (data.tableOrTakeaway || '').toLowerCase();
      if (tableLower.includes('levar') || tableLower.includes('viagem')) {
        consumptionType = 'LEVAR';
      } else if (tableLower.includes('delivery')) {
        consumptionType = 'DELIVERY';
      } else if (tableLower.includes('balcão') || tableLower.includes('balcao')) {
        consumptionType = 'BALCAO';
      } else {
        consumptionType = 'MESA';
      }
    }

    const newOrder: Order = {
      id: generateUniqueId('ord'),
      orderNumber,
      customerName: data.customerName || 'Cliente Balcão',
      customerPhone: data.customerPhone,
      tableOrTakeaway: data.tableOrTakeaway || 'Balcão / Viagem',
      consumptionType,
      notes: data.notes,
      items: orderItems,
      totalAmount,
      totalCost,
      status: 'recebido',
      paymentMethod: data.paymentMethod || 'PIX',
      stockDeducted: false,
      createdAt: now,
      updatedAt: now,
    };

    // Subtrai automaticamente do estoque (Requisito 5)
    const { updatedProducts, updatedOrder, auditLogs } = deductStockForOrder(
      newOrder,
      this.products,
      currentUser
    );

    this.products = updatedProducts;
    this.orders.unshift(updatedOrder);

    // Registra auditoria de pedido e baixas de estoque
    const orderLog = createAuditLog(
      currentUser,
      'PEDIDO_FINALIZADO',
      'Pedido',
      `Novo Pedido #${newOrder.orderNumber} registrado para "${newOrder.customerName}" [${newOrder.tableOrTakeaway}] no valor de R$ ${newOrder.totalAmount.toFixed(2)}${newOrder.notes ? ` (Obs: "${newOrder.notes}")` : ''}.`,
      newOrder.id,
      null,
      newOrder.totalAmount
    );
    this.auditLogs.unshift(orderLog);

    for (const log of auditLogs) {
      this.auditLogs.unshift(log);
    }

    return updatedOrder;
  }

  public updateOrderStatus(orderId: string, newStatus: Order['status']): Order {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Pedido não encontrado');

    const currentUser = this.getCurrentUser();
    const oldStatus = order.status;
    const now = new Date().toISOString();

    order.status = newStatus;
    order.updatedAt = now;

    if (newStatus === 'preparando' && !order.startedPreparingAt) {
      order.startedPreparingAt = now;
    } else if (newStatus === 'pronto') {
      order.readyAt = now;
    } else if (newStatus === 'entregue') {
      order.deliveredAt = now;
    }

    const log = createAuditLog(
      currentUser,
      'PEDIDO_FINALIZADO',
      'Pedido',
      `Barista ${currentUser.name} (${currentUser.role}) alterou status do Pedido #${order.orderNumber} de "${oldStatus}" para "${newStatus}".`,
      order.id,
      oldStatus,
      newStatus
    );
    this.auditLogs.unshift(log);

    return { ...order };
  }

  // ===================== AUDITORIA =====================
  public getAuditLogs(filterType?: string, search?: string): AuditLog[] {
    let list = [...this.auditLogs];

    if (filterType && filterType !== 'ALL') {
      list = list.filter((l) => l.actionType === filterType);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.details.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.userRole.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

export const db = new DatabaseStore();
