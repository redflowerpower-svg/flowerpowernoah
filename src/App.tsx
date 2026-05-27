import { useState } from 'react';
import SplitScreen from './pages/SplitScreen';
import VillageSite from './pages/VillageSite';
import PizzaSite from './pages/PizzaSite';

type Site = 'split' | 'village' | 'pizza';

function App() {
  const [activeSite, setActiveSite] = useState<Site>('split');

  if (activeSite === 'village') {
    return <VillageSite onBack={() => setActiveSite('split')} />;
  }
  if (activeSite === 'pizza') {
    return <PizzaSite onBack={() => setActiveSite('split')} />;
  }
  return (
    <SplitScreen
      onSelectVillage={() => setActiveSite('village')}
      onSelectPizza={() => setActiveSite('pizza')}
    />
  );
}

export default App;
