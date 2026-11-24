import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Phone,
  MapPin,
  User,
  Send,
  Tag,
  Truck,
  Clock,
  Mail,
  Calendar,
  Store,
  CreditCard,
  Search,
  ChevronLeft,
  AlertCircle,
  FileText,
  PackageCheck,
} from 'lucide-react';
import {
  CartItem,
  OrderReceipt,
  OrderType,
  OrderTrackingResult,
  OrderStatus,
  submitValidatedOrderToSupabase,
  trackOrderByCode,
} from '../lib/supabase';
import { storeConfig } from '../config/storeConfig';
import { SiteContent } from '../config/siteContent';
import { getAdaptiveImageUrl } from '../utils/cacheEngine';

export interface CartDrawerProps {
  siteContent: SiteContent;
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onUpdateItemMessage: (cartItemId: string, msg: string) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  promoCode: string;
  onChangePromoCode: (code: string) => void;
  isMobileLocked?: boolean;
}

const BD_PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIME_WINDOWS = [
  '10:00 AM – 01:00 PM',
  '01:00 PM – 04:00 PM',
  '04:00 PM – 07:00 PM',
  '07:00 PM – 10:00 PM',
];

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pending Confirmation', color: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', color: 'bg-sky-100 text-sky-800' },
  preparing: { label: 'Baking & Preparing', color: 'bg-purple-100 text-purple-800' },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'bg-indigo-100 text-indigo-800' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-900' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800' },
};

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ord-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s()-]/g, '').trim();
  if (cleaned.startsWith('+8801')) return cleaned.slice(3);
  if (cleaned.startsWith('8801')) return cleaned.slice(2);
  return cleaned;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  siteContent,
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onUpdateItemMessage,
  onRemoveItem,
  onClearCart,
  promoCode,
  onChangePromoCode,
  isMobileLocked = false,
}) => {
  const deliveryEnabled = siteContent.deliveryEnabled !== false;
  const pickupEnabled = siteContent.pickupEnabled !== false;
  const acceptingOrders = siteContent.acceptingOrders !== false;

  const [activeMode, setActiveMode] = useState<'bag' | 'track'>('bag');
  const [checkoutStep, setCheckoutStep] = useState<'edit' | 'review'>('edit');

  // Order Type
  const [orderType, setOrderType] = useState<OrderType>(() =>
    deliveryEnabled ? 'delivery' : 'pickup'
  );

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAltPhone, setCustomerAltPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Delivery / Pickup Info
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState(
    siteContent.city || storeConfig.city
  );
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => getTodayIso());
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState(TIME_WINDOWS[1]);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Cake Inscription & Payment
  const [cakeInscription, setCakeInscription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash on Delivery');

  // Submission & Idempotency State
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    generateIdempotencyKey()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Order Tracking State (Zero customer login required)
  const [trackCode, setTrackCode] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackResult, setTrackResult] = useState<OrderTrackingResult | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Regenerate idempotency key when cart composition changes
  const cartSignature = useMemo(
    () =>
      items
        .map((i) => `${i.cartItemId}:${i.quantity}:${i.cakeMessage}`)
        .join('|') + `::${promoCode}::${orderType}`,
    [items, promoCode, orderType]
  );

  useEffect(() => {
    setIdempotencyKey(generateIdempotencyKey());
  }, [cartSignature]);

  useEffect(() => {
    if (orderType === 'pickup' && paymentMethod === 'Cash on Delivery') {
      setPaymentMethod('Pay at Pickup');
    } else if (orderType === 'delivery' && paymentMethod === 'Pay at Pickup') {
      setPaymentMethod('Cash on Delivery');
    }
  }, [orderType, paymentMethod]);

  const baseSubtotal = items.reduce(
    (sum, item) => sum + item.basePrice * item.quantity,
    0
  );
  const addonsTotal = items.reduce((sum, item) => {
    const addonUnit =
      typeof item.addonsUnitPrice === 'number'
        ? item.addonsUnitPrice
        : Math.max(0, item.unitPrice - item.basePrice);
    return sum + addonUnit * item.quantity;
  }, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const matchedOffer = (siteContent.offers || []).find(
    (o) =>
      o.isActive &&
      o.promoCode.trim().toUpperCase() === promoCode.trim().toUpperCase()
  );
  const isPromoActive =
    Boolean(matchedOffer) ||
    (promoCode.trim() !== '' &&
      promoCode.trim().toUpperCase() === siteContent.promoCode.toUpperCase());
  const appliedDiscountPercent = matchedOffer
    ? matchedOffer.discountPercent
    : siteContent.promoDiscountPercent;
  const discount = isPromoActive
    ? Math.round((subtotal * appliedDiscountPercent) / 100)
    : 0;

  const afterDiscount = Math.max(0, subtotal - discount);
  const freeThreshold = siteContent.freeDeliveryMin ?? storeConfig.freeDeliveryMin;
  const remainingForFreeDelivery = Math.max(0, freeThreshold - afterDiscount);
  const freeDeliveryProgress = Math.min(
    100,
    Math.round((afterDiscount / Math.max(1, freeThreshold)) * 100)
  );

  const deliveryFee =
    items.length === 0 || orderType === 'pickup'
      ? 0
      : remainingForFreeDelivery === 0
      ? 0
      : siteContent.deliveryFee ?? storeConfig.deliveryFee;

  const grandTotal = afterDiscount + deliveryFee;
  const currency = siteContent.currency || storeConfig.currency;
  const brandName = siteContent.brandName || storeConfig.brandName;
  const city = siteContent.city || storeConfig.city;
  const whatsappNumber = siteContent.whatsappNumber || storeConfig.whatsappNumber;
  const todayIso = getTodayIso();

  const validateCheckoutForm = (): string | null => {
    if (!acceptingOrders) {
      return 'The bakery is currently paused and not accepting new orders.';
    }
    if (items.length === 0) {
      return 'Your order bag is empty.';
    }
    if (customerName.trim().length < 2) {
      return 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (Full Name required).';
    }
    const cleanPhone = normalizePhone(customerPhone);
    if (!BD_PHONE_REGEX.test(cleanPhone)) {
      return siteContent.phoneErrorText;
    }
    if (customerAltPhone.trim()) {
      const cleanAlt = normalizePhone(customerAltPhone);
      if (!BD_PHONE_REGEX.test(cleanAlt)) {
        return 'Alternative mobile number must be a valid 11-digit BD number.';
      }
    }
    if (customerEmail.trim() && !EMAIL_REGEX.test(customerEmail.trim())) {
      return 'Please enter a valid email address or leave it blank.';
    }
    if (orderType === 'delivery') {
      if (deliveryAddress.trim().length < 5) {
        return 'অনুগ্রহ করে আপনার সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন (House, Road, Floor).';
      }
      if (!deliveryCity.trim()) {
        return 'Please enter your District / City.';
      }
      if (!deliveryArea.trim()) {
        return 'Please enter your Area / Locality (e.g., Dhanmondi, Mirpur, Meherpur Sadar).';
      }
    }
    if (!deliveryDate || deliveryDate < todayIso) {
      return 'Please select today or a future delivery/pickup date.';
    }
    if (!deliveryTimeWindow) {
      return 'Please select a preferred time window.';
    }
    return null;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateCheckoutForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setCheckoutStep('review');
  };

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    const err = validateCheckoutForm();
    if (err) {
      setFormError(err);
      setCheckoutStep('edit');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const cleanPhone = normalizePhone(customerPhone);
      const cleanAltPhone = customerAltPhone.trim()
        ? normalizePhone(customerAltPhone)
        : undefined;

      const combinedInscription =
        cakeInscription.trim() ||
        items
          .map((i) => i.cakeMessage)
          .filter(Boolean)
          .join(' | ') ||
        'স্ট্যান্ডার্ড গার্নিশ';

      const result = await submitValidatedOrderToSupabase({
        store_slug: storeConfig.storeSlug,
        idempotency_key: idempotencyKey,
        order_type: orderType,
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        customer_alt_phone: cleanAltPhone,
        customer_email: customerEmail.trim() || undefined,
        delivery_address:
          orderType === 'pickup'
            ? siteContent.storeAddress || `Store Pickup — ${city}`
            : deliveryAddress.trim(),
        delivery_city: deliveryCity.trim() || city,
        delivery_area:
          orderType === 'pickup' ? 'Store Pickup' : deliveryArea.trim(),
        delivery_postal_code: deliveryPostalCode.trim() || undefined,
        delivery_date: deliveryDate,
        delivery_time_window: deliveryTimeWindow,
        delivery_instructions: deliveryInstructions.trim() || undefined,
        cake_inscription: combinedInscription,
        promo_code: isPromoActive ? promoCode.trim().toUpperCase() : undefined,
        payment_method: paymentMethod,
        items,
      });

      if (!result.ok || !result.receipt) {
        setFormError(
          result.error ||
            'Order could not be confirmed on the server. Please try again.'
        );
        return;
      }

      setReceipt(result.receipt);
      setCheckoutStep('edit');
      setIdempotencyKey(generateIdempotencyKey());
      onClearCart();
    } catch {
      setFormError(
        'Connection interrupted before order confirmation. Please retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim() || !trackPhone.trim()) {
      setTrackError('Please enter both your Order ID and Mobile Number.');
      return;
    }
    setIsTracking(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const found = await trackOrderByCode(
        trackCode.trim().toUpperCase(),
        normalizePhone(trackPhone)
      );
      if (!found) {
        setTrackError(
          'No matching order found. Please verify your Order ID and Mobile Number.'
        );
      } else {
        setTrackResult(found);
      }
    } finally {
      setIsTracking(false);
    }
  };

  const handleCloseDrawer = () => {
    setReceipt(null);
    setFormError(null);
    setCheckoutStep('edit');
    onClose();
  };

  const buildWhatsAppUrl = (rec: OrderReceipt) => {
    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
    const lines = [
      `🎂 *নতুন অর্ডার ${rec.order_id} — ${brandName}*`,
      `📦 ধরন: ${rec.order_type === 'pickup' ? 'Store Pickup' : 'Home Delivery'}`,
      `👤 ক্রেতা: ${rec.customer_name} (${rec.customer_phone})`,
      `🏠 ঠিকানা: ${rec.delivery_address}`,
      rec.delivery_date
        ? `📅 তারিখ ও সময়: ${rec.delivery_date} (${rec.delivery_time_window || ''})`
        : '',
      `💳 পেমেন্ট: ${rec.payment_method}`,
      `✨ কেকের লেখা: "${rec.cake_inscription}"`,
      '',
      '*অর্ডার আইটেম:*',
      ...rec.items.map(
        (i) =>
          `• ${i.quantity}x ${i.name}${
            i.selectedOptionNames.length > 0
              ? ` [${i.selectedOptionNames.join(', ')}]`
              : ''
          } (${currency}${(i.unitPrice * i.quantity).toLocaleString('en-US')})`
      ),
      '',
      `*সর্বমোট বিল: ${currency}${rec.total_amount.toLocaleString('en-US')}*`,
    ].filter(Boolean);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      lines.join('\n')
    )}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex ${
            isMobileLocked
              ? 'items-end justify-center'
              : 'items-end md:items-stretch justify-center md:justify-end'
          }`}
        >
          {/* Glassmorphic Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseDrawer}
            className="fixed inset-0 bg-stone-950/45 backdrop-blur-md"
          />

          {/* Slide-Up Mobile Bottom Sheet / Desktop Right Slide-Over Drawer */}
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`relative z-10 bg-[#FAF6F0]/95 backdrop-blur-2xl border-t md:border-l border-white/80 shadow-2xl flex flex-col ${
              isMobileLocked
                ? 'w-full max-w-[430px] max-h-[93dvh] rounded-t-[32px]'
                : 'w-full max-h-[93dvh] rounded-t-[32px] md:max-h-none md:h-full md:w-[460px] md:rounded-t-none md:rounded-l-[32px]'
            } overflow-hidden`}
          >
            {/* Top Drag Handle on Mobile */}
            <div
              className={`${
                isMobileLocked ? 'flex' : 'flex md:hidden'
              } justify-center pt-2.5 pb-1 shrink-0`}
            >
              <span className="w-11 h-1.5 rounded-full bg-stone-300" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-stone-200/80 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center shadow-xs chromatic-transition shrink-0"
                >
                  {activeMode === 'track' ? (
                    <PackageCheck className="w-4 h-4" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-extrabold text-stone-900 leading-[1.3] truncate">
                    {activeMode === 'track'
                      ? 'Track Order'
                      : checkoutStep === 'review' && !receipt
                      ? 'Review Your Order'
                      : siteContent.cartTitle}
                  </h2>
                  <p className="text-[11px] font-semibold text-stone-500 truncate">
                    {brandName} • {city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!receipt && (
                  <div className="flex items-center bg-stone-200/70 rounded-full p-0.5 text-[10px] font-extrabold">
                    <button
                      type="button"
                      onClick={() => setActiveMode('bag')}
                      className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                        activeMode === 'bag'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600'
                      }`}
                    >
                      Bag ({items.reduce((s, i) => s + i.quantity, 0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMode('track')}
                      className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                        activeMode === 'track'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600'
                      }`}
                    >
                      Track
                    </button>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCloseDrawer}
                  aria-label="ব্যাগ বন্ধ করুন"
                  className="w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Free Delivery Progress Bar */}
            {activeMode === 'bag' &&
              !receipt &&
              items.length > 0 &&
              orderType === 'delivery' && (
                <div className="px-5 py-2 bg-white/80 border-b border-stone-200/60 shrink-0">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700 mb-1">
                    <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {remainingForFreeDelivery > 0
                        ? `আরও ${currency}${remainingForFreeDelivery.toLocaleString(
                            'en-US'
                          )} যোগ করলে Free Delivery পাবেন!`
                        : 'অভিনন্দন! আপনি Free Home Delivery পাচ্ছেন 🎉'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${freeDeliveryProgress}%` }}
                      transition={{ duration: 0.35 }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </div>
              )}

            {/* Scrollable Center Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 sm:p-5 space-y-3.5">
              {/* TRACK ORDER TAB */}
              {activeMode === 'track' ? (
                <div className="space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                  <form
                    onSubmit={handleTrackOrder}
                    className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-3"
                  >
                    <p className="text-xs font-semibold text-stone-600">
                      Enter your Order ID and Mobile Number to check your live baking & delivery status — no account required.
                    </p>
                    <input
                      type="text"
                      value={trackCode}
                      onChange={(e) => setTrackCode(e.target.value)}
                      placeholder="Order ID (e.g., SC-842910)"
                      className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 px-3.5 py-2.5 text-[15px] font-bold uppercase text-stone-800 placeholder:normal-case placeholder:font-medium placeholder:text-stone-400 focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={trackPhone}
                      onChange={(e) => setTrackPhone(e.target.value)}
                      placeholder="Mobile Number (e.g., 017XXXXXXXX)"
                      className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 px-3.5 py-2.5 text-[15px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
                    />
                    {trackError && (
                      <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{trackError}</span>
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={isTracking}
                      style={{ backgroundColor: 'var(--dark-btn)' }}
                      className="w-full rounded-full py-3 px-4 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isTracking ? 'Checking Status...' : 'Check Order Status'}</span>
                    </button>
                  </form>

                  {trackResult && (
                    <div className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-extrabold text-sm text-stone-900">
                          {trackResult.order_code}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                            STATUS_LABELS[trackResult.status]?.color ||
                            'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {STATUS_LABELS[trackResult.status]?.label ||
                            trackResult.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF6F0] rounded-2xl p-3">
                        <div>
                          <span className="text-stone-400 block text-[10px] font-bold">
                            Type
                          </span>
                          <span className="font-bold text-stone-800 capitalize">
                            {trackResult.order_type}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px] font-bold">
                            Total
                          </span>
                          <span className="font-extrabold text-stone-900 tabular-nums">
                            {currency}{' '}
                            {Number(trackResult.total_amount).toLocaleString('en-US')}
                          </span>
                        </div>
                        {trackResult.delivery_date && (
                          <div className="col-span-2">
                            <span className="text-stone-400 block text-[10px] font-bold">
                              Scheduled Slot
                            </span>
                            <span className="font-bold text-stone-800">
                              {trackResult.delivery_date} •{' '}
                              {trackResult.delivery_time_window || 'Standard'}
                            </span>
                          </div>
                        )}
                      </div>

                      {Array.isArray(trackResult.status_history) &&
                        trackResult.status_history.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <p className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wide">
                              Status Timeline
                            </p>
                            {trackResult.status_history.map((h, i) => (
                              <div
                                key={`${h.status}-${i}`}
                                className="flex items-start gap-2.5 text-xs"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-stone-800 capitalize">
                                    {h.status.replace(/_/g, ' ')}
                                  </p>
                                  {h.note && (
                                    <p className="text-[11px] text-stone-500">
                                      {h.note}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-stone-400">
                                    {new Date(h.at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ) : receipt ? (
                /* SERVER-VERIFIED CELEBRATORY ORDER RECEIPT */
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[28px] p-5 shadow-md border-[1px] border-stone-100 text-center space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative overflow-hidden"
                >
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, idx) => (
                      <motion.span
                        key={deg}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: [0, 1.2, 0.9],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: idx * 0.08,
                          ease: 'easeOut',
                        }}
                        style={{
                          transform: `rotate(${deg}deg) translateY(-38px)`,
                          backgroundColor:
                            idx % 3 === 0
                              ? '#10B981'
                              : idx % 3 === 1
                              ? '#F59E0B'
                              : '#EC4899',
                        }}
                        className="absolute w-1.5 h-3.5 rounded-full"
                      />
                    ))}
                    <motion.div
                      initial={{ scale: 0.4, rotate: -25 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                      className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-[4px] border-emerald-100"
                    >
                      <CheckCircle2 className="w-9 h-9 stroke-[2.4]" />
                    </motion.div>
                  </div>

                  <div>
                    <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold px-3 py-1 mb-1.5">
                      অর্ডার আইডি: {receipt.order_id}
                    </span>
                    <h3 className="font-display text-xl font-extrabold text-stone-900 leading-[1.4]">
                      {siteContent.successTitle}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {siteContent.successSubtitle}
                    </p>
                  </div>

                  <div className="bg-[#FAF6F0] rounded-[22px] p-3.5 text-left text-xs space-y-2 border border-stone-200/60">
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 font-medium">ক্রেতা:</span>
                      <span className="font-bold text-stone-900 text-right">
                        {receipt.customer_name}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 font-medium">মোবাইল:</span>
                      <span className="font-bold text-stone-900 tabular-nums">
                        {receipt.customer_phone}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 font-medium">ধরন:</span>
                      <span className="font-bold text-stone-900 capitalize">
                        {receipt.order_type === 'pickup'
                          ? 'Store Pickup'
                          : 'Home Delivery'}
                      </span>
                    </div>
                    {receipt.delivery_date && (
                      <div className="flex justify-between gap-2">
                        <span className="text-stone-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>সময়সূচি:</span>
                        </span>
                        <span className="font-bold text-emerald-700 text-right">
                          {receipt.delivery_date} • {receipt.delivery_time_window}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 font-medium">পেমেন্ট:</span>
                      <span className="font-bold text-stone-900">
                        {receipt.payment_method}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 font-medium">
                        কেকের লেখা:
                      </span>
                      <span className="font-bold text-stone-900 truncate max-w-[190px]">
                        &ldquo;{receipt.cake_inscription}&rdquo;
                      </span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
                      <span>{siteContent.grandTotalLabel} (Verified):</span>
                      <span className="tabular-nums">
                        {currency}{' '}
                        {Number(receipt.total_amount).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <a
                      href={buildWhatsAppUrl(receipt)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: 'var(--dark-btn)' }}
                      className="w-full rounded-full py-3.5 px-4 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{siteContent.whatsappBtn}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setTrackCode(receipt.order_id);
                        setTrackPhone(receipt.customer_phone);
                        setReceipt(null);
                        setActiveMode('track');
                      }}
                      className="w-full rounded-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold cursor-pointer"
                    >
                      Track Order {receipt.order_id}
                    </button>

                    <button
                      onClick={handleCloseDrawer}
                      className="w-full rounded-full py-2.5 px-4 bg-stone-200/70 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
                    >
                      {siteContent.continueBtn}
                    </button>
                  </div>
                </motion.div>
              ) : items.length === 0 ? (
                <div className="py-14 text-center space-y-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                  <div className="w-16 h-16 rounded-full bg-[#EFE9E0] mx-auto flex items-center justify-center text-stone-500">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-stone-800 leading-[1.4]">
                    {siteContent.emptyCartText}
                  </h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    {siteContent.emptyCartSubtext}
                  </p>
                </div>
              ) : checkoutStep === 'review' ? (
                /* STEP 2: COMPLETE ORDER REVIEW SCREEN */
                <div className="space-y-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStep('edit');
                      setFormError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-stone-700 hover:text-stone-950 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Edit Cart & Delivery Details</span>
                  </button>

                  {/* Customer & Schedule Summary */}
                  <div className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-2 text-xs">
                    <h4 className="font-display font-extrabold text-stone-900 text-sm">
                      Customer & Schedule
                    </h4>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
                      <span className="text-stone-500">Name</span>
                      <span className="font-bold text-stone-900 text-right">
                        {customerName}
                      </span>
                      <span className="text-stone-500">Mobile</span>
                      <span className="font-bold text-stone-900 text-right tabular-nums">
                        {normalizePhone(customerPhone)}
                      </span>
                      {customerAltPhone && (
                        <>
                          <span className="text-stone-500">Alt Phone</span>
                          <span className="font-bold text-stone-900 text-right tabular-nums">
                            {normalizePhone(customerAltPhone)}
                          </span>
                        </>
                      )}
                      {customerEmail && (
                        <>
                          <span className="text-stone-500">Email</span>
                          <span className="font-bold text-stone-900 text-right truncate">
                            {customerEmail}
                          </span>
                        </>
                      )}
                      <span className="text-stone-500">Order Type</span>
                      <span className="font-bold text-stone-900 text-right">
                        {orderType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
                      </span>
                      <span className="text-stone-500">Date & Slot</span>
                      <span className="font-bold text-emerald-700 text-right">
                        {deliveryDate} • {deliveryTimeWindow}
                      </span>
                      <span className="text-stone-500">Payment</span>
                      <span className="font-bold text-stone-900 text-right">
                        {paymentMethod}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-stone-100">
                      <span className="text-stone-500 block text-[11px] mb-0.5">
                        {orderType === 'pickup' ? 'Pickup Address' : 'Delivery Address'}
                      </span>
                      <p className="font-bold text-stone-900 leading-relaxed">
                        {orderType === 'pickup'
                          ? siteContent.storeAddress || `Store Pickup — ${city}`
                          : `${deliveryAddress}, ${deliveryArea}, ${deliveryCity}${
                              deliveryPostalCode ? ` - ${deliveryPostalCode}` : ''
                            }`}
                      </p>
                      {deliveryInstructions && (
                        <p className="text-[11px] text-stone-500 mt-1">
                          Note: {deliveryInstructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items Review */}
                  <div className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-2.5">
                    <h4 className="font-display font-extrabold text-stone-900 text-sm">
                      Ordered Cakes ({items.reduce((s, i) => s + i.quantity, 0)})
                    </h4>
                    {items.map((item) => (
                      <div
                        key={item.cartItemId}
                        className="flex items-start justify-between gap-2.5 pb-2 border-b last:border-b-0 last:pb-0 border-stone-100 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-extrabold text-stone-900">
                            {item.quantity}× {item.name}
                          </p>
                          {item.selectedOptionNames.length > 0 && (
                            <p className="text-[11px] text-stone-500">
                              {item.selectedOptionNames.join(' • ')}
                            </p>
                          )}
                          {item.cakeMessage && (
                            <p className="text-[11px] text-amber-700 font-semibold">
                              Cake Message: &ldquo;{item.cakeMessage}&rdquo;
                            </p>
                          )}
                          {item.specialInstructions && (
                            <p className="text-[11px] text-stone-500 italic">
                              Special note: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <span className="font-extrabold text-stone-900 tabular-nums shrink-0">
                          {currency}{' '}
                          {(item.unitPrice * item.quantity).toLocaleString('en-US')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {formError && (
                    <div className="rounded-2xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 1: CART ITEMS + CUSTOMER & DELIVERY DETAILS FORM */
                <>
                  {!acceptingOrders && (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs font-bold text-amber-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Ordering is temporarily paused by the bakery. Your cart is saved.
                      </span>
                    </div>
                  )}

                  {/* Itemized Cake List */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <motion.div
                        layout
                        key={item.cartItemId}
                        className="bg-white rounded-[24px] p-3.5 shadow-xs border border-stone-100 space-y-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getAdaptiveImageUrl(item.image_url, 'thumb')}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="w-16 h-16 rounded-full object-cover border-[2px] border-[#FAF6F0] shadow-xs shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-display font-extrabold text-sm text-stone-900 truncate">
                                {item.name}
                              </h4>
                              <button
                                onClick={() => onRemoveItem(item.cartItemId)}
                                aria-label="আইটেম বাদ দিন"
                                className="text-stone-400 hover:text-rose-500 cursor-pointer p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {item.selectedOptionNames.length > 0 && (
                              <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">
                                {item.selectedOptionNames.join(' • ')}
                              </p>
                            )}

                            {item.specialInstructions && (
                              <p className="text-[10px] text-amber-700 font-semibold line-clamp-1 mt-0.5">
                                Note: {item.specialInstructions}
                              </p>
                            )}

                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-bold text-sm text-stone-900 tabular-nums">
                                {currency}{' '}
                                {(item.unitPrice * item.quantity).toLocaleString(
                                  'en-US'
                                )}
                              </span>

                              {/* Capsule Quantity Steppers */}
                              <div className="flex items-center gap-2 bg-[#FAF6F0] rounded-full px-2 py-1 border border-stone-200/70">
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() =>
                                    onUpdateQuantity(item.cartItemId, -1)
                                  }
                                  aria-label="পরিমাণ কমান"
                                  className="w-7 h-7 rounded-full bg-white text-stone-800 flex items-center justify-center shadow-2xs cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </motion.button>
                                <span className="text-xs font-extrabold text-stone-900 min-w-[16px] text-center tabular-nums">
                                  {item.quantity}
                                </span>
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() =>
                                    onUpdateQuantity(item.cartItemId, 1)
                                  }
                                  aria-label="পরিমাণ বাড়ান"
                                  style={{ backgroundColor: 'var(--dark-btn)' }}
                                  className="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-2xs cursor-pointer chromatic-transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={item.cakeMessage}
                          onChange={(e) =>
                            onUpdateItemMessage(item.cartItemId, e.target.value)
                          }
                          placeholder={siteContent.cakeMessagePlaceholder}
                          className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/70 px-3 py-2 text-[14px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white"
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Global Cake Inscription + Promo Code */}
                  <div className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{siteContent.cakeMessageLabel}</span>
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
                        {siteContent.freePipingBadge}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={60}
                      value={cakeInscription}
                      onChange={(e) => setCakeInscription(e.target.value)}
                      placeholder={siteContent.cakeMessagePlaceholder}
                      className="w-full rounded-[16px] bg-[#FAF6F0] border border-stone-200/80 px-3.5 py-2.5 text-[14px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-800/15"
                    />

                    {/* Promo Code Pill */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => onChangePromoCode(e.target.value)}
                          placeholder={`Promo Code (${siteContent.promoCode})`}
                          className="w-full rounded-full bg-[#FAF6F0] border border-stone-200/80 pl-8 pr-3 py-2 text-[14px] font-bold uppercase text-stone-800 placeholder:normal-case placeholder:font-medium placeholder:text-stone-400 focus:outline-none"
                        />
                      </div>
                      {!isPromoActive && siteContent.promoCode && (
                        <button
                          type="button"
                          onClick={() =>
                            onChangePromoCode(siteContent.promoCode)
                          }
                          className="rounded-full bg-stone-900 text-white px-3.5 py-2 text-xs font-extrabold cursor-pointer shrink-0"
                        >
                          Apply {siteContent.promoCode}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Professional Customer & Delivery Checkout Form */}
                  <form
                    id="checkout-form"
                    onSubmit={handleProceedToReview}
                    className="space-y-3"
                  >
                    {/* Order Type Selector */}
                    {(deliveryEnabled || pickupEnabled) && (
                      <div className="bg-white rounded-[24px] p-3.5 shadow-xs border border-stone-100">
                        <span className="block text-[11px] font-extrabold text-stone-500 uppercase tracking-wide mb-2">
                          Order Type
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {deliveryEnabled && (
                            <button
                              type="button"
                              onClick={() => setOrderType('delivery')}
                              className={`rounded-2xl py-2.5 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                orderType === 'delivery'
                                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                  : 'bg-[#FAF6F0] text-stone-700 border-stone-200'
                              }`}
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Home Delivery</span>
                            </button>
                          )}
                          {pickupEnabled && (
                            <button
                              type="button"
                              onClick={() => setOrderType('pickup')}
                              className={`rounded-2xl py-2.5 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                orderType === 'pickup'
                                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                  : 'bg-[#FAF6F0] text-stone-700 border-stone-200'
                              }`}
                            >
                              <Store className="w-3.5 h-3.5" />
                              <span>Store Pickup</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Customer Information Card */}
                    <div className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-2.5">
                      <h4 className="font-display text-xs font-extrabold text-stone-700">
                        Customer Information
                      </h4>

                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            if (formError) setFormError(null);
                          }}
                          placeholder="Full Name *"
                          className="w-full rounded-[15px] bg-[#FAF6F0] border border-stone-200/80 pl-10 pr-3.5 py-2.5 text-[15px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
                        />
                      </div>

                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            if (formError) setFormError(null);
                          }}
                          placeholder="Mobile Number * (01XXXXXXXXX)"
                          className="w-full rounded-[15px] bg-[#FAF6F0] border border-stone-200/80 pl-10 pr-3.5 py-2.5 text-[15px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={customerAltPhone}
                            onChange={(e) => setCustomerAltPhone(e.target.value)}
                            placeholder="Alt Phone (optional)"
                            className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 pl-9 pr-3 py-2 text-[14px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
                          />
                        </div>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="Email (optional)"
                            className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 pl-9 pr-3 py-2 text-[14px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delivery / Pickup Schedule & Address Card */}
                    <div className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-2.5">
                      <h4 className="font-display text-xs font-extrabold text-stone-700">
                        {orderType === 'pickup'
                          ? 'Pickup Schedule'
                          : `${siteContent.deliveryDetailsTitle} (${city})`}
                      </h4>

                      {orderType === 'delivery' ? (
                        <>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                            <textarea
                              rows={2}
                              required
                              value={deliveryAddress}
                              onChange={(e) => {
                                setDeliveryAddress(e.target.value);
                                if (formError) setFormError(null);
                              }}
                              placeholder="House, Road, Flat / Full Street Address *"
                              className="w-full rounded-[15px] bg-[#FAF6F0] border border-stone-200/80 pl-10 pr-3.5 py-2.5 text-[15px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              value={deliveryCity}
                              onChange={(e) => setDeliveryCity(e.target.value)}
                              placeholder="District / City *"
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 px-3 py-2 text-[14px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
                            />
                            <input
                              type="text"
                              required
                              value={deliveryArea}
                              onChange={(e) => setDeliveryArea(e.target.value)}
                              placeholder="Area / Locality *"
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 px-3 py-2 text-[14px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
                            />
                          </div>

                          <input
                            type="text"
                            value={deliveryPostalCode}
                            onChange={(e) => setDeliveryPostalCode(e.target.value)}
                            placeholder="Postal Code (optional)"
                            className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 px-3 py-2 text-[14px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
                          />
                        </>
                      ) : (
                        <div className="rounded-2xl bg-[#FAF6F0] border border-stone-200/70 p-3 text-xs text-stone-700">
                          <span className="font-extrabold block text-stone-900 mb-0.5">
                            Store Pickup Location
                          </span>
                          <span>
                            {siteContent.storeAddress || `${brandName}, ${city}`}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-extrabold text-stone-500 flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {orderType === 'pickup' ? 'Pickup Date *' : 'Delivery Date *'}
                            </span>
                          </label>
                          <input
                            type="date"
                            required
                            min={todayIso}
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 px-2.5 py-2 text-[13px] font-bold text-stone-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold text-stone-500 flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            <span>Time Window *</span>
                          </label>
                          <select
                            value={deliveryTimeWindow}
                            onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                            className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 px-2 py-2 text-[12px] font-bold text-stone-800 focus:outline-none"
                          >
                            {TIME_WINDOWS.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="relative">
                        <FileText className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={deliveryInstructions}
                          onChange={(e) => setDeliveryInstructions(e.target.value)}
                          placeholder="Delivery / Gate instructions (optional)"
                          className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/80 pl-9 pr-3 py-2 text-[14px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Payment Method Card */}
                    <div className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-2">
                      <h4 className="font-display text-xs font-extrabold text-stone-700 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Payment Method</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(orderType === 'pickup'
                          ? ['Pay at Pickup', 'bKash / Nagad at Pickup']
                          : ['Cash on Delivery', 'bKash / Nagad on Delivery']
                        ).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`rounded-2xl py-2 px-3 text-xs font-bold border text-left transition-all cursor-pointer ${
                              paymentMethod === method
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-[#FAF6F0] text-stone-700 border-stone-200'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formError && (
                      <div className="rounded-2xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>

            {/* Sticky Safe-Area Footer Bar */}
            {activeMode === 'bag' && !receipt && items.length > 0 && (
              <div className="shrink-0 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-xl border-t border-stone-200/80 space-y-2.5">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-stone-500 font-medium">
                    <span>{siteContent.subtotalLabel}</span>
                    <span className="tabular-nums font-bold text-stone-800">
                      {currency} {baseSubtotal.toLocaleString('en-US')}
                    </span>
                  </div>
                  {addonsTotal > 0 && (
                    <div className="flex justify-between text-stone-500 font-medium">
                      <span>Customizations & Add-ons</span>
                      <span className="tabular-nums font-bold text-stone-800">
                        +{currency} {addonsTotal.toLocaleString('en-US')}
                      </span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>
                        {siteContent.discountLabel} ({appliedDiscountPercent}%)
                      </span>
                      <span className="tabular-nums">
                        -{currency} {discount.toLocaleString('en-US')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-500 font-medium">
                    <span>
                      {orderType === 'pickup'
                        ? 'Pickup Fee'
                        : siteContent.deliveryLabel}
                    </span>
                    <span className="tabular-nums font-bold text-stone-800">
                      {deliveryFee === 0
                        ? siteContent.freeDeliveryText
                        : `${currency} ${deliveryFee.toLocaleString('en-US')}`}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-stone-200 flex justify-between items-baseline">
                    <span className="font-display text-sm font-extrabold text-stone-900">
                      {siteContent.grandTotalLabel}
                    </span>
                    <span className="font-bold text-xl text-stone-900 tabular-nums">
                      {currency} {grandTotal.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                {checkoutStep === 'edit' ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    form="checkout-form"
                    disabled={!acceptingOrders}
                    style={{ backgroundColor: 'var(--dark-btn)' }}
                    className="w-full rounded-full py-3.5 px-6 text-white font-display text-sm font-extrabold tracking-wide shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 chromatic-transition"
                  >
                    <span>
                      Review Order • {currency}{' '}
                      {grandTotal.toLocaleString('en-US')}
                    </span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || !acceptingOrders}
                    style={{ backgroundColor: 'var(--dark-btn)' }}
                    className="w-full rounded-full py-3.5 px-6 text-white font-display text-sm font-extrabold tracking-wide shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 chromatic-transition"
                  >
                    <span>
                      {isSubmitting
                        ? siteContent.confirmingOrderBtn
                        : `${siteContent.confirmOrderBtn} • ${currency} ${grandTotal.toLocaleString('en-US')}`}
                    </span>
                  </motion.button>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
