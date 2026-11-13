import { Product, SystemUser, Order, AuditLog, StockAlert, Ingredient } from '../../shared/types/index.ts';
import {
  initialProducts,
  initialUsers,
  generateSeedOrders,
  initialAuditLogs,
  initialIngredients,
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
import { prisma, testDatabaseConnection } from './prisma.ts';

class DatabaseStore {
  private products: Product[] = [];
  private ingredients: Ingredient[] = [];
  private orders: Order[] = [];
  private auditLogs: AuditLog[] = [];
  private users: SystemUser[] = [];
  private currentUserId: string = 'usr_admin';
  private nextOrderNumber: number = 2000;
  private isPostgresConnected: boolean = false;

  constructor() {
    this.resetToDefaults();
  }

  public async initFromPostgres(): Promise<boolean> {
    try {
      this.isPostgresConnected = await testDatabaseConnection();
      if (!this.isPostgresConnected) {
        console.log('💡 PostgreSQL: Modo local ativo (armazenamento em memória).');
        console.log('   Para conectar e persistir no PostgreSQL, execute: docker compose up -d\n');
        return false;
      }

      console.log('🐘 PostgreSQL: Conectado com sucesso via Prisma!');

      // Carrega usuários
      const dbUsers = await prisma.user.findMany();
      if (dbUsers.length > 0) {
        this.users = dbUsers.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role as any,
          email: u.email,
          avatarColor: u.avatarColor,
        }));
      }

      // Carrega produtos com tamanhos e adicionais
      const dbProducts = await prisma.product.findMany({
        include: { sizes: true, addons: true },
        orderBy: { createdAt: 'desc' },
      });

      if (dbProducts.length > 0) {
        this.products = dbProducts.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          costPrice: p.costPrice,
          category: p.category as any,
          subcategory: (p as any).subcategory || undefined,
          imageUrl: p.imageUrl,
          cutoutImageUrl: p.cutoutImageUrl || undefined,
          stockQuantity: p.stockQuantity,
          minStockThreshold: p.minStockThreshold,
          status: p.status as any,
          hasSizes: p.hasSizes,
          hasAddons: p.hasAddons,
          sizes: p.sizes.map((s) => ({ name: s.name, price: s.price, costPrice: s.costPrice || undefined })),
          addons: p.addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }));
      }

      // Carrega insumos
      const dbIngredients = await prisma.ingredient.findMany({
        orderBy: { name: 'asc' },
      });
      if (dbIngredients.length > 0) {
        this.ingredients = dbIngredients.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category as any,
          currentStock: i.currentStock,
          unit: i.unit as any,
          minStockThreshold: i.minStockThreshold,
          costPerUnit: i.costPerUnit,
          supplier: i.supplier || undefined,
          isAddonIngredient: i.isAddonIngredient,
          updatedAt: i.updatedAt.toISOString(),
        }));
      }

      // Carrega pedidos
      const dbOrders = await prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
      if (dbOrders.length > 0) {
        this.orders = dbOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerPhone: o.customerPhone || undefined,
          tableOrTakeaway: o.tableOrTakeaway,
          consumptionType: o.consumptionType as any,
          notes: o.notes || undefined,
          totalAmount: o.totalAmount,
          totalCost: o.totalCost,
          status: o.status as any,
          paymentMethod: o.paymentMethod as any,
          stockDeducted: o.stockDeducted,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
          startedPreparingAt: o.startedPreparingAt?.toISOString(),
          readyAt: o.readyAt?.toISOString(),
          deliveredAt: o.deliveredAt?.toISOString(),
          items: o.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            selectedSize: it.selectedSize || undefined,
            selectedAddons: it.selectedAddons ? JSON.parse(it.selectedAddons) : undefined,
            unitPrice: it.unitPrice,
            costPrice: it.costPrice,
            quantity: it.quantity,
            subtotal: it.subtotal,
            notes: it.notes || undefined,
          })),
        }));
        this.nextOrderNumber = Math.max(2000, ...this.orders.map((o) => o.orderNumber + 1));
      }

      // Carrega logs de auditoria
      const dbAuditLogs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 200,
      });
      if (dbAuditLogs.length > 0) {
        this.auditLogs = dbAuditLogs.map((a) => ({
          id: a.id,
          timestamp: a.timestamp.toISOString(),
          userId: a.userId,
          userName: a.userName,
          userRole: a.userRole as any,
          actionType: a.actionType as any,
          targetEntity: a.targetEntity as any,
          targetId: a.targetId || undefined,
          details: a.details,
          oldValue: a.oldValue ?? undefined,
          newValue: a.newValue ?? undefined,
        }));
      }

      return true;
    } catch (err) {
      console.warn('⚠️  Aviso: Não foi possível conectar ao PostgreSQL:', err);
      return false;
    }
  }

  private asyncPersist(operation: () => Promise<void>): void {
    if (!this.isPostgresConnected) return;
    operation().catch((err) => {
      console.warn('⚠️  Erro assíncrono ao persistir no PostgreSQL:', err?.message || err);
    });
  }

  public resetToDefaults(): void {
    this.products = JSON.parse(JSON.stringify(initialProducts));
    this.ingredients = JSON.parse(JSON.stringify(initialIngredients));
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

  public createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: Product['status'] }): Product {
    const currentUser = this.getCurrentUser();
    const id = (data as any).id || generateUniqueId('prod');
    const existing = this.getProductById(id);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();

    const newProduct: Product = {
      id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      costPrice: Number(data.costPrice || data.price * 0.4),
      category: data.category,
      subcategory: data.subcategory,
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600',
      cutoutImageUrl: data.cutoutImageUrl,
      stockQuantity: Number(data.stockQuantity !== undefined ? data.stockQuantity : 50),
      minStockThreshold: Number(data.minStockThreshold || 5),
      status: data.status || 'ativo',
      hasSizes: data.hasSizes,
      sizes: data.sizes,
      hasAddons: data.hasAddons,
      addons: data.addons,
      isCombo: Boolean(data.isCombo),
      comboItems: data.comboItems,
      originalComboPrice: data.originalComboPrice ? Number(data.originalComboPrice) : undefined,
      discountPercentage: data.discountPercentage ? Number(data.discountPercentage) : undefined,
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

    this.asyncPersist(async () => {
      await prisma.product.create({
        data: {
          id: newProduct.id,
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          costPrice: newProduct.costPrice,
          category: newProduct.category,
          imageUrl: newProduct.imageUrl,
          cutoutImageUrl: newProduct.cutoutImageUrl,
          stockQuantity: newProduct.stockQuantity,
          minStockThreshold: newProduct.minStockThreshold,
          status: newProduct.status,
          hasSizes: Boolean(newProduct.hasSizes),
          hasAddons: Boolean(newProduct.hasAddons),
          sizes: newProduct.sizes && newProduct.sizes.length > 0 ? {
            create: newProduct.sizes.map((s) => ({ name: s.name, price: s.price, costPrice: s.costPrice })),
          } : undefined,
          addons: newProduct.addons && newProduct.addons.length > 0 ? {
            create: newProduct.addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
          } : undefined,
        },
      });
      await prisma.auditLog.create({
        data: {
          id: log.id,
          timestamp: new Date(log.timestamp),
          userId: log.userId,
          userName: log.userName,
          userRole: log.userRole,
          actionType: log.actionType,
          targetEntity: log.targetEntity,
          targetId: log.targetId,
          details: log.details,
          newValue: log.newValue !== undefined && log.newValue !== null ? String(log.newValue) : null,
        },
      });
    });

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

    this.asyncPersist(async () => {
      await prisma.product.update({
        where: { id: updatedProduct.id },
        data: {
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: updatedProduct.price,
          costPrice: updatedProduct.costPrice,
          category: updatedProduct.category,
          imageUrl: updatedProduct.imageUrl,
          cutoutImageUrl: updatedProduct.cutoutImageUrl,
          stockQuantity: updatedProduct.stockQuantity,
          minStockThreshold: updatedProduct.minStockThreshold,
          status: updatedProduct.status,
          hasSizes: Boolean(updatedProduct.hasSizes),
          hasAddons: Boolean(updatedProduct.hasAddons),
        },
      });
      for (const log of auditLogs) {
        await prisma.auditLog.create({
          data: {
            id: log.id,
            timestamp: new Date(log.timestamp),
            userId: log.userId,
            userName: log.userName,
            userRole: log.userRole,
            actionType: log.actionType,
            targetEntity: log.targetEntity,
            targetId: log.targetId,
            details: log.details,
            oldValue: log.oldValue !== undefined && log.oldValue !== null ? String(log.oldValue) : null,
            newValue: log.newValue !== undefined && log.newValue !== null ? String(log.newValue) : null,
          },
        });
      }
    });

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

    this.asyncPersist(async () => {
      await prisma.product.update({
        where: { id: updatedProduct.id },
        data: { status: 'inativo' },
      });
      await prisma.auditLog.create({
        data: {
          id: auditLog.id,
          timestamp: new Date(auditLog.timestamp),
          userId: auditLog.userId,
          userName: auditLog.userName,
          userRole: auditLog.userRole,
          actionType: auditLog.actionType,
          targetEntity: auditLog.targetEntity,
          targetId: auditLog.targetId,
          details: auditLog.details,
        },
      });
    });

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

    this.asyncPersist(async () => {
      await prisma.product.update({
        where: { id: updatedProduct.id },
        data: { status: 'ativo' },
      });
      await prisma.auditLog.create({
        data: {
          id: auditLog.id,
          timestamp: new Date(auditLog.timestamp),
          userId: auditLog.userId,
          userName: auditLog.userName,
          userRole: auditLog.userRole,
          actionType: auditLog.actionType,
          targetEntity: auditLog.targetEntity,
          targetId: auditLog.targetId,
          details: auditLog.details,
        },
      });
    });

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

    this.asyncPersist(async () => {
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: product.stockQuantity },
      });
      await prisma.auditLog.create({
        data: {
          id: auditLog.id,
          timestamp: new Date(auditLog.timestamp),
          userId: auditLog.userId,
          userName: auditLog.userName,
          userRole: auditLog.userRole,
          actionType: auditLog.actionType,
          targetEntity: auditLog.targetEntity,
          targetId: auditLog.targetId,
          details: auditLog.details,
          oldValue: String(oldStock),
          newValue: String(newStock),
        },
      });
    });

    return { ...product };
  }

  public getStockAlerts(): StockAlert[] {
    return checkStockAlerts(this.products);
  }

  // ===================== INGREDIENTES E MATÉRIAS-PRIMAS =====================
  public getIngredients(): Ingredient[] {
    return [...this.ingredients];
  }

  public getIngredientById(id: string): Ingredient | undefined {
    return this.ingredients.find((ing) => ing.id === id);
  }

  public adjustIngredientStock(id: string, newStock: number, reason?: string): Ingredient {
    const ingredient = this.getIngredientById(id);
    if (!ingredient) throw new Error('Ingrediente não encontrado');

    const currentUser = this.getCurrentUser();
    const oldStock = ingredient.currentStock;
    const diff = Number((newStock - oldStock).toFixed(2));
    const sign = diff > 0 ? `+${diff}` : `${diff}`;

    ingredient.currentStock = Math.max(0, Number(newStock));
    ingredient.updatedAt = new Date().toISOString();

    const reasonText = reason ? ` Motivo: "${reason}".` : '';
    const auditLog = createAuditLog(
      currentUser,
      'ESTOQUE_AJUSTADO',
      'Estoque',
      `Estoque do insumo "${ingredient.name}" alterado de ${oldStock} ${ingredient.unit} para ${newStock} ${ingredient.unit} (${sign} ${ingredient.unit}) pelo usuário ${currentUser.name} (${currentUser.role}).${reasonText}`,
      ingredient.id,
      oldStock,
      newStock
    );
    this.auditLogs.unshift(auditLog);

    this.asyncPersist(async () => {
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { currentStock: ingredient.currentStock },
      });
      await prisma.auditLog.create({
        data: {
          id: auditLog.id,
          timestamp: new Date(auditLog.timestamp),
          userId: auditLog.userId,
          userName: auditLog.userName,
          userRole: auditLog.userRole,
          actionType: auditLog.actionType,
          targetEntity: auditLog.targetEntity,
          targetId: auditLog.targetId,
          details: auditLog.details,
          oldValue: String(oldStock),
          newValue: String(newStock),
        },
      });
    });

    return { ...ingredient };
  }

  public createIngredient(data: Omit<Ingredient, 'id' | 'updatedAt'>): Ingredient {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nome do insumo ou matéria-prima é obrigatório');
    }

    const id = `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newIngredient: Ingredient = {
      id,
      name: data.name.trim(),
      category: data.category,
      unit: data.unit,
      currentStock: Math.max(0, Number(data.currentStock) || 0),
      minStockThreshold: Math.max(0, Number(data.minStockThreshold) || 0),
      costPerUnit: Math.max(0, Number(data.costPerUnit) || 0),
      supplier: data.supplier ? data.supplier.trim() : undefined,
      isAddonIngredient: data.isAddonIngredient ?? (data.category === 'Adicionais & Complementos'),
      updatedAt: now,
    };

    this.ingredients.unshift(newIngredient);

    const currentUser = this.getCurrentUser();
    const auditLog = createAuditLog(
      currentUser,
      'ESTOQUE_AJUSTADO',
      'Estoque',
      `Novo insumo "${newIngredient.name}" cadastrado com estoque inicial de ${newIngredient.currentStock} ${newIngredient.unit} e limite mínimo de ${newIngredient.minStockThreshold} ${newIngredient.unit} pelo usuário ${currentUser.name} (${currentUser.role}).`,
      newIngredient.id,
      undefined,
      newIngredient.currentStock
    );
    this.auditLogs.unshift(auditLog);

    this.asyncPersist(async () => {
      await prisma.ingredient.create({
        data: {
          id: newIngredient.id,
          name: newIngredient.name,
          category: newIngredient.category,
          unit: newIngredient.unit,
          currentStock: newIngredient.currentStock,
          minStockThreshold: newIngredient.minStockThreshold,
          costPerUnit: newIngredient.costPerUnit,
          supplier: newIngredient.supplier,
          isAddonIngredient: newIngredient.isAddonIngredient,
          updatedAt: new Date(newIngredient.updatedAt),
        },
      });
      await prisma.auditLog.create({
        data: {
          id: auditLog.id,
          timestamp: new Date(auditLog.timestamp),
          userId: auditLog.userId,
          userName: auditLog.userName,
          userRole: auditLog.userRole,
          actionType: auditLog.actionType,
          targetEntity: auditLog.targetEntity,
          targetId: auditLog.targetId,
          details: auditLog.details,
          newValue: String(newIngredient.currentStock),
        },
      });
    });

    return { ...newIngredient };
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
    items: Array<{
      productId: string;
      quantity: number;
      notes?: string;
      selectedSize?: string;
      selectedAddons?: string[];
      addons?: Array<{ name: string; price: number }>;
      unitPrice?: number;
    }>;
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

      let itemPrice = product.price;
      let itemName = product.name;
      if (itemReq.selectedSize && product.sizes && product.sizes.length > 0) {
        const foundSize = product.sizes.find((s) => s.name === itemReq.selectedSize);
        if (foundSize) {
          itemPrice = foundSize.price;
          itemName = `${product.name} (${foundSize.name})`;
        }
      }

      if (itemReq.addons && Array.isArray(itemReq.addons)) {
        for (const addon of itemReq.addons) {
          if (addon && typeof addon.price === 'number') {
            itemPrice += addon.price;
          }
        }
      } else if (typeof itemReq.unitPrice === 'number' && itemReq.unitPrice > itemPrice) {
        itemPrice = itemReq.unitPrice;
      }

      const subtotal = itemPrice * itemReq.quantity;
      totalAmount += subtotal;
      totalCost += product.costPrice * itemReq.quantity;

      orderItems.push({
        productId: product.id,
        productName: itemName,
        selectedSize: itemReq.selectedSize,
        selectedAddons: itemReq.selectedAddons,
        unitPrice: itemPrice,
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

    this.asyncPersist(async () => {
      await prisma.order.create({
        data: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customerName,
          customerPhone: updatedOrder.customerPhone,
          tableOrTakeaway: updatedOrder.tableOrTakeaway,
          consumptionType: updatedOrder.consumptionType || 'MESA',
          notes: updatedOrder.notes,
          totalAmount: updatedOrder.totalAmount,
          totalCost: updatedOrder.totalCost,
          status: updatedOrder.status,
          paymentMethod: updatedOrder.paymentMethod,
          stockDeducted: updatedOrder.stockDeducted,
          createdAt: new Date(updatedOrder.createdAt),
          updatedAt: new Date(updatedOrder.updatedAt),
          items: {
            create: updatedOrder.items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              selectedSize: it.selectedSize,
              selectedAddons: it.selectedAddons ? JSON.stringify(it.selectedAddons) : null,
              unitPrice: it.unitPrice,
              costPrice: it.costPrice,
              quantity: it.quantity,
              subtotal: it.subtotal,
              notes: it.notes,
            })),
          },
        },
      });
      for (const p of updatedProducts) {
        await prisma.product.update({
          where: { id: p.id },
          data: { stockQuantity: p.stockQuantity },
        });
      }
      await prisma.auditLog.create({
        data: {
          id: orderLog.id,
          timestamp: new Date(orderLog.timestamp),
          userId: orderLog.userId,
          userName: orderLog.userName,
          userRole: orderLog.userRole,
          actionType: orderLog.actionType,
          targetEntity: orderLog.targetEntity,
          targetId: orderLog.targetId,
          details: orderLog.details,
          newValue: String(orderLog.newValue),
        },
      });
    });

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

    this.asyncPersist(async () => {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: order.status,
          startedPreparingAt: order.startedPreparingAt ? new Date(order.startedPreparingAt) : undefined,
          readyAt: order.readyAt ? new Date(order.readyAt) : undefined,
          deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : undefined,
        },
      });
      await prisma.auditLog.create({
        data: {
          id: log.id,
          timestamp: new Date(log.timestamp),
          userId: log.userId,
          userName: log.userName,
          userRole: log.userRole,
          actionType: log.actionType,
          targetEntity: log.targetEntity,
          targetId: log.targetId,
          details: log.details,
          oldValue: log.oldValue !== undefined && log.oldValue !== null ? String(log.oldValue) : null,
          newValue: log.newValue !== undefined && log.newValue !== null ? String(log.newValue) : null,
        },
      });
    });

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
