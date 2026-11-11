import { prisma } from '../backend/db/prisma.ts';
import {
  initialProducts,
  initialUsers,
  initialIngredients,
  initialAuditLogs,
  generateSeedOrders,
} from '../backend/db/seedData.ts';

async function main() {
  console.log('🌱 Iniciando seed do banco de dados PostgreSQL...');

  // 1. Limpa tabelas existentes (ordem respeitando foreign keys)
  console.log('🧹 Limpando dados antigos...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.productAddon.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // 2. Cria Usuários
  console.log('👤 Inserindo usuários...');
  for (const user of initialUsers) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor || '#850D2C',
      },
    });
  }

  // 3. Cria Produtos com Tamanhos e Adicionais
  console.log('☕ Inserindo produtos...');
  for (const prod of initialProducts) {
    await prisma.product.create({
      data: {
        id: prod.id,
        name: prod.name,
        description: prod.description || '',
        price: prod.price,
        costPrice: prod.costPrice,
        category: prod.category,
        imageUrl: prod.imageUrl,
        cutoutImageUrl: prod.cutoutImageUrl,
        stockQuantity: prod.stockQuantity,
        minStockThreshold: prod.minStockThreshold,
        status: prod.status || 'ativo',
        hasSizes: Boolean(prod.hasSizes),
        hasAddons: Boolean(prod.hasAddons),
        createdAt: new Date(prod.createdAt || Date.now()),
        updatedAt: new Date(prod.updatedAt || Date.now()),
        sizes: prod.sizes && prod.sizes.length > 0
          ? {
              create: prod.sizes.map((s) => ({
                name: s.name,
                price: s.price,
                costPrice: s.costPrice,
              })),
            }
          : undefined,
        addons: prod.addons && prod.addons.length > 0
          ? {
              create: prod.addons.map((a) => ({
                id: a.id,
                name: a.name,
                price: a.price,
              })),
            }
          : undefined,
      },
    });
  }

  // 4. Cria Insumos / Ingredientes
  console.log('📦 Inserindo insumos e estoque...');
  for (const ing of initialIngredients) {
    await prisma.ingredient.create({
      data: {
        id: ing.id,
        name: ing.name,
        category: ing.category,
        currentStock: ing.currentStock,
        unit: ing.unit,
        minStockThreshold: ing.minStockThreshold,
        costPerUnit: ing.costPerUnit,
        supplier: ing.supplier,
        isAddonIngredient: Boolean(ing.isAddonIngredient),
        updatedAt: new Date(ing.updatedAt || Date.now()),
      },
    });
  }

  // 5. Cria Pedidos e Itens do Pedido
  console.log('📋 Inserindo pedidos...');
  const orders = generateSeedOrders();
  for (const ord of orders) {
    await prisma.order.create({
      data: {
        id: ord.id,
        orderNumber: ord.orderNumber,
        customerName: ord.customerName,
        customerPhone: ord.customerPhone,
        tableOrTakeaway: ord.tableOrTakeaway,
        consumptionType: ord.consumptionType || 'MESA',
        notes: ord.notes,
        totalAmount: ord.totalAmount,
        totalCost: ord.totalCost || 0,
        status: ord.status,
        paymentMethod: ord.paymentMethod,
        stockDeducted: ord.stockDeducted,
        createdAt: new Date(ord.createdAt),
        updatedAt: new Date(ord.updatedAt),
        startedPreparingAt: ord.startedPreparingAt ? new Date(ord.startedPreparingAt) : null,
        readyAt: ord.readyAt ? new Date(ord.readyAt) : null,
        deliveredAt: ord.deliveredAt ? new Date(ord.deliveredAt) : null,
        items: {
          create: ord.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            selectedSize: item.selectedSize,
            selectedAddons: item.selectedAddons ? JSON.stringify(item.selectedAddons) : null,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || 0,
            quantity: item.quantity,
            subtotal: item.subtotal,
            notes: item.notes,
          })),
        },
      },
    });
  }

  // 6. Cria Logs de Auditoria
  console.log('🛡️ Inserindo logs de auditoria...');
  for (const log of initialAuditLogs) {
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

  console.log('✅ Seed do PostgreSQL concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
