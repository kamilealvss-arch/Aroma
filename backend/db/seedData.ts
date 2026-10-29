import { Product, SystemUser, Order, AuditLog } from '../../shared/types/index.ts';

export const initialUsers: SystemUser[] = [
  {
    id: 'usr_admin',
    name: 'Maria Silva',
    role: 'Administrador',
    email: 'maria.admin@cafegourmet.com',
    avatarColor: 'bg-amber-700',
  },
  {
    id: 'usr_sub_carlos',
    name: 'Carlos Mendes',
    role: 'Sub-gerente',
    email: 'carlos.sub@cafegourmet.com',
    avatarColor: 'bg-emerald-700',
  },
  {
    id: 'usr_barista_lucas',
    name: 'Lucas Barista',
    role: 'Barista / Caixa',
    email: 'lucas.barista@cafegourmet.com',
    avatarColor: 'bg-indigo-700',
  },
];

export const initialProducts: Product[] = [
  {
    id: 'prod_cafe_expresso',
    name: 'Café Expresso Especial',
    description: 'Grãos 100% arábica da Mogiana Paulista, torra média, notas de caramelo e cacau.',
    price: 6.50,
    costPrice: 1.80,
    category: 'Cafés Especiais',
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 95,
    minStockThreshold: 15,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_cappuccino',
    name: 'Cappuccino Italiano',
    description: 'Expresso encorpado, leite vaporizado com microespuma sedosa, cacau belga e canela em pó.',
    price: 14.00,
    costPrice: 4.20,
    category: 'Cafés Especiais',
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 42,
    minStockThreshold: 10,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_pao_queijo',
    name: 'Pão de Queijo Mineiro Artesanal',
    description: 'Receita tradicional da Serra da Canastra com queijo curado, crocante por fora e macio por dentro.',
    price: 7.50,
    costPrice: 2.30,
    category: 'Salgados Artesanais',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 48, // Inicialmente 50 un.
    minStockThreshold: 10,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_croissant',
    name: 'Croissant Francês Folhado',
    description: 'Massa folhada autêntica com pura manteiga, textura leve e dourada.',
    price: 13.00,
    costPrice: 4.80,
    category: 'Salgados Artesanais',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 4, // Atenção: Estoque Baixo! (<= 5)
    minStockThreshold: 6,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_bolo_cenoura',
    name: 'Bolo de Cenoura com Brigadeiro',
    description: 'Massa fofinha e úmida coberta com generosa calda artesanal de brigadeiro gourmet.',
    price: 15.00,
    costPrice: 4.50,
    category: 'Doces & Bolos',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 14,
    minStockThreshold: 5,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_torta_holandesa',
    name: 'Torta Holandesa Cremosa',
    description: 'Base de biscoito Calipso com creme de baunilha leve e cobertura de ganache de chocolate meio amargo.',
    price: 18.00,
    costPrice: 6.00,
    category: 'Doces & Bolos',
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 0, // ESGOTADO (Requisito RF04)!
    minStockThreshold: 5,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_frappe_caramelo',
    name: 'Frapê Gelado de Caramelo Salgado',
    description: 'Café expresso batido com gelo, leite integral, calda de caramelo toffee e chantilly fresco.',
    price: 19.50,
    costPrice: 6.20,
    category: 'Bebidas Geladas',
    imageUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 24,
    minStockThreshold: 8,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_soda_frutas_vermelhas',
    name: 'Soda Italiana de Frutas Vermelhas',
    description: 'Xarope natural artesanal de amoras, morangos e mirtilos com água gaseificada e gelo.',
    price: 12.00,
    costPrice: 3.50,
    category: 'Bebidas Geladas',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 30,
    minStockThreshold: 8,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_torta_frango',
    name: 'Quiche de Alho-poró e Brie',
    description: 'Massa podre artesanal recheada com alho-poró salteado no azeite e queijo brie cremoso.',
    price: 16.50,
    costPrice: 5.50,
    category: 'Salgados Artesanais',
    imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 3, // Estoque baixo! (< 5)
    minStockThreshold: 5,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_combo_brunch',
    name: 'Combo Brunch Parisiense',
    description: '1 Croissant folhado, 1 Café Cappuccino Italiano, manteiga artesanal e geleia de frutas vermelhas.',
    price: 29.90,
    costPrice: 9.80,
    category: 'Combos & Brunch',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 18,
    minStockThreshold: 5,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_muffin_blueberry',
    name: 'Muffin de Mirtilo com Crosta de Açúcar',
    description: 'Massa aerada repleta de mirtilos frescos e finalizada com açúcar cristal crocante.',
    price: 11.50,
    costPrice: 3.80,
    category: 'Doces & Bolos',
    imageUrl: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 20,
    minStockThreshold: 5,
    status: 'ativo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'prod_cha_pessego_antigo',
    name: 'Chá Gelado de Pêssego Safra de Verão',
    description: 'Item de edição passada do menu. Inativado via exclusão lógica mantendo histórico de vendas.',
    price: 11.00,
    costPrice: 3.00,
    category: 'Bebidas Geladas',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 0,
    minStockThreshold: 5,
    status: 'inativo', // PRODUTO COM EXCLUSÃO LÓGICA ATIVA PARA DEMONSTRAR O REQUISITO 4!
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-10-05T14:30:00.000Z',
  },
];

