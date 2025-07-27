const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

// Obtenir toutes les commandes
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('items.menuItem').sort('-createdAt');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Créer une nouvelle commande
router.post('/', async (req, res) => {
  try {
    console.log('Received order data:', JSON.stringify(req.body, null, 2));

    // Valider les champs requis
    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({
        message: 'La commande doit contenir au moins un item',
        details: { items: 'Les items sont requis et doivent être un tableau non vide' }
      });
    }

    // Vérifier que chaque item a un menuItem valide
    for (const item of req.body.items) {
      if (!item.menuItem) {
        return res.status(400).json({
          message: 'Chaque item doit avoir un menuItem valide',
          details: { items: 'Un ou plusieurs items n\'ont pas de menuItem' }
        });
      }

      // Vérifier la disponibilité des items
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(400).json({
          message: 'Item non trouvé',
          details: { items: `L'item ${item.menuItem} n'existe pas` }
        });
      }

      if (menuItem.quantityAvailable < item.quantity) {
        return res.status(400).json({
          message: 'Quantité insuffisante',
          details: { items: `Quantité insuffisante pour ${menuItem.name}` }
        });
      }

      // Mettre à jour la quantité disponible
      menuItem.quantityAvailable -= item.quantity;
      await menuItem.save();

      // Émettre l'événement de mise à jour du menu
      const io = req.app.get('io');
      if (io) {
        io.emit('menuItemUpdated', menuItem);
      }
    }

    const order = new Order({
      tableNumber: req.body.tableNumber,
      items: req.body.items.map(item => ({
        menuItem: item.menuItem,
        quantity: parseInt(item.quantity) || 1,
        notes: item.notes || ''
      })),
      notes: req.body.notes || '',
      status: 'en attente',
      createdAt: new Date(),
      totalAmount: parseFloat(req.body.totalAmount) || 0
    });

    const savedOrder = await order.save();
    console.log('Order saved:', savedOrder);

    // Récupérer la commande avec les items peuplés
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate({
        path: 'items.menuItem',
        select: 'name description price category available quantityAvailable'
      });
    console.log('Populated order:', populatedOrder);

    // Émettre l'événement via Socket.IO
    const io = req.app.get('io');
    if (!io) {
      console.error('Socket.IO instance not found!');
    } else {
      console.log('Emitting newOrder event');
      io.emit('newOrder', populatedOrder);
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : { general: error.message }
    });
  }
});

// Mettre à jour le statut d'une commande
router.put('/:id', async (req, res) => {
  try {
    console.log('=== START ORDER UPDATE ===');
    console.log(`Updating order ${req.params.id} with data:`, req.body);

    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log(`Order ${req.params.id} not found`);
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    console.log('Current order status:', order.status);
    console.log('New status:', req.body.status);

    // Vérifier que le statut est valide
    const validStatuses = ['en attente', 'en préparation', 'terminé'];
    if (!validStatuses.includes(req.body.status)) {
      console.log(`Invalid status: ${req.body.status}`);
      return res.status(400).json({ 
        message: 'Statut invalide',
        details: { status: `Le statut doit être l'un des suivants: ${validStatuses.join(', ')}` }
      });
    }
    
    // Mettre à jour tous les champs de la commande
    if (req.body.status) {
      order.status = req.body.status;
      if (req.body.status === 'terminé') {
        order.completedAt = new Date();
      }
    }

    if (req.body.notes !== undefined) {
      order.notes = req.body.notes;
    }

    if (req.body.tableNumber) {
      order.tableNumber = req.body.tableNumber;
    }

    if (req.body.totalAmount !== undefined) {
      order.totalAmount = req.body.totalAmount;
    }

    // Mettre à jour les articles et leurs notes si présents
    if (req.body.items && Array.isArray(req.body.items)) {
      order.items = req.body.items.map(item => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        notes: item.notes || ''
      }));
    }
    
    const updatedOrder = await order.save();
    console.log('Order updated in database:', updatedOrder);

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate({
        path: 'items.menuItem',
        select: 'name description price category available quantityAvailable'
      });

    console.log('Populated order to send:', JSON.stringify(populatedOrder, null, 2));
    
    // Émettre l'événement de mise à jour via Socket.IO
    const io = req.app.get('io');
    if (!io) {
      console.error('Socket.IO instance not found!');
    } else {
      console.log('Emitting orderUpdated event with order:', populatedOrder._id);
      io.emit('orderUpdated', populatedOrder);
    }

    console.log('=== END ORDER UPDATE ===');
    res.json(populatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : { general: error.message }
    });
  }
});

