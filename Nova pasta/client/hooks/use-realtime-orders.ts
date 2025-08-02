import { useState, useEffect, useRef } from 'react';
import { Order } from '@shared/types';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  // Fetch initial orders from Supabase
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders-supabase');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos",
        variant: "destructive",
      });
      
      // Fallback to local API
      try {
        const fallbackResponse = await fetch('/api/orders');
        const fallbackData = await fallbackResponse.json();
        setOrders(fallbackData.orders || []);
      } catch (fallbackError) {
        console.error('Fallback fetch failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Server-Sent Events for real-time updates
  const connectToUpdates = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/orders/updates');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('Connected to real-time order updates');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'CONNECTED') {
          console.log('Real-time connection established');
          return;
        }

        if (data.type === 'ORDER_UPDATE') {
          const updatedOrder: Order = data.data;
          
          setOrders(prevOrders => {
            const existingIndex = prevOrders.findIndex(o => o.purchaseId === updatedOrder.purchaseId);
            
            if (existingIndex >= 0) {
              // Update existing order
              const newOrders = [...prevOrders];
              newOrders[existingIndex] = updatedOrder;
              return newOrders;
            } else {
              // Add new order
              return [updatedOrder, ...prevOrders];
            }
          });

          // Show toast notification for updates
          toast({
            title: "Pedido Atualizado",
            description: `Pedido ${updatedOrder.purchaseId} foi atualizado via webhook`,
          });
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connectToUpdates();
        }
      }, 5000);
    };
  };

  // Save order (manual creation/editing)
  const saveOrder = async (order: Order) => {
    try {
      const response = await fetch('/api/orders-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        await fetchOrders(); // Refresh orders
        toast({
          title: "Sucesso",
          description: "Pedido salvo com sucesso",
        });
        return true;
      } else {
        throw new Error('Failed to save order');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o pedido",
        variant: "destructive",
      });
      return false;
    }
  };

  // Initialize on mount
  useEffect(() => {
    fetchOrders();
    connectToUpdates();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    orders,
    isLoading,
    isConnected,
    fetchOrders,
    saveOrder,
    refreshOrders: fetchOrders,
  };
}
