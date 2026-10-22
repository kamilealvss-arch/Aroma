import React, { useState } from 'react';
import {
  Home,
  ChefHat,
  BarChart3,
  ShoppingCart,
  Coffee,
  Package,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SystemUser, StockAlert } from '../../../shared/types/index.ts';

export type AdminTabType = 'dashboard' | 'kanban' | 'products' | 'stock' | 'reports' | 'audit';

interface SidebarProps {
  currentView: 'admin' | 'client';
  onViewChange: (view: 'admin' | 'client') => void;
  adminTab: AdminTabType;
  onAdminTabChange: (tab: AdminTabType) => void;
  currentUser: SystemUser | null;
  users: SystemUser[];
  onSwitchUser: (userId: string) => void;
  alerts: StockAlert[];
  activeOrdersCount?: number;
  onResetDemo: () => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  circleBg: string;
  activeText: string;
  badge?: number;
  badgeColor?: string;
  onClick: () => void;
  isActive: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  adminTab,
  onAdminTabChange,
  currentUser,
  users,
  onSwitchUser,
  alerts,
  activeOrdersCount = 0,
  onResetDemo,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const criticalCount = alerts.filter((a) => a.isOutOfStock).length;
  const warningCount = alerts.filter((a) => !a.isOutOfStock).length;
  const totalAlerts = criticalCount + warningCount;

  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'HOME',
      icon: Home,
      circleBg: 'bg-[#f04438]',
      activeText: 'text-[#f04438]',
      badge: criticalCount > 0 ? criticalCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      isActive: currentView === 'admin' && adminTab === 'dashboard',
      onClick: () => {
        onViewChange('admin');
        onAdminTabChange('dashboard');
      },
    },
    {
      id: 'products',
      label: 'PRODUTOS',
      icon: Coffee,
      circleBg: 'bg-[#f59e0b]',
      activeText: 'text-[#f59e0b]',
      isActive: currentView === 'admin' && adminTab === 'products',
      onClick: () => {
        onViewChange('admin');
        onAdminTabChange('products');
      },
    },
    {
      id: 'kanban',
      label: 'COMANDAS',
      icon: ChefHat,
      circleBg: 'bg-[#12b76a]',
      activeText: 'text-[#12b76a]',
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
      isActive: currentView === 'admin' && adminTab === 'kanban',
      onClick: () => {
        onViewChange('admin');
        onAdminTabChange('kanban');
      },
    },
    {
      id: 'reports',
      label: 'ANALYTICS',
      icon: BarChart3,
      circleBg: 'bg-[#0ea5e9]',
      activeText: 'text-[#0ea5e9]',
      isActive: currentView === 'admin' && adminTab === 'reports',
      onClick: () => {
        onViewChange('admin');
        onAdminTabChange('reports');
      },
    },
    {
      id: 'client',
      label: 'CARDÁPIO',
      icon: ShoppingCart,
      circleBg: 'bg-[#9b51e0]',
      activeText: 'text-[#9b51e0]',
      isActive: currentView === 'client',
      onClick: () => {
        onViewChange('client');
      },
    },
    {
      id: 'stock',
      label: 'ESTOQUE',
      icon: Package,
      circleBg: 'bg-[#f97316]',
      activeText: 'text-[#f97316]',
      badge: totalAlerts > 0 ? totalAlerts : undefined,
      badgeColor: 'bg-amber-500 text-stone-950',
      isActive: currentView === 'admin' && adminTab === 'stock',
      onClick: () => {
        onViewChange('admin');
        onAdminTabChange('stock');
      },
    },
    {
      id: 'audit',
      label: 'AUDITORIA',
      icon: Shield,
      circleBg: 'bg-[#6366f1]',
      activeText: 'text-[#6366f1]',
      isActive: currentView === 'admin' && adminTab === 'audit',
      onClick: () => {
        onViewChange('admin');
        onAdminTabChange('audit');
      },
    },
  ];

  return (
    <aside
      className="sticky top-0 h-screen shrink-0 z-40 flex bg-[#161821] pr-3.5 select-none shadow-2xl"
      aria-label="Menu Lateral"
    >
      {/* Barra Branca Principal com recortes curvos para o item ativo */}
      <div
        className={`${
          isCollapsed ? 'w-[76px]' : 'w-[248px]'
        } bg-white h-full flex flex-col justify-between transition-all duration-300 ease-in-out relative`}
      >
        {/* Botão de Expandir / Recolher na borda */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          className="absolute -right-5 top-6 z-50 w-6 h-6 rounded-full bg-[#161821] border border-stone-700 text-stone-200 hover:text-amber-400 flex items-center justify-center shadow-md transition-transform hover:scale-110"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Topo: Logo da Marca */}
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="pt-7 pb-4 flex items-center cursor-pointer group"
          title="Clique para alternar tamanho da barra"
        >
          <div className="w-[76px] shrink-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-sm group-hover:bg-amber-600 transition-colors">
              <Coffee className="w-5 h-5" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap pr-4">
              <span className="text-[13px] font-extrabold tracking-[0.2em] text-stone-800 uppercase block">
                AROMA CAFÉ
              </span>
              <span className="text-[10px] font-medium tracking-widest text-stone-400 uppercase block">
                Gestão & Cardápio
              </span>
            </div>
          )}
        </div>

        {/* Lista de Navegação com Recorte Curvo no Item Ativo */}
        <nav className="flex-1 flex flex-col justify-center space-y-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            if (active) {
              return (
                <div key={item.id} className="relative my-1">
                  {/* Curva Côncava Superior Direita */}
                  <span
                    className="pointer-events-none absolute -top-[20px] right-0 w-[20px] h-[20px] bg-transparent rounded-br-[20px] shadow-[6px_6px_0_6px_#161821] z-10"
                    aria-hidden="true"
                  />
                  {/* Curva Côncava Inferior Direita */}
                  <span
                    className="pointer-events-none absolute -bottom-[20px] right-0 w-[20px] h-[20px] bg-transparent rounded-tr-[20px] shadow-[6px_-6px_0_6px_#161821] z-10"
                    aria-hidden="true"
                  />

                  {/* Pílula Escura do Item Ativo */}
                  <button
                    onClick={item.onClick}
                    title={isCollapsed ? item.label : undefined}
                    className="w-[calc(100%-10px)] ml-[10px] h-[56px] bg-[#161821] rounded-l-full relative z-20 flex items-center text-left transition-all"
                  >
                    {/* Círculo Colorido de Destaque */}
                    <div
                      className={`ml-[6px] w-[44px] h-[44px] rounded-full ${item.circleBg} flex items-center justify-center text-white shrink-0 shadow-md relative`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                      {isCollapsed && item.badge !== undefined && (
                        <span
                          className={`absolute -top-1 -right-1 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ${item.badgeColor} shadow`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Texto do Item Ativo */}
                    {!isCollapsed && (
                      <div className="ml-4 pr-4 flex items-center justify-between flex-1 overflow-hidden whitespace-nowrap">
                        <span
                          className={`text-[12px] font-bold tracking-[0.14em] uppercase ${item.activeText}`}
                        >
                          {item.label}
                        </span>
                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              );
            }

            return (
              <div key={item.id} className="relative">
                <button
                  onClick={item.onClick}
                  title={isCollapsed ? item.label : undefined}
                  className="w-full h-[50px] flex items-center text-stone-500 hover:text-stone-900 transition-colors group"
                >
                  <div className="w-[76px] shrink-0 flex items-center justify-center relative">
                    <Icon className="w-5 h-5 stroke-[1.75] group-hover:scale-110 transition-transform" />
                    {isCollapsed && item.badge !== undefined && (
                      <span
                        className={`absolute top-0 right-4 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="pr-5 flex items-center justify-between flex-1 overflow-hidden whitespace-nowrap">
                      <span className="text-[12px] font-medium tracking-[0.14em] uppercase text-stone-600 group-hover:text-stone-950">
                        {item.label}
                      </span>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Rodapé: Perfil do Usuário e Ação de Logout / Reset */}
        <div className="pb-6 pt-3 flex flex-col space-y-3 border-t border-stone-100">
          {/* Seletor de Usuário (Auditoria) */}
          <div className="relative group" title="Clique para alternar o usuário (Auditoria)">
            <div className="w-full flex items-center cursor-pointer py-1">
              <div className="w-[76px] shrink-0 flex items-center justify-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-stone-200 group-hover:ring-amber-500 transition ${
                    currentUser?.role === 'Administrador'
                      ? 'bg-amber-700'
                      : currentUser?.role === 'Sub-gerente'
                      ? 'bg-emerald-700'
                      : 'bg-indigo-700'
                  }`}
                >
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              {!isCollapsed && (
                <div className="pr-4 overflow-hidden whitespace-nowrap">
                  <div className="text-[11px] font-bold tracking-[0.12em] text-stone-800 uppercase truncate">
                    {currentUser?.name || 'CARREGANDO...'}
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider text-amber-600 uppercase">
                    {currentUser?.role || ''}
                  </div>
                </div>
              )}
              <select
                value={currentUser?.id || ''}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Trocar usuário"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-white text-stone-900">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão Restaurar / Logout */}
          <button
            onClick={onResetDemo}
            title="Restaurar dados de demonstração"
            className="w-full h-[44px] flex items-center text-stone-500 hover:text-rose-600 transition-colors group"
          >
            <div className="w-[76px] shrink-0 flex items-center justify-center">
              <LogOut className="w-5 h-5 stroke-[1.75] group-hover:scale-110 transition-transform" />
            </div>
            {!isCollapsed && (
              <span className="text-[12px] font-medium tracking-[0.14em] uppercase text-stone-600 group-hover:text-rose-600 whitespace-nowrap">
                RESETAR DEMO
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
