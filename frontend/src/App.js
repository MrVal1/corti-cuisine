import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppProvider } from './contexts/AppContext';

import Navbar from './components/Navbar';
import Service from './pages/Service';
import Cuisine from './pages/Cuisine';
import Gestion from './pages/Gestion';


const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Router>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <main style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/service" replace />} />
                <Route path="/service" element={<Service />} />
                <Route path="/cuisine" element={<Cuisine />} />
                <Route path="/gestion" element={<Gestion />} />

              </Routes>
            </main>
          </div>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
