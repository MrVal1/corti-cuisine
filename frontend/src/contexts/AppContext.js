import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import config from '../config';

const AppContext = createContext();

console.log('Initializing socket...');
const socket = io(config.API_URL, {
  transports: ['websocket'],
  upgrade: false
});

console.log('Initializing socket connection...');
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

export const AppProvider = ({ children }) => {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${config.API_URL}/api/menu`);
        const data = await response.json();
        setMenu(data);
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${config.API_URL}/api/orders`);
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    const handleMenuItemCreated = (menuItem) => {
      console.log('Menu item created:', menuItem);
      setMenu(prev => [menuItem, ...prev]);
    };

    const handleMenuItemUpdated = (updatedItem) => {
      console.log('Menu item updated:', updatedItem);
      setMenu(prev =>
        prev.map(item =>
          item._id === updatedItem._id ? updatedItem : item
        )
      );
    };

    const handleMenuItemDeleted = (itemId) => {
      console.log('Menu item deleted:', itemId);
      setMenu(prev => prev.filter(item => item._id !== itemId));
    };

    const handleNewOrder = (order) => {
      console.log('New order received:', order);
      setOrders(prevOrders => {
        const exists = prevOrders.some(o => o._id === order._id);
        if (exists) {
          console.log('Order already exists, updating...');
          return prevOrders.map(o => o._id === order._id ? {
            ...o,
            ...order,
            items: order.items.map(item => ({
              ...item,
              notes: item.notes || ''
            })),
            notes: order.notes || ''
          } : o);
        } else {
          console.log('Adding new order...');
          const newOrder = {
            ...order,
            items: order.items.map(item => ({
              ...item,
              notes: item.notes || ''
            })),
            notes: order.notes || ''
          };
          return [newOrder, ...prevOrders];
        }
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      console.log('Order updated:', updatedOrder);
      setOrders(prevOrders => {
        const orderExists = prevOrders.some(o => o._id === updatedOrder._id);
        if (!orderExists) {
          const newOrder = {
            ...updatedOrder,
            items: updatedOrder.items.map(item => ({
              ...item,
              notes: item.notes || ''
            })),
            notes: updatedOrder.notes || ''
          };
          return [newOrder, ...prevOrders];
        }

        return prevOrders.map(order =>
          order._id === updatedOrder._id ? {
            ...order,
            ...updatedOrder,
            items: updatedOrder.items.map(item => ({
              ...item,
              notes: item.notes || ''
            })),
            notes: updatedOrder.notes || ''
          } : order
        );
      });
    };

    const handleOrderDeleted = (orderId) => {
      console.log('Order deleted:', orderId);
      setOrders(prev => prev.filter(order => order._id !== orderId));
    };

    const handleServiceReset = () => {
      console.log('Service reset');
      setOrders([]);
    };

    socket.on('menuItemCreated', handleMenuItemCreated);
    socket.on('menuItemUpdated', handleMenuItemUpdated);
    socket.on('menuItemDeleted', handleMenuItemDeleted);
    socket.on('newOrder', handleNewOrder);
    socket.on('orderUpdated', handleOrderUpdated);
    socket.on('orderDeleted', handleOrderDeleted);
    socket.on('serviceReset', handleServiceReset);

    return () => {
      socket.off('menuItemCreated', handleMenuItemCreated);
      socket.off('menuItemUpdated', handleMenuItemUpdated);
      socket.off('menuItemDeleted', handleMenuItemDeleted);
      socket.off('newOrder', handleNewOrder);
      socket.off('orderUpdated', handleOrderUpdated);
      socket.off('orderDeleted', handleOrderDeleted);
      socket.off('serviceReset', handleServiceReset);
    };
  }, []);

  const createOrder = async (orderData) => {
    try {
      const response = await fetch(`${config.API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const newOrder = await response.json();
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const updateOrder = async (orderId, orderData) => {
    try {
      const response = await fetch(`${config.API_URL}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      const updatedOrder = await response.json();
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    return updateOrder(orderId, { status: newStatus });
  };

  const deleteOrder = async (orderId) => {
    try {
      const response = await fetch(`${config.API_URL}/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete order');
      }

      // La mise à jour de la liste des commandes se fera via Socket.IO
      // L'événement orderDeleted sera émis par le serveur
      return data;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  };

  const resetService = async () => {
    try {
      const response = await fetch(`${config.API_URL}/api/orders/reset-service`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset service');
      }

      return data;
    } catch (error) {
      console.error('Error resetting service:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      menu,
      orders,
      loading,
      createOrder,
      updateOrder,
      updateOrderStatus,
      deleteOrder,
      resetService
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
