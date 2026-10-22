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
      circleBg: 'bg-[#924529]',
      activeText: 'text-[#924529]',
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
      circleBg: 'bg-[#c68e5b]',
      activeText: 'text-[#924529]',
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
      circleBg: 'bg-[#7e8b60]',
      activeText: 'text-[#626d4a]',
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      badgeColor: 'bg-[#7e8b60] text-white',
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
      circleBg: 'bg-[#820b28]',
      activeText: 'text-[#820b28]',
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
      circleBg: 'bg-[#c68e5b]',
      activeText: 'text-[#924529]',
      isActive: currentView === 'client',
      onClick: () => {
        onViewChange('client');
      },
    },
    {
      id: 'stock',
      label: 'ESTOQUE',
      icon: Package,
      circleBg: 'bg-[#924529]',
      activeText: 'text-[#924529]',
      badge: totalAlerts > 0 ? totalAlerts : undefined,
      badgeColor: 'bg-[#c68e5b] text-white',
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
      circleBg: 'bg-[#820b28]',
      activeText: 'text-[#820b28]',
      isActive: currentView === 'admin' && adminTab === 'audit',
      onClick: () => {
        onViewChange('admin');
        onAdminTabChange('audit');
      },
    },
  ];

  return (
    <aside
      className="sticky top-0 h-screen shrink-0 z-40 flex select-none"
      aria-label="Menu Lateral"
    >
      {/* Barra Branca Principal com recortes curvos para o item ativo */}
      <div
        className={`${
          isCollapsed ? 'w-[76px]' : 'w-[248px]'
        } bg-[#820b28] h-full flex flex-col justify-between transition-all duration-300 ease-in-out relative`}
      >
        {/* Botão de Expandir / Recolher na borda */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-white border border-[#820b28] text-[#820b28] hover:text-[#631a09] flex items-center justify-center shadow-md transition-transform hover:scale-110"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Topo: Logo Grande da Marca e Título */}
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="pt-6 pb-2 px-2 flex flex-col items-center justify-center cursor-pointer group select-none"
          title="Clique para alternar tamanho da barra"
        >
          {/* Logo Original da Marca (Estática em repouso, expande suavemente no hover) */}
          <div className="w-full flex items-center justify-center py-1">
            <img
              src="/logo.png"
              alt="Aroma"
              className={`${
                isCollapsed
                  ? 'w-12 h-12 object-contain hover:scale-125 transition-transform duration-300 cursor-pointer'
                  : 'w-36 h-28 object-contain hover:scale-115 transition-transform duration-300 cursor-pointer'
              } drop-shadow-sm select-none brightness-0 invert`}
            />
          </div>

          {/* Nome da Marca abaixo da Logo (Tipografia estilizada Aroma) */}
          {!isCollapsed && (
            <div className="text-center mt-1 px-4 flex items-center justify-center overflow-hidden">
              <img
                src="/aroma-text.png"
                alt="Aroma"
                className="w-28 h-auto object-contain select-none hover:scale-105 transition-transform duration-300 brightness-0 invert"
              />
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
                    className="pointer-events-none absolute -top-[20px] -right-[1px] w-[20px] h-[20px] bg-transparent rounded-br-[20px] shadow-[6px_6px_0_6px_#ffffff] z-10"
                    aria-hidden="true"
                  />
                  {/* Curva Côncava Inferior Direita */}
                  <span
                    className="pointer-events-none absolute -bottom-[20px] -right-[1px] w-[20px] h-[20px] bg-transparent rounded-tr-[20px] shadow-[6px_-6px_0_6px_#ffffff] z-10"
                    aria-hidden="true"
                  />

                  {/* Pílula Escura do Item Ativo */}
                  <button
                    onClick={item.onClick}
                    title={isCollapsed ? item.label : undefined}
                    className="w-[calc(100%-8px)] ml-[10px] -mr-[2px] h-[56px] bg-white rounded-l-full relative z-20 flex items-center text-left transition-all"
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
                  className="w-full h-[50px] flex items-center text-white/70 hover:text-white transition-colors group"
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
                      <span className="text-[12px] font-medium tracking-[0.14em] uppercase text-white/80 group-hover:text-white">
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
        <div className="pb-6 pt-3 flex flex-col space-y-3 border-t border-white/15">
          {/* Seletor de Usuário (Auditoria) */}
          <div className="relative group" title="Clique para alternar o usuário (Auditoria)">
            <div className="w-full flex items-center cursor-pointer py-1">
              <div className="w-[76px] shrink-0 flex items-center justify-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white/30 group-hover:ring-amber-300 transition ${
                    currentUser?.role === 'Administrador'
                      ? 'bg-[#631a09]'
                      : currentUser?.role === 'Sub-gerente'
                      ? 'bg-[#7e8b60]'
                      : 'bg-[#924529]'
                  }`}
                >
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              {!isCollapsed && (
                <div className="pr-4 overflow-hidden whitespace-nowrap">
                  <div className="text-[11px] font-bold tracking-[0.12em] text-white uppercase truncate">
                    {currentUser?.name || 'CARREGANDO...'}
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider text-amber-200/90 uppercase">
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
                  <option key={u.id} value={u.id} className="bg-stone-900 text-white">
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
            className="w-full h-[44px] flex items-center text-white/70 hover:text-amber-200 transition-colors group"
          >
            <div className="w-[76px] shrink-0 flex items-center justify-center">
              <LogOut className="w-5 h-5 stroke-[1.75] group-hover:scale-110 transition-transform" />
            </div>
            {!isCollapsed && (
              <span className="text-[12px] font-medium tracking-[0.14em] uppercase text-white/70 group-hover:text-amber-200 whitespace-nowrap">
                RESETAR DEMO
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
