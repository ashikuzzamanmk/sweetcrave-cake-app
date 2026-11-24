export interface CakeThemePalette {
  canvas: string;
  surface: string;
  card: string;
  wave: string;
  accent: string;
  darkBtn: string;
  textInk: string;
}

export interface CakeGarnish {
  id: string;
  label: string;
  image_url: string;
  position: 'top-left' | 'bottom-left' | 'top-right';
  rotate: number;
}

export interface CakeCustomizerOption {
  id: string;
  name: string;
  category: 'Weight' | 'Sponge' | 'Add-ons';
  priceDelta: number;
  image_url: string;
  defaultSelected: boolean;
}

export interface ProductOptionChoice {
  id: string;
  name: string;
  priceDelta: number;
  image_url?: string;
  defaultSelected?: boolean;
}

export interface ProductOptionGroup {
  id: string;
  name: string; // e.g. "Cake Size", "Cake Flavour", "Filling", "Toppings", "Decoration"
  selectionType: 'single' | 'multiple';
  required: boolean;
  maxSelections?: number;
  choices: ProductOptionChoice[];
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface CakeStepItem {
  stepNumber: number;
  shortLabel: string;
  title: string;
  image_url: string;
}

export interface CakeItem {
  id: string;
  slug?: string;
  name: string;
  heroTitleLines: [string, string];
  category: string;
  badge?: string;
  tags?: string[];
  shortDescription: string;
  fullDescription: string;
  ingredientsStory?: string;
  chefNote?: string;
  servings?: string;
  sweetnessLevel?: number; // 1 to 5
  textureProfile?: string;
  dietaryTags?: string[];
  allergens?: string;
  storageTip?: string;
  basePrice: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  prepMins: number;
  prepTime: string;
  weight: string;
  calories: string;
  isHeroFlavor: boolean;
  isVisible?: boolean;
  isAvailable?: boolean;
  isFeatured?: boolean;
  displayPriority?: number;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  stockLimit?: number | null;
  maxOrderQty?: number;
  allowCustomMessage?: boolean;
  image_url: string;
  galleryImages?: string[];
  theme: CakeThemePalette;
  garnishes: [CakeGarnish, CakeGarnish, CakeGarnish];
  customizerOptions: CakeCustomizerOption[];
  optionGroups?: ProductOptionGroup[];
  steps: CakeStepItem[];
}

/**
 * Returns the product's flexible dynamic optionGroups.
 * If a product uses legacy `customizerOptions`, converts them seamlessly into structured groups
 * so every product works identically in the dynamic customization UI.
 */
export function getEffectiveOptionGroups(cake: CakeItem): ProductOptionGroup[] {
  if (Array.isArray(cake.optionGroups) && cake.optionGroups.length > 0) {
    return cake.optionGroups;
  }

  const groups: ProductOptionGroup[] = [];
  const weightOpts = cake.customizerOptions.filter((o) => o.category === 'Weight');
  const spongeOpts = cake.customizerOptions.filter((o) => o.category === 'Sponge');
  const addonOpts = cake.customizerOptions.filter((o) => o.category === 'Add-ons');

  if (weightOpts.length > 0) {
    groups.push({
      id: 'grp-weight',
      name: 'Size / Weight',
      selectionType: 'single',
      required: true,
      choices: weightOpts.map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: o.priceDelta,
        image_url: o.image_url,
        defaultSelected: o.defaultSelected,
      })),
    });
  }

  if (spongeOpts.length > 0) {
    groups.push({
      id: 'grp-sponge',
      name: 'Flavour / Sponge',
      selectionType: 'single',
      required: true,
      choices: spongeOpts.map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: o.priceDelta,
        image_url: o.image_url,
        defaultSelected: o.defaultSelected,
      })),
    });
  }

  if (addonOpts.length > 0) {
    groups.push({
      id: 'grp-addons',
      name: 'Toppings & Add-ons',
      selectionType: 'multiple',
      required: false,
      choices: addonOpts.map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: o.priceDelta,
        image_url: o.image_url,
        defaultSelected: o.defaultSelected,
      })),
    });
  }

  return groups;
}

