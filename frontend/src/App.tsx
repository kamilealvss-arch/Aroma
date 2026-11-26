import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './services/api.ts';
import {
  Product,
  SystemUser,
  Order,
  StockAlert,
  DailyDashboardMetrics,
  DaySalesSummary,
  Ingredient,
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
  const [clientCategory, setClientCategory] = useState<string>('HOME');
  const [clientSubcategory, setClientSubcategory] = useState<string>('ALL');

  const handleClientCategoryChange = (cat: string) => {
    setClientCategory(cat);
    setClientSubcategory('ALL');
  };
  const [orders, setOrders] = useState<Order[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
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

  const productsRef = useRef<Product[]>([]);
  const isSyncingRef = useRef<boolean>(false);
  const lastSyncAtRef = useRef<number>(0);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Carga inicial completa (executada 1x ao abrir ou ao resetar dados)
  const loadInitialData = useCallback(async (forceProducts: boolean = false) => {
    try {
      const [prods, ings, userList, liveData] = await Promise.all([
        api.getProducts(true, forceProducts),
        api.getIngredients(),
        api.getUsers(),
        api.getLiveSync(),
      ]);
      const usr = await api.getCurrentUser(userList);

      productsRef.current = prods;
      setProducts(prods);
      setIngredients(ings);
      setUsers(userList);
      setCurrentUser(usr);
      setMetrics(liveData.dashboard.metrics);
      setLast7Days(liveData.dashboard.last7Days);
      setAlerts(liveData.dashboard.alerts);
      setRecentOrders(liveData.dashboard.recentOrders);
      setOrders(liveData.orders);
      lastSyncAtRef.current = Date.now();
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    }
  }, []);

  // Sincronização leve em tempo real (apenas pedidos, dashboard e metadados sem imagens)
  const syncLiveData = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const liveData = await api.getLiveSync();
      lastSyncAtRef.current = Date.now();

      setMetrics(liveData.dashboard.metrics);
      setLast7Days(liveData.dashboard.last7Days);
      setAlerts(liveData.dashboard.alerts);
      setRecentOrders(liveData.dashboard.recentOrders);
      setOrders(liveData.orders);

      const knownIds = new Set(productsRef.current.map((p) => p.id));
      const hasNewProduct = liveData.productsMeta.some((meta) => !knownIds.has(meta.id));

      if (hasNewProduct) {
        const freshProducts = await api.getProducts(true, true);
        productsRef.current = freshProducts;
        setProducts(freshProducts);
      } else {
        setProducts((prev) => {
          const prevMap = new Map(prev.map((p) => [p.id, p]));
          const merged: Product[] = liveData.productsMeta.map((meta) => {
            const existing = prevMap.get(meta.id);
            return {
              ...meta,
              imageUrl: existing?.imageUrl || '',
              cutoutImageUrl: existing?.cutoutImageUrl,
            };
          });
          productsRef.current = merged;
          return merged;
        });
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados em tempo real:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const refreshProductsAndLive = useCallback(async () => {
    const freshProducts = await api.getProducts(true, true);
    const prevMap = new Map(productsRef.current.map((p) => [p.id, p]));
    const safeProducts = freshProducts.map((p) => {
      const existing = prevMap.get(p.id);
      if (!existing) return p;
      return {
        ...p,
        imageUrl: p.imageUrl || existing.imageUrl,
        cutoutImageUrl: p.cutoutImageUrl ?? existing.cutoutImageUrl,
      };
    });
    productsRef.current = safeProducts;
    setProducts(safeProducts);
    await syncLiveData();
  }, [syncLiveData]);

  useEffect(() => {
    loadInitialData(false);
  }, [loadInitialData]);

  const hasActiveOrder = orders.some(
    (o) => o.status === 'recebido' || o.status === 'preparando' || o.status === 'pronto'
  );

  // Polling adaptativo que pausa automaticamente quando a aba está oculta
  useEffect(() => {
    const isActiveMode =
      (currentView === 'admin' && adminTab === 'kanban') ||
      (currentView === 'client' && hasActiveOrder);
    const intervalMs = isActiveMode ? 12_000 : 30_000;

    const interval = setInterval(() => {
      if (document.hidden) return;
      syncLiveData();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastSyncAtRef.current >= 10_000) {
        syncLiveData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentView, adminTab, hasActiveOrder, syncLiveData]);

  // CRUD & Ações de Produtos
  const handleCreateProduct = async (data: Partial<Product>) => {
    try {
      await api.createProduct(data);
      showToast('Produto cadastrado com sucesso no cardápio!');
      await refreshProductsAndLive();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await api.updateProduct(id, updates);
      if (updates.isWeeklySpecial) {
        showToast('Novo Especial da Semana definido no cardápio!');
      } else {
        showToast('Produto atualizado com sucesso! (Registrado na auditoria)');
      }
      await refreshProductsAndLive();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleBatchUpdateProducts = async (
    updatesList: Array<{ id: string; updates: Partial<Product> }>,
    successMessage?: string
  ) => {
    try {
      for (const item of updatesList) {
        await api.updateProduct(item.id, item.updates);
      }
      if (updatesList.length > 0) {
        await refreshProductsAndLive();
      }
      if (successMessage) {
        showToast(successMessage);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar produtos.', 'error');
      throw err;
    }
  };

  // ⭐ REQUISITO 4 (PONTO DE OURO): Exclusão Lógica
  const handleSoftDeleteProduct = async (id: string) => {
    try {
      await api.softDeleteProduct(id);
      showToast('Exclusão lógica realizada: Produto inativado sem apagar histórico!', 'info');
      await refreshProductsAndLive();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleRestoreProduct = async (id: string) => {
    try {
      await api.restoreProduct(id);
      showToast('Produto reativado no cardápio do cliente!');
      await refreshProductsAndLive();
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
      await refreshProductsAndLive();
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleAdjustIngredientStock = async (id: string, newStock: number, reason?: string) => {
    try {
      const ing = await api.adjustIngredientStock(id, newStock, reason);
      showToast(`Estoque de "${ing.name}" atualizado para ${newStock} ${ing.unit}!`);
      const freshIngredients = await api.getIngredients();
      setIngredients(freshIngredients);
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleCreateIngredient = async (data: Omit<Ingredient, 'id' | 'updatedAt'>) => {
    try {
      const ing = await api.createIngredient(data);
      showToast(`Insumo "${ing.name}" cadastrado com sucesso!`);
      const freshIngredients = await api.getIngredients();
      setIngredients(freshIngredients);
      return ing;
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
    items: Array<{ productId: string; quantity: number; notes?: string; selectedSize?: string }>;
  }) => {
    try {
      const order = await api.createOrder(orderData);
      showToast(`Pedido #${order.orderNumber} realizado com sucesso! Baixa de estoque efetuada.`);
      await syncLiveData();
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
      await syncLiveData();
    } catch (err: any) {
      showToast(err.message, 'error');
      await syncLiveData();
    }
  };

  // Troca de perfil / usuário: Suporta alternar entre equipe do café (Admin/Sub/Barista) e Cliente (Cardápio)
  const handleSwitchUser = async (userId: string) => {
    if (userId === 'usr_cliente') {
      setCurrentView('client');
      showToast('Visualizando Cardápio Digital do Cliente!', 'info');
      return;
    }
    try {
      const user = await api.switchUser(userId);
      setCurrentUser(user);
      setCurrentView('admin');
      showToast(`Perfil alterado para ${user.name} (${user.role}). Ações serão auditadas em seu nome!`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Retorno rápido ao painel administrativo
  const handleBackToAdmin = () => {
    setCurrentView('admin');
    showToast('Retornou ao Painel Administrativo.', 'info');
  };

  const handleResetDemo = async () => {
    if (confirm('Deseja restaurar os dados de demonstração originais?')) {
      await api.resetDemo();
      await loadInitialData(true);
      showToast('Dados restaurados com sucesso para os padrões iniciais!', 'info');
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status === 'recebido' || o.status === 'preparando'
  ).length;

  return (
    <div className="min-h-screen bg-stone-50 md:bg-white flex flex-col md:flex-row font-sans w-full max-w-full">
      {/* Sidebar Lateral com Recorte Curvo, Categorias Dinâmicas e Troca de Perfil */}
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
        clientCategory={clientCategory}
        onClientCategoryChange={handleClientCategoryChange}
        clientSubcategory={clientSubcategory}
        onClientSubcategoryChange={setClientSubcategory}
        products={products}
        onBackToAdmin={handleBackToAdmin}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-6">
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
                onRefresh={syncLiveData}
              />
            )}

            {adminTab === 'products' && (
              <ProductsView
                products={products}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onBatchUpdateProducts={handleBatchUpdateProducts}
                onSoftDeleteProduct={handleSoftDeleteProduct}
                onRestoreProduct={handleRestoreProduct}
              />
            )}

            {adminTab === 'stock' && (
              <StockView
                products={products}
                ingredients={ingredients}
                alerts={alerts}
                onAdjustStock={handleAdjustStock}
                onAdjustIngredientStock={handleAdjustIngredientStock}
                onCreateIngredient={handleCreateIngredient}
                onRefresh={async () => {
                  const freshIngredients = await api.getIngredients();
                  setIngredients(freshIngredients);
                  await syncLiveData();
                }}
              />
            )}

            {adminTab === 'reports' && <ReportsView />}

            {adminTab === 'audit' && <AuditView />}
          </div>
        ) : (
          /* Visão do Cardápio do Cliente com Acompanhamento em Tempo Real e Categorias Laterais */
          <ClientMenuView
            products={products}
            orders={orders}
            onCreateOrder={handleCreateOrder}
            onOrderSuccess={syncLiveData}
            selectedCategory={clientCategory}
            onSelectCategory={handleClientCategoryChange}
            selectedSubcategory={clientSubcategory}
            onSelectSubcategory={setClientSubcategory}
            onBackToAdmin={handleBackToAdmin}
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
