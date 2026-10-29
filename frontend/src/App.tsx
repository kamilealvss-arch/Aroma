import React, { useState, useEffect } from 'react';
import { api } from './services/api.ts';
import {
  Product,
  SystemUser,
  Order,
  StockAlert,
  DailyDashboardMetrics,
  DaySalesSummary,
} from '../../shared/types/index.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { StockView } from './components/StockView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { AuditView } from './components/AuditView.tsx';
import { KanbanView } from './components/KanbanView.tsx';
import { ClientMenuView } from './components/ClientMenuView.tsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'admin' | 'client'>('admin');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'kanban' | 'products' | 'stock' | 'reports' | 'audit'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [metrics, setMetrics] = useState<DailyDashboardMetrics>({
    todayRevenue: 0,
    todayOrdersCount: 0,
    todayAverageTicket: 0,
    todayProfit: 0,
    lowStockAlertsCount: 0,
    outOfStockCount: 0,
  });
  const [last7Days, setLast7Days] = useState<DaySalesSummary[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Carrega todos os dados necessários
  const refreshAllData = async () => {
    try {
      const [prods, usr, userList, dashData, allOrders] = await Promise.all([
        api.getProducts(true), // Traz todos inclusive inativos para gestão do admin
        api.getCurrentUser(),
        api.getUsers(),
        api.getDashboardData(),
        api.getOrders(),
      ]);

      setProducts(prods);
      setCurrentUser(usr);
      setUsers(userList);
      setMetrics(dashData.metrics);
      setLast7Days(dashData.last7Days);
      setAlerts(dashData.alerts);
      setRecentOrders(dashData.recentOrders);
      setOrders(allOrders);
    } catch (err) {
      console.error('Erro ao sincronizar dados:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
    // Sincronização contínua em tempo real (Barista Kanban <-> Celular do Cliente)
    const interval = setInterval(() => {
      refreshAllData();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // CRUD & Ações de Produtos
  const handleCreateProduct = async (data: Partial<Product>) => {
    try {
      await api.createProduct(data);
      showToast('Produto cadastrado com sucesso no cardápio!');
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await api.updateProduct(id, updates);
      showToast('Produto atualizado com sucesso! (Registrado na auditoria)');
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // ⭐ REQUISITO 4 (PONTO DE OURO): Exclusão Lógica
  const handleSoftDeleteProduct = async (id: string) => {
    try {
      const res = await api.softDeleteProduct(id);
      showToast('Exclusão lógica realizada: Produto inativado sem apagar histórico!', 'info');
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleRestoreProduct = async (id: string) => {
    try {
      await api.restoreProduct(id);
      showToast('Produto reativado no cardápio do cliente!');
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Estoque
  const handleAdjustStock = async (id: string, newStock: number, reason?: string) => {
    try {
      await api.adjustStock(id, newStock, reason);
      showToast(`Estoque atualizado para ${newStock} unidades!`);
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleQuickRestock = async (productId: string, quantityToAdd: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    await handleAdjustStock(
      productId,
      prod.stockQuantity + quantityToAdd,
      `Reposição rápida de balcão (+${quantityToAdd} un.)`
    );
  };

  // Pedidos
  const handleCreateOrder = async (orderData: {
    customerName: string;
    customerPhone?: string;
    tableOrTakeaway: string;
    paymentMethod: Order['paymentMethod'];
    items: Array<{ productId: string; quantity: number }>;
  }) => {
    try {
      const order = await api.createOrder(orderData);
      showToast(`Pedido #${order.orderNumber} realizado com sucesso! Baixa de estoque efetuada.`);
      await refreshAllData();
      return order;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const nowIso = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: nowIso } : o))
      );
      await api.updateOrderStatus(orderId, newStatus);
      showToast(`Status do pedido atualizado para "${newStatus}"!`);
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
      await refreshAllData();
    }
  };

  // Troca de usuário logado (para testar a auditoria em nome de Carlos - Sub-gerente, Maria - Admin, etc.)
  const handleSwitchUser = async (userId: string) => {
    try {
      const user = await api.switchUser(userId);
      setCurrentUser(user);
      showToast(`Perfil alterado para ${user.name} (${user.role}). Ações serão auditadas em seu nome!`, 'info');
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleResetDemo = async () => {
    if (confirm('Deseja restaurar os dados de demonstração originais?')) {
      await api.resetDemo();
      await refreshAllData();
      showToast('Dados restaurados com sucesso para os padrões iniciais!', 'info');
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status === 'recebido' || o.status === 'preparando'
  ).length;

  return (
    <div className="min-h-screen bg-white flex font-sans">
      {/* Sidebar Lateral com Recorte Curvo e Perfis */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        adminTab={adminTab}
        onAdminTabChange={setAdminTab}
        currentUser={currentUser}
        users={users}
        onSwitchUser={handleSwitchUser}
        alerts={alerts}
        activeOrdersCount={activeOrdersCount}
        onResetDemo={handleResetDemo}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'admin' ? (
          <div>
            {adminTab === 'dashboard' && (
              <DashboardView
                metrics={metrics}
                last7Days={last7Days}
                alerts={alerts}
                recentOrders={recentOrders}
                onQuickRestock={handleQuickRestock}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onNavigateToTab={(tab) => setAdminTab(tab as any)}
              />
            )}

            {adminTab === 'kanban' && (
              <KanbanView
                orders={orders}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onRefresh={refreshAllData}
              />
            )}

            {adminTab === 'products' && (
              <ProductsView
                products={products}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onSoftDeleteProduct={handleSoftDeleteProduct}
                onRestoreProduct={handleRestoreProduct}
              />
            )}

            {adminTab === 'stock' && (
              <StockView
                products={products}
                alerts={alerts}
                onAdjustStock={handleAdjustStock}
                onRefresh={refreshAllData}
              />
            )}

            {adminTab === 'reports' && <ReportsView />}

            {adminTab === 'audit' && <AuditView />}
          </div>
        ) : (
          /* Visão do Cardápio do Cliente com Acompanhamento em Tempo Real */
          <ClientMenuView
            products={products}
            orders={orders}
            onCreateOrder={handleCreateOrder}
            onOrderSuccess={refreshAllData}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border ${
              toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : toast.type === 'info'
                ? 'bg-amber-900 text-white border-amber-700'
                : 'bg-stone-900 text-white border-stone-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
