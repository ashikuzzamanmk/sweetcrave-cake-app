import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  Send,
  AlertCircle,
  Loader2,
  Package,
} from 'lucide-react';
import {
  DatabaseOrder,
  OrderStatus,
  PaymentStatus,
  updateAdminOrderStatus,
} from '../../lib/supabase';
import { getAdaptiveImageUrl } from '../../utils/cacheEngine';

export interface AdminOrdersProps {
  orders: DatabaseOrder[];
  currency: string;
  isLoading: boolean;
  error: string | null;
  selectedOrder: DatabaseOrder | null;
  onSelectOrder: (order: DatabaseOrder | null) => void;
  onOrderUpdated: (order: DatabaseOrder) => void;
  onRefresh: () => void;
  onTriggerToast: (msg: string) => void;
}

const ALL_STATUSES: Array<{ value: OrderStatus; label: string; badge: string }> = [
  { value: 'pending', label: 'Pending', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'confirmed', label: 'Confirmed', badge: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'preparing', label: 'Preparing', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'out_for_delivery', label: 'Out for Delivery', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'delivered', label: 'Delivered', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'completed', label: 'Completed', badge: 'bg-emerald-200 text-emerald-950 border-emerald-300' },
  { value: 'cancelled', label: 'Cancelled', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
];

const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'partial', 'paid', 'refunded'];

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  currency,
  isLoading,
  error,
  selectedOrder,
  onSelectOrder,
  onOrderUpdated,
  onRefresh,
  onTriggerToast,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'delivery'>('newest');

  // Detail update controls
  const [draftStatus, setDraftStatus] = useState<OrderStatus>('pending');
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const openDetail = (order: DatabaseOrder) => {
    setDraftStatus(order.status);
    setDraftPaymentStatus(order.payment_status);
    setStatusNote('');
    onSelectOrder(order);
  };

  // Sync draft fields if selectedOrder was opened from Overview
  React.useEffect(() => {
    if (selectedOrder) {
      setDraftStatus(selectedOrder.status);
      setDraftPaymentStatus(selectedOrder.payment_status);
    }
  }, [selectedOrder?.id, selectedOrder?.status, selectedOrder?.payment_status]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.order_code.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        (o.delivery_area || '').toLowerCase().includes(q) ||
        (o.delivery_address || '').toLowerCase().includes(q)
      );
    });

    if (sortBy === 'highest') {
      return [...list].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
    }
    if (sortBy === 'delivery') {
      return [...list].sort((a, b) =>
        (a.delivery_date || '9999').localeCompare(b.delivery_date || '9999')
      );
    }
    return list;
  }, [orders, statusFilter, searchQuery, sortBy]);

  const handleSaveStatusUpdate = async () => {
    if (!selectedOrder || isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await updateAdminOrderStatus(
        selectedOrder.id,
        draftStatus,
        draftPaymentStatus,
        statusNote.trim() || undefined
      );
      if (!res.ok || !res.order) {
        onTriggerToast(res.error || 'Failed to update order status');
        return;
      }
      onOrderUpdated(res.order);
      onSelectOrder(res.order);
      setStatusNote('');
      onTriggerToast(
        `Order ${res.order.order_code} updated to ${res.order.status.replace(/_/g, ' ')} ✓`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusMeta = (st: OrderStatus) =>
    ALL_STATUSES.find((s) => s.value === st) || ALL_STATUSES[0];

  // FULL SINGLE-SCREEN ORDER DETAIL VIEW
  if (selectedOrder) {
    const meta = getStatusMeta(selectedOrder.status);
    const cleanPhone = selectedOrder.customer_phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${
      cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`
    }?text=${encodeURIComponent(
      `Hello ${selectedOrder.customer_name}, regarding your order ${selectedOrder.order_code} — current status: ${selectedOrder.status.replace(/_/g, ' ')}.`
    )}`;

    return (
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectOrder(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1.5 text-xs font-extrabold text-stone-800 hover:bg-stone-100 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-extrabold"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp Customer</span>
            </a>
          </div>
        </div>

        {/* Order Header Banner */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-mono text-lg font-extrabold text-stone-900">
                {selectedOrder.order_code}
              </h3>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${meta.badge}`}
              >
                {meta.label}
              </span>
              <span className="rounded-full bg-stone-100 text-stone-700 px-2.5 py-0.5 text-[11px] font-bold capitalize">
                {selectedOrder.order_type === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Placed on {new Date(selectedOrder.created_at).toLocaleString()}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-bold text-stone-500 uppercase">
              Verified Grand Total
            </p>
            <p className="font-display text-2xl font-extrabold text-stone-900 tabular-nums">
              {currency} {Number(selectedOrder.total_amount).toLocaleString('en-US')}
            </p>
          </div>
        </div>

        {/* Status & Payment Lifecycle Manager */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
          <h4 className="font-display text-xs font-extrabold text-stone-900 uppercase tracking-wide">
            Update Order Lifecycle & Payment Status
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-stone-500 block mb-1">
                Order Status
              </label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-500 block mb-1">
                Payment Status ({selectedOrder.payment_method})
              </label>
              <select
                value={draftPaymentStatus}
                onChange={(e) =>
                  setDraftPaymentStatus(e.target.value as PaymentStatus)
                }
                className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 capitalize"
              >
                {PAYMENT_STATUSES.map((ps) => (
                  <option key={ps} value={ps}>
                    {ps.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Optional status note (e.g., Rider assigned, Cake in oven...)"
              className="flex-1 rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleSaveStatusUpdate}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-extrabold cursor-pointer disabled:opacity-60 shrink-0"
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Save Status</span>
            </button>
          </div>
        </div>

        {/* Customer & Delivery Two-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-2 text-xs">
            <h4 className="font-display font-extrabold text-stone-900 uppercase tracking-wide">
              Customer Information
            </h4>
            <p className="font-extrabold text-sm text-stone-900">
              {selectedOrder.customer_name}
            </p>
            <p className="flex items-center gap-2 text-stone-700 font-semibold">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>{selectedOrder.customer_phone}</span>
            </p>
            {selectedOrder.customer_alt_phone && (
              <p className="flex items-center gap-2 text-stone-600">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>Alt: {selectedOrder.customer_alt_phone}</span>
              </p>
            )}
            {selectedOrder.customer_email && (
              <p className="flex items-center gap-2 text-stone-600">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span>{selectedOrder.customer_email}</span>
              </p>
            )}
            <p className="flex items-center gap-2 text-stone-600 pt-1">
              <CreditCard className="w-3.5 h-3.5 text-stone-400" />
              <span>
                {selectedOrder.payment_method} •{' '}
                <strong className="uppercase">{selectedOrder.payment_status}</strong>
              </span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-2 text-xs">
            <h4 className="font-display font-extrabold text-stone-900 uppercase tracking-wide">
              Delivery & Schedule
            </h4>
            <p className="flex items-start gap-2 text-stone-800 font-semibold leading-relaxed">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>
                {selectedOrder.delivery_address}
                {selectedOrder.delivery_area ? `, ${selectedOrder.delivery_area}` : ''}
                {selectedOrder.delivery_city ? `, ${selectedOrder.delivery_city}` : ''}
                {selectedOrder.delivery_postal_code
                  ? ` - ${selectedOrder.delivery_postal_code}`
                  : ''}
              </span>
            </p>
            {selectedOrder.delivery_date && (
              <p className="flex items-center gap-2 text-emerald-700 font-bold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Requested Date: {selectedOrder.delivery_date}</span>
              </p>
            )}
            {selectedOrder.delivery_time_window && (
              <p className="flex items-center gap-2 text-stone-700 font-bold">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Time Window: {selectedOrder.delivery_time_window}</span>
              </p>
            )}
            {selectedOrder.delivery_instructions && (
              <p className="bg-amber-50 border border-amber-200/80 rounded-xl p-2 text-[11px] font-semibold text-amber-950">
                Delivery Note: {selectedOrder.delivery_instructions}
              </p>
            )}
            {selectedOrder.cake_inscription && (
              <p className="bg-[#FAF6F0] border border-stone-200/80 rounded-xl p-2 text-[11px] font-bold text-stone-800">
                Global Cake Message: &ldquo;{selectedOrder.cake_inscription}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Ordered Products List */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
          <h4 className="font-display text-xs font-extrabold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            <span>
              Ordered Items (
              {Array.isArray(selectedOrder.items_json)
                ? selectedOrder.items_json.reduce((s, i) => s + (i.quantity || 1), 0)
                : 0}
              )
            </span>
          </h4>

          <div className="divide-y divide-stone-100">
            {(selectedOrder.items_json || []).map((item, idx) => (
              <div
                key={`${item.cakeId}-${idx}`}
                className="py-3 first:pt-0 last:pb-0 flex items-start gap-3"
              >
                {item.image_url && (
                  <img
                    src={getAdaptiveImageUrl(item.image_url, 'thumb')}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 text-xs space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-extrabold text-stone-900">
                      {item.quantity}× {item.name}
                    </p>
                    <span className="font-extrabold text-stone-900 tabular-nums shrink-0">
                      {currency}{' '}
                      {(Number(item.unitPrice || 0) * (item.quantity || 1)).toLocaleString(
                        'en-US'
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Unit: {currency} {Number(item.unitPrice || 0).toLocaleString('en-US')}{' '}
                    (Base {currency} {Number(item.basePrice || 0).toLocaleString('en-US')})
                  </p>
                  {Array.isArray(item.selectedOptionNames) &&
                    item.selectedOptionNames.length > 0 && (
                      <p className="text-[11px] font-semibold text-stone-700">
                        Options: {item.selectedOptionNames.join(' • ')}
                      </p>
                    )}
                  {item.cakeMessage && (
                    <p className="text-[11px] font-bold text-amber-800">
                      Cake Message: &ldquo;{item.cakeMessage}&rdquo;
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="text-[11px] italic text-stone-600">
                      Special Instructions: {item.specialInstructions}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-3 border-t border-stone-200 space-y-1 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-bold tabular-nums">
                {currency} {Number(selectedOrder.subtotal || 0).toLocaleString('en-US')}
              </span>
            </div>
            {Number(selectedOrder.addons_total || 0) > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Included Customizations / Add-ons</span>
                <span className="font-bold tabular-nums">
                  {currency}{' '}
                  {Number(selectedOrder.addons_total || 0).toLocaleString('en-US')}
                </span>
              </div>
            )}
            {Number(selectedOrder.discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>
                  Discount {selectedOrder.promo_code ? `(${selectedOrder.promo_code})` : ''}
                </span>
                <span className="tabular-nums">
                  -{currency} {Number(selectedOrder.discount).toLocaleString('en-US')}
                </span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>Delivery Charge</span>
              <span className="font-bold tabular-nums">
                {Number(selectedOrder.delivery_fee || 0) === 0
                  ? 'FREE'
                  : `${currency} ${Number(selectedOrder.delivery_fee).toLocaleString('en-US')}`}
              </span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
              <span>Final Total</span>
              <span className="tabular-nums">
                {currency} {Number(selectedOrder.total_amount).toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>

        {/* Status History Audit Log */}
        {Array.isArray(selectedOrder.status_history) &&
          selectedOrder.status_history.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-2.5">
              <h4 className="font-display text-xs font-extrabold text-stone-900 uppercase tracking-wide">
                Status Audit History
              </h4>
              <div className="space-y-2">
                {selectedOrder.status_history.map((entry, idx) => (
                  <div
                    key={`${entry.status}-${idx}`}
                    className="flex items-start justify-between gap-2 text-xs bg-[#FAF6F0] rounded-xl px-3 py-2"
                  >
                    <div>
                      <span className="font-extrabold text-stone-900 capitalize">
                        {entry.status.replace(/_/g, ' ')}
                      </span>
                      {entry.payment_status && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-stone-500">
                          (Payment: {entry.payment_status})
                        </span>
                      )}
                      {entry.note && (
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">
                      {new Date(entry.at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    );
  }

  // ORDERS LIST & FILTER VIEW
  return (
    <div className="space-y-3.5">
      {/* Search & Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer name, phone, area..."
            className="w-full rounded-full bg-white border border-stone-200 pl-9 pr-4 py-2 text-xs font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as 'newest' | 'highest' | 'delivery')
          }
          className="rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-700"
        >
          <option value="newest">Sort: Newest</option>
          <option value="delivery">Sort: Delivery Date</option>
          <option value="highest">Sort: Highest Total</option>
        </select>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 text-white px-3.5 py-2 text-xs font-extrabold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold border cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white text-stone-700 border-stone-200'
          }`}
        >
          All ({orders.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = orders.filter((o) => o.status === s.value).length;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold border cursor-pointer ${
                statusFilter === s.value
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200'
              }`}
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-10 text-center space-y-1.5">
          <p className="text-sm font-extrabold text-stone-800">
            No matching orders found
          </p>
          <p className="text-xs text-stone-500">
            {orders.length === 0
              ? 'Orders submitted by customers will appear here live.'
              : 'Try clearing your search or status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order) => {
            const meta = getStatusMeta(order.status);
            const itemCount = Array.isArray(order.items_json)
              ? order.items_json.reduce((s, i) => s + (i.quantity || 1), 0)
              : 0;
            return (
              <div
                key={order.id}
                onClick={() => openDetail(order)}
                className="bg-white rounded-2xl p-3.5 border border-stone-200/80 hover:border-stone-400 shadow-2xs cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-extrabold text-stone-900">
                        {order.order_code}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">
                        {order.order_type}
                      </span>
                    </div>

                    <p className="text-sm font-extrabold text-stone-900 mt-1 truncate">
                      {order.customer_name} •{' '}
                      <span className="font-semibold text-stone-600 tabular-nums">
                        {order.customer_phone}
                      </span>
                    </p>

                    <p className="text-[11px] text-stone-500 truncate mt-0.5">
                      {order.delivery_area ? `${order.delivery_area}, ` : ''}
                      {order.delivery_address}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-bold text-stone-500">
                      <span>{itemCount} item(s)</span>
                      <span>•</span>
                      <span>
                        {order.delivery_date
                          ? `Due: ${order.delivery_date} (${order.delivery_time_window || ''})`
                          : new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="uppercase">{order.payment_status}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-display text-base font-extrabold text-stone-900 tabular-nums">
                      {currency} {Number(order.total_amount).toLocaleString('en-US')}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-extrabold text-stone-600 underline">
                      Open Details →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
