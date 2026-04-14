import { create } from 'zustand';
import type { Restaurant } from '@/types/database';

interface RestaurantStore {
  currentRestaurant: Restaurant | null;
  restaurants: Restaurant[];
  setCurrentRestaurant: (restaurant: Restaurant) => void;
  setRestaurants: (restaurants: Restaurant[]) => void;
}

export const useRestaurantStore = create<RestaurantStore>((set) => ({
  currentRestaurant: null,
  restaurants: [],
  setCurrentRestaurant: (restaurant) => set({ currentRestaurant: restaurant }),
  setRestaurants: (restaurants) => set({ restaurants }),
}));
