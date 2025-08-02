import { RequestHandler } from "express";
import { BraipWebhookPayload, BRAIP_STATUS_MAPPING, Order } from "../../shared/types";
import { z } from "zod";
import { randomUUID } from "crypto";
import axios from "axios";

// Supabase configuration
const SUPABASE_URL = "https://qiecxrvunvgejtaedsfm.supabase.co";
const SUPABASE_ANON_KEY = "3e9a6260f6225f5fc129524940a26c56f9bcea65";

// Validation schema for Braip webhook payload
const BraipWebhookSchema = z.object({
  buyer_name: z.string(),
  purchase_id: z.string(),
  tracking_code: z.string().optional(),
  status: z.enum(['PAGAMENTO_CONFIRMADO', 'EM_ANDAMENTO', 'POSTADO', 'AGUARDANDO_RETIRADA', 'ENTREGUE', 'FRUSTRADO', 'NAO_RETIRADO']),
  updated_at: z.string().optional(),
});

// In-memory storage for demonstration (in production, Supabase will be the source of truth)
let orders: Order[] = [];

// WebSocket connections for real-time updates
const wsConnections = new Set<any>();

export const handleBraipWebhookEnhanced: RequestHandler = async (req, res) => {
  try {
    console.log('Received Braip webhook:', req.body);
    
    // Validate webhook payload
    const validatedPayload = BraipWebhookSchema.parse(req.body);
    
    // Map Braip data to our Order format
    const mappedStatus = BRAIP_STATUS_MAPPING[validatedPayload.status];
    
    const order: Order = {
      id: validatedPayload.purchase_id,
      buyerName: validatedPayload.buyer_name,
      purchaseId: validatedPayload.purchase_id,
      trackingCode: validatedPayload.tracking_code,
      purchaseDate: new Date().toISOString().split('T')[0],
      currentLocation: getLocationFromStatus(validatedPayload.status),
      status: mappedStatus,
      updatedAt: validatedPayload.updated_at || new Date().toISOString(),
      braipStatus: validatedPayload.status,
    };

    // Update Supabase database
    try {
      const supabaseResponse = await updateOrderInSupabase(order, validatedPayload);
      console.log('Supabase update successful:', supabaseResponse.status);
    } catch (supabaseError) {
      console.error('Supabase update failed:', supabaseError);
      // Continue with local update even if Supabase fails
    }

    // Update local storage
    const existingOrderIndex = orders.findIndex(o => o.purchaseId === order.purchaseId);
    
    if (existingOrderIndex >= 0) {
      orders[existingOrderIndex] = order;
      console.log(`Updated order ${order.purchaseId}`);
    } else {
      orders.push(order);
      console.log(`Created new order ${order.purchaseId}`);
    }

    // Broadcast real-time update to all connected clients
    await broadcastOrderUpdate(order);

    res.status(200).json({ 
      success: true, 
      message: 'Pedido atualizado com sucesso!',
      orderId: order.id 
    });

  } catch (error) {
    console.error('Error processing Braip webhook:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payload do webhook inválido',
        errors: error.errors 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// Update order in Supabase
async function updateOrderInSupabase(order: Order, payload: any) {
  const supabaseData = {
    buyer_name: payload.buyer_name,
    purchase_id: payload.purchase_id,
    tracking_code: payload.tracking_code || null,
    status: payload.status,
    updated_at: payload.updated_at || new Date().toISOString(),
    current_location: order.currentLocation,
    buyer_phone: order.phoneNumber || null,
    product: order.product || null,
    quantity: order.quantity || 1,
    product_value: order.productValue || 0,
    observations: order.observations || null,
  };

  // Try to update first, if no rows affected, insert
  const updateResponse = await axios.patch(
    `${SUPABASE_URL}/rest/v1/pedidos?purchase_id=eq.${order.purchaseId}`,
    supabaseData,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    }
  );

  // If no rows were updated, create new record
  if (!updateResponse.data || updateResponse.data.length === 0) {
    const insertResponse = await axios.post(
      `${SUPABASE_URL}/rest/v1/pedidos`,
      {
        ...supabaseData,
        id: order.id,
        purchase_date: order.purchaseDate,
      },
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      }
    );
    return insertResponse;
  }

  return updateResponse;
}

// Fetch orders from Supabase
export const handleGetOrdersFromSupabase: RequestHandler = async (req, res) => {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/pedidos?select=*&order=updated_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Transform Supabase data to our Order format
    const transformedOrders: Order[] = response.data.map((row: any) => ({
      id: row.id,
      buyerName: row.buyer_name,
      phoneNumber: row.buyer_phone,
      purchaseId: row.purchase_id,
      trackingCode: row.tracking_code,
      product: row.product,
      quantity: row.quantity || 1,
      productValue: row.product_value || 0,
      purchaseDate: row.purchase_date || new Date().toISOString().split('T')[0],
      currentLocation: row.current_location,
      observations: row.observations,
      status: BRAIP_STATUS_MAPPING[row.status] || 'placed',
      updatedAt: row.updated_at,
      braipStatus: row.status,
    }));

    // Update local storage
    orders = transformedOrders;

    res.json({ orders: transformedOrders });

  } catch (error) {
    console.error('Error fetching orders from Supabase:', error);
    
    // Fallback to local storage
    res.json({ orders });
  }
};

