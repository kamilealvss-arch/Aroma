import React, { useRef, useState, useEffect } from 'react';
import { Download, ArrowRight, X } from 'lucide-react';
import { Order } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

interface OrderReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  onTrackOrder?: (orderId: string) => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  onClose,
  onTrackOrder,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [paperHeight, setPaperHeight] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const paperContentRef = useRef<HTMLDivElement>(null);

  const orderDate = order ? new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) : '';

  const orderTime = order ? new Date(order.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }) : '';

  const orderDisplayId = order
    ? (order.orderNumber ? String(order.orderNumber).padStart(4, '0') : order.id.slice(-5).toUpperCase())
    : '';

  // Efeito de impressão: o título e a bobina são 100% estáticos e apenas o papel desce
  useEffect(() => {
    if (!order) return;

    setPaperHeight(0);
    setIsFinished(false);

    const startTimer = setTimeout(() => {
      if (paperContentRef.current) {
        setPaperHeight(paperContentRef.current.scrollHeight);
      } else {
        const estimated = 480 + (order.items.length * 26);
        setPaperHeight(estimated);
      }
    }, 200);

    const finishTimer = setTimeout(() => {
      setIsFinished(true);
    }, 3600);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(finishTimer);
    };
  }, [order?.id]);

  if (!order) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = 2;
      const width = 380 * scale;
      const baseHeight = 580 * scale;
      const itemRowHeight = 26 * scale;
      const extraItemsHeight = order.items.length * itemRowHeight;
      const totalHeight = baseHeight + extraItemsHeight;

      canvas.width = width;
      canvas.height = totalHeight;

      // Fundo Papel Térmico
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, width, totalHeight);

      // Topo Aroma Oficial
      ctx.fillStyle = '#2B1810';
      ctx.textAlign = 'center';

      ctx.font = `bold ${34 * scale}px "Amarego", "Playfair Display", Georgia, serif`;
      ctx.fillText('Aroma', width / 2, 60 * scale);

      ctx.font = `600 ${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#7A6E65';
      ctx.fillText('CAFÉ & GASTRONOMIA ARTESANAL', width / 2, 80 * scale);

      ctx.font = `${10 * scale}px "Courier Prime", monospace`;
      ctx.fillStyle = '#9C8E84';
      ctx.fillText('Rua das Flores, 120 • Tel: (11) 98765-4321', width / 2, 95 * scale);

      // Linha Pontilhada
      ctx.strokeStyle = '#D8D0C5';
      ctx.lineWidth = 1.5 * scale;
      ctx.setLineDash([5 * scale, 4 * scale]);
      ctx.beginPath();
      ctx.moveTo(25 * scale, 112 * scale);
      ctx.lineTo((380 - 25) * scale, 112 * scale);
      ctx.stroke();

      // Dados do Pedido
      ctx.setLineDash([]);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1A1817';
      ctx.font = `bold ${16 * scale}px "Courier Prime", monospace`;
      ctx.fillText(`PEDIDO #${orderDisplayId}`, 25 * scale, 136 * scale);

      ctx.font = `${12 * scale}px "Courier Prime", monospace`;
      ctx.fillStyle = '#5A4E46';
      ctx.fillText(`Data: ${orderDate} às ${orderTime}`, 25 * scale, 156 * scale);
      ctx.fillText(`Cliente: ${order.customerName || 'Cliente Balcão'}`, 25 * scale, 174 * scale);
      ctx.fillText(`Local: ${order.tableOrTakeaway || 'Balcão / Retirada'}`, 25 * scale, 192 * scale);

      // Divisor
      ctx.setLineDash([5 * scale, 4 * scale]);
      ctx.beginPath();
      ctx.moveTo(25 * scale, 208 * scale);
      ctx.lineTo((380 - 25) * scale, 208 * scale);
      ctx.stroke();

      // Cabeçalho dos Itens
      ctx.setLineDash([]);
      ctx.font = `bold ${11 * scale}px "Courier Prime", monospace`;
      ctx.fillStyle = '#7A6E65';
      ctx.fillText('QTD  ITEM', 25 * scale, 226 * scale);
      ctx.textAlign = 'right';
      ctx.fillText('VALOR', (380 - 25) * scale, 226 * scale);

      // Itens
      let currentY = 248 * scale;
      ctx.font = `${12 * scale}px "Courier Prime", monospace`;
      ctx.fillStyle = '#1A1817';

      order.items.forEach((item) => {
        ctx.textAlign = 'left';
        const itemName = item.productName.length > 22
          ? item.productName.substring(0, 20) + '..'
          : item.productName;
        const itemLine = `${item.quantity}x ${itemName}`;
        ctx.fillText(itemLine, 25 * scale, currentY);

        ctx.textAlign = 'right';
        ctx.fillText(formatCurrencyBRL(item.subtotal || item.unitPrice * item.quantity), (380 - 25) * scale, currentY);

        currentY += itemRowHeight;
      });

      // Linha antes dos totais
      ctx.setLineDash([5 * scale, 4 * scale]);
      ctx.beginPath();
      ctx.moveTo(25 * scale, currentY + (5 * scale));
      ctx.lineTo((380 - 25) * scale, currentY + (5 * scale));
      ctx.stroke();

      currentY += 26 * scale;
      ctx.setLineDash([]);

      // Forma de Pagamento
      ctx.textAlign = 'left';
      ctx.font = `${12 * scale}px "Courier Prime", monospace`;
      ctx.fillStyle = '#5A4E46';
      ctx.fillText('FORMA DE PAGAMENTO:', 25 * scale, currentY);
      ctx.textAlign = 'right';
      ctx.fillText(order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'PIX', (380 - 25) * scale, currentY);

      currentY += 20 * scale;
      ctx.textAlign = 'left';
      ctx.font = `bold ${16 * scale}px "Courier Prime", monospace`;
      ctx.fillStyle = '#1A1817';
      ctx.fillText('TOTAL PAGO', 25 * scale, currentY);
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrencyBRL(order.totalAmount), (380 - 25) * scale, currentY);

      // Código de Barras Decorativo
      currentY += 30 * scale;
      const barcodeWidth = (380 - 50) * scale;
      const barcodeHeight = 36 * scale;
      const barX = 25 * scale;

      ctx.fillStyle = '#1A1817';
      for (let i = 0; i < barcodeWidth; i += (4 * scale)) {
        const barW = (Math.sin(i * 11) > 0 ? 2 : 1) * scale;
        ctx.fillRect(barX + i, currentY, barW, barcodeHeight);
      }

      currentY += barcodeHeight + (16 * scale);
      ctx.textAlign = 'center';
      ctx.font = `${11 * scale}px "Courier Prime", monospace`;
      ctx.fillStyle = '#7A6E65';
      ctx.fillText(`* ${order.id.toUpperCase()} *`, width / 2, currentY);

      currentY += 22 * scale;
      ctx.font = `italic 600 ${14 * scale}px "Amarego", "Playfair Display", Georgia, serif`;
      ctx.fillStyle = '#3E2723';
      ctx.fillText('Obrigado pelo seu pedido! Tenha um ótimo café.', width / 2, currentY);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `comprovante-aroma-${orderDisplayId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in select-none">
      {/* =========================================================================
          FUNDO COM TOLDO / TENDINHA DE CAFETERIA
          1. Topo: Faixa sólida Creme (#f6efdd)
          2. Detalhe: Fileira de quadradinhos verdes (#7f8c61) no rodapé da faixa creme
          3. Toldo: Listras verticais com pontas arredondadas 100% lisas (sem risquinhos)
         ========================================================================= */}
      
      {/* 1. Base geral da tela: tom #f6efdd */}
      <div 
        className="fixed inset-0 transition-opacity" 
        style={{ backgroundColor: '#f6efdd' }} 
        onClick={onClose} 
      />

      {/* 2. Barra Superior Sólida Creme (onde fica o título estático) */}
      <div 
        className="fixed top-0 left-0 right-0 h-[100px] sm:h-[110px] z-10 pointer-events-none"
        style={{ backgroundColor: '#f6efdd' }}
      >
        {/* Fileira de Quadradinhos Verdes (#7f8c61) na transição para as listras */}
        <div className="absolute bottom-0 left-0 right-0 h-[10px] overflow-hidden leading-none z-20">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  #7f8c61 0px,
                  #7f8c61 14px,
                  transparent 14px,
                  transparent 28px
                )
              `,
            }}
          />
        </div>
      </div>

      {/* 3. Tendinha / Toldo com listras começando abaixo da barra sólida de texto (~100px / 110px) */}
      <div 
        className="fixed top-[100px] sm:top-[110px] left-0 right-0 h-[calc(72vh-100px)] min-h-[440px] max-h-[660px] pointer-events-none z-0 overflow-visible"
        style={{
          backgroundColor: '#f6efdd',
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              #f6efdd 0px,
              #f6efdd 60px,
              #822B3B 60px,
              #822B3B 120px
            )
          `,
        }}
      >
        {/* Voltinhas da Tendinha: sem qualquer fresta ou risquinho horizontal */}
        <div className="absolute -bottom-[29px] left-0 right-0 h-[30px] overflow-hidden leading-none z-10">
          <svg className="w-full h-[30px] block" preserveAspectRatio="none">
            <defs>
              <pattern id="striped-scallop-pattern" width="120" height="30" patternUnits="userSpaceOnUse">
                {/* Ponta arredondada da listra creme (x: 0 a 60) preenchendo até o fim exato da altura 30 */}
                <path 
                  d="M 0,0 L 60,0 C 60,20 45,30 30,30 C 15,30 0,20 0,0 Z" 
                  fill="#f6efdd" 
                />
                {/* Ponta arredondada da listra vinho (x: 60 a 120) preenchendo até o fim exato da altura 30 */}
                <path 
                  d="M 60,0 L 120,0 C 120,20 105,30 90,30 C 75,30 60,20 60,0 Z" 
                  fill="#822B3B" 
                />
              </pattern>
            </defs>
            <rect width="100%" height="30" fill="url(#striped-scallop-pattern)" />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          MODAL COM POSICIONAMENTO 100% ESTÁTICO (NÃO PULA NEM MUDA DE LUGAR)
         ========================================================================= */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center pt-3 pb-12">
        
        {/* Botão de Fechar discreto no canto */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2 right-1 sm:-right-4 p-2 rounded-full bg-white/95 hover:bg-white text-[#5C4033] shadow-md transition hover:scale-105 cursor-pointer z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Título 100% Estático no topo (sobre a área clara sólida, sem o subtítulo removido) */}
        <div className="w-full text-center flex items-center justify-center py-2 z-40">
          <h2 className="font-['Amarego'] text-2xl sm:text-3xl text-[#2B1810] tracking-wide leading-tight">
            {isFinished ? 'Seu pedido está pronto!' : 'Imprimindo seu pedido...'}
          </h2>
        </div>

        {/* =====================================================================
            ESTRUTURA DA BOBINA (100% ESTÁTICA - O TOPO NÃO SE MOVE)
           ===================================================================== */}
        <div className="relative w-full flex flex-col items-center mt-2">

          {/* 1. CAMADA DE FUNDO / BASE DA BOBINA (Fica ATRÁS do papel - z-0) */}
          <div 
            className="absolute top-0 z-0 flex flex-col items-center pointer-events-none"
            style={{
              width: 'min(360px, 92vw)',
              height: '82px',
              background: 'linear-gradient(180deg, #eae6de 0%, #a8a399 75%, #ccc8bf 100%)',
              borderRadius: '16px 16px 12px 12px',
              boxShadow: '0 16px 30px rgba(0,0,0,0.22), inset 0 2px 4px white, inset 0 -4px 8px rgba(100,95,90,0.4)',
            }}
          />

          {/* 2. CAMADA DO TOPO DA BOBINA (Capô metálico superior onde fica a fenda) - z-30 */}
          <div 
            className="relative z-30 flex flex-col items-center pointer-events-none"
            style={{
              width: 'min(360px, 92vw)',
              height: '58px',
              background: 'linear-gradient(180deg, #fbfaf8 0%, #dedad2 40%, #b8b3a9 85%, #6a665f 100%)',
              borderRadius: '16px 16px 4px 4px',
              boxShadow: 'inset 0 2px 4px white, 0 5px 12px rgba(0,0,0,0.28)',
            }}
          >
            {/* Logo ícone Aroma oficial (posicionado onde foi marcado em amarelo) */}
            <div className="flex items-center justify-center mt-2">
              <img 
                src="/aroma-icon.png" 
                alt="Aroma" 
                className="h-[30px] w-auto object-contain opacity-85 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]" 
              />
            </div>

            {/* A FENDA ESCURA DE ONDE O PAPEL SAI */}
            <div 
              className="absolute -bottom-1.5 left-[8%] w-[84%] h-[7px] rounded-full"
              style={{
                background: 'linear-gradient(#0a0908, #2a2826)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.95), 0 1px 2px rgba(255,255,255,0.4)',
              }}
            />
          </div>

          {/* 3. O PAPEL TÉRMICO (z-20 - SAI DA FENDA E ROLA PARA BAIXO POR CIMA DA BASE) */}
          <div 
            className="relative z-20 -mt-2 overflow-hidden transition-[height] duration-[3400ms] ease-[cubic-bezier(.2,.7,.2,1)] filter drop-shadow-[0_18px_25px_rgba(0,0,0,0.20)]"
            style={{
              width: 'min(296px, 78vw)',
              height: `${paperHeight}px`,
            }}
          >
            {/* Sombra realista na saída da fenda metálica */}
            <div className="w-full h-2.5 bg-gradient-to-b from-black/45 via-black/15 to-transparent relative z-30 flex-shrink-0" />

            {/* Conteúdo Real do Papel da Notinha */}
            <div 
              ref={paperContentRef} 
              className="w-full bg-[#FAF8F5] text-[#1E1C1A] px-5 sm:px-6 pt-5 pb-4 relative select-none flex flex-col items-center"
              style={{
                fontFamily: '"Courier Prime", Courier, monospace',
              }}
            >
              {/* Topo do Cupom: Tipografia Aroma Oficial */}
              <div className="w-full text-center border-b border-dashed border-[#D1C7BD] pb-4 mb-3.5">
                <h2 className="font-['Amarego'] text-3xl sm:text-4xl tracking-wide text-[#2B1810] font-normal leading-none mb-1">
                  Aroma
                </h2>
                <p className="text-[10px] sm:text-[11px] font-sans tracking-widest uppercase text-[#7D6E63] font-semibold mt-1">
                  Café & Gastronomia
                </p>
                <p className="text-[9px] text-[#9C8E84] mt-0.5 font-mono">
                  Rua das Flores, 120 • (11) 98765-4321
                </p>
              </div>

              {/* Cabeçalho de Dados do Pedido */}
              <div className="w-full text-xs leading-relaxed text-[#4A3E36] mb-3 pb-3 border-b border-dashed border-[#D1C7BD]">
                <div className="font-bold text-[#1E1C1A] text-sm mb-1">
                  PEDIDO #{orderDisplayId}
                </div>
                <div className="flex justify-between text-[11px] text-[#6D5D53]">
                  <span>Data: {orderDate}</span>
                  <span>{orderTime}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#6D5D53]">
                  <span>Cliente:</span>
                  <span className="font-semibold text-[#2B1810] truncate max-w-[170px]">
                    {order.customerName || 'Cliente Balcão'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#6D5D53]">
                  <span>Local / Retirada:</span>
                  <span className="font-semibold text-[#2B1810]">
                    {order.tableOrTakeaway || 'Balcão / Viagem'}
                  </span>
                </div>
              </div>

              {/* Lista de Itens */}
              <div className="w-full space-y-1.5 mb-3 pb-3 border-b border-dashed border-[#D1C7BD]">
                <div className="flex justify-between text-[9px] text-[#8C7D73] font-bold uppercase tracking-wider mb-1">
                  <span>Qtd / Item</span>
                  <span>Total</span>
                </div>

                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-baseline text-xs leading-snug">
                    <div className="flex-1 pr-2 truncate">
                      <span className="font-bold text-[#2B1810] mr-1">{item.quantity}x</span>
                      <span className="text-[#3A2E28] font-medium">{item.productName}</span>
                    </div>
                    <span className="font-bold text-[#2B1810] whitespace-nowrap">
                      {formatCurrencyBRL(item.subtotal || item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Valores / Pagamento */}
              <div className="w-full space-y-1 text-xs text-[#5A4B42] mb-3 pb-3 border-b border-dashed border-[#D1C7BD]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrencyBRL(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-dotted border-[#E2D9CF]">
                  <span className="font-extrabold text-sm text-[#2B1810]">TOTAL PAGO</span>
                  <span className="font-extrabold text-base text-[#2B1810]">
                    {formatCurrencyBRL(order.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-[#7A6C62] pt-0.5">
                  <span>Forma de Pagamento:</span>
                  <span className="uppercase font-semibold text-[#3E2723]">
                    {order.paymentMethod || 'Pix Instantâneo'}
                  </span>
                </div>
              </div>

              {/* Código de barras decorativo e Agradecimento Centralizado */}
              <div className="w-full pt-1 flex flex-col items-center text-center">
                <div className="w-full flex justify-between items-center h-8 px-1 opacity-90">
                  {[...Array(36)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-[#2B1810] h-full"
                      style={{
                        width: (i % 4 === 0 || i % 7 === 0) ? '3px' : (i % 2 === 0 ? '1.5px' : '1px'),
                        opacity: (i % 6 === 0) ? 0.7 : 1,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[9px] tracking-[0.25em] text-[#7A6C62] mt-1 font-mono">
                  *{order.id.slice(0, 10).toUpperCase()}*
                </span>

                <p className="text-[12px] font-['Amarego'] italic text-[#4A3226] text-center mt-2.5 leading-snug">
                  Obrigado pelo seu pedido! Tenha um ótimo café.
                </p>
              </div>

              {/* BORDA DE CORTE ONDULADA (SCALLOPED / VIEIRAS) NA BASE DO PAPEL */}
              <div className="w-full overflow-hidden leading-none relative z-10 -mt-[1px] pt-3 flex-shrink-0">
                <svg
                  className="w-full block text-[#FAF8F5] fill-current"
                  viewBox="0 0 290 16"
                  preserveAspectRatio="none"
                  style={{ height: '16px' }}
                >
                  <path
                    d="
                      M 0,0 
                      L 290,0 
                      L 290,4
                      C 285,14 275,14 270,4
                      C 265,14 255,14 250,4
                      C 245,14 235,14 230,4
                      C 225,14 215,14 210,4
                      C 205,14 195,14 190,4
                      C 185,14 175,14 170,4
                      C 165,14 155,14 150,4
                      C 145,14 135,14 130,4
                      C 125,14 115,14 110,4
                      C 105,14 95,14 90,4
                      C 85,14 75,14 70,4
                      C 65,14 55,14 50,4
                      C 45,14 35,14 30,4
                      C 25,14 15,14 10,4
                      C 7,14 3,14 0,4
                      Z
                    "
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* =====================================================================
              BOTÕES DE AÇÃO: FICAM SEMPRE ABAIXO DA NOTINHA
             ===================================================================== */}
          <div 
            className={`w-full max-w-[310px] mt-6 flex flex-col gap-2.5 z-30 transition-all duration-700 ${
              isFinished ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#5C4033] hover:bg-[#4A3226] active:scale-[0.99] shadow-md transition-all duration-200 cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Gerando Notinha...' : 'Baixar Comprovante'}
            </button>

            {onTrackOrder && (
              <button
                onClick={() => {
                  onTrackOrder(order.id);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-[#5C4033] bg-white/95 hover:bg-white border border-[#D7CCC8] shadow-sm transition-all duration-200 cursor-pointer"
              >
                <span>Acompanhar Pedido ao Vivo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
