import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Order, OrderStatus, ORDER_STATUSES } from '@shared/types';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Order) => void;
  editingOrder?: Order | null;
}

export function OrderForm({ isOpen, onClose, onSave, editingOrder }: OrderFormProps) {
  const [formData, setFormData] = useState({
    buyerName: '',
    phoneNumber: '',
    purchaseId: '',
    trackingCode: '',
    product: '',
    productTitle: '',
    quantity: 1,
    productValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    currentLocation: '',
    observations: '',
    status: 'placed' as OrderStatus,
  });

  // Update form data when editingOrder changes
  useEffect(() => {
    if (editingOrder) {
      setFormData({
        buyerName: editingOrder.buyerName || '',
        phoneNumber: editingOrder.phoneNumber || '',
        purchaseId: editingOrder.purchaseId || '',
        trackingCode: editingOrder.trackingCode || '',
        product: editingOrder.product || '',
        productTitle: editingOrder.productTitle || '',
        quantity: editingOrder.quantity || 1,
        productValue: editingOrder.productValue || 0,
        purchaseDate: editingOrder.purchaseDate || new Date().toISOString().split('T')[0],
        currentLocation: editingOrder.currentLocation || '',
        observations: editingOrder.observations || '',
        status: editingOrder.status || 'placed',
      });
    } else {
      // Reset form for new order
      setFormData({
        buyerName: '',
        phoneNumber: '',
        purchaseId: '',
        trackingCode: '',
        product: '',
        productTitle: '',
        quantity: 1,
        productValue: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        currentLocation: '',
        observations: '',
        status: 'placed',
      });
    }
  }, [editingOrder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const order: Order = {
      id: editingOrder?.id || Date.now().toString() + Math.random().toString(36),
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    
    onSave(order);
    onClose();
    
    // Reset form if creating new order
    if (!editingOrder) {
      setFormData({
        buyerName: '',
        phoneNumber: '',
        purchaseId: '',
        trackingCode: '',
        product: '',
        productTitle: '',
        quantity: 1,
        productValue: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        currentLocation: '',
        observations: '',
        status: 'placed',
      });
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingOrder ? 'Editar Pedido' : 'Adicionar Pedido Manualmente'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyerName">Nome do Cliente</Label>
              <Input
                id="buyerName"
                value={formData.buyerName}
                onChange={(e) => setFormData(prev => ({ ...prev, buyerName: e.target.value }))}
                placeholder="Digite o nome do cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Telefone do Cliente</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="Ex: (11) 99999-9999"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseId">Número do Pedido</Label>
              <Input
                id="purchaseId"
                value={formData.purchaseId}
                onChange={(e) => setFormData(prev => ({ ...prev, purchaseId: e.target.value }))}
                placeholder="Ex: PED001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingCode">Código de Rastreio</Label>
              <Input
                id="trackingCode"
                value={formData.trackingCode}
                onChange={(e) => setFormData(prev => ({ ...prev, trackingCode: e.target.value }))}
                placeholder="Ex: AA123456789BR (opcional)"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Input
                id="product"
                value={formData.product}
                onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
                placeholder="Nome do produto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                placeholder="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productValue">Valor do Produto</Label>
            <Input
              id="productValue"
              type="number"
              min="0"
              step="0.01"
              value={formData.productValue}
              onChange={(e) => setFormData(prev => ({ ...prev, productValue: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Data da Compra</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentLocation">Localização/Status Atual</Label>
            <Textarea
              id="currentLocation"
              value={formData.currentLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, currentLocation: e.target.value }))}
              placeholder="Ex: Centro de Distribuição São Paulo"
              className="min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">OBS:</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              placeholder="Observações sobre o pedido (opcional)"
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status do Pedido</Label>
            <Select value={formData.status} onValueChange={(value: OrderStatus) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORDER_STATUSES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingOrder ? 'Salvar Alterações' : 'Criar Pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
