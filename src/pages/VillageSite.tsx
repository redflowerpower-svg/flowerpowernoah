import { useState, useEffect } from 'react';
import VillageNav from '../components/VillageNav';
import VillageFooter from '../components/VillageFooter';
import VillageHero from '../sections/VillageHero';
import VillageHighlights from '../sections/VillageHighlights';
import VillageBookingBanner from '../sections/VillageBookingBanner';
import AccommodationsSection from '../sections/AccommodationsSection';
import RestaurantSection from '../sections/RestaurantSection';
import SpaSection from '../sections/SpaSection';
import ActivitiesSection from '../sections/ActivitiesSection';
import GallerySection from '../sections/GallerySection';
import ContactSection from '../sections/ContactSection';

interface Props {
  onBack: () => void;
}

type Page = 'home' | 'accommodations' | 'restaurant' | 'spa' | 'activities' | 'gallery' | 'contact';

export default function VillageSite({ onBack }: Props) {
  const [activePage, setActivePage] = useState<Page>('home');

  const navigate = (page: string) => {
    setActivePage(page as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage]);

  const renderPage = () => {
    switch (activePage) {
      case 'accommodations':
        return <AccommodationsSection onNavigate={navigate} />;
      case 'restaurant':
        return <RestaurantSection />;
      case 'spa':
        return <SpaSection />;
      case 'activities':
        return <ActivitiesSection />;
      case 'gallery':
        return <GallerySection />;
      case 'contact':
        return <ContactSection />;
      default:
        return (
          <>
            <VillageHero onNavigate={navigate} />
            <VillageHighlights />
            <VillageBookingBanner onNavigate={navigate} />
            <AccommodationsSection onNavigate={navigate} />
            <RestaurantSection />
            <SpaSection />
            <ActivitiesSection />
            <GallerySection />
            <ContactSection />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <VillageNav onBack={onBack} activePage={activePage} onNavigate={navigate} />
      <main>
        {renderPage()}
      </main>
      <VillageFooter onNavigate={navigate} />
    </div>
  );
}
