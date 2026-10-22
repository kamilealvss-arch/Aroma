import test from 'node:test';
import assert from 'node:assert/strict';
import {
  softDeleteProduct,
  restoreProduct,
  updateProductWithAudit,
  checkStockAlerts,
  deductStockForOrder,
  calculateDailyMetrics,
  calculateLast7DaysSales,
  generateABCCurveReport,
  generateCustomerReport,
  classifyOrdersForKanban,
  formatElapsedTime,
  advanceOrderStatusWithAudit,
} from './cafeRules.ts';
import type { Product, SystemUser, Order } from '../types/index.ts';

const mockAdmin: SystemUser = {
  id: 'usr_admin',
  name: 'Maria Silva',
  role: 'Administrador',
  email: 'maria@cafegourmet.com',
  avatarColor: '#b45309',
};

const mockSubManager: SystemUser = {
  id: 'usr_sub',
  name: 'Carlos',
  role: 'Sub-gerente',
  email: 'carlos@cafegourmet.com',
  avatarColor: '#0284c7',
};

const sampleProduct: Product = {
  id: 'prod_bolo_cenoura',
  name: 'Bolo de Cenoura com Chocolate',
  description: 'Fatia generosa com calda cremosa de brigadeiro belga',
  price: 14.5,
  costPrice: 4.5,
  category: 'Doces & Bolos',
  imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500',
  stockQuantity: 12,
  minStockThreshold: 5,
  status: 'ativo',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

test('REQUISITO 4 (Ponto de Ouro): Exclusão Lógica não apaga o registro, apenas altera status para inativo', () => {
  const result = softDeleteProduct(sampleProduct, mockAdmin);
  assert.equal(result.updatedProduct.status, 'inativo');
  assert.equal(result.updatedProduct.id, sampleProduct.id);
  assert.equal(result.updatedProduct.name, sampleProduct.name);
  assert.equal(result.auditLog.actionType, 'EXCLUSAO_LOGICA');
  assert.equal(result.auditLog.oldValue, 'ativo');
  assert.equal(result.auditLog.newValue, 'inativo');
  assert.match(result.auditLog.details, /exclusão lógica/i);
});

test('Reativação de produto retorna o status para ativo com log de auditoria', () => {
  const inactiveProduct: Product = { ...sampleProduct, status: 'inativo' };
  const result = restoreProduct(inactiveProduct, mockAdmin);
  assert.equal(result.updatedProduct.status, 'ativo');
  assert.equal(result.auditLog.actionType, 'REATIVACAO_PRODUTO');
});

test('REQUISITO 11: Auditoria de Segurança grava alteração de preço com nome do usuário e valores', () => {
  const coffeeProduct: Product = {
    ...sampleProduct,
    id: 'prod_cafe_expresso',
    name: 'Café Expresso',
    price: 5.0,
  };

  const result = updateProductWithAudit(coffeeProduct, { price: 6.0 }, mockSubManager);
  assert.equal(result.updatedProduct.price, 6.0);
  assert.equal(result.auditLogs.length, 1);
  const log = result.auditLogs[0];
  assert.equal(log.actionType, 'PRECO_ALTERADO');
  assert.equal(log.userName, 'Carlos');
  assert.equal(log.userRole, 'Sub-gerente');
  assert.match(log.details, /alterado de R\$\s*5,00 para R\$\s*6,00 pelo usuário Carlos/i);
});

test('REQUISITO 19 & RF04: Alerta de estoque baixo e esgotado', () => {
  const products: Product[] = [
    {
      ...sampleProduct,
      id: 'p1',
      name: 'Pão de Queijo Mineiro',
      stockQuantity: 4,
      minStockThreshold: 5,
    },
    {
      ...sampleProduct,
      id: 'p2',
      name: 'Croissant Tradicional',
      stockQuantity: 0,
      minStockThreshold: 5,
    },
    {
      ...sampleProduct,
      id: 'p3',
      name: 'Café Espresso',
      stockQuantity: 80,
      minStockThreshold: 10,
    },
    {
      ...sampleProduct,
      id: 'p4',
      name: 'Produto Desativado',
      status: 'inativo',
      stockQuantity: 0,
      minStockThreshold: 5,
    },
  ];

  const alerts = checkStockAlerts(products);
  assert.equal(alerts.length, 2); // p2 esgotado e p1 baixo (p4 inativo ignorado)
  
  const critical = alerts.find((a) => a.productId === 'p2');
  assert.ok(critical);
  assert.equal(critical?.isOutOfStock, true);
  assert.equal(critical?.severity, 'critico');

  const warning = alerts.find((a) => a.productId === 'p1');
  assert.ok(warning);
  assert.equal(warning?.isOutOfStock, false);
  assert.equal(warning?.severity, 'atencao');
  assert.match(warning?.message || '', /Atenção: Necessário repor/);
});

test('REQUISITO 5 & RF04: Baixa automática de estoque após finalização do pedido', () => {
  const products: Product[] = [
    { ...sampleProduct, id: 'p_pao', name: 'Pão de Queijo', stockQuantity: 50 },
    { ...sampleProduct, id: 'p_cafe', name: 'Café Pingado', stockQuantity: 30 },
  ];

  const order: Order = {
    id: 'ord_101',
    orderNumber: 101,
    customerName: 'Renata',
    tableOrTakeaway: 'Mesa 02',
    items: [
      {
        productId: 'p_pao',
        productName: 'Pão de Queijo',
        unitPrice: 6.0,
        costPrice: 2.0,
        quantity: 3,
        subtotal: 18.0,
      },
      {
        productId: 'p_cafe',
        productName: 'Café Pingado',
        unitPrice: 8.0,
        costPrice: 2.5,
        quantity: 2,
        subtotal: 16.0,
      },
    ],
    totalAmount: 34.0,
    totalCost: 11.0,
    status: 'recebido',
    paymentMethod: 'PIX',
    stockDeducted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { updatedProducts, updatedOrder, auditLogs } = deductStockForOrder(
    order,
    products,
    mockAdmin
  );

  assert.equal(updatedOrder.stockDeducted, true);
  const pao = updatedProducts.find((p) => p.id === 'p_pao');
  const cafe = updatedProducts.find((p) => p.id === 'p_cafe');
  assert.equal(pao?.stockQuantity, 47); // 50 - 3
  assert.equal(cafe?.stockQuantity, 28); // 30 - 2
  assert.equal(auditLogs.length, 2);
  assert.match(auditLogs[0].details, /Baixa automática de estoque/);
});

test('REQUISITO 8: Métricas do Dashboard Gerencial calculam faturamento, pedidos e ticket médio', () => {
  const todayStr = '2026-10-16';
  const orders: Order[] = [
    {
      id: 'o1',
      orderNumber: 1,
      customerName: 'Cliente 1',
      tableOrTakeaway: 'Mesa 1',
      items: [],
      totalAmount: 50.0,
      totalCost: 15.0,
      status: 'entregue',
      paymentMethod: 'PIX',
      stockDeducted: true,
      createdAt: `${todayStr}T09:00:00.000Z`,
      updatedAt: `${todayStr}T09:30:00.000Z`,
    },
    {
      id: 'o2',
      orderNumber: 2,
      customerName: 'Cliente 2',
      tableOrTakeaway: 'Balcão',
      items: [],
      totalAmount: 25.0,
      totalCost: 8.0,
      status: 'entregue',
      paymentMethod: 'Cartão de Crédito',
      stockDeducted: true,
      createdAt: `${todayStr}T10:15:00.000Z`,
      updatedAt: `${todayStr}T10:45:00.000Z`,
    },
  ];

  const metrics = calculateDailyMetrics(orders, [sampleProduct], todayStr);
  assert.equal(metrics.todayRevenue, 75.0);
  assert.equal(metrics.todayOrdersCount, 2);
  assert.equal(metrics.todayAverageTicket, 37.5);
  assert.equal(metrics.todayProfit, 52.0); // 75 - 23
});

test('REQUISITO 10: Curva ABC classifica produtos corretamente por faturamento', () => {
  const products: Product[] = [
    { ...sampleProduct, id: 'p1', name: 'Super Campeão de Vendas', stockQuantity: 20 },
    { ...sampleProduct, id: 'p2', name: 'Venda Média', stockQuantity: 15 },
    { ...sampleProduct, id: 'p3', name: 'Item Encalhado', stockQuantity: 10 },
  ];

  const orders: Order[] = [
    {
      id: 'o1',
      orderNumber: 1,
      customerName: 'A',
      tableOrTakeaway: 'Mesa 1',
      items: [
        { productId: 'p1', productName: 'Super Campeão de Vendas', unitPrice: 80, costPrice: 20, quantity: 1, subtotal: 80 },
        { productId: 'p2', productName: 'Venda Média', unitPrice: 15, costPrice: 5, quantity: 1, subtotal: 15 },
        { productId: 'p3', productName: 'Item Encalhado', unitPrice: 5, costPrice: 2, quantity: 1, subtotal: 5 },
      ],
      totalAmount: 100,
      totalCost: 27,
      status: 'entregue',
      paymentMethod: 'PIX',
      stockDeducted: true,
      createdAt: '2026-10-16T10:00:00.000Z',
      updatedAt: '2026-10-16T10:00:00.000Z',
    },
  ];

  const report = generateABCCurveReport(orders, products);
  assert.equal(report.items[0].productId, 'p1');
  assert.equal(report.items[0].classification, 'A');
  assert.equal(report.items[1].productId, 'p2');
  assert.equal(report.items[1].classification, 'B');
  assert.equal(report.items[2].productId, 'p3');
  assert.equal(report.items[2].classification, 'C');
});

test('REQUISITO 10: Relatório de Clientes mais fiéis identifica maiores compradores', () => {
  const orders: Order[] = [
    {
      id: 'o1',
      orderNumber: 1,
      customerName: 'Beatriz Lima',
      tableOrTakeaway: 'Mesa 3',
      items: [{ productId: 'p1', productName: 'Cappuccino Italiano', unitPrice: 15, costPrice: 5, quantity: 2, subtotal: 30 }],
      totalAmount: 30,
      totalCost: 10,
      status: 'entregue',
      paymentMethod: 'PIX',
      stockDeducted: true,
      createdAt: '2026-10-10T14:00:00.000Z',
      updatedAt: '2026-10-10T14:00:00.000Z',
    },
    {
      id: 'o2',
      orderNumber: 2,
      customerName: 'Beatriz Lima',
      tableOrTakeaway: 'Mesa 3',
      items: [{ productId: 'p1', productName: 'Cappuccino Italiano', unitPrice: 15, costPrice: 5, quantity: 3, subtotal: 45 }],
      totalAmount: 45,
      totalCost: 15,
      status: 'entregue',
      paymentMethod: 'PIX',
      stockDeducted: true,
      createdAt: '2026-10-15T15:00:00.000Z',
      updatedAt: '2026-10-15T15:00:00.000Z',
    },
    {
      id: 'o3',
      orderNumber: 3,
      customerName: 'João Santos',
      tableOrTakeaway: 'Balcão',
      items: [{ productId: 'p2', productName: 'Expresso', unitPrice: 6, costPrice: 2, quantity: 1, subtotal: 6 }],
      totalAmount: 6,
      totalCost: 2,
      status: 'entregue',
      paymentMethod: 'Dinheiro',
      stockDeducted: true,
      createdAt: '2026-10-16T08:00:00.000Z',
      updatedAt: '2026-10-16T08:00:00.000Z',
    },
  ];

  const report = generateCustomerReport(orders);
  assert.equal(report[0].customerName, 'Beatriz Lima');
  assert.equal(report[0].totalOrders, 2);
  assert.equal(report[0].totalSpent, 75);
  assert.equal(report[0].averageTicket, 37.5);
  assert.equal(report[0].favoriteProduct, 'Cappuccino Italiano');
  assert.equal(report[1].customerName, 'João Santos');
});

test('KANBAN BARISTA: classifyOrdersForKanban separa nas colunas Pendentes, Em Preparo, Prontos e Entregues', () => {
  const sampleOrders: Order[] = [
    {
      id: 'o_p',
      orderNumber: 101,
      customerName: 'Lucas',
      tableOrTakeaway: 'Mesa 01',
      items: [],
      totalAmount: 20,
      totalCost: 5,
      status: 'recebido',
      paymentMethod: 'PIX',
      stockDeducted: true,
      createdAt: '2026-10-16T10:00:00.000Z',
      updatedAt: '2026-10-16T10:00:00.000Z',
    },
    {
      id: 'o_prep',
      orderNumber: 102,
      customerName: 'Ana',
      tableOrTakeaway: 'Para Levar',
      items: [],
      totalAmount: 30,
      totalCost: 8,
      status: 'preparando',
      paymentMethod: 'Cartão de Crédito',
      stockDeducted: true,
      createdAt: '2026-10-16T09:55:00.000Z',
      updatedAt: '2026-10-16T09:58:00.000Z',
    },
    {
      id: 'o_pronto',
      orderNumber: 103,
      customerName: 'Marcos',
      tableOrTakeaway: 'Mesa 04',
      items: [],
      totalAmount: 15,
      totalCost: 4,
      status: 'pronto',
      paymentMethod: 'PIX',
      stockDeducted: true,
      createdAt: '2026-10-16T09:40:00.000Z',
      updatedAt: '2026-10-16T09:50:00.000Z',
    },
    {
      id: 'o_entregue',
      orderNumber: 104,
      customerName: 'Bruna',
      tableOrTakeaway: 'Delivery',
      items: [],
      totalAmount: 40,
      totalCost: 10,
      status: 'entregue',
      paymentMethod: 'PIX',
      stockDeducted: true,
      createdAt: '2026-10-16T09:00:00.000Z',
      updatedAt: '2026-10-16T09:20:00.000Z',
    },
  ];

  const kanban = classifyOrdersForKanban(sampleOrders);
  assert.equal(kanban.pendentes.length, 1);
  assert.equal(kanban.pendentes[0].id, 'o_p');
  assert.equal(kanban.emPreparo.length, 1);
  assert.equal(kanban.emPreparo[0].id, 'o_prep');
  assert.equal(kanban.prontos.length, 1);
  assert.equal(kanban.prontos[0].id, 'o_pronto');
  assert.equal(kanban.entregues.length, 1);
  assert.equal(kanban.entregues[0].id, 'o_entregue');
});

test('KANBAN BARISTA: formatElapsedTime calcula minutos e nível de urgência corretamente', () => {
  const baseTime = new Date('2026-10-16T10:30:00.000Z');
  
  // 4 minutos atrás
  const fourMinAgo = new Date('2026-10-16T10:26:00.000Z').toISOString();
  const res1 = formatElapsedTime(fourMinAgo, baseTime);
  assert.equal(res1.minutes, 4);
  assert.equal(res1.text, '⏱️ 4 min atrás');
  assert.equal(res1.urgency, 'normal');

  // 10 minutos atrás (moderada)
  const tenMinAgo = new Date('2026-10-16T10:20:00.000Z').toISOString();
  const res2 = formatElapsedTime(tenMinAgo, baseTime);
  assert.equal(res2.minutes, 10);
  assert.equal(res2.urgency, 'moderada');

  // 18 minutos atrás (urgente)
  const eighteenMinAgo = new Date('2026-10-16T10:12:00.000Z').toISOString();
  const res3 = formatElapsedTime(eighteenMinAgo, baseTime);
  assert.equal(res3.minutes, 18);
  assert.equal(res3.urgency, 'urgente');
});

test('KANBAN BARISTA: advanceOrderStatusWithAudit avança de recebido -> preparando -> pronto e gera auditoria', () => {
  const initialOrder: Order = {
    id: 'ord_barista_test',
    orderNumber: 205,
    customerName: 'João Silva',
    tableOrTakeaway: 'Mesa 04',
    items: [],
    totalAmount: 18.5,
    totalCost: 5.0,
    status: 'recebido',
    paymentMethod: 'PIX',
    stockDeducted: true,
    createdAt: '2026-10-16T10:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
  };

  // 1. Iniciar Preparo
  const step1 = advanceOrderStatusWithAudit(initialOrder, mockAdmin);
  assert.equal(step1.updatedOrder.status, 'preparando');
  assert.ok(step1.updatedOrder.startedPreparingAt);
  assert.match(step1.auditLog.details, /avançou Pedido #205 .* de "recebido" para "preparando"/);

  // 2. Finalizar (Pronto)
  const step2 = advanceOrderStatusWithAudit(step1.updatedOrder, mockAdmin);
  assert.equal(step2.updatedOrder.status, 'pronto');
  assert.ok(step2.updatedOrder.readyAt);
  assert.match(step2.auditLog.details, /avançou Pedido #205 .* de "preparando" para "pronto"/);
});

