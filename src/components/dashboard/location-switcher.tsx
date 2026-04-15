'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRestaurantStore } from '@/stores/restaurant-store';
import { getUserRestaurants } from '@/lib/queries';
import type { Restaurant } from '@/types/database';
import { ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LocationSwitcher() {
  const router = useRouter();
  const supabase = createClient();
  const {
    currentRestaurant,
    restaurants,
    setCurrentRestaurant,
    setRestaurants,
  } = useRestaurantStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userRestaurants = await getUserRestaurants(supabase);
        if (!mounted) return;
        setRestaurants(userRestaurants);
        if (userRestaurants.length > 0 && !currentRestaurant) {
          const savedId =
            typeof window !== 'undefined'
              ? localStorage.getItem('selectedRestaurantId')
              : null;
          const restored = userRestaurants.find((r) => r.id === savedId);
          setCurrentRestaurant(restored || userRestaurants[0]);
        }
      } catch (err) {
        console.error('Failed to load restaurants:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (restaurant: Restaurant) => {
    setCurrentRestaurant(restaurant);
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedRestaurantId', restaurant.id);
    }
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="mt-3 rounded-xl bg-ringo-card/50 border border-ringo-border p-3">
        <p className="text-[10px] text-ringo-muted">Loading locations…</p>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return null;
  }

  if (restaurants.length === 1) {
    return (
      <div className="mt-3 rounded-xl bg-ringo-card/50 border border-ringo-border p-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#F3EEE3]" />
          <p className="text-xs font-semibold text-foreground truncate">
            {restaurants[0].name}
          </p>
        </div>
        <p className="text-[10px] text-ringo-muted/70 mt-1">1 location</p>
      </div>
    );
  }

  return (
    <div className="mt-3 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 rounded-xl bg-ringo-card/50 border border-ringo-border px-3 py-2.5 hover:bg-ringo-card transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-[#F3EEE3] shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">
            {currentRestaurant?.name || 'Select location'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-ringo-muted transition-transform shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl bg-ringo-darker border border-ringo-border shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => handleChange(r)}
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors',
                  currentRestaurant?.id === r.id
                    ? 'bg-[#F3EEE3]/10 text-[#F3EEE3]'
                    : 'text-ringo-muted hover:bg-ringo-card/60 hover:text-foreground'
                )}
              >
                <p className="text-xs font-semibold truncate">{r.name}</p>
                {r.address && (
                  <p className="text-[10px] text-ringo-muted/70 truncate mt-0.5">
                    {r.address}
                  </p>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-ringo-border px-3 py-2">
            <p className="text-[10px] text-ringo-muted">
              {restaurants.length} locations
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
