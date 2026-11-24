import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  History,
  Sparkles,
} from 'lucide-react';
import { CakeCustomizerOption } from '../../data/cakesData';
import { storeConfig } from '../../config/storeConfig';
import {
  ImageInspectorBadge,
  useImageInspector,
} from './ImageResizerStudio';
import { normalizeImageUrl } from '../../utils/cacheEngine';

export interface IngredientManagerProps {
  options: CakeCustomizerOption[];
  previousIngredients: CakeCustomizerOption[];
  darkBtnColor: string;
  onChange: (nextOptions: CakeCustomizerOption[]) => void;
  onRecordHistory: (item: CakeCustomizerOption) => void;
}

const CATEGORY_LABELS: {
  id: CakeCustomizerOption['category'];
  label: string;
}[] = [
  { id: 'Weight', label: 'Weight (ওজন)' },
  { id: 'Sponge', label: 'Sponge (স্পঞ্জ)' },
  { id: 'Add-ons', label: 'Add-ons / Toppings' },
];

export const IngredientManager: React.FC<IngredientManagerProps> = ({
  options,
  previousIngredients,
  darkBtnColor,
  onChange,
  onRecordHistory,
}) => {
  const [name, setName] = useState<string>('');
  const [category, setCategory] =
    useState<CakeCustomizerOption['category']>('Add-ons');
  const [priceDelta, setPriceDelta] = useState<number>(100);
  const [imageUrl, setImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=300&q=80'
  );
  const [defaultSelected, setDefaultSelected] = useState<boolean>(false);

  const previewDims = useImageInspector(imageUrl);

  const handleAddOption = () => {
    if (!name.trim() || !imageUrl.trim()) return;
    const newItem: CakeCustomizerOption = {
      id: `opt-${Date.now()}`,
      name: name.trim(),
      category,
      priceDelta: Number(priceDelta) || 0,
      image_url: imageUrl.trim(),
      defaultSelected,
    };
    onChange([...options, newItem]);
    onRecordHistory(newItem);
    setName('');
  };

  const handleReuseFromHistory = (
    histItem: CakeCustomizerOption,
    attachDirectly: boolean
  ) => {
    setName(histItem.name);
    setCategory(histItem.category);
    setPriceDelta(histItem.priceDelta);
    setImageUrl(histItem.image_url);
    setDefaultSelected(histItem.defaultSelected);

    if (attachDirectly) {
      const cloned: CakeCustomizerOption = {
        ...histItem,
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      onChange([...options, cloned]);
    }
  };

  const handleDeleteOption = (id: string) => {
    onChange(options.filter((o) => o.id !== id));
  };

  const handleMoveOption = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= options.length) return;
    const clone = [...options];
    const [removed] = clone.splice(index, 1);
    clone.splice(target, 0, removed);
    onChange(clone);
  };

  const handleToggleDefault = (id: string) => {
    onChange(
      options.map((o) =>
        o.id === id ? { ...o, defaultSelected: !o.defaultSelected } : o
      )
    );
  };

  return (
    <div className="bg-[#FAF6F0] rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-sm sm:text-base font-extrabold text-stone-900">
          Cake Customizer Toppings & Ingredients ({options.length} Items)
        </h4>
        <span className="text-[11px] font-bold text-stone-500">
          Weight, Sponge ও Toppings যোগ বা পরিবর্তন করুন
        </span>
      </div>

      {/* Add New Ingredient Form + Side-by-Side Live Squircle Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start bg-white rounded-[22px] p-4 border border-stone-200/80">
        <div className="lg:col-span-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Item / Topping Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: Fresh Strawberry / 1 kg"
                className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as CakeCustomizerOption['category']
                  )
                }
                className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
              >
                {CATEGORY_LABELS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Extra Price ({storeConfig.currency})
              </label>
              <input
                type="number"
                min={0}
                value={priceDelta}
                onChange={(e) => setPriceDelta(Number(e.target.value) || 0)}
                className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-stone-600 block mb-1">
              Topping Image Link (Google Drive &ldquo;Anyone with the link&rdquo; or URL)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(normalizeImageUrl(e.target.value, 400))}
              placeholder="Paste Google Drive link or https://..."
              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:outline-none focus:bg-white"
            />
            <ImageInspectorBadge
              url={imageUrl}
              onQuickOptimize={(optUrl) => setImageUrl(optUrl)}
              targetSize={{ w: 300, h: 300, label: '300×300' }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={defaultSelected}
                onChange={(e) => setDefaultSelected(e.target.checked)}
                className="rounded accent-stone-900 w-4 h-4"
              />
              <span>Default Selected থাকবে</span>
            </label>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleAddOption}
              style={{ backgroundColor: darkBtnColor || '#24372B' }}
              className="rounded-full px-4 py-2 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Topping</span>
            </motion.button>
          </div>
        </div>

        {/* Live Customer-Facing Squircle Tile Preview */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center bg-[#FAF6F0] rounded-[20px] p-3.5 border border-stone-200/70">
          <span className="text-[10px] font-extrabold text-stone-500 mb-2">
            Customer Screen-এ যেমন দেখাবে (Live Preview)
          </span>

          <div className="w-28 rounded-[18px] p-2.5 bg-[#EFE9E0] border border-stone-900/15 shadow-xs relative flex flex-col items-center text-center">
            <span
              style={{ backgroundColor: darkBtnColor || '#24372B' }}
              className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full text-white flex items-center justify-center"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </span>

            <div className="w-12 h-12 mt-1 mb-1 rounded-full bg-white p-1 shadow-xs overflow-hidden">
              <img
                src={imageUrl}
                alt={name || 'Preview'}
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            <span className="text-[11px] font-bold text-stone-800 leading-tight line-clamp-2 min-h-[26px] flex items-center">
              {name || 'Topping Name'}
            </span>
            <span className="text-[10px] font-bold text-stone-500 mt-0.5 tabular-nums">
              {priceDelta === 0 ? 'Free' : `+${storeConfig.currency}${priceDelta}`}
            </span>
          </div>

          {previewDims.status === 'valid' && (
            <span className="mt-2 text-[10px] font-bold text-emerald-700 tabular-nums">
              Size: {previewDims.width} × {previewDims.height} px
            </span>
          )}
        </div>
      </div>

      {/* PREVIOUSLY ADDED ITEMS GALLERY (পূর্বে যোগ করা Items — 1-Tap Auto-Fill) */}
      <div className="bg-white rounded-[22px] p-4 border border-stone-200/80 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800">
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Previously Added Items (পূর্বে যোগ করা — 1-Tap Auto-Fill বা + Add)</span>
          </div>
          <span className="text-[10px] font-bold text-stone-400">
            বারবার Image Link পেস্ট করার প্রয়োজন নেই
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
          {previousIngredients.map((hist) => (
            <div
              key={`${hist.category}-${hist.name}`}
              className="shrink-0 bg-[#FAF6F0] hover:bg-[#EFE9E0] rounded-[16px] p-2 border border-stone-200/80 flex items-center gap-2.5 transition-all"
            >
              <img
                src={hist.image_url}
                alt={hist.name}
                loading="lazy"
                className="w-9 h-9 rounded-full object-cover bg-white p-0.5 border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate max-w-[110px]">
                  {hist.name}
                </div>
                <div className="text-[10px] font-bold text-stone-500 tabular-nums">
                  {hist.priceDelta === 0
                    ? 'Free'
                    : `+${storeConfig.currency}${hist.priceDelta}`}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleReuseFromHistory(hist, false)}
                  className="rounded-full bg-white hover:bg-stone-100 border border-stone-200 px-2 py-0.5 text-[9.5px] font-bold text-stone-700 cursor-pointer"
                >
                  Auto-Fill
                </button>
                <button
                  type="button"
                  onClick={() => handleReuseFromHistory(hist, true)}
                  className="rounded-full bg-stone-900 hover:bg-stone-800 text-white px-2 py-0.5 text-[9.5px] font-bold cursor-pointer flex items-center justify-center gap-0.5"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>+ Add</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Cake's Ingredients List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {options.map((opt, idx) => (
          <div
            key={opt.id}
            className="bg-white rounded-[18px] p-2.5 border border-stone-200/80 flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={opt.image_url}
                alt={opt.name}
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-stone-900 truncate">
                  {opt.name}
                </p>
                <p className="text-[10px] font-bold text-stone-500">
                  {opt.category} •{' '}
                  {opt.priceDelta === 0
                    ? 'Free'
                    : `+${storeConfig.currency}${opt.priceDelta}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleDefault(opt.id)}
                title="Default Selected Toggle"
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer ${
                  opt.defaultSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveOption(idx, -1)}
                className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveOption(idx, 1)}
                className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOption(opt.id)}
                className="w-6 h-6 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IngredientManager;
