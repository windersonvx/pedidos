import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Webhook, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { OrderForm } from './OrderForm';
import { Order, OrderStatus, ORDER_STATUSES } from '@shared/types';
import { useRealtimeOrdersClient } from '@/hooks/use-realtime-orders-client';

const statusIndicatorColors = {
  placed: 'bg-status-placed',
  progress: 'bg-status-progress',
  pickup: 'bg-status-pickup',
  delivered: 'bg-status-delivered',
  delivered_unpaid: 'bg-status-delivered-unpaid',
  failed: 'bg-status-failed',
};

export function KanbanBoardRealtime() {
  const { orders, isLoading, isConnected, saveOrder, refreshOrders } = useRealtimeOrdersClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [draggingOrder, setDraggingOrder] = useState<Order | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);

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
    const success = await saveOrder(order);
    if (success) {
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
              <Webhook className="h-8 w-8 text-primary" />
              Rastreamento de Pedidos Braip
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              Gerencie e acompanhe os pedidos em tempo real via webhook
              <span className={`text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
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
                onClick={refreshOrders}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[600px]">
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
