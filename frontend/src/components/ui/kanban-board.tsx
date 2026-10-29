import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type ColumnStatus = 'recebido' | 'preparando' | 'pronto' | 'entregue' | 'todo' | 'in-progress' | 'done' | string;

export interface CardTag {
  label: string;
  variant?: 'feature' | 'bug' | 'docs' | 'design' | 'improvement' | 'done' | string;
}

export interface KanbanCardItem {
  id: string;
  title?: string;
  tags?: CardTag[];
  assignee?: {
    name: string;
    avatar?: string;
  };
  date?: string;
  [key: string]: any;
}

export interface ColumnData {
  id: ColumnStatus;
  title: string;
  status: ColumnStatus;
  subtitle?: string;
  badgeColor?: string;
  cards: any[];
}

export type DragState = {
  cardId: string;
  fromColumnId: ColumnStatus;
} | null;

export const gentleSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 25,
  mass: 0.5,
};

export interface ColumnProps {
  column: ColumnData;
  dragState: DragState;
  onDrop: (cardId: string, fromColumnId: ColumnStatus, toColumnId: ColumnStatus) => void;
  setDragState: (state: DragState) => void;
  renderCard?: (card: any, columnStatus: ColumnStatus) => React.ReactNode;
  headerIcon?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export const Column: React.FC<ColumnProps> = ({
  column,
  dragState,
  onDrop,
  setDragState,
  renderCard,
  headerIcon,
  emptyState,
  className = '',
}) => {
  const [isOver, setIsOver] = useState(false);

  const isDraggingSource = dragState?.fromColumnId === column.id;
  const isTargetOfDrag = dragState !== null && !isDraggingSource;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Evita falsos disparos se entrar em elementos filhos
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
    }
  };

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    try {
      const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      let cardId = '';
      let fromColumnId: ColumnStatus = '';

      if (rawData) {
        const parsed = JSON.parse(rawData);
        cardId = parsed.cardId;
        fromColumnId = parsed.fromColumnId;
      } else if (dragState) {
        cardId = dragState.cardId;
        fromColumnId = dragState.fromColumnId;
      }

      if (cardId && fromColumnId) {
        onDrop(cardId, fromColumnId, column.id);
      }
    } catch {
      if (dragState) {
        onDrop(dragState.cardId, dragState.fromColumnId, column.id);
      }
    } finally {
      setDragState(null);
    }
  };

  return (
    <motion.div
      layout
      transition={gentleSpring}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      className={`rounded-2xl border transition-all duration-200 p-3.5 flex flex-col min-h-[520px] relative select-none ${
        isOver
          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 scale-[1.01]'
          : isTargetOfDrag
          ? 'bg-stone-100/90 border-dashed border-stone-400/80 hover:border-amber-400'
          : 'bg-stone-100/90 border-stone-200/90'
      } ${className}`}
    >
      {/* Header da Coluna */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
        <div className="flex items-center space-x-2">
          {headerIcon}
          <h3 className="font-extrabold text-stone-900 text-sm">
            {column.title}
          </h3>
        </div>
        <span
          className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center transition-transform ${
            isOver ? 'scale-110' : ''
          } ${column.badgeColor || 'bg-stone-200 text-stone-800'}`}
        >
          {column.cards.length}
        </span>
      </div>

      {column.subtitle && (
        <p className="text-[11px] text-stone-500 mb-3">
          {column.subtitle}
        </p>
      )}

      {/* Indicador visual de Drop Hover */}
      <AnimatePresence>
        {isOver && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="mb-3 py-2 px-3 rounded-xl bg-amber-500 text-stone-950 font-extrabold text-xs text-center shadow-md flex items-center justify-center space-x-1.5"
          >
            <span>⬇️</span>
            <span>Soltar comanda em "{column.title}"</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Cards com Scroll suave */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
        {column.cards.length === 0 ? (
          emptyState || (
            <div className="text-center py-12 text-stone-400 bg-white/60 rounded-xl border border-dashed border-stone-300">
              <p className="text-xs font-semibold text-stone-600">Sem pedidos nesta coluna</p>
              <p className="text-[11px] text-stone-400">Arraste uma comanda para cá</p>
            </div>
          )
        ) : (
          column.cards.map((card) => {
            const isCardDragging = dragState?.cardId === card.id;

            return (
              <motion.div
                key={card.id}
                layout
                layoutId={card.id}
                transition={gentleSpring}
                draggable
                onDragStart={(e: any) => {
                  setDragState({ cardId: card.id, fromColumnId: column.id });
                  const payload = JSON.stringify({ cardId: card.id, fromColumnId: column.id });
                  if (e.dataTransfer) {
                    e.dataTransfer.setData('application/json', payload);
                    e.dataTransfer.setData('text/plain', payload);
                    e.dataTransfer.effectAllowed = 'move';
                  }
                }}
                onDragEnd={() => {
                  setDragState(null);
                  setIsOver(false);
                }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className={`cursor-grab active:cursor-grabbing transition-shadow ${
                  isCardDragging
                    ? 'opacity-40 rotate-1 scale-95 shadow-none'
                    : 'hover:shadow-md'
                }`}
              >
                {renderCard ? (
                  renderCard(card, column.id)
                ) : (
                  <DefaultKanbanCard card={card} />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

const DefaultKanbanCard: React.FC<{ card: KanbanCardItem }> = ({ card }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-2.5">
      <div className="font-bold text-stone-900 text-sm">{card.title || card.id}</div>
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700"
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
      {card.assignee && (
        <div className="flex items-center space-x-2 pt-2 border-t border-stone-100 text-xs text-stone-600">
          {card.assignee.avatar && (
            <img
              src={card.assignee.avatar}
              alt={card.assignee.name}
              className="w-5 h-5 rounded-full"
            />
          )}
          <span>{card.assignee.name}</span>
        </div>
      )}
    </div>
  );
};
