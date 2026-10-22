import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Package,
  ShoppingBag,
  Sparkles,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AuditLog, AuditActionType } from '../../../shared/types/index.ts';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(filterType, searchTerm);
      setLogs(data);
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (type: AuditActionType) => {
    switch (type) {
      case 'PRECO_ALTERADO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <DollarSign className="w-3 h-3 text-amber-700" />
            <span>Preço Alterado</span>
          </span>
        );
      case 'EXCLUSAO_LOGICA':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-700" />
            <span>Exclusão Lógica</span>
          </span>
        );
      case 'REATIVACAO_PRODUTO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <RotateCcw className="w-3 h-3 text-emerald-700" />
            <span>Reativação de Item</span>
          </span>
        );
      case 'ESTOQUE_AJUSTADO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
            <Package className="w-3 h-3 text-sky-700" />
            <span>Ajuste de Estoque</span>
          </span>
        );
      case 'PEDIDO_FINALIZADO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <ShoppingBag className="w-3 h-3 text-purple-700" />
            <span>Pedido Finalizado</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-300">
            <Sparkles className="w-3 h-3 text-stone-600" />
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Box Didático do Requisito 11 */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-2xl p-6 shadow-xl border border-stone-700">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-amber-600 rounded-xl text-white shadow-lg shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-amber-100">
                Trilha de Auditoria de Segurança (Requisito 11)
              </h2>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-600/50 px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                Segurança Ativa
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1.5 leading-relaxed max-w-4xl">
              <strong>Como citado na especificação:</strong> "Se você criar um perfil de Sub-gerente, sempre que ele alterar o preço de um café, o sistema salva no banco de dados: <em>'Preço do Café alterado de R$ 5 para R$ 6 pelo usuário Carlos em 01/10/2026'</em>". Todas as ações críticas (preços, exclusão lógica, ajustes de estoque e baixas automáticas) ficam registradas de forma imutável com usuário, cargo, carimbo de data/hora e valores.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por usuário (ex: Carlos), produto ou detalhe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Buscar Logs
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterType('ALL');
                fetchLogs();
              }}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-semibold transition"
            >
              Limpar
            </button>
          </div>
        </form>

        {/* Filtro por tipo de ação */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
          <span className="text-[11px] font-bold text-stone-400 mr-1 flex items-center space-x-1">
            <Filter className="w-3 h-3" />
            <span>Tipo:</span>
          </span>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'ALL'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todas as Ações ({logs.length})
          </button>
          <button
            onClick={() => setFilterType('PRECO_ALTERADO')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'PRECO_ALTERADO'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Alteração de Preço
          </button>
          <button
            onClick={() => setFilterType('EXCLUSAO_LOGICA')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'EXCLUSAO_LOGICA'
                ? 'bg-rose-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Exclusão Lógica
          </button>
          <button
            onClick={() => setFilterType('ESTOQUE_AJUSTADO')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'ESTOQUE_AJUSTADO'
                ? 'bg-sky-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Ajuste de Estoque
          </button>
          <button
            onClick={() => setFilterType('PEDIDO_FINALIZADO')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'PEDIDO_FINALIZADO'
                ? 'bg-purple-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Pedidos
          </button>
        </div>
      </div>

      {/* Tabela de Trilha de Auditoria */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Usuário Responsável</th>
                <th className="py-3 px-4">Ação Realizada</th>
                <th className="py-3 px-4">Detalhes do Registro de Auditoria</th>
                <th className="py-3 px-4 text-center">Entidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map((log) => {
                const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(new Date(log.timestamp));

                const roleBadgeColor = {
                  Administrador: 'bg-amber-100 text-amber-900 border-amber-300',
                  'Sub-gerente': 'bg-emerald-100 text-emerald-900 border-emerald-300',
                  'Barista / Caixa': 'bg-indigo-100 text-indigo-900 border-indigo-300',
                }[log.userRole] || 'bg-stone-100 text-stone-800';

                return (
                  <tr key={log.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-stone-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-stone-900 block">
                          {log.userName}
                        </span>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full border mt-0.5 ${roleBadgeColor}`}
                        >
                          {log.userRole}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.actionType)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-stone-800 font-medium leading-relaxed max-w-xl">
                        {log.details}
                      </div>

                      {/* Exibição clara de Old vs New value se houver */}
                      {log.oldValue !== null && log.newValue !== null && log.oldValue !== undefined && (
                        <div className="mt-1 flex items-center space-x-2 text-[11px] text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200 inline-flex">
                          <span>Anterior: <strong>{String(log.oldValue)}</strong></span>
                          <ArrowRight className="w-3 h-3 text-stone-400" />
                          <span className="text-amber-800">Novo: <strong>{String(log.newValue)}</strong></span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                        {log.targetEntity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="p-8 text-center text-stone-400">
            Nenhum registro de auditoria corresponde aos filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
};