// Helper para gerar pedidos passados realistas
export function generateSeedOrders(): Order[] {
  const today = new Date();
  const orders: Order[] = [];
  let orderCounter = 1001;

  const customers = [
    { name: 'Beatriz Lima', phone: '(11) 98765-4321' },
    { name: 'Rafael Costa', phone: '(11) 99123-5566' },
    { name: 'Mariana Souza', phone: '(11) 97788-9900' },
    { name: 'Carlos Eduardo', phone: '(11) 96655-4433' },
    { name: 'Fernanda Martins', phone: '(11) 95544-3322' },
    { name: 'Gustavo Alencar', phone: '(11) 94433-2211' },
    { name: 'Camila Rocha', phone: '(11) 93322-1100' },
  ];

  // Quantidade determinística de pedidos por dia para evitar divergência entre instâncias serverless
  const pastDayCounts = [14, 12, 15, 11, 16, 13, 14];

  // Gera vendas dos últimos 7 dias (incluindo hoje)
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const isToday = daysAgo === 0;
    // Hoje terá 14 pedidos fixos e os dias anteriores seguem valores determinísticos
    const countForDay = isToday ? 14 : pastDayCounts[daysAgo];

    for (let j = 0; j < countForDay; j++) {
      const cust = customers[(orderCounter + j) % customers.length];
      const hour = 8 + Math.floor((j / countForDay) * 11);
      const min = (j * 17) % 60;
      date.setHours(hour, min, 0, 0);

      const items = [];
      // Cappuccino + Pão de queijo é o mais popular
      if (j % 2 === 0) {
        items.push({
          productId: 'prod_cappuccino',
          productName: 'Cappuccino Italiano',
          unitPrice: 14.00,
          costPrice: 4.20,
          quantity: 1 + (j % 2),
          subtotal: 14.00 * (1 + (j % 2)),
        });
      }
      if (j % 3 === 0 || j % 2 !== 0) {
        items.push({
          productId: 'prod_pao_queijo',
          productName: 'Pão de Queijo Mineiro Artesanal',
          unitPrice: 7.50,
          costPrice: 2.30,
          quantity: 2,
          subtotal: 15.00,
        });
      }
      if (j % 4 === 0) {
        items.push({
          productId: 'prod_bolo_cenoura',
          productName: 'Bolo de Cenoura com Brigadeiro',
          unitPrice: 15.00,
          costPrice: 4.50,
          quantity: 1,
          subtotal: 15.00,
        });
      }
      if (j % 5 === 0) {
        items.push({
          productId: 'prod_combo_brunch',
          productName: 'Combo Brunch Parisiense',
          unitPrice: 29.90,
          costPrice: 9.80,
          quantity: 1,
          subtotal: 29.90,
        });
      }
      // Vendas do chá inativo no passado para demonstrar que exclusão lógica preserva relatórios
      if (daysAgo >= 4 && j === 1) {
        items.push({
          productId: 'prod_cha_pessego_antigo',
          productName: 'Chá Gelado de Pêssego Safra de Verão',
          unitPrice: 11.00,
          costPrice: 3.00,
          quantity: 1,
          subtotal: 11.00,
        });
      }

      if (items.length === 0) {
        items.push({
          productId: 'prod_cafe_expresso',
          productName: 'Café Expresso Especial',
          unitPrice: 6.50,
          costPrice: 1.80,
          quantity: 1,
          subtotal: 6.50,
        });
      }

      const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0);
      const totalCost = items.reduce((sum, it) => sum + it.costPrice * it.quantity, 0);
      const tables = ['Mesa 04', 'Para Levar', 'Mesa 02', 'Delivery', 'Mesa 01', 'Balcão'];
      const methods: Order['paymentMethod'][] = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];

      const tableChoice = tables[j % tables.length];
      let consumptionType: Order['consumptionType'] = 'MESA';
      if (tableChoice.includes('Levar')) consumptionType = 'LEVAR';
      else if (tableChoice.includes('Delivery')) consumptionType = 'DELIVERY';
      else if (tableChoice.includes('Balcão')) consumptionType = 'BALCAO';

      // Observações em destaque solicitadas no PDF / requisitos
      const observationsList = [
        'S/ Açúcar por favor, bem quente!',
        'Leite sem lactose no cappuccino',
        'Aquecer bem o pão de queijo',
        'Caprichar na canela',
        'Sem talher plástico, retirar no balcão',
        undefined,
        undefined,
      ];
      const orderNotes = observationsList[j % observationsList.length];

      // Status para pedidos de hoje: distribuídos nas colunas do Kanban
      let status: Order['status'] = 'entregue';
      if (isToday) {
        if (j === countForDay - 1 || j === countForDay - 2) {
          status = 'recebido'; // 🔴 Pendentes (Novos)
        } else if (j === countForDay - 3 || j === countForDay - 4) {
          status = 'preparando'; // 🟡 Em Preparo
        } else if (j === countForDay - 5) {
          status = 'pronto'; // 🟢 Prontos
        }
      }

      orders.push({
        id: `ord_${orderCounter}`,
        orderNumber: orderCounter,
        customerName: cust.name,
        customerPhone: cust.phone,
        tableOrTakeaway: tableChoice,
        consumptionType,
        notes: orderNotes,
        items,
        totalAmount,
        totalCost,
        status,
        paymentMethod: methods[j % methods.length],
        stockDeducted: true,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
        startedPreparingAt: status === 'preparando' || status === 'pronto' ? date.toISOString() : undefined,
        readyAt: status === 'pronto' ? date.toISOString() : undefined,
      });

      orderCounter++;
    }
  }

  return orders;
}

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_seed_1',
    timestamp: '2026-10-01T08:30:00.000Z',
    userId: 'usr_admin',
    userName: 'Maria Silva',
    userRole: 'Administrador',
    actionType: 'NOVO_PRODUTO',
    targetEntity: 'Produto',
    targetId: 'prod_pao_queijo',
    details: 'Cadastro do produto "Pão de Queijo Mineiro Artesanal" com estoque inicial de 50 un. pela administradora Maria Silva.',
    oldValue: null,
    newValue: 50,
  },
  {
    id: 'log_seed_2',
    timestamp: '2026-10-05T14:30:00.000Z',
    userId: 'usr_admin',
    userName: 'Maria Silva',
    userRole: 'Administrador',
    actionType: 'EXCLUSAO_LOGICA',
    targetEntity: 'Produto',
    targetId: 'prod_cha_pessego_antigo',
    details: 'Exclusão lógica: Produto "Chá Gelado de Pêssego Safra de Verão" marcado como inativo pelo usuário Maria Silva (Administrador). Histórico de vendas foi preservado.',
    oldValue: 'ativo',
    newValue: 'inativo',
  },
  {
    id: 'log_seed_3',
    timestamp: '2026-10-10T11:15:00.000Z',
    userId: 'usr_sub_carlos',
    userName: 'Carlos Mendes',
    userRole: 'Sub-gerente',
    actionType: 'PRECO_ALTERADO',
    targetEntity: 'Produto',
    targetId: 'prod_cafe_expresso',
    details: 'Preço do produto "Café Expresso Especial" alterado de R$ 5,00 para R$ 6,50 pelo usuário Carlos Mendes (Sub-gerente) em 10/10/2026.',
    oldValue: 5.0,
    newValue: 6.5,
  },
  {
    id: 'log_seed_4',
    timestamp: '2026-10-15T16:20:00.000Z',
    userId: 'usr_sub_carlos',
    userName: 'Carlos Mendes',
    userRole: 'Sub-gerente',
    actionType: 'ESTOQUE_AJUSTADO',
    targetEntity: 'Estoque',
    targetId: 'prod_croissant',
    details: 'Entrada de lote: Estoque de "Croissant Francês Folhado" ajustado de 2 para 20 (+18 un.) por Carlos Mendes (Sub-gerente).',
    oldValue: 2,
    newValue: 20,
  },
];
