import { storeConfig } from './storeConfig';

export const SITE_CONTENT_STORAGE_KEY = 'cake_site_content_v6';

export interface PromoOfferItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  promoCode: string;
  discountPercent: number;
  imageUrl: string;
  isActive: boolean;
}

export interface HomeFoodSection {
  id: string;
  title: string;
  subtitle: string;
  cakeIds: string[];
  isVisible: boolean;
}

export interface SiteContent {
  // Store & Delivery Settings (Editable in Admin Tab 4)
  brandName: string;
  tagline: string;
  city: string;
  currency: string;
  whatsappNumber: string;
  deliveryFee: number;
  freeDeliveryMin: number;
  adminPin: string;

  // Header & Search
  locationLabel: string;
  searchPlaceholder: string;
  emptySearchText: string;
  resetFilterBtn: string;

  // Hero & Categories
  popularTitle: string;
  viewAllText: string;
  orderNowBtn: string;
  quickAddBtn: string;
  categories: string[];
  heroAutoRotate: boolean;
  heroAutoRotateSeconds: number;

  // Promo Banner & Multi-Offers
  bannerBadge: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerDescription: string;
  bannerCta: string;
  bannerAppliedCta: string;
  bannerImageUrl: string;
  promoCode: string;
  promoDiscountPercent: number;
  offers: PromoOfferItem[];

  // Custom Home Page Food Sections
  homeSections: HomeFoodSection[];

  // Detail & Customizer Sheet
  prepTimeSuffix: string;
  totalPriceLabel: string;
  addToCartBtn: string;
  customizeTitle: string;
  editBtn: string;
  stepsTitle: string;
  stepsSubtitle: string;
  cakeNoteBtn: string;
  cakeNotePlaceholder: string;

  // Cart & Checkout Drawer
  cartTitle: string;
  emptyCartText: string;
  emptyCartSubtext: string;
  cakeMessageLabel: string;
  cakeMessagePlaceholder: string;
  freePipingBadge: string;
  deliveryDetailsTitle: string;
  nameLabel: string;
  phoneLabel: string;
  phoneErrorText: string;
  addressLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  deliveryLabel: string;
  freeDeliveryText: string;
  grandTotalLabel: string;
  confirmOrderBtn: string;
  confirmingOrderBtn: string;
  successTitle: string;
  successSubtitle: string;
  whatsappBtn: string;
  continueBtn: string;
  estimatedDeliveryLabel: string;
  estimatedDeliveryValue: string;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  // Store & Delivery Settings
  brandName: storeConfig.brandName,
  tagline: storeConfig.tagline,
  city: storeConfig.city,
  currency: storeConfig.currency,
  whatsappNumber: storeConfig.whatsappNumber,
  deliveryFee: storeConfig.deliveryFee,
  freeDeliveryMin: storeConfig.freeDeliveryMin,
  adminPin: '1234',

  // Header & Search
  locationLabel: 'Delivery Area',
  searchPlaceholder: 'পছন্দের Cake বা Flavor খুঁজুন (যেমন: Mango, আম, Bento)...',
  emptySearchText: 'দুঃখিত, এই নামে কোনো Cake পাওয়া যায়নি',
  resetFilterBtn: 'সব কেক দেখুন',

  // Hero & Categories
  popularTitle: 'Popular কেকসমূহ',
  viewAllText: 'View All',
  orderNowBtn: 'Order করুন',
  quickAddBtn: '+ Quick Add',
  categories: [
    'সব কেক',
    'Birthday Cake',
    'Bento Cake',
    'Cupcake',
    'Sugar-Free',
  ],
  heroAutoRotate: true,
  heroAutoRotateSeconds: 2,

