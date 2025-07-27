import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <RestaurantMenuIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Corti-Cuisine
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/service"
          >
            Service
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/cuisine"
          >
            Cuisine
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/gestion"
          >
            Gestion
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
