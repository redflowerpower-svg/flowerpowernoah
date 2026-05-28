import { create } from 'zustand';
import { calculateDistance } from '../utils/distance';

// Coordinate centrali (Koh Phayam) per il calcolo del raggio di consegna
const RESTAURANT_LAT = 9.7320;
const RESTAURANT_LNG = 98.3320;

interface LocationState {
  userLat: number | null;
  userLng: number | null;
  distanceKm: number | null;
  maxRadiusKm: number;
  isDeliverable: boolean;
  isLoading: boolean;
  error: string | null;

  requestLocation: () => void;
  setMaxRadius: (radius: number) => void;
  setSimulatedLocation: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  userLat: null,
  userLng: null,
  distanceKm: null,
  maxRadiusKm: 5,
  isDeliverable: true,
  isLoading: false,
  error: null,

  requestLocation: () => {
    set({ isLoading: true, error: null });

    if (!navigator.geolocation) {
      set({ error: 'Geolocalizzazione non supportata dal browser', isLoading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistance(RESTAURANT_LAT, RESTAURANT_LNG, latitude, longitude);

        set({
          userLat: latitude,
          userLng: longitude,
          distanceKm: distance,
          isDeliverable: distance <= get().maxRadiusKm,
          isLoading: false
        });
      },
      (_error) => {
        set({ error: 'Impossibile ottenere la posizione. Verifica i permessi.', isLoading: false });
      }
    );
  },

  setSimulatedLocation: () => {
    set({
      distanceKm: 1.5,
      isDeliverable: true,
      isLoading: false,
      error: null,
    });
  },

  setMaxRadius: (radius) => {
    const currentDistance = get().distanceKm;
    set({
      maxRadiusKm: radius,
      isDeliverable: currentDistance !== null ? currentDistance <= radius : true
    });
  }
}));
