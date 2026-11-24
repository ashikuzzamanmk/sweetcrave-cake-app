import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  CartItem,
  OrderReceipt,
  submitOrderToSupabase,
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

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

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
  const [cakeInscription, setCakeInscription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
    items.length === 0
      ? 0
      : remainingForFreeDelivery === 0
      ? 0
      : siteContent.deliveryFee ?? storeConfig.deliveryFee;

  const grandTotal = afterDiscount + deliveryFee;
  const currency = siteContent.currency || storeConfig.currency;
  const brandName = siteContent.brandName || storeConfig.brandName;
  const city = siteContent.city || storeConfig.city;
  const whatsappNumber = siteContent.whatsappNumber || storeConfig.whatsappNumber;

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const cleanPhone = customerPhone.replace(/[\s-]/g, '').trim();
    if (!BD_PHONE_REGEX.test(cleanPhone)) {
      setFormError(siteContent.phoneErrorText);
      return;
    }

    if (!deliveryAddress.trim()) {
      setFormError('অনুগ্রহ করে আপনার সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const savedReceipt = await submitOrderToSupabase({
        store_slug: storeConfig.storeSlug,
        customer_name: customerName.trim() || 'সম্মানিত ক্রেতা',
        customer_phone: cleanPhone,
        delivery_address: deliveryAddress.trim(),
        cake_inscription:
          cakeInscription.trim() ||
          items
            .map((i) => i.cakeMessage)
            .filter(Boolean)
            .join(' | ') ||
          'স্ট্যান্ডার্ড গার্নিশ',
        promo_code: isPromoActive ? siteContent.promoCode : undefined,
        subtotal,
        discount,
        delivery_fee: deliveryFee,
        total_amount: grandTotal,
        items,
      });

      setReceipt(savedReceipt);
      onClearCart();
    } catch {
      setFormError('Something went wrong. Please call Admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    setReceipt(null);
    setFormError(null);
    onClose();
  };

  const buildWhatsAppUrl = (rec: OrderReceipt) => {
    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
    const lines = [
      `🎂 *নতুন অর্ডার ${rec.order_id} — ${brandName}*`,
      `📍 এলাকা: ${city}`,
      `👤 ক্রেতা: ${rec.customer_name} (${rec.customer_phone})`,
      `🏠 ঠিকানা: ${rec.delivery_address}`,
      `✨ কেকের লেখা: "${rec.cake_inscription}"`,
      '',
      '*অর্ডার আইটেম:*',
      ...rec.items.map(
        (i) =>
          `• ${i.quantity}x ${i.name} (${currency}${(
            i.unitPrice * i.quantity
          ).toLocaleString('en-US')})`
      ),
      '',
      `*সর্বমোট বিল: ${currency}${rec.total_amount.toLocaleString(
        'en-US'
      )}*`,
    ];
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
                ? 'w-full max-w-[430px] max-h-[92dvh] rounded-t-[32px]'
                : 'w-full max-h-[92dvh] rounded-t-[32px] md:max-h-none md:h-full md:w-[440px] md:rounded-t-none md:rounded-l-[32px]'
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
            <div className="px-5 py-3 border-b border-stone-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center shadow-xs chromatic-transition shrink-0"
                >
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-extrabold text-stone-900 leading-[1.35]">
                    {siteContent.cartTitle}
                  </h2>
                  <p className="text-[11px] font-semibold text-stone-500">
                    {brandName} • {city}
                  </p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCloseDrawer}
                aria-label="ব্যাগ বন্ধ করুন"
                className="w-11 h-11 min-w-[44px] min-h-[44px] md:w-9 md:h-9 md:min-w-0 md:min-h-0 rounded-full bg-white border border-black/5 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Automatic Free-Delivery Progress Bar in Bangla */}
            {!receipt && items.length > 0 && (
              <div className="px-5 py-2.5 bg-white/80 border-b border-stone-200/60 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mb-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {remainingForFreeDelivery > 0
                      ? `আরও ${currency}${remainingForFreeDelivery.toLocaleString(
                          'en-US'
                        )} টাকার Cake যোগ করলে Free Delivery পাবেন!`
                      : 'অভিনন্দন! আপনি Free Home Delivery পাচ্ছেন 🎉'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${freeDeliveryProgress}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Scrollable Center Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 sm:p-5 space-y-4">
              {receipt ? (
                /* CELEBRATORY ORDER RECEIPT WITH VIDEO-2 FIREWORKS BURST */
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[28px] p-5 shadow-md border-[1px] border-stone-100 text-center space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative overflow-hidden"
                >
                  {/* Animated Confetti / Fireworks Rays (Video 2 Reference) */}
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
                      <span className="text-stone-500 font-medium">
                        কেকের লেখা:
                      </span>
                      <span className="font-bold text-stone-900 truncate max-w-[190px]">
                        &ldquo;{receipt.cake_inscription}&rdquo;
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 items-center">
                      <span className="text-stone-500 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{siteContent.estimatedDeliveryLabel}:</span>
                      </span>
                      <span className="font-bold text-emerald-700 text-right">
                        {siteContent.estimatedDeliveryValue}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
                      <span>{siteContent.grandTotalLabel}:</span>
                      <span className="tabular-nums">
                        {currency}{' '}
                        {receipt.total_amount.toLocaleString('en-US')}
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
                      onClick={handleCloseDrawer}
                      className="w-full rounded-full py-3 px-4 bg-stone-200/70 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
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
              ) : (
                <>
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
                              <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                                {item.selectedOptionNames.join(' • ')}
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
                          className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200/70 px-3 py-2 text-[16px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white"
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
                      maxLength={45}
                      value={cakeInscription}
                      onChange={(e) => setCakeInscription(e.target.value)}
                      placeholder={siteContent.cakeMessagePlaceholder}
                      className="w-full rounded-[18px] bg-[#FAF6F0] border border-stone-200/80 px-3.5 py-2.5 text-[16px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-800/15"
                    />

                    {/* Promo Code Pill */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => onChangePromoCode(e.target.value)}
                          placeholder={`Promo Code (${siteContent.promoCode})`}
                          className="w-full rounded-full bg-[#FAF6F0] border border-stone-200/80 pl-8 pr-3 py-2 text-[16px] font-bold uppercase text-stone-800 placeholder:normal-case placeholder:font-medium placeholder:text-stone-400 focus:outline-none"
                        />
                      </div>
                      {!isPromoActive && (
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

                  {/* Customer Phone & Delivery Address Form */}
                  <form
                    id="checkout-form"
                    onSubmit={handleConfirmOrder}
                    className="bg-white rounded-[24px] p-4 shadow-xs border border-stone-100 space-y-2.5"
                  >
                    <h4 className="font-display text-xs font-extrabold text-stone-500 mb-1">
                      {siteContent.deliveryDetailsTitle} ({city})
                    </h4>

                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={siteContent.nameLabel}
                        className="w-full rounded-[16px] bg-[#FAF6F0] border border-stone-200/80 pl-10 pr-3.5 py-2.5 text-[16px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
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
                        placeholder={siteContent.phoneLabel}
                        className="w-full rounded-[16px] bg-[#FAF6F0] border border-stone-200/80 pl-10 pr-3.5 py-2.5 text-[16px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
                      />
                    </div>

                    <div className="relative">
                      <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <textarea
                        rows={2}
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder={siteContent.addressLabel}
                        className="w-full rounded-[16px] bg-[#FAF6F0] border border-stone-200/80 pl-10 pr-3.5 py-2.5 text-[16px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none resize-none"
                      />
                    </div>

                    {formError && (
                      <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-[12px] px-3 py-2">
                        {formError}
                      </p>
                    )}
                  </form>
                </>
              )}
            </div>

            {/* Sticky Safe-Area Footer Bar */}
            {!receipt && items.length > 0 && (
              <div className="shrink-0 px-5 pt-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-xl border-t border-stone-200/80 space-y-2.5">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-stone-500 font-medium">
                    <span>{siteContent.subtotalLabel}</span>
                    <span className="tabular-nums font-bold text-stone-800">
                      {currency} {subtotal.toLocaleString('en-US')}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>{siteContent.discountLabel}</span>
                      <span className="tabular-nums">
                        -{currency} {discount.toLocaleString('en-US')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-500 font-medium">
                    <span>{siteContent.deliveryLabel}</span>
                    <span className="tabular-nums font-bold text-stone-800">
                      {deliveryFee === 0
                        ? siteContent.freeDeliveryText
                        : `${currency} ${deliveryFee.toLocaleString(
                            'en-US'
                          )}`}
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

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="w-full rounded-full py-3.5 px-6 text-white font-display text-sm font-extrabold tracking-wide shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 chromatic-transition"
                >
                  <span className="py-0.5">
                    {isSubmitting
                      ? siteContent.confirmingOrderBtn
                      : `${siteContent.confirmOrderBtn} • ${currency} ${grandTotal.toLocaleString('en-US')}`}
                  </span>
                </motion.button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
