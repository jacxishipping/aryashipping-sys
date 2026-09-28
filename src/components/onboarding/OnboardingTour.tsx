"use client";

import { useEffect, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/design-system';
import { HelpCircle } from 'lucide-react';

interface OnboardingTourProps {
  storageKey?: string;
  autoStart?: boolean;
}

export default function OnboardingTour({
  storageKey = 'jacxi_tour_completed',
  autoStart = false
}: OnboardingTourProps) {
  const driverObj = useRef<Driver | null>(null);

  useEffect(() => {
    driverObj.current = driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: '#dashboard-header',
          popover: {
            title: 'Welcome to Jacxi Shipping',
            description: 'This is your command center. Get a quick overview of your shipments, revenue, and active containers.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#stats-grid',
          popover: {
            title: 'Key Metrics',
            description: 'Monitor real-time performance indicators. These cards update automatically as operations progress.',
            side: 'bottom',
          },
        },
        {
          element: '#quick-actions',
          popover: {
            title: 'Quick Actions',
            description: 'Fast access to common tasks like creating shipments or containers. Saves you clicks!',
            side: 'left',
          },
        },
        {
          element: '#shipment-trends',
          popover: {
            title: 'Trends & Analytics',
            description: 'Visualize your shipping volume over the last 14 days to spot patterns.',
            side: 'top',
          },
        },
        {
          element: '#shipment-calculator',
          popover: {
            title: 'Cost Calculator',
            description: 'Estimate shipping costs instantly based on vehicle type and destination.',
            side: 'right',
          },
        }
      ],
      onDestroyed: () => {
        if (storageKey) {
          localStorage.setItem(storageKey, 'true');
        }
      },
    });

    if (autoStart) {
      const tourCompleted = localStorage.getItem(storageKey);
      if (!tourCompleted) {
        // Small delay to ensure elements are mounted
        setTimeout(() => {
          driverObj.current?.drive();
        }, 1000);
      }
    }
  }, [storageKey, autoStart]);

  const startTour = () => {
    driverObj.current?.drive();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startTour}
      icon={<HelpCircle className="w-4 h-4" />}
      aria-label="Start interactive tour"
    >
      Tour
    </Button>
  );
}
