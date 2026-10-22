import React, { useState, useEffect } from 'react';
import {
  Clock,
  Coffee,
  CheckCircle2,
  ChefHat,
  BellRing,
  Play,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Flame,
  User,
  ShoppingBag,
  Truck,
  Sparkles,
} from 'lucide-react';
import { Order, ConsumptionType } from '../../../shared/types/index.ts';
import { classifyOrdersForKanban, formatElapsedTime, formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { playChimeSound } from '../utils/sound.ts';

interface KanbanViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => Promise<void>;
  onRefresh: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  orders,
  onUpdateOrderStatus,
  onRefresh,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);
  const [selectedConsumptionFilter, setSelectedConsumptionFilter] = useState<'ALL' | ConsumptionType>('ALL');
  const [now, setNow] = useState(new Date());

  // Atualiza cronômetro a cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filtra por tipo de consumo se selecionado
  const filteredOrders = orders.filter((o) => {
    if (selectedConsumptionFilter === 'ALL') return true;
    return o.consumptionType === selectedConsumptionFilter;
  });

  const { pendentes, emPreparo, prontos, entregues } = classifyOrdersForKanban(filteredOrders);

  const handleStartPreparing = async (orderId: string) => {
    await onUpdateOrderStatus(orderId, 'preparando');
  };

  const handleFinishPreparing = async (orderId: string) => {
    if (soundEnabled) {
      playChimeSound();
    }
    await onUpdateOrderStatus(orderId, 'pronto');
  };

  const handleDeliver = async (orderId: string) => {
    await onUpdateOrderStatus(orderId, 'entregue');
  };

  const handleRevert = async (orderId: string, previousStatus: Order['status']) => {
    await onUpdateOrderStatus(orderId, previousStatus);
  };

  const getConsumptionTag = (order: Order) => {
    const type = order.consumptionType || 'MESA';
    switch (type) {
      case 'MESA':
        return {
          label: order.tableOrTakeaway ? `[ ${order.tableOrTakeaway.toUpperCase()} ]` : '[ MESA ]',
          className: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'LEVAR':
        return {
          label: '[ PARA LEVAR ]',
          className: 'bg-sky-100 text-sky-900 border-sky-300',
        };
      case 'DELIVERY':
        return {
          label: '[ DELIVERY ]',
          className: 'bg-purple-100 text-purple-900 border-purple-300',
        };
      case 'BALCAO':
        return {
          label: '[ BALCÃO ]',
          className: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      default:
        return {
          label: `[ ${order.tableOrTakeaway} ]`,
          className: 'bg-stone-100 text-stone-800 border-stone-300',
        };
    }
  };

  // Renderizador do Card da Comanda
  const renderOrderCard = (order: Order, column: 'pendente' | 'preparo' | 'pronto' | 'entregue') => {
    const elapsed = formatElapsedTime(order.createdAt, now);
    const tag = getConsumptionTag(order);

    const urgencyColors = {
      normal: 'text-stone-500 bg-stone-100 border-stone-200',
      moderada: 'text-amber-800 bg-amber-100 border-amber-300 font-bold',
      urgente: 'text-rose-700 bg-rose-100 border-rose-300 font-extrabold animate-pulse',
    }[elapsed.urgency];

    return (
      <div
        key={order.id}
        className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 ${
          column === 'pendente'
            ? 'border-rose-200 border-l-4 border-l-rose-500'
            : column === 'preparo'
            ? 'border-amber-200 border-l-4 border-l-amber-500'
            : column === 'pronto'
            ? 'border-emerald-200 border-l-4 border-l-emerald-500'
            : 'border-stone-200 opacity-75'
        }`}
      >
        {/* Topo do Card: Identificação & Tag de Consumo */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-stone-900 text-sm">
                Pedido #{order.orderNumber}
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider ${tag.className}`}
              >
                {tag.label}
              </span>
            </div>
            <div className="text-xs font-semibold text-stone-700 mt-0.5 flex items-center space-x-1">
              <User className="w-3 h-3 text-stone-400" />
              <span>Cliente: {order.customerName}</span>
            </div>
          </div>

          {/* Cronômetro */}
          <div
            className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center space-x-1 shrink-0 ${urgencyColors}`}
            title="Tempo decorrido desde a realização do pedido"
          >
            <Clock className="w-3 h-3" />
            <span>{elapsed.text}</span>
          </div>
        </div>

        {/* Lista de Itens da Comanda */}
        <div className="space-y-1.5 py-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="text-xs text-stone-800">
              <div className="flex items-start justify-between font-semibold">
                <span>
                  <strong className="text-amber-900 mr-1.5">{item.quantity}x</strong>
                  {item.productName}
                </span>
              </div>

              {/* Observação individual do item se houver */}
              {item.notes && (
                <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md mt-0.5 border border-rose-200">
                  ⚠️ {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Observações em Destaque (Crucial!) */}
        {order.notes && (
          <div className="bg-rose-50/90 border border-rose-300 rounded-xl p-2.5 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block mb-0.5 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Observação do Cliente:</span>
            </span>
            <p className="text-xs font-extrabold text-rose-900 leading-snug">
              {order.notes}
            </p>
          </div>
        )}

        {/* Rodapé com Botão de Ação Direta (1 toque para o Barista) */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          {column === 'pendente' && (
            <button
              onClick={() => handleStartPreparing(order.id)}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Iniciar Preparo</span>
            </button>
          )}

          {column === 'preparo' && (
            <div className="flex items-center space-x-1.5 w-full">
              <button
                onClick={() => handleRevert(order.id, 'recebido')}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
                title="Voltar para Pendentes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFinishPreparing(order.id)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Finalizar (Pronto!)</span>
              </button>
            </div>
          )}

          {column === 'pronto' && (
            <div className="flex items-center space-x-1.5 w-full">
              <button
                onClick={() => handleRevert(order.id, 'preparando')}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
                title="Voltar para Em Preparo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeliver(order.id)}
                className="flex-1 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Marcar como Entregue</span>
              </button>
            </div>
          )}

          {column === 'entregue' && (
            <div className="w-full flex items-center justify-between text-xs text-stone-400 font-semibold">
              <span className="flex items-center space-x-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Entregue</span>
              </span>
              <button
                onClick={() => handleRevert(order.id, 'pronto')}
                className="text-[11px] text-stone-500 hover:underline"
              >
                Desfazer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const activeCount = pendentes.length + emPreparo.length + prontos.length;

  return (
    <div className="space-y-5">
      {/* Barra Superior do Barista */}
      <div className="bg-stone-900 text-white p-4 sm:p-5 rounded-2xl border border-stone-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-900/40 shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-amber-100">
                Quadro Kanban de Comandas (KDS do Barista)
              </h2>
              <span className="text-[10px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full font-extrabold uppercase">
                {activeCount} ativas
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Gestão visual de pedidos em tempo real • 1 toque para avançar status
            </p>
          </div>
        </div>

        {/* Controles: Som, Filtros e Coluna Entregues */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Alternar Som de Finalização */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
              soundEnabled
                ? 'bg-amber-600/20 text-amber-300 border-amber-600/40'
                : 'bg-stone-800 text-stone-400 border-stone-700'
            }`}
            title="Tocar sino ao finalizar pedido"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Sino de Aviso: {soundEnabled ? 'Ligado' : 'Mudo'}</span>
          </button>

          {/* Filtro de Tipo de Consumo */}
          <div className="flex items-center space-x-1 bg-stone-800 p-1 rounded-xl border border-stone-700 text-xs">
            <button
              onClick={() => setSelectedConsumptionFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                selectedConsumptionFilter === 'ALL'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedConsumptionFilter('MESA')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                selectedConsumptionFilter === 'MESA'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Mesas
            </button>
            <button
              onClick={() => setSelectedConsumptionFilter('LEVAR')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                selectedConsumptionFilter === 'LEVAR'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Para Levar
            </button>
            <button
              onClick={() => setSelectedConsumptionFilter('DELIVERY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                selectedConsumptionFilter === 'DELIVERY'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Delivery
            </button>
          </div>

          {/* Alternar Coluna de Entregues */}
          <button
            onClick={() => setShowDelivered(!showDelivered)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
              showDelivered
                ? 'bg-stone-700 text-white border-stone-600'
                : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
            }`}
          >
            {showDelivered ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showDelivered ? 'Ocultar Entregues' : 'Histórico Entregues'}</span>
          </button>
        </div>
      </div>

      {/* Grid Kanban: As Colunas Principais (Estilo Trello) */}
      <div className={`grid gap-4 ${showDelivered ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
        
        {/* ================= COLUNA 1: 🔴 PENDENTES (NOVOS) ================= */}
        <div className="bg-stone-100/90 rounded-2xl border border-stone-200/90 p-3.5 flex flex-col min-h-[520px]">
          {/* Header da Coluna */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
              <h3 className="font-extrabold text-stone-900 text-sm">
                1. Pendentes (Novos)
              </h3>
            </div>
            <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 text-xs font-extrabold flex items-center justify-center">
              {pendentes.length}
            </span>
          </div>

          <p className="text-[11px] text-stone-500 mb-3">
            Pedidos recém-enviados pelo cliente no cardápio digital
          </p>

          {/* Cards da Coluna */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
            {pendentes.length === 0 ? (
              <div className="text-center py-12 text-stone-400 bg-white/60 rounded-xl border border-dashed border-stone-300">
                <Coffee className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-xs font-semibold text-stone-600">Sem pedidos pendentes</p>
                <p className="text-[11px] text-stone-400">Novos pedidos aparecerão aqui</p>
              </div>
            ) : (
              pendentes.map((order) => renderOrderCard(order, 'pendente'))
            )}
          </div>
        </div>

        {/* ================= COLUNA 2: 🟡 EM PREPARO ================= */}
        <div className="bg-stone-100/90 rounded-2xl border border-stone-200/90 p-3.5 flex flex-col min-h-[520px]">
          {/* Header da Coluna */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <h3 className="font-extrabold text-stone-900 text-sm">
                2. Em Preparo
              </h3>
            </div>
            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center justify-center">
              {emPreparo.length}
            </span>
          </div>

          <p className="text-[11px] text-stone-500 mb-3">
            Barista preparando o café ou assando os salgados
          </p>

          {/* Cards da Coluna */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
            {emPreparo.length === 0 ? (
              <div className="text-center py-12 text-stone-400 bg-white/60 rounded-xl border border-dashed border-stone-300">
                <ChefHat className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-xs font-semibold text-stone-600">Nenhum em preparo</p>
                <p className="text-[11px] text-stone-400">Clique em "Iniciar Preparo" na coluna anterior</p>
              </div>
            ) : (
              emPreparo.map((order) => renderOrderCard(order, 'preparo'))
            )}
          </div>
        </div>

        {/* ================= COLUNA 3: 🟢 PRONTOS ================= */}
        <div className="bg-stone-100/90 rounded-2xl border border-stone-200/90 p-3.5 flex flex-col min-h-[520px]">
          {/* Header da Coluna */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <h3 className="font-extrabold text-stone-900 text-sm">
                3. Prontos (Retirada)
              </h3>
            </div>
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
              {prontos.length}
            </span>
          </div>

          <p className="text-[11px] text-stone-500 mb-3">
            Aguardando cliente retirar no balcão ou levar à mesa
          </p>

          {/* Cards da Coluna */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
            {prontos.length === 0 ? (
              <div className="text-center py-12 text-stone-400 bg-white/60 rounded-xl border border-dashed border-stone-300">
                <CheckCircle2 className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-xs font-semibold text-stone-600">Nenhum pedido aguardando retirada</p>
                <p className="text-[11px] text-stone-400">Finalize o preparo para chamar o cliente</p>
              </div>
            ) : (
              prontos.map((order) => renderOrderCard(order, 'pronto'))
            )}
          </div>
        </div>

        {/* ================= COLUNA 4: ⚪ ENTREGUES (OPCIONAL/HISTÓRICO) ================= */}
        {showDelivered && (
          <div className="bg-stone-100/90 rounded-2xl border border-stone-200/90 p-3.5 flex flex-col min-h-[520px] animate-in fade-in duration-200">
            {/* Header da Coluna */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-stone-400 shrink-0" />
                <h3 className="font-extrabold text-stone-900 text-sm">
                  4. Entregues (Hoje)
                </h3>
              </div>
              <span className="w-6 h-6 rounded-lg bg-stone-200 text-stone-700 text-xs font-extrabold flex items-center justify-center">
                {entregues.length}
              </span>
            </div>

            <p className="text-[11px] text-stone-500 mb-3">
              Histórico de pedidos já entregues e concluídos
            </p>

            {/* Cards da Coluna */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
              {entregues.length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white/60 rounded-xl border border-dashed border-stone-300">
                  <p className="text-xs font-semibold text-stone-600">Nenhum pedido entregue ainda</p>
                </div>
              ) : (
                entregues.slice(0, 15).map((order) => renderOrderCard(order, 'entregue'))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
