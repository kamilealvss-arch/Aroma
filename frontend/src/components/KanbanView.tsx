import React, { useState, useEffect, useCallback } from 'react';
import { MotionConfig } from 'motion/react';
import {
  Clock,
  Coffee,
  CheckCircle2,
  ChefHat,
  Play,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  MessageSquare,
  User,
  GripVertical,
  Search,
} from 'lucide-react';
import {
  Column,
  gentleSpring,
  type ColumnData,
  type ColumnStatus,
  type DragState,
} from '@/components/ui/kanban-board';
import { Order, ConsumptionType } from '../../../shared/types/index.ts';
import { classifyOrdersForKanban, formatElapsedTime } from '../../../shared/logic/cafeRules.ts';
import { playChimeSound } from '../utils/sound.ts';

// Ícones de consumo fornecidos pelo usuário
import levarIcon from '../assets/icons/levar.png';
import mesaIcon from '../assets/icons/mesa.png';
import balcaoIcon from '../assets/icons/balcao.png';
import deliveryIcon from '../assets/icons/delivery.png';

interface KanbanViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => Promise<void>;
  onRefresh: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  orders,
  onUpdateOrderStatus,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);
  const [selectedConsumptionFilter, setSelectedConsumptionFilter] = useState<'ALL' | ConsumptionType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(new Date());
  const [dragState, setDragState] = useState<DragState>(null);

  // Atualiza cronômetro a cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filtra por tipo de consumo e busca por cliente / número do pedido
  const filteredOrders = orders.filter((o) => {
    if (selectedConsumptionFilter !== 'ALL' && o.consumptionType !== selectedConsumptionFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNumber = String(o.orderNumber).includes(q);
      const matchName = o.customerName.toLowerCase().includes(q);
      const matchTable = (o.tableOrTakeaway || '').toLowerCase().includes(q);
      if (!matchNumber && !matchName && !matchTable) return false;
    }
    return true;
  });

  const { pendentes, emPreparo, prontos, entregues } = classifyOrdersForKanban(filteredOrders);

  // Função de Drop (Drag and Drop entre colunas)
  const handleDrop = useCallback(
    async (cardId: string, fromColumnId: ColumnStatus, toColumnId: ColumnStatus) => {
      if (fromColumnId === toColumnId) {
        return;
      }

      const newStatus = toColumnId as Order['status'];

      // Se moveu para 'pronto' e o som estiver ligado, toca o sino de aviso
      if (newStatus === 'pronto' && soundEnabled) {
        playChimeSound();
      }

      await onUpdateOrderStatus(cardId, newStatus);
    },
    [onUpdateOrderStatus, soundEnabled]
  );

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

  // Renderizador do Ícone de Consumo (Mesa apenas com número, Levar, Balcão, Delivery)
  const renderConsumptionBadge = (order: Order) => {
    const type = order.consumptionType || 'MESA';

    switch (type) {
      case 'MESA': {
        const match = order.tableOrTakeaway?.match(/\d+/);
        const tableNumber = match ? match[0] : (order.tableOrTakeaway || '');
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border bg-[#c68e5b]/20 text-[#631a09] border-[#c68e5b]/45 text-xs font-black tracking-tight shrink-0 shadow-2xs"
            title={tableNumber ? `Mesa ${tableNumber}` : 'Mesa'}
          >
            <img src={mesaIcon} alt="Mesa" className="w-5 h-5 object-contain shrink-0" />
            <span>{tableNumber}</span>
          </span>
        );
      }
      case 'LEVAR':
        return (
          <span
            className="inline-flex items-center justify-center p-1 rounded-md border bg-[#924529]/15 border-[#924529]/40 shadow-2xs shrink-0"
            title="Para Levar"
          >
            <img src={levarIcon} alt="Para Levar" className="w-5 h-5 object-contain" />
          </span>
        );
      case 'DELIVERY':
        return (
          <span
            className="inline-flex items-center justify-center p-1 rounded-md border bg-[#820b28]/15 border-[#820b28]/35 shadow-2xs shrink-0"
            title="Delivery"
          >
            <img src={deliveryIcon} alt="Delivery" className="w-5 h-5 object-contain" />
          </span>
        );
      case 'BALCAO':
        return (
          <span
            className="inline-flex items-center justify-center p-1 rounded-md border bg-[#7e8b60]/20 border-[#7e8b60]/45 shadow-2xs shrink-0"
            title="Balcão"
          >
            <img src={balcaoIcon} alt="Balcão" className="w-5.5 h-5.5 object-contain" />
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-[#f6efdd] text-[#631a09] border-[#c68e5b]/40 text-[10px] font-extrabold">
            {order.tableOrTakeaway}
          </span>
        );
    }
  };

  // Renderizador do Card da Comanda
  const renderOrderCard = (order: Order, column: 'recebido' | 'preparando' | 'pronto' | 'entregue') => {
    const elapsed = formatElapsedTime(order.createdAt, now);
    const cleanElapsedText = elapsed.text.replace(/^[^\w\dÀ-ÿ]+/u, '').trim();

    const urgencyColors = {
      normal: 'text-stone-500 bg-stone-50 border-stone-200/80 font-medium',
      moderada: 'text-stone-600 bg-stone-50 border-stone-200 font-medium',
      urgente: 'text-stone-700 bg-stone-100 border-stone-300 font-medium',
    }[elapsed.urgency];

    return (
      <div
        className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 ${
          column === 'recebido'
            ? 'border-t-4 border-t-[#c68e5b] border-stone-200/90'
            : column === 'preparando'
            ? 'border-t-4 border-t-[#924529] border-stone-200/90'
            : column === 'pronto'
            ? 'border-t-4 border-t-[#7e8b60] border-stone-200/90'
            : 'border-t-4 border-t-[#631a09] border-stone-200/90 opacity-75'
        }`}
      >
        {/* Topo do Card: Identificação, Ícone de Consumo e Indicador Drag */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-stone-900 text-sm">
                Pedido #{order.orderNumber}
              </span>
              {renderConsumptionBadge(order)}
            </div>
            <div className="text-xs font-semibold text-stone-700 mt-0.5 flex items-center space-x-1">
              <User className="w-3 h-3 text-stone-400" />
              <span>Cliente: {order.customerName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Cronômetro */}
            <div
              className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${urgencyColors}`}
              title="Tempo decorrido desde a realização do pedido"
            >
              <Clock className="w-3 h-3 text-stone-400 shrink-0" />
              <span>{cleanElapsedText}</span>
            </div>
            {/* Ícone sutil indicando que é arrastável */}
            <div
              className="text-stone-300 hover:text-stone-600 cursor-grab"
              title="Clique e arraste esta comanda para outra coluna"
            >
              <GripVertical className="w-4 h-4" />
            </div>
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
                <div className="text-[11px] text-stone-600 bg-stone-50 px-2 py-1 rounded-md mt-1 border border-stone-200/80 font-normal">
                  <span className="text-stone-400 font-medium mr-1">Obs:</span>
                  {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Observação do Cliente (Simples e discreta) */}
        {order.notes && (
          <div className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-stone-400 font-medium text-[11px] mb-0.5">
              <MessageSquare className="w-3 h-3 text-stone-400 shrink-0" />
              <span>Observação:</span>
            </div>
            <p className="text-stone-700 font-normal leading-relaxed text-[11.5px]">
              {order.notes}
            </p>
          </div>
        )}

        {/* Rodapé com Botão de Ação Direta */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          {column === 'recebido' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartPreparing(order.id);
              }}
              className="w-full py-2 px-3 bg-[#924529] hover:bg-[#7a3820] text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Iniciar Preparo</span>
            </button>
          )}

          {column === 'preparando' && (
            <div className="flex items-center space-x-1.5 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevert(order.id, 'recebido');
                }}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                title="Voltar para Pendentes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFinishPreparing(order.id);
                }}
                className="flex-1 py-2 px-3 bg-[#820b28] hover:bg-[#680820] text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Finalizar</span>
              </button>
            </div>
          )}

          {column === 'pronto' && (
            <div className="flex items-center space-x-1.5 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevert(order.id, 'preparando');
                }}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                title="Voltar para Em Preparo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeliver(order.id);
                }}
                className="flex-1 py-2 px-3 bg-[#7e8b60] hover:bg-[#626d4a] text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3] text-white" />
                <span>Marcar como Entregue</span>
              </button>
            </div>
          )}

          {column === 'entregue' && (
            <div className="w-full flex items-center justify-between text-xs text-stone-400 font-semibold">
              <span className="flex items-center space-x-1 text-[#7e8b60]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Entregue</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevert(order.id, 'pronto');
                }}
                className="text-[11px] text-stone-500 hover:underline cursor-pointer"
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

  // Colunas com a Opção 2 escolhida: Caramelo (#c68e5b) -> Terracota (#924529) -> Verde (#7e8b60)
  const columns: ColumnData[] = [
    {
      id: 'recebido',
      title: '1. Pendentes (Novos)',
      status: 'recebido',
      subtitle: 'Pedidos recém-enviados pelo cliente',
      columnBg: 'bg-[#c68e5b]/[0.10] border-[#c68e5b]/30',
      dotColor: 'bg-[#c68e5b]',
      badgeColor: 'bg-white text-[#924529] border border-[#c68e5b]/30 shadow-2xs',
      cards: pendentes,
    },
    {
      id: 'preparando',
      title: '2. Em Preparo',
      status: 'preparando',
      subtitle: 'Barista preparando café ou assando',
      columnBg: 'bg-[#924529]/[0.08] border-[#924529]/25',
      dotColor: 'bg-[#924529]',
      badgeColor: 'bg-white text-[#924529] border border-[#924529]/25 shadow-2xs',
      cards: emPreparo,
    },
    {
      id: 'pronto',
      title: '3. Prontos (Retirada)',
      status: 'pronto',
      subtitle: 'Aguardando cliente retirar no balcão',
      columnBg: 'bg-[#7e8b60]/[0.10] border-[#7e8b60]/30',
      dotColor: 'bg-[#7e8b60]',
      badgeColor: 'bg-white text-[#7e8b60] border border-[#7e8b60]/30 shadow-2xs',
      cards: prontos,
    },
    ...(showDelivered
      ? [
          {
            id: 'entregue',
            title: '4. Entregues (Hoje)',
            status: 'entregue',
            subtitle: 'Histórico de pedidos já concluídos',
            columnBg: 'bg-[#631a09]/[0.06] border-[#631a09]/20',
            dotColor: 'bg-[#631a09]',
            badgeColor: 'bg-white text-[#631a09] border border-[#631a09]/20 shadow-2xs',
            cards: entregues.slice(0, 20),
          },
        ]
      : []),
  ];

  const getEmptyState = (status: ColumnStatus) => {
    switch (status) {
      case 'recebido':
        return (
          <div className="text-center py-12 text-stone-400 bg-white/70 rounded-2xl border border-dashed border-[#c68e5b]/40">
            <Coffee className="w-8 h-8 mx-auto text-[#c68e5b] mb-2" />
            <p className="text-xs font-semibold text-stone-600">Sem pedidos pendentes</p>
            <p className="text-[11px] text-stone-400">Novos pedidos aparecerão aqui</p>
          </div>
        );
      case 'preparando':
        return (
          <div className="text-center py-12 text-stone-400 bg-white/70 rounded-2xl border border-dashed border-[#924529]/35">
            <ChefHat className="w-8 h-8 mx-auto text-[#924529]/70 mb-2" />
            <p className="text-xs font-semibold text-stone-600">Nenhum em preparo</p>
            <p className="text-[11px] text-stone-400">Arraste uma comanda para cá ou clique em "Iniciar Preparo"</p>
          </div>
        );
      case 'pronto':
        return (
          <div className="text-center py-12 text-stone-400 bg-white/70 rounded-2xl border border-dashed border-[#7e8b60]/40">
            <CheckCircle2 className="w-8 h-8 mx-auto text-[#7e8b60] mb-2" />
            <p className="text-xs font-semibold text-stone-600">Nenhum pedido aguardando retirada</p>
            <p className="text-[11px] text-stone-400">Arraste para cá para finalizar e tocar o sino</p>
          </div>
        );
      case 'entregue':
        return (
          <div className="text-center py-12 text-stone-400 bg-white/70 rounded-2xl border border-dashed border-[#631a09]/30">
            <p className="text-xs font-semibold text-stone-600">Nenhum pedido entregue ainda</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MotionConfig transition={gentleSpring}>
      {/* Superfície branca arredondada flutuante */}
      <div className="bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 shadow-sm border border-stone-200/80 space-y-6">
        {/* Top Header do KDS */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-amarego font-normal text-2xl sm:text-3xl text-stone-900 tracking-wide">
                    Quadro Kanban de Comandas
                  </h1>
                  <span className="inline-flex items-center gap-1.5 font-medium text-stone-500 bg-stone-100/80 px-2.5 py-0.5 rounded-full border border-stone-200/80 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    {activeCount} {activeCount === 1 ? 'comanda ativa' : 'comandas ativas'}
                  </span>
                </div>
              </div>

              {/* Ações rápidas no topo direito */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    soundEnabled
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-stone-100 text-stone-500 border-stone-200'
                  }`}
                  title="Tocar sino ao finalizar pedido"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-700" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>Sino: {soundEnabled ? 'Ligado' : 'Mudo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDelivered(!showDelivered)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    showDelivered
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {showDelivered ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showDelivered ? 'Ocultar Entregues' : 'Histórico Entregues'}</span>
                </button>
              </div>
            </div>

            {/* Barra de Filtros em Cápsula (Vermelho quando selecionado) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="bg-stone-100/80 rounded-full p-1 border border-stone-200/80 shadow-2xs inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedConsumptionFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedConsumptionFilter === 'ALL'
                      ? 'bg-[#820b28] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
                  }`}
                >
                  Todos
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedConsumptionFilter('MESA')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsumptionFilter === 'MESA'
                      ? 'bg-[#820b28] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
                  }`}
                >
                  <img
                    src={mesaIcon}
                    alt=""
                    className={`w-3.5 h-3.5 object-contain transition-all ${
                      selectedConsumptionFilter === 'MESA' ? 'brightness-0 invert' : ''
                    }`}
                  />
                  <span>Mesas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedConsumptionFilter('LEVAR')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsumptionFilter === 'LEVAR'
                      ? 'bg-[#820b28] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
                  }`}
                >
                  <img
                    src={levarIcon}
                    alt=""
                    className={`w-3.5 h-3.5 object-contain transition-all ${
                      selectedConsumptionFilter === 'LEVAR' ? 'brightness-0 invert' : ''
                    }`}
                  />
                  <span>Para Levar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedConsumptionFilter('DELIVERY')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsumptionFilter === 'DELIVERY'
                      ? 'bg-[#820b28] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
                  }`}
                >
                  <img
                    src={deliveryIcon}
                    alt=""
                    className={`w-3.5 h-3.5 object-contain transition-all ${
                      selectedConsumptionFilter === 'DELIVERY' ? 'brightness-0 invert' : ''
                    }`}
                  />
                  <span>Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedConsumptionFilter('BALCAO')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsumptionFilter === 'BALCAO'
                      ? 'bg-[#820b28] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-white/80'
                  }`}
                >
                  <img
                    src={balcaoIcon}
                    alt=""
                    className={`w-3.5 h-3.5 object-contain transition-all ${
                      selectedConsumptionFilter === 'BALCAO' ? 'brightness-0 invert' : ''
                    }`}
                  />
                  <span>Balcão</span>
                </button>
              </div>

              {/* Campo de busca rápido de comanda */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por comanda ou cliente..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs w-60"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Grid Kanban: As Colunas com formato arredondado e tons pastéis elegantes */}
          <div
            className={`grid gap-5 ${
              showDelivered
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-3'
            }`}
          >
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                dragState={dragState}
                onDrop={handleDrop}
                setDragState={setDragState}
                emptyState={getEmptyState(col.id)}
                renderCard={(order) => renderOrderCard(order, col.id as any)}
              />
            ))}
          </div>
      </div>
    </MotionConfig>
  );
};
