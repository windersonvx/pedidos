import { RequestHandler } from "express";
import { Order } from "../../shared/types";
import { randomUUID } from "crypto";

// In-memory storage for demonstration (in production, use a database)
let orders: Order[] = [];

export const handleGetOrders: RequestHandler = (req, res) => {
  res.json({ orders });
};

export const handleAddManualOrder: RequestHandler = (req, res) => {
  try {
    const order: Order = {
      ...req.body,
      id: req.body.id || randomUUID(),
      updatedAt: new Date().toISOString(),
    };

    const existingOrderIndex = orders.findIndex(o => o.id === order.id);
    
    if (existingOrderIndex >= 0) {
      orders[existingOrderIndex] = order;
    } else {
      orders.push(order);
    }

    res.status(200).json({ 
      success: true, 
      order 
    });

  } catch (error) {
    console.error('Error adding manual order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding order' 
    });
  }
};
