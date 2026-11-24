export interface StoreConfig {
  storeSlug: string;
  store_slug: string;
  brandName: string;
  brand_name: string;
  tagline: string;
  city: string;
  country: string;
  currency: string;
  currency_symbol: string;
  whatsappNumber: string;
  whatsapp_number: string;
  menuVersion: string;
  deliveryFee: number;
  freeDeliveryMin: number;
  freeDeliveryThreshold: number;
  defaultPrepTime: string;
  avatarUrl: string;
  promoBanner: {
    headline: string;
    subtext: string;
    code: string;
    discountPercent: number;
    description: string;
    image_url: string;
  };
  categories: {
    id: string;
    label: string;
    shortLabel: string;
    image_url: string;
  }[];
}

export const storeConfig: StoreConfig = {
  storeSlug: 'sweet-crave',
  store_slug: 'sweet-crave',
  brandName: 'SweetCrave',
  brand_name: 'SweetCrave',
  tagline: 'Artisan Cake & Bento Patisserie',
  city: 'ঢাকা ও মেহেরপুর',
  country: 'Bangladesh',
  currency: '৳',
  currency_symbol: '৳',
  whatsappNumber: '+8801711000000',
  whatsapp_number: '+8801711000000',
  menuVersion: '2026.11.5',
  deliveryFee: 60,
  freeDeliveryMin: 1200,
  freeDeliveryThreshold: 1200,
  defaultPrepTime: '40 mins',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  promoBanner: {
    headline: '30% পর্যন্ত Discount!',
    subtext: 'যেকোনো Custom Celebration Cake-এর Order-এ',
    code: 'SWEET30',
    discountPercent: 30,
    description:
      'Checkout-এ SWEET30 Promo Code ব্যবহার করলেই পাচ্ছেন 30% Special Discount!',
    image_url:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  },
  categories: [
    {
      id: 'সব কেক',
      label: 'সব কেক',
      shortLabel: 'সব কেক',
      image_url:
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=160&q=80',
    },
    {
      id: 'Birthday Cake',
      label: 'Birthday Cake',
      shortLabel: 'Birthday',
      image_url:
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=160&q=80',
    },
    {
      id: 'Bento Cake',
      label: 'Bento Cake',
      shortLabel: 'Bento Cake',
      image_url:
        'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=160&q=80',
    },
    {
      id: 'Cupcake',
      label: 'Cupcake',
      shortLabel: 'Cupcake',
      image_url:
        'https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&w=160&q=80',
    },
    {
      id: 'Sugar-Free',
      label: 'Sugar-Free',
      shortLabel: 'Sugar-Free',
      image_url:
        'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=160&q=80',
    },
  ],
};

export default storeConfig;
