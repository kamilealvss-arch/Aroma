export type ProductCategory = 
  | 'Cafés Especiais'
  | 'Bebidas Geladas'
  | 'Doces & Bolos'
  | 'Salgados Artesanais'
  | 'Combos & Brunch'
  | (string & {});

export type ProductStatus = 'ativo' | 'inativo';

export interface ProductSizeOption {
  name: string; // Ex: 'P (150ml)', 'M (300ml)', 'G (450ml)'
  price: number;
  costPrice?: number;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export interface ComboItemConfig {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  category: ProductCategory;
  subcategory?: string;      // Subcategoria dentro da categoria principal (ex: 'Espressos & Puros', 'Folhados & Croissants')
  imageUrl: string;          // Imagem quadrada normal (catálogo de produtos / gestão)
  cutoutImageUrl?: string;   // Imagem recortada sem fundo (cardápio do cliente e modal de detalhes)
  stockQuantity: number;
  minStockThreshold: number; // Ex: 5 unidades para aviso de estoque baixo
  status: ProductStatus;     // 'ativo' ou 'inativo' (Exclusão Lógica - Requisito 4)
  hasSizes?: boolean;        // Se possui opções de tamanho (ex: cafés e bebidas)
  sizes?: ProductSizeOption[]; // Lista opcional de tamanhos disponíveis
  hasAddons?: boolean;       // Se possui opções de adicionais/complementos específicos
  addons?: ProductAddon[];   // Lista de adicionais configurados para este produto
  isCombo?: boolean;
  comboItems?: ComboItemConfig[];
  originalComboPrice?: number;
  discountPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== INGREDIENTES E MATÉRIAS-PRIMAS ====================
export type IngredientUnit = 'kg' | 'g' | 'L' | 'ml' | 'un';

export type IngredientCategory =
  | 'Grãos & Pós'
  | 'Laticínios'
  | 'Panificação & Doces'
  | 'Mercearia & Adoçantes'
  | 'Embalagens & Descartáveis'
  | 'Adicionais & Complementos';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  currentStock: number;
  unit: IngredientUnit;
  minStockThreshold: number;
  costPerUnit: number; // Custo por kg, L ou un
  supplier?: string;
  isAddonIngredient?: boolean; // Se é utilizado como ingrediente adicional no cardápio
  updatedAt: string;
}

export interface StockAlert {
  productId: string;
  productName: string;
  category: ProductCategory;
  subcategory?: string;      // Subcategoria dentro da categoria principal (ex: 'Espressos & Puros', 'Folhados & Croissants')
  currentStock: number;
  minStockThreshold: number;
  isOutOfStock: boolean;
  severity: 'critico' | 'atencao';
  message: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  selectedSize?: string; // Ex: 'M (300ml)'
  selectedAddons?: string[]; // Ex: ['Chantilly Artesanal', 'Shot Extra']
  unitPrice: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  notes?: string; // Ex: "(S/ Açúcar)", "(Leite sem lactose)"
}

export type ConsumptionType = 'MESA' | 'BALCAO' | 'LEVAR' | 'DELIVERY';

export type OrderStatus = 'recebido' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
export type PaymentMethod = 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro';

export interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone?: string;
  tableOrTakeaway: string; // Ex: "Mesa 03", "Balcão / Para Viagem"
  consumptionType?: ConsumptionType; // [ MESA 04 ], [ PARA LEVAR ], [ DELIVERY ]
  notes?: string; // Observações em destaque
  items: OrderItem[];
  totalAmount: number;
  totalCost: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  stockDeducted: boolean;
  createdAt: string;
  updatedAt: string;
  startedPreparingAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

export type AuditActionType = 
  | 'PRECO_ALTERADO'
  | 'EXCLUSAO_LOGICA'
  | 'REATIVACAO_PRODUTO'
  | 'ESTOQUE_AJUSTADO'
  | 'NOVO_PRODUTO'
  | 'PRODUTO_ATUALIZADO'
  | 'PEDIDO_FINALIZADO';

export type UserRole = 'Administrador' | 'Sub-gerente' | 'Barista / Caixa';

export interface SystemUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatarColor: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  actionType: AuditActionType;
  targetEntity: 'Produto' | 'Estoque' | 'Pedido' | 'Sistema';
  targetId?: string;
  details: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
}

export interface DailyDashboardMetrics {
  todayRevenue: number;
  todayOrdersCount: number;
  todayAverageTicket: number;
  todayProfit: number;
  lowStockAlertsCount: number;
  outOfStockCount: number;
}

export interface DaySalesSummary {
  date: string;
  label: string; // "Seg", "Ter", "16/10"
  revenue: number;
  ordersCount: number;
}

export interface ABCCurveItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  subcategory?: string;      // Subcategoria dentro da categoria principal (ex: 'Espressos & Puros', 'Folhados & Croissants')
  quantitySold: number;
  totalRevenue: number;
  percentageOfRevenue: number;
  cumulativePercentage: number;
  classification: 'A' | 'B' | 'C'; // A: até 80%, B: 80% a 95%, C: 95% a 100%
  currentStock: number;
  status: ProductStatus;
}

export interface CustomerLoyaltyItem {
  customerName: string;
  customerPhone?: string;
  totalOrders: number;
  totalSpent: number;
  averageTicket: number;
  lastOrderDate: string;
  favoriteProduct?: string;
}
