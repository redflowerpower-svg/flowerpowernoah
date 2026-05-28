import { useState } from 'react';
import SplitScreen from './pages/SplitScreen';
import VillageSite from './pages/VillageSite';
import PizzaSite from './pages/PizzaSite';
import AdminDashboard from './pizza/pages/AdminDashboard';

type Site = 'split' | 'village' | 'pizza' | 'admin';

function App() {
  const [activeSite, setActiveSite] = useState<Site>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#admin') return 'admin';
    return 'split';
  });

  if (activeSite === 'village') {
    return <VillageSite onBack={() => setActiveSite('split')} />;
  }
  if (activeSite === 'pizza') {
    return <PizzaSite onBack={() => setActiveSite('split')} />;
  }
  if (activeSite === 'admin') {
    return <AdminDashboard />;
  }
  return (
    <SplitScreen
      onSelectVillage={() => setActiveSite('village')}
      onSelectPizza={() => setActiveSite('pizza')}
    />
  );
}

export default App;
