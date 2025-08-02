import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, RefreshCw } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { OrderForm } from './OrderForm';
import { Order, OrderStatus, ORDER_STATUSES } from '@shared/types';

const statusIndicatorColors = {
  placed: 'bg-status-placed',
  progress: 'bg-status-progress',
  pickup: 'bg-status-pickup',
  delivered: 'bg-status-delivered',
  delivered_unpaid: 'bg-status-delivered-unpaid',
  failed: 'bg-status-failed',
};

// Sample data for demonstration
const SAMPLE_ORDERS: Order[] = [
  {
    id: '1',
    buyerName: 'João Silva',
    phoneNumber: '(11) 99999-9999',
    purchaseId: 'PED001',
    trackingCode: 'AA123456789BR',
    product: 'Smartphone Samsung Galaxy',
    productTitle: 'Smartphone Samsung Galaxy',
    quantity: 1,
    productValue: 899.99,
    purchaseDate: '2024-01-15',
    currentLocation: 'Centro de Distribuição São Paulo',
    observations: 'Cliente solicitou entrega no período da manhã',
    status: 'placed',
    updatedAt: new Date().toISOString(),
    braipStatus: 'PAGAMENTO_CONFIRMADO'
  },
  {
    id: '2',
    buyerName: 'Maria Santos',
    phoneNumber: '(21) 88888-8888',
    purchaseId: 'PED002',
    trackingCode: 'BB987654321BR',
    product: 'Notebook Dell Inspiron',
    productTitle: 'Notebook Dell Inspiron',
    quantity: 1,
    productValue: 2499.99,
    purchaseDate: '2024-01-14',
    currentLocation: 'Em trânsito para Rio de Janeiro',
    status: 'progress',
    updatedAt: new Date().toISOString(),
    braipStatus: 'EM_ANDAMENTO'
  },
  {
    id: '3',
    buyerName: 'Pedro Costa',
    phoneNumber: '(31) 77777-7777',
    purchaseId: 'PED003',
    trackingCode: 'CC555666777BR',
    product: 'Headphone JBL',
    productTitle: 'Headphone JBL',
    quantity: 2,
    productValue: 299.99,
    purchaseDate: '2024-01-13',
    currentLocation: 'Disponível para retirada - Agência Central',
    status: 'pickup',
    updatedAt: new Date().toISOString(),
    braipStatus: 'AGUARDANDO_RETIRADA'
  },
  {
    id: '4',
    buyerName: 'Ana Oliveira',
    phoneNumber: '(85) 66666-6666',
    purchaseId: 'PED004',
    trackingCode: 'DD111222333BR',
    product: 'Smartwatch Apple',
    productTitle: 'Smartwatch Apple',
    quantity: 1,
    productValue: 1899.99,
    purchaseDate: '2024-01-12',
    currentLocation: 'Entregue ao destinatário',
    status: 'delivered',
    updatedAt: new Date().toISOString(),
    braipStatus: 'ENTREGUE'
  },
  {
    id: '5',
    buyerName: 'Carlos Mendes',
    phoneNumber: '(47) 55555-5555',
    purchaseId: 'PED005',
    trackingCode: 'EE444555666BR',
    product: 'Tablet Samsung',
    productTitle: 'Tablet Samsung',
    quantity: 1,
    productValue: 799.99,
    purchaseDate: '2024-01-11',
    currentLocation: 'Entregue - Pagamento pendente',
    status: 'delivered_unpaid',
    updatedAt: new Date().toISOString(),
    braipStatus: 'ENTREGUE'
  },
  {
    id: '6',
    buyerName: 'Lucia Ferreira',
    phoneNumber: '(41) 44444-4444',
    purchaseId: 'PED006',
    trackingCode: 'FF777888999BR',
    product: 'Câmera Canon',
    productTitle: 'Câmera Canon',
    quantity: 1,
    productValue: 1299.99,
    purchaseDate: '2024-01-10',
    currentLocation: 'Devolvido ao remetente - Não retirado',
    status: 'failed',
    updatedAt: new Date().toISOString(),
    braipStatus: 'NAO_RETIRADO'
  }
];

export function KanbanBoard() {
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [draggingOrder, setDraggingOrder] = useState<Order | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (data.orders && data.orders.length > 0) {
        setOrders(data.orders);
      }
      // If no orders from API, keep sample data
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Keep sample data on error
    } finally {
      setIsLoading(false);
    }
  };

  // Setup initial data fetch
  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search term
  const filteredOrders = orders.filter(order => 
    order.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.purchaseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.trackingCode && order.trackingCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    ORDER_STATUSES[order.status].label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group orders by status
  const ordersByStatus = (Object.keys(ORDER_STATUSES) as OrderStatus[]).reduce((acc, status) => {
    acc[status] = filteredOrders.filter(order => order.status === status);
    return acc;
  }, {} as Record<OrderStatus, Order[]>);

  const handleSaveOrder = async (order: Order) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        await fetchOrders(); // Refresh orders
        setEditingOrder(null);
      } else {
        // Fallback to local update
        const existingIndex = orders.findIndex(o => o.id === order.id);
        if (existingIndex >= 0) {
          const newOrders = [...orders];
          newOrders[existingIndex] = order;
          setOrders(newOrders);
        } else {
          setOrders(prev => [...prev, order]);
        }
        setEditingOrder(null);
      }
    } catch (error) {
      console.error('Error saving order:', error);
      // Fallback to local update
      const existingIndex = orders.findIndex(o => o.id === order.id);
      if (existingIndex >= 0) {
        const newOrders = [...orders];
        newOrders[existingIndex] = order;
        setOrders(newOrders);
      } else {
        setOrders(prev => [...prev, order]);
      }
      setEditingOrder(null);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, order: Order) => {
    setDraggingOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (status: OrderStatus) => {
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (newStatus: OrderStatus) => {
    if (draggingOrder && draggingOrder.status !== newStatus) {
      const updatedOrder = { 
        ...draggingOrder, 
        status: newStatus,
        updatedAt: new Date().toISOString() 
      };
      
      await handleSaveOrder(updatedOrder);
    }
    setDraggingOrder(null);
    setDragOverColumn(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingOrder(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Rastreamento de Pedidos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e acompanhe os pedidos dos Correios
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, pedido ou rastreio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-80"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchOrders}
                disabled={isLoading}
                className="whitespace-nowrap"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={() => setIsFormOpen(true)} className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Manualmente
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(Object.keys(ORDER_STATUSES) as OrderStatus[]).map((status) => {
            const statusInfo = ORDER_STATUSES[status];
            const count = ordersByStatus[status].length;
            
            return (
              <div key={status} className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${statusIndicatorColors[status]}`} />
                  <span className="text-sm font-medium">{statusInfo.label}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {(Object.keys(ORDER_STATUSES) as OrderStatus[]).map((status) => (
            <div
              key={status}
              onDragEnter={() => handleDragEnter(status)}
              onDragLeave={handleDragLeave}
              className="h-full"
            >
              <KanbanColumn
                status={status}
                orders={ordersByStatus[status]}
                onEditOrder={handleEditOrder}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragStart={handleDragStart}
                isDragOver={dragOverColumn === status}
                draggingOrder={draggingOrder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Order Form Modal */}
      <OrderForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveOrder}
        editingOrder={editingOrder}
      />
    </div>
  );
}
