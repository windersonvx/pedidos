import { RequestHandler } from "express";
import { createClient } from '@supabase/supabase-js';
import { BraipWebhookPayload, BRAIP_STATUS_MAPPING, Order } from "../../shared/types";
import { z } from "zod";

// Supabase configuration
const SUPABASE_URL = "https://qiecxrvunvgejtaedsfm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWN4cnZ1bnZnZWp0YWVkc2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Mzg5OTQsImV4cCI6MjA2OTMxNDk5NH0.sK4AJ-LAyHOfZoqzbmg44KVm0-1iUCaC3obhZuMeIR0";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Validation schema for Braip webhook payload
const BraipWebhookSchema = z.object({
  buyer_name: z.string(),
  purchase_id: z.string(),
  tracking_code: z.string().optional(),
  product_title: z.string().optional(),
  status: z.enum(['PAGAMENTO_CONFIRMADO', 'EM_ANDAMENTO', 'POSTADO', 'AGUARDANDO_RETIRADA', 'ENTREGUE', 'FRUSTRADO', 'NAO_RETIRADO']),
  updated_at: z.string().optional(),
});

// In-memory storage for real-time updates
let orders: Order[] = [];

// Server-Sent Events connections
const sseConnections = new Set<any>();

export const handleBraipWebhookSupabase: RequestHandler = async (req, res) => {
  try {
    console.log('Received Braip webhook (Supabase client):', req.body);
    
    // Validate webhook payload
    const validatedPayload = BraipWebhookSchema.parse(req.body);
    
    // Map Braip data to our Order format
    const mappedStatus = BRAIP_STATUS_MAPPING[validatedPayload.status];
    
    const order: Order = {
      id: validatedPayload.purchase_id,
      buyerName: validatedPayload.buyer_name,
      purchaseId: validatedPayload.purchase_id,
      trackingCode: validatedPayload.tracking_code,
      product: validatedPayload.product_title,
      productTitle: validatedPayload.product_title,
      quantity: 1,
      productValue: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      currentLocation: getLocationFromStatus(validatedPayload.status),
      status: mappedStatus,
      updatedAt: validatedPayload.updated_at || new Date().toISOString(),
      braipStatus: validatedPayload.status,
    };

    // Upsert to Supabase using the client library
    const { data, error } = await supabase
      .from("pedidos")
      .upsert({
        purchase_id: validatedPayload.purchase_id,
        buyer_name: validatedPayload.buyer_name,
        product_title: validatedPayload.product_title,
        tracking_code: validatedPayload.tracking_code,
        status: validatedPayload.status,
        updated_at: new Date().toISOString(),
        current_location: order.currentLocation,
        quantity: order.quantity,
        product_value: order.productValue || 0,
        purchase_date: order.purchaseDate,
      }, {
        onConflict: 'purchase_id'
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    console.log('Supabase upsert successful:', data);

    // Update local storage
    const existingOrderIndex = orders.findIndex(o => o.purchaseId === order.purchaseId);
    
    if (existingOrderIndex >= 0) {
      orders[existingOrderIndex] = order;
      console.log(`Updated order ${order.purchaseId}`);
    } else {
      orders.push(order);
      console.log(`Created new order ${order.purchaseId}`);
    }

    // Broadcast real-time update
    await broadcastOrderUpdate(order);

    res.status(200).json({ 
      success: true, 
      message: 'Pedido atualizado com sucesso!',
      orderId: order.id,
      data
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
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Fetch orders from Supabase using client
export const handleGetOrdersSupabase: RequestHandler = async (req, res) => {
  try {
    console.log('Fetching orders from Supabase...');

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      // Return empty orders array instead of throwing
      return res.json({ orders: [], error: error.message });
    }

    console.log(`Fetched ${data?.length || 0} orders from Supabase`);

    // Transform Supabase data to our Order format
    const transformedOrders: Order[] = (data || []).map((row: any) => ({
      id: row.id || row.purchase_id,
      buyerName: row.buyer_name,
      phoneNumber: row.buyer_phone,
      purchaseId: row.purchase_id,
      trackingCode: row.tracking_code,
      product: row.product_title,
      productTitle: row.product_title,
      quantity: row.quantity || 1,
      productValue: row.product_value || 0,
      purchaseDate: row.purchase_date || new Date().toISOString().split('T')[0],
      currentLocation: row.current_location || 'Localização não informada',
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

    // Return error details for debugging
    res.status(500).json({
      orders: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Error in handleGetOrdersSupabase'
    });
  }
};

// Create or update order manually using Supabase client
export const handleAddManualOrderSupabase: RequestHandler = async (req, res) => {
  try {
    const order: Order = {
      ...req.body,
      id: req.body.id || req.body.purchase_id || Date.now().toString(),
      updatedAt: new Date().toISOString(),
    };

    // Upsert to Supabase
    const { data, error } = await supabase
      .from("pedidos")
      .upsert({
        id: order.id,
        purchase_id: order.purchaseId,
        buyer_name: order.buyerName,
        buyer_phone: order.phoneNumber,
        product_title: order.productTitle || order.product,
        tracking_code: order.trackingCode,
        quantity: order.quantity || 1,
        product_value: order.productValue || 0,
        purchase_date: order.purchaseDate,
        current_location: order.currentLocation,
        observations: order.observations,
        status: order.braipStatus || 'PAGAMENTO_CONFIRMADO',
        updated_at: order.updatedAt,
      }, {
        onConflict: 'purchase_id'
      });

    if (error) {
      console.error('Supabase manual upsert error:', error);
      throw error;
    }

    // Update local storage
    const existingOrderIndex = orders.findIndex(o => o.id === order.id || o.purchaseId === order.purchaseId);
    
    if (existingOrderIndex >= 0) {
      orders[existingOrderIndex] = order;
    } else {
      orders.push(order);
    }

    // Broadcast real-time update
    await broadcastOrderUpdate(order);

    res.status(200).json({ 
      success: true, 
      order,
      data
    });

  } catch (error) {
    console.error('Error adding manual order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao adicionar pedido',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Server-Sent Events for real-time updates
export const handleOrderUpdatesSupabaseSSE: RequestHandler = (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to Supabase order updates' })}\n\n`);

  // Add connection to SSE connections
  const connectionId = Date.now().toString();
  sseConnections.add({ id: connectionId, res });

  // Clean up on connection close
  req.on('close', () => {
    sseConnections.forEach(conn => {
      if (conn.id === connectionId) {
        sseConnections.delete(conn);
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

// Test Supabase connection
export const handleTestSupabaseConnection: RequestHandler = async (req, res) => {
  try {
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase
      .from('pedidos')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Supabase connection test failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: 'Supabase connection test failed'
      });
    }

    console.log('Supabase connection test successful');
    res.json({
      success: true,
      message: 'Supabase connection successful',
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Error in connection test'
    });
  }
};

async function broadcastOrderUpdate(order: Order) {
  const message = JSON.stringify({
    type: 'ORDER_UPDATE',
    data: order,
    timestamp: new Date().toISOString()
  });

  // Broadcast via Server-Sent Events
  sseConnections.forEach(conn => {
    try {
      if (conn.res && !conn.res.destroyed) {
        conn.res.write(`data: ${message}\n\n`);
      }
    } catch (error) {
      console.error('Error broadcasting via SSE:', error);
      sseConnections.delete(conn);
    }
  });

  console.log(`Broadcasted update for order ${order.purchaseId} to ${sseConnections.size} connections`);
}