// Create or update order manually (sync with Supabase)
export const handleAddManualOrderEnhanced: RequestHandler = async (req, res) => {
  try {
    const order: Order = {
      ...req.body,
      id: req.body.id || randomUUID(),
      updatedAt: new Date().toISOString(),
    };

    // Update Supabase
    try {
      await updateOrderInSupabase(order, {
        buyer_name: order.buyerName,
        purchase_id: order.purchaseId,
        tracking_code: order.trackingCode,
        status: order.braipStatus || 'PAGAMENTO_CONFIRMADO',
        updated_at: order.updatedAt,
      });
    } catch (supabaseError) {
      console.error('Supabase manual update failed:', supabaseError);
    }

    // Update local storage
    const existingOrderIndex = orders.findIndex(o => o.id === order.id);
    
    if (existingOrderIndex >= 0) {
      orders[existingOrderIndex] = order;
    } else {
      orders.push(order);
    }

    // Broadcast real-time update
    await broadcastOrderUpdate(order);

    res.status(200).json({ 
      success: true, 
      order 
    });

  } catch (error) {
    console.error('Error adding manual order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao adicionar pedido' 
    });
  }
};

// Real-time updates via Server-Sent Events
export const handleOrderUpdatesSSE: RequestHandler = (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to order updates' })}\n\n`);

  // Add connection to SSE connections
  const connectionId = Date.now().toString();
  wsConnections.add({ id: connectionId, res });

  // Clean up on connection close
  req.on('close', () => {
    wsConnections.forEach(conn => {
      if (conn.id === connectionId) {
        wsConnections.delete(conn);
      }
    });
  });
};

function getLocationFromStatus(status: string): string {
  const locationMap: Record<string, string> = {
    'PAGAMENTO_CONFIRMADO': 'Pagamento confirmado - Aguardando processamento',
    'EM_ANDAMENTO': 'Pedido em andamento - Preparando envio',
    'POSTADO': 'Postado nos Correios',
    'AGUARDANDO_RETIRADA': 'Disponível para retirada na agência',
    'ENTREGUE': 'Entregue ao destinatário',
    'FRUSTRADO': 'Entrega frustrada',
    'NAO_RETIRADO': 'Não retirado - Devolvido ao remetente',
  };
  
  return locationMap[status] || 'Status desconhecido';
}

async function broadcastOrderUpdate(order: Order) {
  const message = JSON.stringify({
    type: 'ORDER_UPDATE',
    data: order,
    timestamp: new Date().toISOString()
  });

  // Broadcast via Server-Sent Events
  wsConnections.forEach(conn => {
    try {
      if (conn.res && !conn.res.destroyed) {
        conn.res.write(`data: ${message}\n\n`);
      }
    } catch (error) {
      console.error('Error broadcasting via SSE:', error);
      wsConnections.delete(conn);
    }
  });

  console.log(`Broadcasted update for order ${order.purchaseId} to ${wsConnections.size} connections`);
}

export function addWebSocketConnection(ws: any) {
  wsConnections.add(ws);
  
  ws.on('close', () => {
    wsConnections.delete(ws);
  });
}
