import express from 'express';
import { db } from './db/db.ts';
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
  router.get('/users', (req, res) => {
    res.json(db.getUsers());
  });

  router.get('/currentUser', (req, res) => {
    res.json(db.getCurrentUser());
  });

  router.post('/switchUser', (req, res) => {
    const { userId } = req.body;
    try {
      const user = db.setCurrentUser(userId);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== ROTAS DE PRODUTOS ====================
  // 1. Gestão de Produtos (Cardápio)
  router.get('/products', (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    res.json(db.getProducts(includeInactive));
  });

  router.post('/products', (req, res) => {
    try {
      const product = db.createProduct(req.body);
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/products/:id', (req, res) => {
    try {
      const product = db.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ⭐ REQUISITO 4 (PONTO DE OURO): Exclusão Lógica
  router.delete('/products/:id', (req, res) => {
    try {
      const product = db.softDeleteProduct(req.params.id);
      res.json({
        message: 'Produto desativado com sucesso (exclusão lógica). O histórico de vendas foi mantido.',
        product,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/products/:id/restore', (req, res) => {
    try {
      const product = db.restoreProduct(req.params.id);
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
  router.post('/products/:id/stock', (req, res) => {
    const { newStock, reason } = req.body;
    try {
      const product = db.adjustStock(req.params.id, Number(newStock), reason);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/stock/alerts', (req, res) => {
    res.json(db.getStockAlerts());
  });

  // ==================== ROTAS DE INGREDIENTES E MATÉRIAS-PRIMAS ====================
  router.get('/ingredients', (req, res) => {
    res.json(db.getIngredients());
  });

  router.post('/ingredients/:id/stock', (req, res) => {
    const { newStock, reason } = req.body;
    try {
      const ingredient = db.adjustIngredientStock(req.params.id, Number(newStock), reason);
      res.json(ingredient);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== ROTAS DE PEDIDOS ====================
  router.get('/orders', (req, res) => {
    res.json(db.getOrders());
  });

  // REQUISITO 5 & RF04: Criação do pedido com baixa automática no estoque
  router.post('/orders', (req, res) => {
    try {
      const order = db.createOrder(req.body);
      res.status(201).json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/orders/:id/status', (req, res) => {
    try {
      const order = db.updateOrderStatus(req.params.id, req.body.status);
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== DASHBOARD GERENCIAL ====================
  // 3. Dashboard Gerencial (Requisito 8)
  router.get('/dashboard', (req, res) => {
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
  router.get('/reports/sales', (req, res) => {
    const { start, end } = req.query as { start?: string; end?: string };
    const orders = db.getOrders();
    const report = generateSalesReport(orders, start, end);
    res.json(report);
  });

  router.get('/reports/abc-curve', (req, res) => {
    const orders = db.getOrders();
    const products = db.getProducts(true);
    const report = generateABCCurveReport(orders, products);
    res.json(report);
  });

  router.get('/reports/customers', (req, res) => {
    const orders = db.getOrders();
    const report = generateCustomerReport(orders);
    res.json(report);
  });

  // ==================== AUDITORIA DE SEGURANÇA ====================
  // 5. Auditoria de Segurança (Requisito 11)
  router.get('/audit-logs', (req, res) => {
    const { type, search } = req.query as { type?: string; search?: string };
    const logs = db.getAuditLogs(type, search);
    res.json(logs);
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
