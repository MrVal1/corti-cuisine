import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Snackbar,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider
} from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useApp } from '../contexts/AppContext';

const Service = () => {
  const { menu, orders, createOrder, updateOrder, deleteOrder } = useApp();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [cart, setCart] = useState([]);
  const [itemNotes, setItemNotes] = useState({});
  const [orderNote, setOrderNote] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [sortedOrders, setSortedOrders] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState({
    text: '',
    severity: 'success'
  });

  // Trier les commandes par ordre chronologique inverse (plus récentes d'abord)
  useEffect(() => {
    if (orders && orders.length > 0) {
      const sorted = [...orders].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setSortedOrders(sorted);
    }
  }, [orders]);

  const handleNoteChange = (itemId, note) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: note
    }));
  };

  const addToOrder = (menuItem) => {
    const quantity = Number(menuItem.quantityAvailable || 0);
    if (quantity <= 0) {
      setSnackbarMessage({
        text: 'Article non disponible',
        severity: 'error'
      });
      setOpenSnackbar(true);
      return;
    }

    const existingItem = cart.find(
      orderItem => orderItem.menuItem._id === menuItem._id
    );

    if (existingItem) {
      if (existingItem.quantity >= quantity) {
        setSnackbarMessage({
          text: 'Quantité maximale atteinte',
          severity: 'warning'
        });
        setOpenSnackbar(true);
        return;
      }
      setCart(prevCart => {
        const newCart = prevCart.map(orderItem =>
          orderItem.menuItem._id === menuItem._id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        );
        // Mettre à jour le montant total
        const newTotal = newCart.reduce((sum, item) => 
          sum + (Number(item.menuItem.price) * item.quantity), 0
        );
        setTotalAmount(newTotal);
        return newCart;
      });
    } else {
      setCart(prevCart => {
        const newCart = [...prevCart, { 
          menuItem, 
          quantity: 1,
          notes: itemNotes[menuItem._id] || ''
        }];
        // Mettre à jour le montant total
        const newTotal = newCart.reduce((sum, item) => 
          sum + (Number(item.menuItem.price) * item.quantity), 0
        );
        setTotalAmount(newTotal);
        return newCart;
      });
    }
  };

  const removeFromOrder = (itemId) => {
    setCart(prev => {
      const newCart = prev.map(orderItem =>
        orderItem.menuItem._id === itemId && orderItem.quantity > 1
          ? { ...orderItem, quantity: orderItem.quantity - 1 }
          : orderItem
      ).filter(orderItem =>
        !(orderItem.menuItem._id === itemId && orderItem.quantity === 1)
      );

      // Mettre à jour le montant total
      const newTotal = newCart.reduce((sum, item) => 
        sum + (item.menuItem.price * item.quantity), 0
      );
      setTotalAmount(newTotal);

      return newCart;
    });
  };

  const handleDeleteClick = (event, order) => {
    event.stopPropagation();
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (orderToDelete) {
        await deleteOrder(orderToDelete._id);
        setSnackbarMessage({
          text: `Commande pour la table ${orderToDelete.tableNumber} supprimée avec succès`,
          severity: 'success'
        });
        setOpenSnackbar(true);
      }
    } catch (error) {
      setSnackbarMessage({
        text: `Erreur lors de la suppression de la commande: ${error.message}`,
        severity: 'error'
      });
      setOpenSnackbar(true);
    } finally {
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setEditMode(true);
    setTableNumber(order.tableNumber);
    setCart(order.items.map(item => ({
      menuItem: item.menuItem,
      quantity: item.quantity,
      notes: item.notes || ''
    })));
    const newNotes = {};
    order.items.forEach(item => {
      if (item.notes) {
        newNotes[item.menuItem._id] = item.notes;
      }
    });
    setItemNotes(newNotes);
    setTotalAmount(order.totalAmount);
    setOrderNote(order.notes || '');
  };

  const handleCancelEdit = () => {
    setSelectedOrder(null);
    setEditMode(false);
    setTableNumber('');
    setCart([]);
    setTotalAmount(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tableNumber || cart.length === 0) {
      setSnackbarMessage({
        text: 'Veuillez entrer un numéro de table et ajouter des articles',
        severity: 'warning'
      });
      setOpenSnackbar(true);
      return;
    }

    try {
      const orderData = {
        tableNumber,
        items: cart.map(item => ({
          menuItem: item.menuItem._id,
          quantity: item.quantity,
          notes: itemNotes[item.menuItem._id] || ''
        })),
        totalAmount,
        status: editMode ? selectedOrder.status : 'en attente',
        notes: orderNote
      };

      if (editMode && selectedOrder) {
        await updateOrder(selectedOrder._id, orderData);
        setSnackbarMessage({
          text: `Commande pour la table ${tableNumber} modifiée avec succès`,
          severity: 'success'
        });
      } else {
        await createOrder(orderData);
        setSnackbarMessage({
          text: `Commande pour la table ${tableNumber} créée avec succès`,
          severity: 'success'
        });
      }
      
      setOpenSnackbar(true);

      // Réinitialiser le formulaire
      setTableNumber('');
      setCart([]);
      setTotalAmount(0);
      setSelectedOrder(null);
      setEditMode(false);
      setItemNotes({});
      setOrderNote('');
    } catch (error) {
      console.error('Error creating order:', error);
      setSnackbarMessage({
        text: `Erreur: ${error.message}`,
        severity: 'error'
      });
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrder(orderId, { status: newStatus });
      setSnackbarMessage({
        text: 'Statut mis à jour avec succès',
        severity: 'success'
      });
      setOpenSnackbar(true);
    } catch (error) {
      setSnackbarMessage({
        text: `Erreur lors de la mise à jour du statut: ${error.message}`,
        severity: 'error'
      });
      setOpenSnackbar(true);
    }
  };

  const validStatuses = ['en attente', 'en préparation', 'terminé'];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ position: 'relative', maxWidth: '100%', overflow: 'hidden' }}>
      <Grid container spacing={2} sx={{ p: 2 }}>
        {/* Menu et Panier */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {/* Menu Section */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>Menu</Typography>
            </Grid>
            {menu.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {item.description}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {item.price}€
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Disponible: {item.quantityAvailable || 0}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => addToOrder(item)}
                      disabled={!item.quantityAvailable}
                    >
                      Ajouter
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Panier */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
            <Typography variant="h5" gutterBottom>Panier</Typography>
            
            <TextField
              fullWidth
              label="Numéro de table"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              margin="normal"
              required
            />

            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {cart.map((item) => (
                <ListItem key={item.menuItem._id} sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                    <ListItemText
                      primary={`${item.quantity}x ${item.menuItem.name}`}
                      secondary={`${(item.menuItem.price * item.quantity).toFixed(2)}€`}
                    />
                    <IconButton onClick={() => removeFromOrder(item.menuItem._id)}>
                      <RemoveIcon />
                    </IconButton>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Commentaire pour la cuisine"
                    value={itemNotes[item.menuItem._id] || ''}
                    onChange={(e) => handleNoteChange(item.menuItem._id, e.target.value)}
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" align="right" gutterBottom>
              Total: {totalAmount.toFixed(2)}€
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Commentaire général pour la commande"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              variant="outlined"
              sx={{ mt: 2, mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              {editMode ? (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={cart.length === 0 || !tableNumber}
                  >
                    Modifier la commande
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={handleCancelEdit}
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={cart.length === 0 || !tableNumber}
                >
                  Valider la commande
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Historique des commandes */}
        <Grid item xs={12}>
          <Paper sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
              Historique des commandes
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width="15%">Date</TableCell>
                    <TableCell width="10%">Table</TableCell>
                    <TableCell width="40%">Articles</TableCell>
                    <TableCell width="10%">Total</TableCell>
                    <TableCell width="15%">Statut</TableCell>
                    <TableCell width="10%">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow 
                      key={order._id}
                      hover
                      onClick={() => handleEditOrder(order)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{order.tableNumber}</TableCell>
                      <TableCell>
                        {order.items.map((item, index) => (
                          <Box key={index} sx={{ mb: item.notes ? 1 : 0 }}>
                            <Typography>
                              {item.quantity}x {item.menuItem.name}
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
                        {order.notes && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ mt: 1, fontStyle: 'italic', borderTop: '1px solid #eee', pt: 1 }}
                          >
                            Note commande: {order.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{order.totalAmount.toFixed(2)}€</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <select
                            value={order.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(order._id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ccc',
                              backgroundColor: order.status === 'en attente' ? '#fff3e0' :
                                             order.status === 'en préparation' ? '#e3f2fd' :
                                             order.status === 'terminé' ? '#f5f5f5' : '#ffffff',
                              color: order.status === 'en attente' ? '#ed6c02' :
                                    order.status === 'en préparation' ? '#0288d1' :
                                    order.status === 'terminé' ? '#2e7d32' : '#000000'
                            }}
                          >
                            {validStatuses.map(status => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditOrder(order);
                            }}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleDeleteClick(e, order)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer la commande
            {orderToDelete && ` pour la table ${orderToDelete.tableNumber}`} ?
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Annuler
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarMessage.severity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Service;
