import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Divider,
  Select,
  MenuItem,
  FormControl
} from '@mui/material';
import { useApp } from '../contexts/AppContext';

const Cuisine = () => {
  const { orders, updateOrderStatus } = useApp();

  const statusOptions = [
    { value: 'en attente', label: 'En attente' },
    { value: 'en préparation', label: 'En préparation' },
    { value: 'terminé', label: 'Terminé' }
  ];

  const handleStatusUpdate = (orderId, newStatus) => {
    console.log(`Changing status for order ${orderId} to ${newStatus}`);
    updateOrderStatus(orderId, newStatus);
  };

  const [filteredOrders, setFilteredOrders] = useState({
    'en attente': [],
    'en préparation': [],
    'terminé': []
  });

  useEffect(() => {
    console.log('=== ORDERS CHANGED IN CUISINE ===');
    console.log('All orders:', orders);

    const newFilteredOrders = {
      'en attente': orders?.filter(order => order.status === 'en attente') || [],
      'en préparation': orders?.filter(order => order.status === 'en préparation') || [],
      'terminé': orders?.filter(order => order.status === 'terminé') || []
    };

    console.log('Filtered orders:', {
      'en attente': newFilteredOrders['en attente']?.length || 0,
      'en préparation': newFilteredOrders['en préparation']?.length || 0,
      'terminé': newFilteredOrders['terminé']?.length || 0
    });

    setFilteredOrders(newFilteredOrders);
  }, [orders]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Forcing orders refresh...');
      fetch('http://localhost:3001/api/orders')
        .then(response => response.json())
        .then(data => {
          console.log('Refreshed orders:', data);
          setFilteredOrders({
            'en attente': data.filter(order => order.status === 'en attente'),
            'en préparation': data.filter(order => order.status === 'en préparation'),
            'terminé': data.filter(order => order.status === 'terminé')
          });
        })
        .catch(error => console.error('Error refreshing orders:', error));
    }, 5000); // Rafraîchir toutes les 5 secondes

    return () => clearInterval(interval);
  }, []);

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'en attente':
        return 'en préparation';
      case 'en préparation':
        return 'terminé';
      default:
        return currentStatus;
    }
  };

  const OrderCard = ({ order }) => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Table: {order.tableNumber}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            value={order.status}
            onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
            variant="outlined"
            sx={{
              backgroundColor: 
                order.status === 'en attente'
                  ? '#1976d2'
                  : order.status === 'en préparation'
                    ? '#ed6c02'
                    : order.status === 'prêt'
                      ? '#0288d1'
                      : '#2e7d32',
              color: 'white',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              '.MuiSvgIcon-root': { color: 'white' }
            }}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ mb: 2 }}>
        {order.items.map((item) => (
          <Box key={item._id || item.menuItem._id} sx={{ mb: 1 }}>
            <Typography>
              • {item.menuItem.name} x{item.quantity}
            </Typography>
            {item.notes && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ ml: 2, fontStyle: 'italic' }}
              >
                Note: {item.notes}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      
      {order.notes && (
        <>
          <Typography variant="subtitle2" color="text.secondary">
            Notes:
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {order.notes}
          </Typography>
        </>
      )}
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        {order.status !== 'terminé' && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleStatusUpdate(order._id, getNextStatus(order.status))}
            fullWidth
          >
            {order.status === 'en attente' 
              ? 'Commencer la préparation' 
              : order.status === 'en préparation'
                ? 'Terminer la commande'
                : 'Terminer'}
          </Button>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box sx={{
      width: '100%',
      overflowX: { xs: 'auto', md: 'visible' },
      WebkitOverflowScrolling: 'touch'
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'row', md: 'row' },
        gap: 3,
        p: 3,
        minWidth: { xs: '150vw', md: '100%' }
      }}>
        {/* Commandes en attente */}
        <Box sx={{ flex: 1, minWidth: { xs: '80vw', md: 0 } }}>
          <Typography variant="h5" gutterBottom>
            Commandes à préparer ({filteredOrders['en attente']?.length || 0})
          </Typography>
          {filteredOrders['en attente']?.map((order) => (
            <OrderCard key={order._id} order={order} />
          )) || []}
        </Box>

        {/* Commandes en préparation */}
        <Box sx={{ flex: 1, minWidth: { xs: '80vw', md: 0 } }}>
          <Typography variant="h5" gutterBottom>
            En préparation ({filteredOrders['en préparation']?.length || 0})
          </Typography>
          {filteredOrders['en préparation']?.map((order) => (
            <OrderCard key={order._id} order={order} />
          )) || []}
        </Box>

        {/* Commandes terminées */}
        <Box sx={{ flex: 1, minWidth: { xs: '80vw', md: 0 } }}>
          <Typography variant="h5" gutterBottom>
            Commandes terminées ({filteredOrders['terminé']?.length || 0})
          </Typography>
          {filteredOrders['terminé']?.map((order) => (
            <OrderCard key={order._id} order={order} />
          )) || []}
        </Box>
      </Box>
    </Box>
  );
};

export default Cuisine;
