import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Package,
  ShoppingBag,
  Sparkles,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AuditLog, AuditActionType } from '../../../shared/types/index.ts';

export const AuditView: React.FC = () => {
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs('ALL', '');
      setAllLogs(data);
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filtragem instantânea por tipo e busca textual
  const filteredLogs = allLogs.filter((log) => {
    if (filterType !== 'ALL' && log.actionType !== filterType) {
      return false;
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchRole = log.userRole.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchEntity = (log.targetEntity || '').toLowerCase().includes(q);
      if (!matchUser && !matchRole && !matchDetails && !matchEntity) {
        return false;
      }
    }
    return true;
  });

  // Métricas rápidas da trilha de auditoria
  const totalLogsCount = allLogs.length;
  const stockLogsCount = allLogs.filter((l) => l.actionType === 'ESTOQUE_AJUSTADO').length;
  const priceLogsCount = allLogs.filter(
    (l) => l.actionType === 'PRECO_ALTERADO' || (l.actionType as string) === 'NOVO_PRODUTO'
  ).length;
  const criticalLogsCount = allLogs.filter(
    (l) => l.actionType === 'EXCLUSAO_LOGICA' || l.actionType === 'REATIVACAO_PRODUTO'
  ).length;

  // Badges de Ação com a Paleta Oficial Aroma (suaves e harmônicos como na Home e KDS)
  const getActionBadge = (type: AuditActionType | string) => {
    switch (type) {
      case 'PRECO_ALTERADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#c68e5b]/15 text-[#924529] border border-[#c68e5b]/35">
            <DollarSign className="w-3 h-3 text-[#924529]" />
            <span>Preço Alterado</span>
          </span>
        );
      case 'EXCLUSAO_LOGICA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#820b28]/[0.08] text-[#820b28] border border-[#820b28]/25">
            <AlertTriangle className="w-3 h-3 text-[#820b28]" />
            <span>Exclusão Lógica</span>
          </span>
        );
      case 'REATIVACAO_PRODUTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7e8b60]/15 text-[#4f583c] border border-[#7e8b60]/35">
            <RotateCcw className="w-3 h-3 text-[#7e8b60]" />
            <span>Reativação de Item</span>
          </span>
        );
      case 'ESTOQUE_AJUSTADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7e8b60]/15 text-[#4f583c] border border-[#7e8b60]/35">
            <Package className="w-3 h-3 text-[#7e8b60]" />
            <span>Ajuste de Estoque</span>
          </span>
        );
      case 'PEDIDO_FINALIZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#924529]/12 text-[#924529] border border-[#924529]/30">
            <ShoppingBag className="w-3 h-3 text-[#924529]" />
            <span>Pedido Finalizado</span>
          </span>
        );
      case 'NOVO_PRODUTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f6efdd] text-[#631a09] border border-[#c68e5b]/40">
            <Sparkles className="w-3 h-3 text-[#924529]" />
            <span>Novo Produto</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
            <Sparkles className="w-3 h-3 text-stone-500" />
            <span>{String(type).replace(/_/g, ' ')}</span>
          </span>
        );
    }
  };

  const getRoleAvatarBg = (role: string) => {
    if (role === 'Administrador') return 'bg-[#820b28]';
    if (role === 'Sub-gerente') return 'bg-[#7e8b60]';
    return 'bg-[#924529]';
  };

  const getRoleBadgeStyle = (role: string) => {
    if (role === 'Administrador') {
      return 'bg-[#820b28]/[0.08] text-[#820b28] border-[#820b28]/20';
    }
    if (role === 'Sub-gerente') {
      return 'bg-[#7e8b60]/15 text-[#4f583c] border-[#7e8b60]/30';
    }
    return 'bg-[#c68e5b]/15 text-[#631a09] border-[#c68e5b]/35';
  };

  return (
    /* Quadrão principal arredondado igual à Home e KDS */
    <div className="bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 shadow-sm border border-stone-200/80 space-y-6">
      
      {/* Top Header com fonte Amarego e controles em cápsula */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-amarego font-normal text-2xl sm:text-3xl text-stone-900 tracking-wide">
                Trilha de Auditoria
              </h1>
              <span className="inline-flex items-center gap-1.5 font-medium text-stone-500 bg-stone-100/80 px-2.5 py-0.5 rounded-full border border-stone-200/80 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7e8b60]" />
                {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Histórico imutável de alterações de preços, reposições de estoque, exclusões lógicas e pedidos com identificação de usuário e cargo.
            </p>
          </div>
        </div>

        {/* 4 Cards de Resumo de Auditoria (Mesmo estilo da Home com border-t-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Card 1: Total Auditado */}
          <div
            onClick={() => setFilterType('ALL')}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#7e8b60] shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Total Auditado
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#7e8b60]/15 text-[#7e8b60] border border-[#7e8b60]/25 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {totalLogsCount} eventos
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Rastreabilidade completa por perfil
              </p>
            </div>
          </div>

          {/* Card 2: Movimentações de Estoque */}
          <div
            onClick={() => setFilterType('ESTOQUE_AJUSTADO')}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#c68e5b] shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Ajustes de Estoque
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#c68e5b]/15 text-[#924529] border border-[#c68e5b]/30 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {stockLogsCount} registros
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Entradas de lote e contagens físicas
              </p>
            </div>
          </div>

          {/* Card 3: Preços e Cardápio */}
          <div
            onClick={() => setFilterType('PRECO_ALTERADO')}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#924529] shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Preços & Cardápio
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#924529]/12 text-[#924529] border border-[#924529]/25 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {priceLogsCount} alterações
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Histórico de valor anterior e novo
              </p>
            </div>
          </div>

          {/* Card 4: Exclusões Lógicas */}
          <div
            onClick={() => setFilterType('EXCLUSAO_LOGICA')}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#820b28] shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Exclusão Lógica
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#820b28]/10 text-[#820b28] border border-[#820b28]/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {criticalLogsCount} {criticalLogsCount === 1 ? 'ação' : 'ações'}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Inativações sem perda de histórico
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros em Cápsula (Idêntica ao KDS: Vermelho #820b28 quando selecionado) + Busca Rápida */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="bg-stone-100/80 rounded-full p-1 border border-stone-200/80 shadow-2xs inline-flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-[#820b28] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
              }`}
            >
              Todas ({allLogs.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('PRECO_ALTERADO')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'PRECO_ALTERADO'
                  ? 'bg-[#820b28] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
              }`}
            >
              Alteração de Preço
            </button>

            <button
              type="button"
              onClick={() => setFilterType('ESTOQUE_AJUSTADO')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ESTOQUE_AJUSTADO'
                  ? 'bg-[#820b28] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
              }`}
            >
              Ajuste de Estoque
            </button>

            <button
              type="button"
              onClick={() => setFilterType('EXCLUSAO_LOGICA')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'EXCLUSAO_LOGICA'
                  ? 'bg-[#820b28] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
              }`}
            >
              Exclusão Lógica
            </button>

            <button
              type="button"
              onClick={() => setFilterType('PEDIDO_FINALIZADO')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'PEDIDO_FINALIZADO'
                  ? 'bg-[#820b28] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
              }`}
            >
              Pedidos
            </button>
          </div>

          {/* Campo de busca rápido estilo KDS */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuário, produto ou detalhe..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#820b28]/25 focus:border-[#820b28] shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Container da Tabela de Auditoria (Fundo Branco no padrão da Home) */}
      <div className="rounded-3xl border bg-white border-stone-200/90 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#820b28]" />
              <h3 className="font-extrabold text-stone-900 text-sm tracking-tight">
                Registros da Trilha de Auditoria
              </h3>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
              Cada evento registra automaticamente autor, cargo, data/hora exata e comparativo de valores
            </p>
          </div>

          {(filterType !== 'ALL' || searchTerm !== '') && (
            <button
              type="button"
              onClick={() => {
                setFilterType('ALL');
                setSearchTerm('');
              }}
              className="text-xs font-bold text-[#820b28] bg-white hover:bg-[#820b28]/[0.05] px-3 py-1 rounded-full border border-[#820b28]/25 shadow-2xs transition flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4">Usuário Responsável</th>
                  <th className="py-3 px-4">Ação Realizada</th>
                  <th className="py-3 px-4">Detalhes do Registro</th>
                  <th className="py-3 px-4 text-center">Entidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLogs.map((log) => {
                  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(new Date(log.timestamp));

                  return (
                    <tr key={log.id} className="hover:bg-stone-50/80 transition">
                      {/* Data & Horário */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-stone-600 font-medium bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/70">
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Usuário Responsável com Avatar nas cores do Sidebar */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0 shadow-2xs ${getRoleAvatarBg(
                              log.userRole
                            )}`}
                          >
                            {log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-extrabold text-stone-900 block leading-tight">
                              {log.userName}
                            </span>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full border mt-0.5 ${getRoleBadgeStyle(
                                log.userRole
                              )}`}
                            >
                              {log.userRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Ação Realizada */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.actionType)}
                      </td>

                      {/* Detalhes + Valor Anterior -> Novo */}
                      <td className="py-3.5 px-4">
                        <div className="text-stone-800 font-medium leading-relaxed max-w-xl">
                          {log.details}
                        </div>

                        {log.oldValue !== null &&
                          log.newValue !== null &&
                          log.oldValue !== undefined && (
                            <div className="mt-1.5 inline-flex items-center gap-2 text-[11px] text-stone-600 bg-stone-50 px-2.5 py-0.5 rounded-lg border border-stone-200/90">
                              <span>
                                Anterior: <strong className="text-stone-800">{String(log.oldValue)}</strong>
                              </span>
                              <ArrowRight className="w-3 h-3 text-stone-400" />
                              <span className="text-[#924529]">
                                Novo: <strong className="font-extrabold">{String(log.newValue)}</strong>
                              </span>
                            </div>
                          )}
                      </td>

                      {/* Entidade */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="text-[11px] font-bold text-stone-600 bg-stone-100/90 px-2.5 py-1 rounded-lg border border-stone-200/80">
                          {log.targetEntity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-stone-400">
              <Shield className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              <p className="text-xs font-semibold text-stone-700">
                Nenhum registro de auditoria encontrado
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Tente ajustar o filtro selecionado ou o termo pesquisado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