  // Promo Banner & Multi-Offers
  bannerBadge: 'Special Offer',
  bannerTitle: '30% পর্যন্ত Discount!',
  bannerSubtitle: 'যেকোনো Custom Celebration Cake-এর Order-এ',
  bannerDescription:
    'Checkout-এ Promo Code ব্যবহার করলেই পাচ্ছেন Special Discount!',
  bannerCta: 'Claim Offer',
  bannerAppliedCta: 'Offer Applied',
  bannerImageUrl: storeConfig.promoBanner.image_url,
  promoCode: 'SWEET30',
  promoDiscountPercent: 30,
  offers: [
    {
      id: 'offer-sweet30',
      badge: 'Special Offer',
      title: '30% পর্যন্ত Discount!',
      subtitle: 'যেকোনো Custom Celebration Cake-এর Order-এ',
      description:
        'Checkout-এ SWEET30 Promo Code ব্যবহার করলেই পাচ্ছেন 30% Special Discount!',
      ctaText: 'Claim Offer',
      promoCode: 'SWEET30',
      discountPercent: 30,
      imageUrl: storeConfig.promoBanner.image_url,
      isActive: true,
    },
  ],

  // Custom Home Page Food Sections
  homeSections: [
    {
      id: 'sec-bento-picks',
      title: 'Gift & Bento Specials',
      subtitle: 'Cute Surprise বক্স — হাতে লেখা মেসেজ সহ',
      cakeIds: ['alphonso-mango-cloud', 'classic-caramel-bento', 'blueberry-lavender-mist'],
      isVisible: true,
    },
  ],

  // Detail & Customizer Sheet
  prepTimeSuffix: 'mins prep',
  totalPriceLabel: 'Total Price',
  addToCartBtn: 'Add to Cart',
  customizeTitle: 'Cake Customize করুন',
  editBtn: 'Reset',
  stepsTitle: 'Order ও Delivery Process',
  stepsSubtitle: '5 Steps Fresh Baking',
  cakeNoteBtn: '+ Cake-এ নাম লিখুন',
  cakeNotePlaceholder: 'Cake-এর ওপর কী নাম লিখবেন? (যেমন: Happy Birthday Tanha)',

  // Cart & Checkout Drawer
  cartTitle: 'আপনার Order Bag',
  emptyCartText: 'আপনার Order Bag এখন খালি আছে',
  emptyCartSubtext:
    'উপরের Flavor Wave বা পছন্দের Cake ট্যাপ করে Customize করে Cart-এ যোগ করুন।',
  cakeMessageLabel: 'Cake-এর ওপর কী নাম লিখবেন?',
  cakeMessagePlaceholder: 'যেমন: Happy Birthday Tanha',
  freePipingBadge: 'Free Hand-Piping',
  deliveryDetailsTitle: 'Home Delivery Details',
  nameLabel: 'আপনার Full Name',
  phoneLabel: 'Mobile Number (01XXXXXXXXX)',
  phoneErrorText: 'সঠিক 11 Digit-এর Mobile Number দিন',
  addressLabel: 'সম্পূর্ণ Delivery Address',
  subtotalLabel: 'Subtotal (কেকের মূল্য)',
  discountLabel: 'Special Discount',
  deliveryLabel: 'Home Delivery Charge',
  freeDeliveryText: 'Free Delivery',
  grandTotalLabel: 'Grand Total (সর্বমোট বিল)',
  confirmOrderBtn: 'Confirm Order',
  confirmingOrderBtn: 'Order Confirm হচ্ছে...',
  successTitle: 'অভিনন্দন! আপনার Order Confirm হয়েছে',
  successSubtitle: 'আমাদের Bakery Team খুব শীঘ্রই আপনার সাথে যোগাযোগ করবে।',
  whatsappBtn: 'WhatsApp-এ Receipt পাঠান',
  continueBtn: 'আরও Cake দেখুন',
  estimatedDeliveryLabel: 'Estimated Delivery Time',
  estimatedDeliveryValue: '45 – 60 mins (Express Chilled Box)',
};

export function loadSiteContentSync(): SiteContent {
  if (typeof window === 'undefined') return DEFAULT_SITE_CONTENT;
  try {
    const raw = window.localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        SITE_CONTENT_STORAGE_KEY,
        JSON.stringify(DEFAULT_SITE_CONTENT)
      );
      return DEFAULT_SITE_CONTENT;
    }
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return { ...DEFAULT_SITE_CONTENT, ...parsed };
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export function saveSiteContentSync(content: SiteContent): void {
  try {
    window.localStorage.setItem(
      SITE_CONTENT_STORAGE_KEY,
      JSON.stringify(content)
    );
  } catch {
    // Ignore storage quota errors
  }
}
