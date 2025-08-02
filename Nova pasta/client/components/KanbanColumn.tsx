import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderCard } from './OrderCard';
import { Order, OrderStatus, ORDER_STATUSES } from '@shared/types';
import { cn } from '@/lib/utils';

const statusIndicatorColors = {
  placed: 'bg-status-placed',
  progress: 'bg-status-progress',
  pickup: 'bg-status-pickup',
  delivered: 'bg-status-delivered',
  delivered_unpaid: 'bg-status-delivered-unpaid',
  failed: 'bg-status-failed',
};

interface KanbanColumnProps {
  status: OrderStatus;
  orders: Order[];
  onEditOrder: (order: Order) => void;
  onDrop: (status: OrderStatus) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, order: Order) => void;
  isDragOver?: boolean;
  draggingOrder?: Order | null;
}

export function KanbanColumn({ 
  status, 
  orders, 
  onEditOrder, 
  onDrop, 
  onDragOver, 
  onDragStart,
  isDragOver,
  draggingOrder
}: KanbanColumnProps) {
  const statusInfo = ORDER_STATUSES[status];
  
  return (
    <Card className={cn(
      "flex-1 min-h-[400px] flex flex-col transition-all duration-200",
      isDragOver && "ring-2 ring-primary/50 bg-primary/5"
    )}>
      <CardHeader className="pb-4 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", statusIndicatorColors[status])} />
            <span className="text-sm font-semibold">{statusInfo.label}</span>
          </div>
          <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
            {orders.length}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent 
        className="flex-1 p-0"
        onDrop={() => onDrop(status)}
        onDragOver={onDragOver}
      >
        <div className="px-4 max-h-[600px] overflow-y-auto">
          <div className="space-y-3 pb-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onEdit={onEditOrder}
                onDragStart={onDragStart}
                isDragging={draggingOrder?.id === order.id}
              />
            ))}
            
            {orders.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground border-2 border-dashed border-muted rounded-lg mx-0">
                <p className="text-sm text-center px-4">
                  Nenhum pedido<br/>nesta etapa
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