// Obtenir les statistiques des commandes
router.get('/stats', async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);
    res.json(stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer toutes les commandes
router.delete('/reset-service', async (req, res) => {
  console.log('=== START SERVICE RESET ===');
  try {
    // Récupérer toutes les commandes pour remettre les articles en stock
    console.log('Fetching all orders...');
    const orders = await Order.find().populate('items.menuItem');
    console.log(`Found ${orders.length} orders to process`);

    // Remettre en stock les articles de toutes les commandes
    console.log('Restocking items...');
    for (const order of orders) {
      console.log(`Processing order ${order._id}`);
      for (const item of order.items) {
        if (!item.menuItem) {
          console.warn(`MenuItem not found for item in order ${order._id}`);
          continue;
        }
        console.log(`Restocking ${item.quantity} units of item ${item.menuItem._id}`);
        const menuItem = await MenuItem.findById(item.menuItem._id);
        if (!menuItem) {
          console.warn(`MenuItem ${item.menuItem._id} not found in database`);
          continue;
        }
        menuItem.quantityAvailable += item.quantity;
        await menuItem.save();
        console.log(`Updated quantity for ${menuItem.name}: ${menuItem.quantityAvailable}`);

        // Émettre l'événement de mise à jour du menu
        const io = req.app.get('io');
        if (io) {
          console.log(`Emitting menuItemUpdated for ${menuItem._id}`);
          io.emit('menuItemUpdated', menuItem);
        }
      }
    }

    // Supprimer toutes les commandes
    console.log('Deleting all orders...');
    const deleteResult = await Order.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} orders`);

    // Émettre l'événement de réinitialisation du service
    const io = req.app.get('io');
    if (io) {
      console.log('Emitting serviceReset event');
      io.emit('serviceReset');
    }

    console.log('=== END SERVICE RESET ===');
    res.json({ 
      message: 'Service réinitialisé avec succès',
      details: {
        ordersProcessed: orders.length,
        ordersDeleted: deleteResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Error resetting service:', error);
    res.status(500).json({ message: error.message });
  }
});

// Supprimer une commande
router.delete('/:id', async (req, res) => {
  console.log('=== START ORDER DELETE ===');
  try {
    console.log(`Deleting order ${req.params.id}`);
    const order = await Order.findById(req.params.id).populate('items.menuItem');

    if (!order) {
      console.log(`Order ${req.params.id} not found`);
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Remettre les quantités en stock
    console.log('Restocking items...');
    for (const item of order.items) {
      if (!item.menuItem) {
        console.warn(`MenuItem not found for item in order ${order._id}`);
        continue;
      }
      console.log(`Restocking ${item.quantity} units of item ${item.menuItem._id}`);
      const menuItem = await MenuItem.findById(item.menuItem._id);
      if (!menuItem) {
        console.warn(`MenuItem ${item.menuItem._id} not found in database`);
        continue;
      }
      menuItem.quantityAvailable += item.quantity;
      await menuItem.save();
      console.log(`Updated quantity for ${menuItem.name}: ${menuItem.quantityAvailable}`);

      // Émettre l'événement de mise à jour du menu
      const io = req.app.get('io');
      if (io) {
        console.log(`Emitting menuItemUpdated for ${menuItem._id}`);
        io.emit('menuItemUpdated', menuItem);
      }
    }

    // Supprimer la commande
    console.log(`Deleting order ${order._id} from database...`);
    await Order.findByIdAndDelete(req.params.id);
    console.log('Order deleted successfully');

    // Émettre l'événement de suppression
    const io = req.app.get('io');
    if (io) {
      console.log(`Emitting orderDeleted event for ${req.params.id}`);
      io.emit('orderDeleted', req.params.id);
    }

    console.log('=== END ORDER DELETE ===');
    res.json({ 
      message: 'Commande supprimée avec succès',
      orderId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