export const DEFAULT_JOURNEY_STEPS: CakeStepItem[] = [
  {
    stepNumber: 1,
    shortLabel: '1. Fresh Baking',
    title: 'Fresh Sponge Baking',
    image_url:
      'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=200&q=80',
  },
  {
    stepNumber: 2,
    shortLabel: '2. Cream Layer',
    title: 'Whipped Cream Layering',
    image_url:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80',
  },
  {
    stepNumber: 3,
    shortLabel: '3. Custom নাম লেখা',
    title: 'Hand-Piped Calligraphy',
    image_url:
      'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=200&q=80',
  },
  {
    stepNumber: 4,
    shortLabel: '4. Chilled Box',
    title: 'Insulated Chilled Box',
    image_url:
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=200&q=80',
  },
  {
    stepNumber: 5,
    shortLabel: '5. Home Delivery',
    title: 'Express Home Delivery',
    image_url:
      'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=200&q=80',
  },
];

const createBanglaCustomizerTiles = (
  defaultSponge: 'opt-sponge-vanilla' | 'opt-sponge-choc' | 'opt-sponge-velvet'
): CakeCustomizerOption[] => [
  // Weight
  {
    id: 'opt-weight-half',
    name: '0.5 kg (হাফ কেজি)',
    category: 'Weight',
    priceDelta: 0,
    image_url:
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=200&q=80',
    defaultSelected: true,
  },
  {
    id: 'opt-weight-1kg',
    name: '1 kg (১ কেজি)',
    category: 'Weight',
    priceDelta: 450,
    image_url:
      'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=200&q=80',
    defaultSelected: false,
  },
  {
    id: 'opt-weight-2kg',
    name: '2 kg (২ কেজি)',
    category: 'Weight',
    priceDelta: 900,
    image_url:
      'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=200&q=80',
    defaultSelected: false,
  },
  // Sponge
  {
    id: 'opt-sponge-vanilla',
    name: 'Vanilla Sponge',
    category: 'Sponge',
    priceDelta: 0,
    image_url:
      'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=200&q=80',
    defaultSelected: defaultSponge === 'opt-sponge-vanilla',
  },
  {
    id: 'opt-sponge-choc',
    name: 'Chocolate Fudge',
    category: 'Sponge',
    priceDelta: 0,
    image_url:
      'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=200&q=80',
    defaultSelected: defaultSponge === 'opt-sponge-choc',
  },
  {
    id: 'opt-sponge-velvet',
    name: 'Red Velvet',
    category: 'Sponge',
    priceDelta: 0,
    image_url:
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=200&q=80',
    defaultSelected: defaultSponge === 'opt-sponge-velvet',
  },
  // Add-ons
  {
    id: 'opt-addon-strawberry',
    name: 'Fresh Strawberry',
    category: 'Add-ons',
    priceDelta: 120,
    image_url:
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=200&q=80',
    defaultSelected: false,
  },
  {
    id: 'opt-addon-chocchips',
    name: 'Chocolate Chips',
    category: 'Add-ons',
    priceDelta: 80,
    image_url:
      'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=200&q=80',
    defaultSelected: false,
  },
  {
    id: 'opt-addon-candle',
    name: 'Golden Candle & Box',
    category: 'Add-ons',
    priceDelta: 100,
    image_url:
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=200&q=80',
    defaultSelected: false,
  },
];

