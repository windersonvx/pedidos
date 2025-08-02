import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Package, Edit, User, Hash, CheckCircle } from 'lucide-react';
import { Order, ORDER_STATUSES } from '@shared/types';
import { cn } from '@/lib/utils';

const statusColors = {
  placed: 'border-l-status-placed',
  progress: 'border-l-status-progress',
  pickup: 'border-l-status-pickup',
  delivered: 'border-l-status-delivered',
  delivered_unpaid: 'border-l-status-delivered-unpaid',
  failed: 'border-l-status-failed',
};

const statusBadgeColors = {
  placed: 'bg-status-placed/10 text-status-placed border-status-placed/20 hover:bg-status-placed/20',
  progress: 'bg-status-progress/10 text-status-progress border-status-progress/20 hover:bg-status-progress/20',
  pickup: 'bg-status-pickup/10 text-status-pickup border-status-pickup/20 hover:bg-status-pickup/20',
  delivered: 'bg-status-delivered/10 text-status-delivered border-status-delivered/20 hover:bg-status-delivered/20',
  delivered_unpaid: 'bg-status-delivered-unpaid/10 text-status-delivered-unpaid border-status-delivered-unpaid/20 hover:bg-status-delivered-unpaid/20',
  failed: 'bg-status-failed/10 text-status-failed border-status-failed/20 hover:bg-status-failed/20',
};

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, order: Order) => void;
  isDragging?: boolean;
}

export function OrderCard({ order, onEdit, onDragStart, isDragging }: OrderCardProps) {
  const statusInfo = ORDER_STATUSES[order.status];
  
  return (
    <Card 
      className={cn(
        "cursor-grab hover:shadow-md transition-all duration-200 border-l-4 group",
        isDragging && "opacity-50 transform rotate-2",
        statusColors[order.status]
      )}
      draggable
      onDragStart={(e) => onDragStart?.(e, order)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">{order.buyerName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">#{order.purchaseId}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(order)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {order.trackingCode && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Rastreio:</span>
              <Badge variant="outline" className="text-xs font-mono">
                {order.trackingCode}
              </Badge>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{new Date(order.purchaseDate).toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-start gap-2 text-xs">
            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{order.currentLocation}</span>
          </div>

          {order.braipStatus && (
            <div className="flex items-center gap-2 text-xs">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground font-mono">{order.braipStatus}</span>
            </div>
          )}

          {order.observations && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <span className="font-medium text-muted-foreground">OBS: </span>
              <span className="text-muted-foreground">{order.observations}</span>
            </div>
          )}
        </div>
        
        <Badge
          className={cn(
            "w-full justify-center text-xs font-medium flex items-center gap-1",
            statusBadgeColors[order.status]
          )}
          variant="outline"
        >
          {order.status === 'delivered' && <CheckCircle className="h-3 w-3" />}
          {statusInfo.label}
        </Badge>

        <div className="text-xs text-muted-foreground">
          Atualizado: {new Date(order.updatedAt).toLocaleString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}
