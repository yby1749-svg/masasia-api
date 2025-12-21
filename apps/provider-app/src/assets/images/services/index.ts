// Service image mappings
// Replace these placeholder URLs with actual local images when available

// Placeholder images - using Unsplash for demo purposes
export const serviceImages: Record<string, string> = {
  'svc-thai': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop',
  'svc-swedish': 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&h=300&fit=crop',
  'svc-deep-tissue': 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&h=300&fit=crop',
  'svc-hot-stone': 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&h=300&fit=crop',
  'svc-aromatherapy': 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=400&h=300&fit=crop',
  'svc-foot-reflexology': 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop',
};

// Fallback image for services without a specific image
export const defaultServiceImage = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop';

// Get image URL for a service
export const getServiceImage = (serviceId: string): string => {
  return serviceImages[serviceId] || defaultServiceImage;
};

// Get image by service name (fuzzy matching)
export const getServiceImageByName = (serviceName: string): string => {
  const name = serviceName.toLowerCase();

  if (name.includes('thai')) {
    return serviceImages['svc-thai'];
  }
  if (name.includes('swedish')) {
    return serviceImages['svc-swedish'];
  }
  if (name.includes('deep') || name.includes('tissue')) {
    return serviceImages['svc-deep-tissue'];
  }
  if (name.includes('hot') || name.includes('stone')) {
    return serviceImages['svc-hot-stone'];
  }
  if (name.includes('aroma')) {
    return serviceImages['svc-aromatherapy'];
  }
  if (name.includes('foot') || name.includes('reflex')) {
    return serviceImages['svc-foot-reflexology'];
  }

  return defaultServiceImage;
};
