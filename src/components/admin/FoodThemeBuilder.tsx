import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Plus, Sparkles } from 'lucide-react';
import { CakeThemePalette } from '../../data/cakesData';
import { storeConfig } from '../../config/storeConfig';
import { normalizeImageUrl } from '../../utils/cacheEngine';

export interface FoodPresetPalette {
  id: string;
  label: string;
  theme: CakeThemePalette;
}

export const FOOD_PRESET_PALETTES: FoodPresetPalette[] = [
  {
    id: 'strawberry',
    label: '🍓 Strawberry Velvet',
    theme: {
      canvas: '#FFF0EC',
      surface: '#FFE3DC',
      card: '#FAF6F0',
      wave: '#FF9B82',
      accent: '#D9385A',
      darkBtn: '#24372B',
      textInk: '#1F191A',
    },
  },
  {
    id: 'mango',
    label: '🥭 Alphonso Mango (আম)',
    theme: {
      canvas: '#FFF8E7',
      surface: '#FFEFCC',
      card: '#FAF6F0',
      wave: '#FFD25A',
      accent: '#D97706',
      darkBtn: '#2D2A1E',
      textInk: '#231F14',
    },
  },
  {
    id: 'truffle',
    label: '🍫 Dark Chocolate Truffle',
    theme: {
      canvas: '#F5EFEA',
      surface: '#EBE0D6',
      card: '#FAF6F0',
      wave: '#8C6246',
      accent: '#5C3A21',
      darkBtn: '#2B1D14',
      textInk: '#211710',
    },
  },
  {
    id: 'blueberry',
    label: '🫐 Blueberry Lavender',
    theme: {
      canvas: '#F3F0F8',
      surface: '#E6E0F2',
      card: '#FAF6F0',
      wave: '#6D689E',
      accent: '#4A3B69',
      darkBtn: '#27243D',
      textInk: '#1B1828',
    },
  },
  {
    id: 'pistachio',
    label: '🌿 Pistachio (পেস্তা বাদাম)',
    theme: {
      canvas: '#EFF6F1',
      surface: '#E0EDE4',
      card: '#FAF6F0',
      wave: '#7BB08E',
      accent: '#233329',
      darkBtn: '#233329',
      textInk: '#16221A',
    },
  },
  {
    id: 'caramel',
    label: '🍮 Salted Caramel',
    theme: {
      canvas: '#FDF6EC',
      surface: '#F7E8D4',
      card: '#FAF6F0',
      wave: '#D99B52',
      accent: '#B45309',
      darkBtn: '#2D2114',
      textInk: '#21180E',
    },
  },
];

export interface FoodThemeBuilderProps {
  theme: CakeThemePalette;
  cakeName: string;
  cakePrice: number;
  cakeImageUrl: string;
  onChange: (nextTheme: CakeThemePalette) => void;
}

export const FoodThemeBuilder: React.FC<FoodThemeBuilderProps> = ({
  theme,
  cakeName,
  cakePrice,
  cakeImageUrl,
  onChange,
}) => {
  const updateColor = (key: keyof CakeThemePalette, val: string) => {
    onChange({ ...theme, [key]: val });
  };

  const colorFields: { key: keyof CakeThemePalette; label: string }[] = [
    { key: 'canvas', label: 'Page Background (Canvas)' },
    { key: 'surface', label: 'Hero Surface' },
    { key: 'wave', label: 'Wave Color (SVG Wave)' },
    { key: 'accent', label: 'Highlight (Accent)' },
    { key: 'darkBtn', label: 'Dark Button (CTA)' },
  ];

  return (
    <div className="bg-[#FAF6F0] rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-stone-700" />
          <h4 className="font-display text-sm sm:text-base font-extrabold text-stone-900">
            Food-Color Theme & Wave Animation Builder
          </h4>
        </div>
        <span className="text-[11px] font-bold text-stone-500">
          1-Click Preset অথবা Custom Color Picker
        </span>
      </div>

      {/* 1-Click Preset Food Palettes */}
      <div className="flex flex-wrap gap-2">
        {FOOD_PRESET_PALETTES.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.theme)}
            className="rounded-full bg-white hover:bg-stone-100 border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-800 flex items-center gap-2 shadow-2xs cursor-pointer transition-all"
          >
            <span
              style={{ backgroundColor: preset.theme.wave }}
              className="w-3.5 h-3.5 rounded-full border border-black/10"
            />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* 5 Color Pickers */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {colorFields.map((field) => (
            <label
              key={field.key}
              className="bg-white rounded-[16px] p-2.5 border border-stone-200/80 flex flex-col gap-1.5 cursor-pointer"
            >
              <span className="text-[10px] font-bold text-stone-500 truncate">
                {field.label}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme[field.key]}
                  onChange={(e) => updateColor(field.key, e.target.value)}
                  className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent shrink-0"
                />
                <input
                  type="text"
                  value={theme[field.key]}
                  onChange={(e) => updateColor(field.key, e.target.value)}
                  className="w-full text-xs font-extrabold text-stone-800 uppercase bg-transparent focus:outline-none tabular-nums"
                />
              </div>
            </label>
          ))}
        </div>

        {/* Live Mini Chromatic Wave Preview Card */}
        <div className="lg:col-span-5">
          <div
            style={{ backgroundColor: theme.surface }}
            className="rounded-[24px] p-4 relative overflow-hidden shadow-md border border-white min-h-[150px] flex items-center justify-between gap-3 transition-colors duration-300"
          >
            {/* Animated SVG Wave Split */}
            <svg
              viewBox="0 0 400 240"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <path
                d="M 0,0 L 210,0 C 245,45 270,95 245,155 C 220,205 180,220 190,240 L 0,240 Z"
                fill={theme.wave}
              />
              <path
                d="M 0,0 L 210,0 C 245,45 270,95 245,155 C 220,205 180,220 190,240 L 0,240 Z"
                fill={theme.darkBtn}
                fillOpacity="0.24"
              />
            </svg>

            <div className="relative z-10 text-white space-y-2 max-w-[58%]">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Live Wave Preview</span>
              </span>
              <h5 className="font-display text-sm font-extrabold leading-[1.3] truncate">
                {cakeName || 'New Cake'}
              </h5>
              <button
                type="button"
                style={{ backgroundColor: theme.darkBtn }}
                className="rounded-full pl-3 pr-1.5 py-1 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-sm"
              >
                <span>Order করুন</span>
                <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center">
                  <Plus className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </button>
            </div>

            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10 w-20 h-20 rounded-full bg-white p-1 shadow-lg border-2 border-white shrink-0"
            >
              <img
                src={
                  normalizeImageUrl(cakeImageUrl, 400) ||
                  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=300&q=80'
                }
                alt={cakeName}
                className="w-full h-full object-cover rounded-full"
              />
              <span
                style={{ backgroundColor: theme.darkBtn }}
                className="absolute -bottom-1 right-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white"
              >
                {storeConfig.currency}
                {cakePrice}
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodThemeBuilder;
