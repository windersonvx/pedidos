export type OrderStatus = 'placed' | 'progress' | 'pickup' | 'delivered' | 'delivered_unpaid' | 'failed';

export type BraipStatus = 'PAGAMENTO_CONFIRMADO' | 'EM_ANDAMENTO' | 'POSTADO' | 'AGUARDANDO_RETIRADA' | 'ENTREGUE' | 'FRUSTRADO' | 'NAO_RETIRADO';

export interface Order {
  id: string;
  buyerName: string;           // buyer_name from Braip
  phoneNumber?: string;        // telefone do cliente
  purchaseId: string;          // purchase_id from Braip
  trackingCode?: string;       // tracking_code from Braip (optional)
  product?: string;            // produto
  productTitle?: string;       // product_title from Braip
  quantity?: number;           // quantidade
  productValue?: number;       // valor do produto
  purchaseDate: string;        // purchase date
  currentLocation: string;     // current location or status
  observations?: string;       // observações sobre o pedido
  status: OrderStatus;         // mapped from Braip status
  updatedAt: string;          // updated_at from Braip
  braipStatus?: BraipStatus;  // original Braip status
}

export const ORDER_STATUSES: Record<OrderStatus, { label: string; color: string }> = {
  placed: { label: 'Pedido Agendado', color: 'status-placed' },
  progress: { label: 'Pedido em Andamento', color: 'status-progress' },
  pickup: { label: 'Pedido Aguardando Retirada', color: 'status-pickup' },
  delivered: { label: 'Pedido Entregue e Pago', color: 'status-delivered' },
  delivered_unpaid: { label: 'Pedido Entregue e Não Pago', color: 'status-delivered-unpaid' },
  failed: { label: 'Pedido Frustrado', color: 'status-failed' },
};

// Mapping from Braip status to platform status
export const BRAIP_STATUS_MAPPING: Record<BraipStatus, OrderStatus> = {
  'PAGAMENTO_CONFIRMADO': 'placed',
  'EM_ANDAMENTO': 'progress',
  'POSTADO': 'pickup',
  'AGUARDANDO_RETIRADA': 'pickup',
  'ENTREGUE': 'delivered',
  'FRUSTRADO': 'failed',
  'NAO_RETIRADO': 'failed',
};

// Braip webhook payload interface
export interface BraipWebhookPayload {
  buyer_name: string;
  purchase_id: string;
  tracking_code?: string;
  product_title?: string;
  status: BraipStatus;
  updated_at: string;
}
