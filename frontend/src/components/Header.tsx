import React from 'react';
import {
  Coffee,
  Shield,
  Smartphone,
  LayoutDashboard,
  AlertTriangle,
  RotateCcw,
  ChefHat,
} from 'lucide-react';
import { SystemUser, StockAlert } from '../../../shared/types/index.ts';

interface HeaderProps {
  currentView: 'admin' | 'client';
  onViewChange: (view: 'admin' | 'client') => void;
  adminTab: 'dashboard' | 'kanban' | 'products' | 'stock' | 'reports' | 'audit';
  onAdminTabChange: (tab: 'dashboard' | 'kanban' | 'products' | 'stock' | 'reports' | 'audit') => void;
  currentUser: SystemUser | null;
  users: SystemUser[];
  onSwitchUser: (userId: string) => void;
  alerts: StockAlert[];
  activeOrdersCount?: number;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
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
  const criticalCount = alerts.filter((a) => a.isOutOfStock).length;
  const warningCount = alerts.filter((a) => !a.isOutOfStock).length;

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-lg">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-900/30 shrink-0">
              <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-sm sm:text-base md:text-lg text-amber-100 tracking-wide whitespace-nowrap">
                  Café Gourmet Pro
                </span>
                <span className="hidden md:inline-block text-[10px] uppercase tracking-wider font-semibold bg-amber-950 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Gestão & Cardápio
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden lg:block">
                Controle Inteligente de Estoque, Exclusão Lógica & Auditoria
              </p>
            </div>
          </div>

          {/* Mode Switcher: Admin vs Cliente */}
          <div className="flex items-center bg-stone-800/90 p-1 rounded-xl border border-stone-700 mx-2">
            <button
              onClick={() => onViewChange('admin')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Painel do Administrador</span>
              <span className="sm:hidden">Admin</span>
            </button>
            <button
              onClick={() => onViewChange('client')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'client'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Cardápio do Cliente</span>
              <span className="sm:hidden">Cardápio</span>
            </button>
          </div>

          {/* Right Controls: User Switcher & Reset Demo */}
          <div className="flex items-center space-x-3">
            {/* User Profile Selector (Requisito 11 - Auditoria por usuário) */}
            <div className="relative group">
              <div className="flex items-center space-x-2 bg-stone-800 border border-stone-700/80 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-amber-600/60 transition">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    currentUser?.role === 'Administrador'
                      ? 'bg-amber-600'
                      : currentUser?.role === 'Sub-gerente'
                      ? 'bg-emerald-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {currentUser?.name.charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-stone-200 leading-tight">
                    {currentUser?.name}
                  </div>
                  <div className="text-[10px] text-amber-400 font-medium leading-none">
                    {currentUser?.role}
                  </div>
                </div>
                <select
                  value={currentUser?.id}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Trocar usuário para testar auditoria"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-stone-900 text-white">
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Demo Data Button */}
            <button
              onClick={onResetDemo}
              title="Restaurar dados de teste para o padrão"
              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition border border-transparent hover:border-stone-700"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        {currentView === 'admin' && (
          <div className="flex items-center space-x-1 border-t border-stone-800/80 pt-2 pb-2.5 overflow-x-auto scrollbar-none text-xs font-medium">
            <button
              onClick={() => onAdminTabChange('dashboard')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition ${
                adminTab === 'dashboard'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>1. Dashboard Gerencial</span>
              {criticalCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {criticalCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onAdminTabChange('kanban')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition ${
                adminTab === 'kanban'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Comandas Barista (Kanban)</span>
              {activeOrdersCount > 0 && (
                <span className="bg-amber-500 text-stone-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onAdminTabChange('products')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition ${
                adminTab === 'products'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>3. Gestão de Produtos (Cardápio)</span>
            </button>

            <button
              onClick={() => onAdminTabChange('stock')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition ${
                adminTab === 'stock'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>4. Controle de Estoque Inteligente</span>
              {warningCount + criticalCount > 0 && (
                <span className="bg-amber-500 text-stone-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {warningCount + criticalCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onAdminTabChange('reports')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition ${
                adminTab === 'reports'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <span>5. Área de Relatórios (ABC & Vendas)</span>
            </button>

            <button
              onClick={() => onAdminTabChange('audit')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition ${
                adminTab === 'audit'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>6. Auditoria de Segurança</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