export const CAKES_DATA: CakeItem[] = [
  {
    id: 'strawberry-velvet-crown',
    name: 'Strawberry Velvet Crown',
    heroTitleLines: ['Strawberry Velvet', 'Crown'],
    category: 'Birthday Cake',
    badge: 'Bestseller',
    shortDescription:
      'Soft Vanilla Sponge-এর সাথে Fresh Strawberry Cream ও Glazed Berry Topping।',
    fullDescription:
      'নরম Vanilla Sponge-এর প্রতিটি Layer-এ Organic Strawberry Compote, হালকা Whipped Mascarpone Cream ও তাজা Glazed Berry-র রাজকীয় স্বাদ।',
    ingredientsStory:
      'Hand-selected organic strawberries, French whipped mascarpone cream, Madagascar vanilla bean sponge, light berry reduction glaze, and fresh mint sprigs — baked fresh per order.',
    chefNote:
      'আপনার বিশেষ দিনের জন্য প্রতিটি Layer হাতে Finish করা হয় — প্রথম কামড়েই পাবেন মেঘের মতো নরম ও ফ্রেশ বেরির স্বাদ।',
    servings: '4–6 জন (6 Slices)',
    sweetnessLevel: 3,
    textureProfile: 'Cloud-Soft & Velvety',
    dietaryTags: ['100% Halal', 'Freshly Baked', 'No Preservatives'],
    allergens: 'Dairy, Eggs, Wheat (Gluten)',
    storageTip:
      'ফ্রিজে (4°C) রাখুন এবং কাটার 15 মিনিট আগে বের করলে সেরা Creamy Texture পাবেন।',
    basePrice: 950,
    originalPrice: 1200,
    rating: 4.9,
    reviewsCount: 342,
    prepMins: 40,
    prepTime: '40 mins prep',
    weight: '0.5 kg',
    calories: '310 kcal',
    isHeroFlavor: true,
    image_url:
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
    theme: {
      canvas: '#FFF0EC',
      surface: '#FFE3DC',
      card: '#FAF6F0',
      wave: '#FF9B82',
      accent: '#D9385A',
      darkBtn: '#24372B',
      textInk: '#1F191A',
    },
    garnishes: [
      {
        id: 'sv-g1',
        label: 'Fresh Strawberry',
        image_url:
          'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=220&q=80',
        position: 'top-left',
        rotate: -14,
      },
      {
        id: 'sv-g2',
        label: 'Mint Leaf',
        image_url:
          'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=220&q=80',
        position: 'bottom-left',
        rotate: 18,
      },
      {
        id: 'sv-g3',
        label: 'Ruby Raspberry',
        image_url:
          'https://images.unsplash.com/photo-1577069861033-55d04cec4ef5?auto=format&fit=crop&w=220&q=80',
        position: 'top-right',
        rotate: 12,
      },
    ],
    customizerOptions: createBanglaCustomizerTiles('opt-sponge-velvet'),
    steps: DEFAULT_JOURNEY_STEPS,
  },
  {
    id: 'alphonso-mango-cloud',
    name: 'Alphonso Mango Cloud',
    heroTitleLines: ['Alphonso Mango', 'Cloud'],
    category: 'Bento Cake',
    badge: "Chef's Pick",
    shortDescription:
      'পাকা Alphonso Mango Puree, হালকা Whipped Cream ও Fresh Mango Cubes।',
    fullDescription:
      'মিষ্টি পাকা Alphonso আমের Puree, Golden Chiffon Sponge ও Silky Whipped Cream-এর সাথে Fresh Mango Cubes-এর অসাধারণ স্বাদ।',
    ingredientsStory:
      'Real sun-ripened Alphonso mango puree, airy golden chiffon sponge, coconut-kissed whipped cream, passionfruit drizzle, and hand-diced mango cubes.',
    chefNote:
      'কোনো Artificial Essence নয় — ১০০% আসল পাকা আমের পিউরি দিয়ে তৈরি, যা মুখে দিলেই গলে যায়।',
    servings: '3–4 জন (4–5 Slices)',
    sweetnessLevel: 3,
    textureProfile: 'Airy Chiffon & Juicy',
    dietaryTags: ['100% Halal', 'Real Fruit Puree', 'Freshly Baked'],
    allergens: 'Dairy, Eggs, Wheat',
    storageTip:
      'ঠান্ডা অবস্থায় (Chilled) পরিবেশন করলে আমের ফ্রেশ ফ্লেভার সবচেয়ে দারুণ লাগে।',
    basePrice: 550,
    rating: 4.8,
    reviewsCount: 289,
    prepMins: 35,
    prepTime: '35 mins prep',
    weight: '0.5 kg',
    calories: '295 kcal',
    isHeroFlavor: true,
    image_url:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    theme: {
      canvas: '#FFF8E7',
      surface: '#FFEFCC',
      card: '#FAF6F0',
      wave: '#FFD25A',
      accent: '#D97706',
      darkBtn: '#2D2A1E',
      textInk: '#231F14',
    },
    garnishes: [
      {
        id: 'am-g1',
        label: 'Mango Cubes',
        image_url:
          'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=220&q=80',
        position: 'top-left',
        rotate: -12,
      },
      {
        id: 'am-g2',
        label: 'Passionfruit Glaze',
        image_url:
          'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=220&q=80',
        position: 'bottom-left',
        rotate: 22,
      },
      {
        id: 'am-g3',
        label: 'Toasted Coconut',
        image_url:
          'https://images.unsplash.com/photo-1580984969071-a8da5656c2fb?auto=format&fit=crop&w=220&q=80',
        position: 'top-right',
        rotate: 15,
      },
    ],
    customizerOptions: createBanglaCustomizerTiles('opt-sponge-vanilla'),
    steps: DEFAULT_JOURNEY_STEPS,
  },
  {
    id: 'belgian-dark-chocolate-truffle',
    name: 'Belgian Dark Chocolate Truffle',
    heroTitleLines: ['Belgian Dark', 'Chocolate Truffle'],
    category: 'Birthday Cake',
    badge: 'Signature 5.0★',
    shortDescription:
      '70% Dark Belgian Chocolate Ganache ও Moist Cocoa Fudge Sponge।',
    fullDescription:
      '70% আসল Belgian Dark Chocolate Ganache এবং Moist Dutch Cocoa Fudge Sponge-এর সাথে Roasted Hazelnut Crunch।',
    ingredientsStory:
      '70% Belgian dark couverture chocolate, slow-whisked glossy ganache, Dutch-processed dark cocoa sponge, espresso mist, and toasted Piedmont hazelnut praline.',
    chefNote:
      'সত্যিকারের Chocolate Lovers-দের জন্য তৈরি — অতিরিক্ত মিষ্টি নয়, বরং Rich, Deep ও Silky Dark Cocoa-র নিখুঁত ব্যালেন্স।',
    servings: '4–6 জন (6 Slices)',
    sweetnessLevel: 4,
    textureProfile: 'Rich, Moist & Silky Fudge',
    dietaryTags: ['100% Halal', 'Real Belgian Cocoa', 'No Preservatives'],
    allergens: 'Dairy, Wheat, Hazelnuts',
    storageTip:
      'কাটার 20 মিনিট আগে ফ্রিজ থেকে বের করে রাখুন — এতে Dark Ganache-টা একদম মখমলের মতো নরম থাকবে।',
    basePrice: 1150,
    originalPrice: 1450,
    rating: 5.0,
    reviewsCount: 418,
    prepMins: 50,
    prepTime: '50 mins prep',
    weight: '0.5 kg',
    calories: '390 kcal',
    isHeroFlavor: true,
    image_url:
      'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80',
    theme: {
      canvas: '#F5EFEA',
      surface: '#EBE0D6',
      card: '#FAF6F0',
      wave: '#8C6246',
      accent: '#5C3A21',
      darkBtn: '#2B1D14',
      textInk: '#211710',
    },
    garnishes: [
      {
        id: 'bt-g1',
        label: 'Dark Cocoa Nibs',
        image_url:
          'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=220&q=80',
        position: 'top-left',
        rotate: -15,
      },
      {
        id: 'bt-g2',
        label: 'Roasted Hazelnut',
        image_url:
          'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=220&q=80',
        position: 'bottom-left',
        rotate: 20,
      },
      {
        id: 'bt-g3',
        label: 'Truffle Rosette',
        image_url:
          'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=220&q=80',
        position: 'top-right',
        rotate: 14,
      },
    ],
    customizerOptions: createBanglaCustomizerTiles('opt-sponge-choc'),
    steps: DEFAULT_JOURNEY_STEPS,
  },
  {
    id: 'blueberry-lavender-mist',
    name: 'Blueberry Lavender Mist',
    heroTitleLines: ['Blueberry Lavender', 'Mist'],
    category: 'Cupcake',
    badge: 'Gift Box',
    shortDescription:
      'Wild Blueberry Compote ও Smooth Vanilla Buttercream-এর দারুণ Combination।',
    fullDescription:
      'হাতে Pipe করা 6 pcs Artisanal Cupcake — ভেতরে Wild Blueberry Compote আর উপরে Smooth French Vanilla Buttercream Swirl।',
    ingredientsStory:
      'Wild blueberry heart filling, organic buttermilk vanilla crumb, silky Swiss meringue buttercream swirled with a delicate floral lavender mist.',
    chefNote:
      'Gift দেওয়ার জন্য বা Tea-Time Treat-এর জন্য সেরা — প্রতিটি Cupcake আলাদাভাবে Hand-Piped।',
    servings: '6 pcs Luxury Box',
    sweetnessLevel: 3,
    textureProfile: 'Fluffy Crumb & Creamy Swirl',
    dietaryTags: ['100% Halal', 'Hand-Piped Fresh', 'Gift Ready'],
    allergens: 'Dairy, Eggs, Wheat',
    storageTip:
      'Airtight বক্সে রুম টেম্পারেচারে 24 ঘণ্টা বা ফ্রিজে 3 দিন পর্যন্ত তাজা থাকবে।',
    basePrice: 650,
    rating: 4.9,
    reviewsCount: 214,
    prepMins: 30,
    prepTime: '30 mins prep',
    weight: '6 pcs Box',
    calories: '260 kcal',
    isHeroFlavor: true,
    image_url:
      'https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&w=800&q=80',
    theme: {
      canvas: '#F3F0F8',
      surface: '#E6E0F2',
      card: '#FAF6F0',
      wave: '#6D689E',
      accent: '#4A3B69',
      darkBtn: '#27243D',
      textInk: '#1B1828',
    },
    garnishes: [
      {
        id: 'bl-g1',
        label: 'Wild Blueberry',
        image_url:
          'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=220&q=80',
        position: 'top-left',
        rotate: -18,
      },
      {
        id: 'bl-g2',
        label: 'Blackberry',
        image_url:
          'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=220&q=80',
        position: 'bottom-left',
        rotate: 16,
      },
      {
        id: 'bl-g3',
        label: 'Lavender',
        image_url:
          'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=220&q=80',
        position: 'top-right',
        rotate: 10,
      },
    ],
    customizerOptions: createBanglaCustomizerTiles('opt-sponge-vanilla'),
    steps: DEFAULT_JOURNEY_STEPS,
  },
  {
    id: 'pistachio-rose-delight',
    name: 'Pistachio Rose Delight',
    heroTitleLines: ['Pistachio Rose', 'Delight'],
    category: 'Sugar-Free',
    badge: 'Guilt-Free',
    shortDescription:
      'Roasted Pistachio বাদাম ও প্রাকৃতিক Dates-এর মিষ্টিতে তৈরি Sugar-Free কেক।',
    fullDescription:
      'কোনো চিনি ছাড়াই Roasted Pistachio বাদাম, খাঁটি Almond Flour ও প্রাকৃতিক খেজুরের মিষ্টিতে তৈরি Guilt-Free Rosewater Cake।',
    ingredientsStory:
      'Roasted Iranian pistachios, pure blanched almond flour, Medjool date natural sweetness, distilled organic rosewater, and light whipped cream.',
    chefNote:
      'স্বাস্থ্য সচেতন ও ডায়াবেটিস-ফ্রেন্ডলি ক্রেতাদের জন্য Refined Sugar ছাড়াই তৈরি — স্বাদে কোনো ছাড় নেই।',
    servings: '4–5 জন (5 Slices)',
    sweetnessLevel: 2,
    textureProfile: 'Nutty, Moist & Aromatic',
    dietaryTags: ['Zero Added Sugar', '100% Halal', 'Almond Flour'],
    allergens: 'Tree Nuts (Pistachio, Almond), Dairy',
    storageTip:
      'ফ্রিজে সংরক্ষণ করুন এবং হালকা ঠান্ডা অবস্থায় উপভোগ করুন।',
    basePrice: 1050,
    rating: 4.5,
    reviewsCount: 196,
    prepMins: 45,
    prepTime: '45 mins prep',
    weight: '0.5 kg',
    calories: '195 kcal',
    isHeroFlavor: false,
    image_url:
      'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=800&q=80',
    theme: {
      canvas: '#EFF6F1',
      surface: '#E0EDE4',
      card: '#FAF6F0',
      wave: '#7BB08E',
      accent: '#233329',
      darkBtn: '#233329',
      textInk: '#16221A',
    },
    garnishes: [
      {
        id: 'pr-g1',
        label: 'Pistachio Nuts',
        image_url:
          'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=220&q=80',
        position: 'top-left',
        rotate: -16,
      },
      {
        id: 'pr-g2',
        label: 'Rose Petals',
        image_url:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=220&q=80',
        position: 'bottom-left',
        rotate: 14,
      },
      {
        id: 'pr-g3',
        label: 'Milk Cream',
        image_url:
          'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=220&q=80',
        position: 'top-right',
        rotate: 19,
      },
    ],
    customizerOptions: createBanglaCustomizerTiles('opt-sponge-vanilla'),
    steps: DEFAULT_JOURNEY_STEPS,
  },
  {
    id: 'classic-caramel-bento',
    name: 'Classic Caramel Bento',
    heroTitleLines: ['Classic Caramel', 'Bento'],
    category: 'Bento Cake',
    badge: 'Trending',
    shortDescription:
      'Salted Golden Caramel Drip ও Crunchy Hazelnut Praline দেওয়া Mini Bento Cake।',
    fullDescription:
      'Cute Korean Style Lunchbox Bento Cake — Salted Golden Caramel Drip, Crunchy Hazelnut Praline এবং আপনার পছন্দের Custom Message।',
    ingredientsStory:
      'Slow-cooked sea-salted golden caramel, velvety butter vanilla sponge, roasted hazelnut praline crunch, and signature pastel frosting inside an eco bento box.',
    chefNote:
      'সারপ্রাইজ গিফট বা স্পেশাল মেসেজের জন্য পারফেক্ট — সাথে পাচ্ছেন ফ্রি স্পুন ও মিনি ক্যান্ডেল।',
    servings: '2–3 জন (Lunchbox Bento)',
    sweetnessLevel: 4,
    textureProfile: 'Creamy, Gooey & Crunchy',
    dietaryTags: ['100% Halal', 'Free Custom Message', 'Freshly Baked'],
    allergens: 'Dairy, Eggs, Wheat, Hazelnuts',
    storageTip:
      'বক্সসহ ফ্রিজে রাখুন এবং সারপ্রাইজের 10 মিনিট আগে বের করে পরিবেশন করুন।',
    basePrice: 480,
    originalPrice: 600,
    rating: 4.8,
    reviewsCount: 512,
    prepMins: 25,
    prepTime: '25 mins prep',
    weight: '400g',
    calories: '240 kcal',
    isHeroFlavor: false,
    image_url:
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80',
    theme: {
      canvas: '#FDF6EC',
      surface: '#F7E8D4',
      card: '#FAF6F0',
      wave: '#D99B52',
      accent: '#B45309',
      darkBtn: '#2D2114',
      textInk: '#21180E',
    },
    garnishes: [
      {
        id: 'cc-g1',
        label: 'Caramel Drip',
        image_url:
          'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=220&q=80',
        position: 'top-left',
        rotate: -12,
      },
      {
        id: 'cc-g2',
        label: 'Hazelnut',
        image_url:
          'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=220&q=80',
        position: 'bottom-left',
        rotate: 15,
      },
      {
        id: 'cc-g3',
        label: 'Vanilla Cream',
        image_url:
          'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=220&q=80',
        position: 'top-right',
        rotate: 10,
      },
    ],
    customizerOptions: createBanglaCustomizerTiles('opt-sponge-vanilla'),
    steps: DEFAULT_JOURNEY_STEPS,
  },
];

export const HERO_CAKES = CAKES_DATA.filter((cake) => cake.isHeroFlavor);
