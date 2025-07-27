const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

// Obtenir tous les items du menu
router.get('/', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    console.log('Menu items from database:', menuItems.map(item => ({
      id: item._id,
      name: item.name,
      price: item.price,
      quantityAvailable: item.quantityAvailable
    })));
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: error.message });
  }
});

// Créer un nouvel item
router.post('/', async (req, res) => {
  console.log('POST request body:', req.body);
  try {
    // Valider les données requises
    const { name, price, category, quantityAvailable } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({
        message: 'Les champs name, price et category sont requis',
        details: {
          name: !name ? 'Le nom est requis' : null,
          price: !price ? 'Le prix est requis' : null,
          category: !category ? 'La catégorie est requise' : null
        }
      });
    }

    // Valider la catégorie
    if (!['Burgers', 'Boissons', 'Desserts', 'Accompagnements'].includes(category)) {
      return res.status(400).json({
        message: 'Catégorie invalide',
        details: {
          category: `La catégorie doit être l'une des suivantes : Burgers, Boissons, Desserts, Accompagnements`
        }
      });
    }

    // Valider le prix
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        message: 'Prix invalide',
        details: {
          price: 'Le prix doit être un nombre positif'
        }
      });
    }

    // Valider la quantité
    const parsedQuantity = parseInt(quantityAvailable);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({
        message: 'Quantité invalide',
        details: {
          quantityAvailable: 'La quantité doit être un nombre entier positif'
        }
      });
    }

    const menuItemData = {
      name,
      description: req.body.description || '',
      price: parseFloat(price),
      category,
      quantityAvailable: parsedQuantity
    };
    console.log('Creating menu item with data:', menuItemData);
    
    console.log('Creating menu item with data:', menuItemData);
    const menuItem = new MenuItem(menuItemData);

    const newMenuItem = await menuItem.save();
    console.log('New menu item saved:', {
      id: newMenuItem._id,
      name: newMenuItem.name,
      price: newMenuItem.price,
      quantityAvailable: newMenuItem.quantityAvailable
    });

    req.app.get('io').emit('menuItemCreated', newMenuItem);
    res.status(201).json(newMenuItem);
  } catch (error) {
    console.error('Erreur lors de la création du menu item:', error);
    res.status(400).json({
      message: 'Erreur lors de la création de l\'item',
      details: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : { general: error.message }
    });
  }
});

// Mettre à jour un item du menu
router.put('/:id', async (req, res) => {
  try {
    console.log('PUT request body:', req.body);
    const { name, description, price, category, quantityAvailable } = req.body;

    // Valider les champs requis
    if (!name || price === undefined || !category) {
      return res.status(400).json({
        message: 'Champs requis manquants',
        details: {
          name: !name ? 'Le nom est requis' : null,
          price: price === undefined ? 'Le prix est requis' : null,
          category: !category ? 'La catégorie est requise' : null
        }
      });
    }

    // Valider la catégorie
    if (!['Burgers', 'Boissons', 'Desserts', 'Accompagnements'].includes(category)) {
      return res.status(400).json({
        message: 'Catégorie invalide',
        details: {
          category: 'La catégorie doit être une des suivantes : Burgers, Boissons, Desserts, Accompagnements'
        }
      });
    }

    // Valider le prix
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: 'Prix invalide',
        details: {
          price: 'Le prix doit être un nombre positif'
        }
      });
    }

    // Valider la quantité
    const parsedQuantity = parseInt(quantityAvailable);
    console.log('Quantity validation:', { 
      raw: quantityAvailable, 
      parsed: parsedQuantity,
      isNaN: isNaN(parsedQuantity)
    });

    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({
        message: 'Quantité invalide',
        details: {
          quantityAvailable: 'La quantité doit être un nombre entier positif'
        }
      });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Item non trouvé' });
    }

    menuItem.name = name;
    menuItem.description = description || '';
    menuItem.price = parsedPrice;
    menuItem.category = category;
    menuItem.quantityAvailable = parsedQuantity;

    console.log('Updating menu item:', {
      id: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      category: menuItem.category,
      quantityAvailable: menuItem.quantityAvailable
    });

    const updatedMenuItem = await menuItem.save();
    console.log('Menu item updated:', {
      id: updatedMenuItem._id,
      name: updatedMenuItem.name,
      price: updatedMenuItem.price,
      category: updatedMenuItem.category,
      quantityAvailable: updatedMenuItem.quantityAvailable
    });

    req.app.get('io').emit('menuItemUpdated', updatedMenuItem);
    res.json(updatedMenuItem);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du menu item:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'item' });
  }
});

// Supprimer un item
router.delete('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) return res.status(404).json({ message: 'Item non trouvé' });
    
    await menuItem.deleteOne();
    res.json({ message: 'Item supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
