import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/db.ts';
import {
  calculateDailyMetrics,
  calculateLast7DaysSales,
  generateSalesReport,
  generateABCCurveReport,
  generateCustomerReport,
} from '../shared/logic/cafeRules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // ==================== ROTAS DE USUÁRIOS E PERFIL ====================
  app.get('/api/users', (req, res) => {
    res.json(db.getUsers());
  });

  app.get('/api/currentUser', (req, res) => {
    res.json(db.getCurrentUser());
  });

  app.post('/api/switchUser', (req, res) => {
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
  app.get('/api/products', (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    res.json(db.getProducts(includeInactive));
  });

  app.post('/api/products', (req, res) => {
    try {
      const product = db.createProduct(req.body);
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const product = db.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ⭐ REQUISITO 4 (PONTO DE OURO): Exclusão Lógica
  app.delete('/api/products/:id', (req, res) => {
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

  app.post('/api/products/:id/restore', (req, res) => {
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
  app.post('/api/products/:id/stock', (req, res) => {
    const { newStock, reason } = req.body;
    try {
      const product = db.adjustStock(req.params.id, Number(newStock), reason);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/stock/alerts', (req, res) => {
    res.json(db.getStockAlerts());
  });

  // ==================== ROTAS DE PEDIDOS ====================
  app.get('/api/orders', (req, res) => {
    res.json(db.getOrders());
  });

  // REQUISITO 5 & RF04: Criação do pedido com baixa automática no estoque
  app.post('/api/orders', (req, res) => {
    try {
      const order = db.createOrder(req.body);
      res.status(201).json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    try {
      const order = db.updateOrderStatus(req.params.id, req.body.status);
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==================== DASHBOARD GERENCIAL ====================
  // 3. Dashboard Gerencial (Requisito 8)
  app.get('/api/dashboard', (req, res) => {
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
  app.get('/api/reports/sales', (req, res) => {
    const { start, end } = req.query as { start?: string; end?: string };
    const orders = db.getOrders();
    const report = generateSalesReport(orders, start, end);
    res.json(report);
  });

  app.get('/api/reports/abc-curve', (req, res) => {
    const orders = db.getOrders();
    const products = db.getProducts(true);
    const report = generateABCCurveReport(orders, products);
    res.json(report);
  });

  app.get('/api/reports/customers', (req, res) => {
    const orders = db.getOrders();
    const report = generateCustomerReport(orders);
    res.json(report);
  });

  // ==================== AUDITORIA DE SEGURANÇA ====================
  // 5. Auditoria de Segurança (Requisito 11)
  app.get('/api/audit-logs', (req, res) => {
    const { type, search } = req.query as { type?: string; search?: string };
    const logs = db.getAuditLogs(type, search);
    res.json(logs);
  });

  // Reset para dados de demonstração
  app.post('/api/reset-demo', (req, res) => {
    db.resetToDefaults();
    res.json({ message: 'Dados restaurados com sucesso para os padrões originais.' });
  });

  const ROOT_DIR = path.resolve(__dirname, '..');
  const FRONTEND_DIR = path.resolve(ROOT_DIR, 'frontend');
  const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

  // Integração com Vite SPA
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(DIST_DIR, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      configFile: path.resolve(ROOT_DIR, 'vite.config.ts'),
      root: FRONTEND_DIR,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aroma (Café Gourmet Pro) server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
