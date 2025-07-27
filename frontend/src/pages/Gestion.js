import React, { useState } from 'react';
import config from '../config';
import {
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  IconButton,
  Box,
  Snackbar
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, RestartAlt as RestartAltIcon } from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';

const categories = ['Burgers', 'Boissons', 'Desserts', 'Accompagnements'];

const Gestion = () => {
  const { menu, resetService } = useApp();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: categories[0],
    quantityAvailable: 0
  });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState({ text: '', severity: 'success' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({ title: '', content: '', action: null });

  const handleOpen = (item = null) => {
    if (item) {
      setEditingItem(item);
      console.log('Item to edit:', item);
      const quantity = parseInt(item.quantityAvailable);
      console.log('Item to edit - quantity:', item.quantityAvailable, 'parsed:', quantity);
      
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price || '',
        category: item.category || categories[0],
        quantityAvailable: isNaN(quantity) ? 0 : quantity
      });
      console.log('Form data set:', formData);
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category: categories[0],
        quantityAvailable: '0'
      });
    }
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    try {
      console.log('Form data before submit:', formData);
      const quantity = parseInt(formData.quantityAvailable);
      if (isNaN(quantity) || quantity < 0) {
        setFormErrors(prev => ({
          ...prev,
          quantityAvailable: 'La quantité doit être un nombre positif'
        }));
        return;
      }

      const itemData = {
        ...formData,
        price: parseFloat(formData.price),
        quantityAvailable: quantity
      };
      console.log('Item data to send:', itemData);

      if (editingItem) {
        console.log('Updating item:', itemData);
        const response = await fetch(`${config.API_URL}/api/menu/${editingItem._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...itemData,
            quantityAvailable: parseInt(itemData.quantityAvailable)
          })
        });

        const responseData = await response.json();
        console.log('Update response:', responseData);

        if (!response.ok) {
          setFormErrors(responseData.details || { general: responseData.message });
          throw new Error(responseData.message);
        }
      } else {
        const response = await fetch(`${config.API_URL}/api/menu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData)
        });

        if (!response.ok) {
          const data = await response.json();
          setFormErrors(data.details || { general: data.message });
          throw new Error(data.message);
        }
      }

      handleClose();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleResetService = async () => {
    try {
      await resetService();
      setSnackbarMessage({
        text: 'Service réinitialisé avec succès',
        severity: 'success'
      });
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error resetting service:', error);
      setSnackbarMessage({
        text: `Erreur: ${error.message}`,
        severity: 'error'
      });
      setOpenSnackbar(true);
    }
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        const response = await fetch(`${config.API_URL}/api/menu/${itemId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete item');
        }

        // La mise à jour du menu se fera automatiquement via Socket.IO
        // L'événement menuItemDeleted sera émis par le serveur
        setSnackbarMessage({
          text: 'Article supprimé avec succès',
          severity: 'success'
        });
        setOpenSnackbar(true);
      } catch (error) {
        console.error('Error:', error);
        setSnackbarMessage({
          text: `Erreur: ${error.message}`,
          severity: 'error'
        });
        setOpenSnackbar(true);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Grid container spacing={3} sx={{ p: 3 }}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Gestion du Menu</Typography>
          <Button
            variant="contained"
            onClick={() => handleOpen()}
          >
            Ajouter un article
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Prix</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell>Quantité disponible</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menu.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{Number(item.price).toFixed(2)} €</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{Number(item.quantityAvailable || 0)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpen(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* Section Réinitialisation du Service */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Réinitialisation du Service
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Cette action supprimera toutes les commandes et remettra les articles en stock.
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDialogOpen(true);
              setConfirmDialogConfig({
                title: 'Réinitialiser le service ?',
                content: 'Cette action supprimera toutes les commandes et remettra les articles en stock. Cette action est irréversible.',
                action: handleResetService
              });
            }}
            startIcon={<RestartAltIcon />}
          >
            Réinitialiser le Service
          </Button>
        </Paper>
      </Grid>

      {/* Dialogue de confirmation */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>{confirmDialogConfig.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialogConfig.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              setConfirmDialogOpen(false);
              confirmDialogConfig.action();
            }}
            color="error"
            variant="contained"
            autoFocus
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue d'édition */}
      <Dialog open={openDialog} onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingItem ? 'Modifier l\'article' : 'Nouvel article'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nom"
              name="name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={3}
              error={!!formErrors.description}
              helperText={formErrors.description}
            />
            <TextField
              fullWidth
              label="Prix"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              margin="normal"
              required
              inputProps={{ min: 0, step: 0.01 }}
              error={!!formErrors.price}
              helperText={formErrors.price}
            />
            <TextField
              fullWidth
              select
              label="Catégorie"
              name="category"
              value={formData.category}
              onChange={handleChange}
              margin="normal"
              required
              error={!!formErrors.category}
              helperText={formErrors.category}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Quantité disponible"
              type="number"
              name="quantityAvailable"
              value={formData.quantityAvailable}
              onChange={handleChange}
              margin="normal"
              required
              inputProps={{ min: 0, step: 1 }}
              error={!!formErrors.quantityAvailable}
              helperText={formErrors.quantityAvailable}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained">
              {editingItem ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message={snackbarMessage.text}
      />
    </Grid>
  );
};

export default Gestion;
