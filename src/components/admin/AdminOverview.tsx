import React from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChefHat,
  CakeSlice,
  EyeOff,
  TrendingUp,
  Cloud,
  RefreshCw,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { CakeItem } from '../../data/cakesData';
import { DatabaseOrder, isSupabaseConfigured } from '../../lib/supabase';

export interface AdminOverviewProps {
  orders: DatabaseOrder[];
  cakes: CakeItem[];
  currency: string;
  isLiveConnected: boolean;
  isLoadingOrders: boolean;
  onRefreshAll: () => void;
  onPublishCatalog: () => void;
  onOpenOrder: (order: DatabaseOrder) => void;
  onNavigateTab: (tab: 'orders' | 'cakes' | 'categories') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  orders,
  cakes,
  currency,
  isLiveConnected,
  isLoadingOrders,
  onRefreshAll,
  onPublishCatalog,
  onOpenOrder,
  onNavigateTab,
}) => {
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length;
  const preparingCount = orders.filter(
    (o) =>
      o.status === 'preparing' ||
      o.status === 'ready_for_pickup' ||
      o.status === 'out_for_delivery'
  ).length;
  const completedCount = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'completed'
  ).length;

  const activeRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const visibleProducts = cakes.filter(
    (c) => c.isVisible !== false && c.isAvailable !== false
  ).length;
  const unavailableProducts = cakes.length - visibleProducts;

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Live Cloud Status Strip */}
      <div className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isLiveConnected
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Radio className="w-4 h-4" />
          </span>
          <div>
            <p className="text-xs font-extrabold text-stone-900">
              {isLiveConnected
                ? 'Supabase Realtime Live Connected'
                : isSupabaseConfigured
                ? 'Supabase Ready — Syncing Data'
                : 'Supabase Not Configured'}
            </p>
            <p className="text-[11px] text-stone-500">
              Product, category, and order changes reflect live for all visitors without redeployment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshAll}
            className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1.5 text-xs font-extrabold cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onPublishCatalog}
            className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 text-xs font-extrabold cursor-pointer"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Sync Full Catalog</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs cursor-pointer hover:border-stone-400 transition-colors"
        >
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-[11px] font-bold">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-stone-700" />
          </div>
          <p className="font-display text-2xl font-extrabold text-stone-900 tabular-nums">
            {orders.length}
          </p>
          <p className="text-[10px] font-bold text-emerald-700 mt-0.5 tabular-nums">
            {currency} {activeRevenue.toLocaleString('en-US')} total
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between text-amber-800 mb-1.5">
            <span className="text-[11px] font-bold">Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="font-display text-2xl font-extrabold text-amber-950 tabular-nums">
            {pendingCount}
          </p>
          <p className="text-[10px] font-bold text-amber-700 mt-0.5">
            {confirmedCount} confirmed
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-purple-50/70 rounded-2xl p-3.5 border border-purple-200/80 shadow-2xs cursor-pointer hover:border-purple-400 transition-colors"
        >
          <div className="flex items-center justify-between text-purple-800 mb-1.5">
            <span className="text-[11px] font-bold">In Progress</span>
            <ChefHat className="w-4 h-4" />
          </div>
          <p className="font-display text-2xl font-extrabold text-purple-950 tabular-nums">
            {preparingCount}
          </p>
          <p className="text-[10px] font-bold text-purple-700 mt-0.5">
            Baking / Delivery
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs cursor-pointer hover:border-emerald-400 transition-colors"
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1.5">
            <span className="text-[11px] font-bold">Completed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="font-display text-2xl font-extrabold text-emerald-950 tabular-nums">
            {completedCount}
          </p>
          <p className="text-[10px] font-bold text-emerald-700 mt-0.5">
            Delivered & Done
          </p>
        </div>
      </div>

      {/* Product Health Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div
          onClick={() => onNavigateTab('cakes')}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 cursor-pointer hover:border-stone-400"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500">
            <CakeSlice className="w-3.5 h-3.5 text-stone-700" />
            <span>Total Products</span>
          </div>
          <p className="font-display text-xl font-extrabold text-stone-900 mt-1 tabular-nums">
            {cakes.length}
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('cakes')}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 cursor-pointer hover:border-stone-400"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Live</span>
          </div>
          <p className="font-display text-xl font-extrabold text-emerald-800 mt-1 tabular-nums">
            {visibleProducts}
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('cakes')}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 cursor-pointer hover:border-stone-400"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
            <EyeOff className="w-3.5 h-3.5" />
            <span>Hidden / Out</span>
          </div>
          <p className="font-display text-xl font-extrabold text-rose-700 mt-1 tabular-nums">
            {unavailableProducts}
          </p>
        </div>
      </div>

      {/* Recent Orders Feed */}
      <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-display text-sm font-extrabold text-stone-900">
            Recent Customer Orders
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-stone-700 hover:text-stone-950 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs font-bold text-stone-700">No orders yet</p>
            <p className="text-[11px] text-stone-500">
              Customer orders placed on the storefront appear here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onOpenOrder(order)}
                className="w-full px-4 py-3 text-left hover:bg-[#FAF6F0]/70 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-stone-900">
                      {order.order_code}
                    </span>
                    <span className="rounded-full bg-stone-100 text-stone-700 px-2 py-0.5 text-[10px] font-bold capitalize">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-stone-800 truncate mt-0.5">
                    {order.customer_name} • {order.customer_phone}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {new Date(order.created_at).toLocaleString()} •{' '}
                    {Array.isArray(order.items_json) ? order.items_json.length : 0}{' '}
                    item(s)
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-extrabold text-sm text-stone-900 tabular-nums">
                    {currency} {Number(order.total_amount).toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] font-bold text-stone-500 capitalize">
                    {order.payment_status}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
