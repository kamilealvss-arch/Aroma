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
  Sparkles,
  UtensilsCrossed,
  Cake,
  GlassWater,
  ArrowLeft,
} from 'lucide-react';
import { SystemUser, StockAlert, Product } from '../../../shared/types/index.ts';

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
  clientCategory?: string;
  onClientCategoryChange?: (category: string) => void;
  products?: Product[];
  onBackToAdmin?: () => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  circleBg: string;
  activeText: string;
  badge?: number | string;
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
  clientCategory = 'HOME',
  onClientCategoryChange,
  products = [],
  onBackToAdmin,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const criticalCount = alerts.filter((a) => a.isOutOfStock).length;
  const warningCount = alerts.filter((a) => !a.isOutOfStock).length;
  const totalAlerts = criticalCount + warningCount;

  // Filtra apenas produtos ativos para contagens do cliente
  const activeProducts = products.filter((p) => p.status === 'ativo');
  const countForCategory = (cat: string) =>
    activeProducts.filter((p) => p.category === cat).length;

  // Itens de Navegação do Painel Administrativo
  const adminNavItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'INÍCIO',
      icon: Home,
      circleBg: 'bg-[#924529]',
      activeText: 'text-[#924529]',
      badge: criticalCount > 0 ? criticalCount : undefined,
      badgeColor: 'bg-[#c68e5b] text-white',
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
      label: 'RELATÓRIOS',
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
      isActive: false,
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

  // Itens de Navegação Dinâmica do Cardápio Digital (quando currentView === 'client')
  const clientNavItems: NavItemConfig[] = [
    {
      id: 'HOME',
      label: 'INÍCIO',
      icon: Sparkles,
      circleBg: 'bg-[#924529]',
      activeText: 'text-[#924529]',
      badge: '★',
      badgeColor: 'bg-amber-400 text-stone-900',
      isActive: currentView === 'client' && (clientCategory === 'HOME' || !clientCategory),
      onClick: () => {
        onClientCategoryChange?.('HOME');
      },
    },
    {
      id: 'ALL',
      label: 'TODOS',
      icon: ShoppingCart,
      circleBg: 'bg-[#820b28]',
      activeText: 'text-[#820b28]',
      badge: activeProducts.length || undefined,
      badgeColor: 'bg-white/30 text-white',
      isActive: currentView === 'client' && clientCategory === 'ALL',
      onClick: () => {
        onClientCategoryChange?.('ALL');
      },
    },
    {
      id: 'Cafés Especiais',
      label: 'CAFÉS',
      icon: Coffee,
      circleBg: 'bg-[#c68e5b]',
      activeText: 'text-[#924529]',
      badge: countForCategory('Cafés Especiais') || undefined,
      badgeColor: 'bg-[#c68e5b] text-white',
      isActive: currentView === 'client' && clientCategory === 'Cafés Especiais',
      onClick: () => {
        onClientCategoryChange?.('Cafés Especiais');
      },
    },
    {
      id: 'Salgados Artesanais',
      label: 'SALGADOS',
      icon: UtensilsCrossed,
      circleBg: 'bg-[#7e8b60]',
      activeText: 'text-[#626d4a]',
      badge: countForCategory('Salgados Artesanais') || undefined,
      badgeColor: 'bg-[#7e8b60] text-white',
      isActive: currentView === 'client' && clientCategory === 'Salgados Artesanais',
      onClick: () => {
        onClientCategoryChange?.('Salgados Artesanais');
      },
    },
    {
      id: 'Doces & Bolos',
      label: 'DOCES',
      icon: Cake,
      circleBg: 'bg-[#820b28]',
      activeText: 'text-[#820b28]',
      badge: countForCategory('Doces & Bolos') || undefined,
      badgeColor: 'bg-[#820b28] text-white',
      isActive: currentView === 'client' && clientCategory === 'Doces & Bolos',
      onClick: () => {
        onClientCategoryChange?.('Doces & Bolos');
      },
    },
    {
      id: 'Bebidas Geladas',
      label: 'GELADOS',
      icon: GlassWater,
      circleBg: 'bg-[#7e8b60]',
      activeText: 'text-[#626d4a]',
      badge: countForCategory('Bebidas Geladas') || undefined,
      badgeColor: 'bg-[#7e8b60] text-white',
      isActive: currentView === 'client' && clientCategory === 'Bebidas Geladas',
      onClick: () => {
        onClientCategoryChange?.('Bebidas Geladas');
      },
    },
    {
      id: 'Combos & Brunch',
      label: 'COMBOS',
      icon: Package,
      circleBg: 'bg-[#924529]',
      activeText: 'text-[#924529]',
      badge: countForCategory('Combos & Brunch') || undefined,
      badgeColor: 'bg-[#924529] text-white',
      isActive: currentView === 'client' && clientCategory === 'Combos & Brunch',
      onClick: () => {
        onClientCategoryChange?.('Combos & Brunch');
      },
    },
  ];

  const navItems = currentView === 'client' ? clientNavItems : adminNavItems;

  return (
    <aside
      className="sticky top-0 h-screen shrink-0 z-40 flex select-none"
      aria-label="Menu Lateral"
    >
      {/* Barra Principal com recortes curvos para o item ativo */}
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

          {/* Nome da Marca abaixo da Logo */}
          {!isCollapsed && (
            <div className="text-center mt-1 px-4 flex flex-col items-center justify-center overflow-hidden">
              <img
                src="/aroma-text.png"
                alt="Aroma"
                className="w-28 h-auto object-contain select-none hover:scale-105 transition-transform duration-300 brightness-0 invert"
              />
              {currentView === 'client' && (
                <span className="text-[9px] uppercase font-bold tracking-[0.18em] text-[#fcd34d] bg-white/10 px-2.5 py-0.5 rounded-full mt-1.5 border border-[#fcd34d]/30">
                  Cardápio Digital
                </span>
              )}
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

                  {/* Pílula do Item Ativo */}
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
                          className={`absolute -top-1 -right-1 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ${
                            item.badgeColor || 'bg-white/20 text-white'
                          } shadow`}
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
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              item.badgeColor || 'bg-stone-200 text-stone-800'
                            }`}
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
                        className={`absolute top-0 right-4 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ${
                          item.badgeColor || 'bg-white/20 text-white'
                        }`}
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
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.badgeColor || 'bg-white/20 text-white'
                          }`}
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

        {/* Rodapé: Card Branco com Perfil e Botão Circular de Ação no topo */}
        {isCollapsed ? (
          <div className="pb-5 pt-3 px-2 flex flex-col items-center space-y-3">
            {/* Avatar compacto quando recolhido */}
            <div
              className="relative group cursor-pointer"
              title={
                currentView === 'client'
                  ? 'Cliente Gourmet (Cardápio Digital) - Clique para alternar perfil'
                  : `${currentUser?.name || 'Usuário'} (${currentUser?.role || ''}) - Clique para trocar`
              }
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white/40 group-hover:scale-105 transition ${
                  currentView === 'client'
                    ? 'bg-[#924529] text-white'
                    : 'bg-white text-[#820b28]'
                }`}
              >
                {currentView === 'client' ? (
                  'C'
                ) : currentUser?.name ? (
                  currentUser.name.charAt(0).toUpperCase()
                ) : (
                  'U'
                )}
              </div>
              <select
                value={currentView === 'client' ? 'usr_cliente' : currentUser?.id || ''}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Trocar usuário"
              >
                {currentView === 'client' ? (
                  <>
                    <option value="usr_cliente" className="bg-stone-900 text-white">
                      🛍️ Cliente (Cardápio Digital)
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-stone-900 text-white">
                        👤 {u.name} ({u.role})
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-stone-900 text-white">
                        {u.name} ({u.role})
                      </option>
                    ))}
                    <option value="usr_cliente" className="bg-stone-900 text-white">
                      🛍️ Cliente (Cardápio Digital)
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* Botão de Ação compacto */}
            {currentView === 'client' ? (
              <button
                type="button"
                onClick={onBackToAdmin || (() => onViewChange('admin'))}
                title="Voltar ao Painel Administrativo"
                className="w-10 h-10 rounded-full bg-white text-[#820b28] hover:bg-stone-100 flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetDemo}
                title="Sair / Restaurar demonstração"
                className="w-10 h-10 rounded-full bg-white text-[#820b28] hover:bg-stone-100 flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 pb-5 pt-7">
            <div className="relative bg-white rounded-[26px] shadow-md">
              {/* Botão Circular Superior Recortado: Voltar ao Admin ou Sair/Reset */}
              {currentView === 'client' ? (
                <button
                  type="button"
                  onClick={onBackToAdmin || (() => onViewChange('admin'))}
                  title="Voltar ao Painel Administrativo"
                  className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 w-11 h-11 rounded-full bg-white border-[5px] border-[#820b28] text-[#820b28] hover:bg-rose-50 hover:scale-105 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onResetDemo}
                  title="Sair / Restaurar dados de demonstração"
                  className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 w-11 h-11 rounded-full bg-white border-[5px] border-[#820b28] text-[#820b28] hover:bg-rose-50 hover:scale-105 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4 stroke-[2.2]" />
                </button>
              )}

              {/* Conteúdo Interno do Card Branco com seletor de Perfil */}
              <div
                className="relative overflow-hidden rounded-[26px] pt-7 pb-4 px-4 cursor-pointer group"
                title="Clique para alternar o perfil (Auditoria / Cardápio)"
              >
                {/* Semicírculo decorativo suave no canto inferior esquerdo */}
                <div
                  className="pointer-events-none absolute -bottom-6 -left-4 w-36 h-24 bg-[#820b28]/[0.06] rounded-t-full transition-transform duration-300 group-hover:scale-105"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex items-end justify-between gap-2">
                  {/* Lado Esquerdo: Avatar / Ícone + Nome do Perfil e Cargo */}
                  <div className="flex flex-col space-y-2 min-w-0">
                    {/* Avatar do Perfil */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow-xs transition-transform group-hover:scale-105 ${
                        currentView === 'client'
                          ? 'bg-[#924529]'
                          : currentUser?.role === 'Administrador'
                          ? 'bg-[#820b28]'
                          : currentUser?.role === 'Sub-gerente'
                          ? 'bg-[#7e8b60]'
                          : 'bg-[#924529]'
                      }`}
                    >
                      {currentView === 'client' ? (
                        'C'
                      ) : currentUser?.name ? (
                        currentUser.name.charAt(0).toUpperCase()
                      ) : (
                        'U'
                      )}
                    </div>

                    {/* Nome e Cargo */}
                    <div className="pt-0.5">
                      <div className="text-xs font-extrabold text-stone-900 leading-tight truncate">
                        {currentView === 'client'
                          ? 'Cliente Gourmet'
                          : currentUser?.name || 'Carregando...'}
                      </div>
                      <div className="text-[10px] font-semibold text-[#820b28] leading-tight mt-0.5">
                        {currentView === 'client'
                          ? 'Cardápio Digital'
                          : currentUser?.role || 'Perfil'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Select invisível sobre o card para permitir trocar de perfil ao clicar */}
                <select
                  value={currentView === 'client' ? 'usr_cliente' : currentUser?.id || ''}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  aria-label="Trocar perfil"
                >
                  {currentView === 'client' ? (
                    <>
                      <option value="usr_cliente" className="bg-white text-stone-900 font-bold">
                        🛍️ Cliente (Cardápio Digital)
                      </option>
                      <optgroup label="Voltar ao Painel Administrativo">
                        {users.map((u) => (
                          <option key={u.id} value={u.id} className="bg-white text-stone-900">
                            👤 {u.name} ({u.role})
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    <>
                      <optgroup label="Equipe do Café (Auditoria)">
                        {users.map((u) => (
                          <option key={u.id} value={u.id} className="bg-white text-stone-900">
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Visualizar como Cliente">
                        <option value="usr_cliente" className="bg-white text-[#820b28] font-bold">
                          🛍️ Cliente (Cardápio Digital)
                        </option>
                      </optgroup>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
