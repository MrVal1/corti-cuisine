// Configuration de l'application
const getApiUrl = () => {
  // En production, utilise le même hôte que le frontend
  if (process.env.NODE_ENV === 'production') {
    // Utilise le même hôte (domaine:port) que le frontend
    // Le reverse proxy s'occupera de rediriger les requêtes /api vers le backend
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  // En développement
  const devPort = process.env.REACT_APP_API_PORT || '3001';
  // Si on accède via l'IP du réseau, on l'utilise avec le port configuré
  if (window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}:${devPort}`;
  }
  // Sinon, on utilise localhost avec le port configuré
  return `http://localhost:${devPort}`;
};

const config = {
  API_URL: getApiUrl()
};

export default config;
