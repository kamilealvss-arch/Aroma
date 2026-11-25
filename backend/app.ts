import express from 'express';
import { db } from './db/db.ts';
import { processProductImagesForStorage } from './services/storage.ts';
import {
  calculateDailyMetrics,
  calculateLast7DaysSales,
  generateSalesReport,
  generateABCCurveReport,
  generateCustomerReport,
} from '../shared/logic/cafeRules.ts';

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));

  const router = express.Router();

  // ==================== ROTAS DE USUÁRIOS E PERFIL ====================
  router.get('/users', async (req, res) => {
    await db.syncUsers();
    res.json(db.getUsers());
  });

  router.get('/currentUser', async (req, res) => {
    await db.syncUsers();
    res.json(db.getCurrentUser());
  });

  router.post('/switchUser', async (req, res) => {
    await db.syncUsers();
    const { userId } = req.body;
    try {
      const user = db.setCurrentUser(userId);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== ROTAS DE PRODUTOS ====================
  // 1. Gestão de Produtos (Cardápio) com ETag / 304 para evitar reenvio de imagens
  router.get('/products', async (req, res) => {
    await db.syncProductsFull();
    const includeInactive = req.query.includeInactive === 'true';
    const etag = db.getProductsEtag(includeInactive);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, no-cache');

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.json(db.getProducts(includeInactive));
  });

  router.post('/products', async (req, res) => {
    try {
      await Promise.all([db.syncUsers(), db.syncProductsMetadata()]);
      const productIdHint = req.body?.id || `prod_${Date.now()}`;
      const preparedBody = await processProductImagesForStorage(req.body, productIdHint);
      const product = db.createProduct(preparedBody);
      await db.flushPendingOps();
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/products/:id', async (req, res) => {
    try {
      await Promise.all([
        db.syncUsers(),
        db.syncProductsMetadata(!db.getProductById(req.params.id)),
      ]);
      const preparedBody = await processProductImagesForStorage(req.body, req.params.id);
      const product = db.updateProduct(req.params.id, preparedBody);
      await db.flushPendingOps();
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ⭐ REQUISITO 4 (PONTO DE OURO): Exclusão Lógica
  router.delete('/products/:id', async (req, res) => {
    try {
      await Promise.all([
        db.syncUsers(),
        db.syncProductsMetadata(!db.getProductById(req.params.id)),
      ]);
      const product = db.softDeleteProduct(req.params.id);
      await db.flushPendingOps();
      res.json({
        message: 'Produto desativado com sucesso (exclusão lógica). O histórico de vendas foi mantido.',
        product,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/products/:id/restore', async (req, res) => {
    try {
      await Promise.all([
        db.syncUsers(),
        db.syncProductsMetadata(!db.getProductById(req.params.id)),
      ]);
      const product = db.restoreProduct(req.params.id);
      await db.flushPendingOps();
      res.json({
        message: 'Produto reativado com sucesso no cardápio.',
        product,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== ROTAS DE ESTOQUE ====================
  // 2. Controle de Estoque Inteligente (Requisito 19 - RF04)
  router.post('/products/:id/stock', async (req, res) => {
    const { newStock, reason } = req.body;
    try {
      await Promise.all([
        db.syncUsers(),
        db.syncProductsMetadata(!db.getProductById(req.params.id)),
      ]);
      const product = db.adjustStock(req.params.id, Number(newStock), reason);
      await db.flushPendingOps();
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/stock/alerts', async (req, res) => {
    await db.syncProductsMetadata();
    res.json(db.getStockAlerts());
  });

  // ==================== ROTAS DE INGREDIENTES E MATÉRIAS-PRIMAS ====================
  router.get('/ingredients', async (req, res) => {
    await db.syncIngredients();
    res.json(db.getIngredients());
  });

  router.post('/ingredients', async (req, res) => {
    try {
      await Promise.all([db.syncUsers(), db.syncIngredients()]);
      const ingredient = db.createIngredient(req.body);
      await db.flushPendingOps();
      res.status(201).json(ingredient);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/ingredients/:id/stock', async (req, res) => {
    const { newStock, reason } = req.body;
    try {
      await Promise.all([
        db.syncUsers(),
        db.syncIngredients(!db.getIngredientById(req.params.id)),
      ]);
      const ingredient = db.adjustIngredientStock(req.params.id, Number(newStock), reason);
      await db.flushPendingOps();
      res.json(ingredient);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== ROTAS DE PEDIDOS ====================
  router.get('/orders', async (req, res) => {
    await db.syncOrders();
    res.json(db.getOrders());
  });

  // REQUISITO 5 & RF04: Criação do pedido com baixa automática no estoque
  router.post('/orders', async (req, res) => {
    try {
      await Promise.all([db.syncUsers(), db.syncProductsMetadata(), db.syncOrders(true)]);
      const order = db.createOrder(req.body);
      await db.flushPendingOps();
      res.status(201).json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/orders/:id/status', async (req, res) => {
    try {
      await Promise.all([
        db.syncUsers(),
        db.syncOrders(!db.getOrderById(req.params.id)),
      ]);
      const order = db.updateOrderStatus(req.params.id, req.body.status);
      await db.flushPendingOps();
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== SINCRONIZAÇÃO LEVE EM TEMPO REAL (SEM IMAGENS) ====================
  router.get('/sync/live', async (req, res) => {
    await Promise.all([db.syncOrders(), db.syncProductsMetadata()]);
    const orders = db.getOrders();
    const products = db.getProducts(true);
    const metrics = calculateDailyMetrics(orders, products);
    const last7Days = calculateLast7DaysSales(orders);
    const alerts = db.getStockAlerts();
    const recentOrders = orders.slice(0, 6);
    const productsMeta = db.getProductsMeta(true);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      orders,
      dashboard: {
        metrics,
        last7Days,
        alerts,
        recentOrders,
      },
      productsMeta,
    });
  });

  // ==================== DASHBOARD GERENCIAL ====================
  // 3. Dashboard Gerencial (Requisito 8)
  router.get('/dashboard', async (req, res) => {
    await Promise.all([db.syncOrders(), db.syncProductsMetadata()]);
    const orders = db.getOrders();
    const products = db.getProducts(true);
    const metrics = calculateDailyMetrics(orders, products);
    const last7Days = calculateLast7DaysSales(orders);
    const alerts = db.getStockAlerts();
    const recentOrders = orders.slice(0, 6);

    res.json({
      metrics,
      last7Days,
      alerts,
      recentOrders,
    });
  });

  // ==================== ÁREA DE RELATÓRIOS ====================
  // 4. Área de Relatórios (Requisito 10)
  router.get('/reports/sales', async (req, res) => {
    await db.syncOrders();
    const { start, end } = req.query as { start?: string; end?: string };
    const orders = db.getOrders();
    const report = generateSalesReport(orders, start, end);
    res.json(report);
  });

  router.get('/reports/abc-curve', async (req, res) => {
    await Promise.all([db.syncOrders(), db.syncProductsMetadata()]);
    const orders = db.getOrders();
    const products = db.getProducts(true);
    const report = generateABCCurveReport(orders, products);
    res.json(report);
  });

  router.get('/reports/customers', async (req, res) => {
    await db.syncOrders();
    const orders = db.getOrders();
    const report = generateCustomerReport(orders);
    res.json(report);
  });

  // ==================== AUDITORIA DE SEGURANÇA ====================
  // 5. Auditoria de Segurança (Requisito 11)
  router.get('/audit-logs', async (req, res) => {
    await db.syncAuditLogs();
    const { type, search } = req.query as { type?: string; search?: string };
    const logs = db.getAuditLogs(type, search);
    res.json(logs);
  });

  // Diagnóstico de conexão e sincronização com o banco de dados PostgreSQL / Supabase
  router.get('/health-db', async (req, res) => {
    try {
      const status = await db.getHealthStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // Reset para dados de demonstração
  router.post('/reset-demo', (req, res) => {
    db.resetToDefaults();
    res.json({ message: 'Dados restaurados com sucesso para os padrões originais.' });
  });

  // Monta as rotas em /api e também como raiz para suportar chamadas com ou sem prefixo
  app.use('/api', router);
  app.use('/', router);

  return app;
}

export const app = createExpressApp();
