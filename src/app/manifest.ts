import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JACXI Shipping',
    short_name: 'JACXI',
    description:
      'Vehicle shipping from the USA and Canada to Afghanistan through either Mersin or UAE with tracking, invoicing, and delivery operations.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#191C1F',
    theme_color: '#DAA520',
    categories: ['business', 'logistics', 'productivity'],
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
