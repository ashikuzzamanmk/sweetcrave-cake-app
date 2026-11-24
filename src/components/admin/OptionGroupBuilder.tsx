import React from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ProductOptionGroup,
  ProductOptionChoice,
} from '../../data/cakesData';
import { normalizeImageUrl } from '../../utils/cacheEngine';

export interface OptionGroupBuilderProps {
  groups: ProductOptionGroup[];
  currency: string;
  onChange: (nextGroups: ProductOptionGroup[]) => void;
}

const GROUP_PRESETS: Array<{ label: string; group: Omit<ProductOptionGroup, 'id'> }> = [
  {
    label: '+ Cake Weight (1/2/3 lb)',
    group: {
      name: 'Cake Weight',
      selectionType: 'single',
      required: true,
      choices: [
        { id: 'wt-1lb', name: '1 Pound (6 Slices)', priceDelta: 0, defaultSelected: true },
        { id: 'wt-2lb', name: '2 Pounds (12 Slices)', priceDelta: 750, defaultSelected: false },
        { id: 'wt-3lb', name: '3 Pounds (18 Slices)', priceDelta: 1450, defaultSelected: false },
      ],
    },
  },
  {
    label: '+ Size (S / M / L)',
    group: {
      name: 'Size',
      selectionType: 'single',
      required: true,
      choices: [
        { id: 'sz-s', name: 'Small', priceDelta: 0, defaultSelected: true },
        { id: 'sz-m', name: 'Medium', priceDelta: 300, defaultSelected: false },
        { id: 'sz-l', name: 'Large', priceDelta: 650, defaultSelected: false },
      ],
    },
  },
  {
    label: '+ Flavour Choice',
    group: {
      name: 'Cake Flavour',
      selectionType: 'single',
      required: true,
      choices: [
        { id: 'flv-van', name: 'Classic Vanilla Bean', priceDelta: 0, defaultSelected: true },
        { id: 'flv-choc', name: 'Belgian Chocolate', priceDelta: 120, defaultSelected: false },
        { id: 'flv-rv', name: 'Red Velvet Cream Cheese', priceDelta: 180, defaultSelected: false },
      ],
    },
  },
  {
    label: '+ Toppings & Add-ons',
    group: {
      name: 'Toppings & Extra Add-ons',
      selectionType: 'multiple',
      required: false,
      maxSelections: 5,
      choices: [
        { id: 'top-gold', name: 'Edible Gold Leaf', priceDelta: 150, defaultSelected: false },
        { id: 'top-mac', name: 'French Macarons (4 pcs)', priceDelta: 220, defaultSelected: false },
        { id: 'top-berry', name: 'Fresh Imported Strawberries', priceDelta: 180, defaultSelected: false },
        { id: 'top-candle', name: 'Sparkler & Birthday Topper', priceDelta: 90, defaultSelected: false },
      ],
    },
  },
];

export const OptionGroupBuilder: React.FC<OptionGroupBuilderProps> = ({
  groups,
  currency,
  onChange,
}) => {
  const addPresetGroup = (preset: Omit<ProductOptionGroup, 'id'>) => {
    const stamp = Date.now();
    const cloned: ProductOptionGroup = {
      ...preset,
      id: `grp-${stamp}`,
      choices: preset.choices.map((ch, idx) => ({
        ...ch,
        id: `ch-${stamp}-${idx}`,
      })),
    };
    onChange([...groups, cloned]);
  };

  const addBlankGroup = () => {
    const stamp = Date.now();
    onChange([
      ...groups,
      {
        id: `grp-${stamp}`,
        name: 'Custom Option Group',
        selectionType: 'single',
        required: false,
        choices: [
          {
            id: `ch-${stamp}-0`,
            name: 'Standard Option',
            priceDelta: 0,
            defaultSelected: true,
          },
        ],
      },
    ]);
  };

  const updateGroup = (idx: number, patch: Partial<ProductOptionGroup>) => {
    const next = [...groups];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const deleteGroup = (idx: number) => {
    onChange(groups.filter((_, i) => i !== idx));
  };

  const moveGroup = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= groups.length) return;
    const next = [...groups];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  const addChoice = (groupIdx: number) => {
    const next = [...groups];
    const grp = next[groupIdx];
    const newChoice: ProductOptionChoice = {
      id: `ch-${Date.now()}-${grp.choices.length}`,
      name: '',
      priceDelta: 0,
      defaultSelected: false,
    };
    next[groupIdx] = { ...grp, choices: [...grp.choices, newChoice] };
    onChange(next);
  };

  const updateChoice = (
    groupIdx: number,
    choiceIdx: number,
    patch: Partial<ProductOptionChoice>
  ) => {
    const next = [...groups];
    const grp = next[groupIdx];
    const choices = [...grp.choices];

    // If setting defaultSelected on a single-select group, unset others
    if (patch.defaultSelected && grp.selectionType === 'single') {
      for (let i = 0; i < choices.length; i++) {
        choices[i] = { ...choices[i], defaultSelected: i === choiceIdx };
      }
    } else {
      choices[choiceIdx] = { ...choices[choiceIdx], ...patch };
    }

    next[groupIdx] = { ...grp, choices };
    onChange(next);
  };

  const deleteChoice = (groupIdx: number, choiceIdx: number) => {
    const next = [...groups];
    const grp = next[groupIdx];
    next[groupIdx] = {
      ...grp,
      choices: grp.choices.filter((_, i) => i !== choiceIdx),
    };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-amber-700" />
            <h4 className="font-display text-xs font-extrabold text-stone-900">
              Dynamic Per-Product Customization Groups
            </h4>
          </div>
          <button
            type="button"
            onClick={addBlankGroup}
            className="inline-flex items-center gap-1 rounded-full bg-stone-900 text-white px-3 py-1.5 text-[11px] font-extrabold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Blank Group</span>
          </button>
        </div>

        <p className="text-[11px] text-stone-600 leading-relaxed">
          Configure sizes, weights, flavours, fillings, decorations, or paid add-ons specifically for this product. The storefront dynamically renders these groups and server-side checkout validates every option price.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {GROUP_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => addPresetGroup(preset.group)}
              className="rounded-full bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1 text-[11px] font-bold text-stone-800 cursor-pointer transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-6 text-center space-y-1.5">
          <Sparkles className="w-6 h-6 text-stone-400 mx-auto" />
          <p className="text-xs font-bold text-stone-700">
            No custom option groups configured yet
          </p>
          <p className="text-[11px] text-stone-500">
            Use the quick presets above or add a blank group. (If left empty, legacy toppings/ingredients still work automatically.)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((grp, gIdx) => (
            <div
              key={grp.id}
              className="bg-white rounded-2xl border border-stone-200/80 p-3.5 shadow-2xs space-y-3"
            >
              {/* Group Header Controls */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <input
                  type="text"
                  value={grp.name}
                  onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                  placeholder="Group Name (e.g., Cake Weight, Flavour, Toppings)"
                  className="flex-1 min-w-[180px] rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-1.5 text-xs font-extrabold text-stone-900 focus:outline-none focus:bg-white"
                />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={gIdx === 0}
                    onClick={() => moveGroup(gIdx, -1)}
                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={gIdx === groups.length - 1}
                    onClick={() => moveGroup(gIdx, 1)}
                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGroup(gIdx)}
                    className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                    title="Delete Group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Group Settings Row */}
              <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
                <select
                  value={grp.selectionType}
                  onChange={(e) =>
                    updateGroup(gIdx, {
                      selectionType: e.target.value as 'single' | 'multiple',
                    })
                  }
                  className="rounded-lg bg-[#FAF6F0] border border-stone-200 px-2.5 py-1.5 font-bold text-stone-800"
                >
                  <option value="single">Single Select (Pick 1)</option>
                  <option value="multiple">Multiple Select (Add-ons)</option>
                </select>

                <label className="inline-flex items-center gap-1.5 font-bold text-stone-700 cursor-pointer bg-[#FAF6F0] border border-stone-200 rounded-lg px-2.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={grp.required}
                    onChange={(e) =>
                      updateGroup(gIdx, { required: e.target.checked })
                    }
                    className="accent-stone-900"
                  />
                  <span>Required</span>
                </label>

                {grp.selectionType === 'multiple' && (
                  <label className="inline-flex items-center gap-1.5 font-bold text-stone-700 bg-[#FAF6F0] border border-stone-200 rounded-lg px-2.5 py-1">
                    <span>Max picks:</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={grp.maxSelections ?? ''}
                      placeholder="∞"
                      onChange={(e) =>
                        updateGroup(gIdx, {
                          maxSelections: e.target.value
                            ? Math.max(1, Number(e.target.value))
                            : undefined,
                        })
                      }
                      className="w-12 bg-white border border-stone-200 rounded px-1.5 py-0.5 text-center font-bold text-stone-900"
                    />
                  </label>
                )}
              </div>

              {/* Choices List */}
              <div className="space-y-2 pt-1">
                {grp.choices.map((choice, cIdx) => (
                  <div
                    key={choice.id}
                    className="grid grid-cols-12 gap-2 items-center bg-[#FAF6F0] rounded-xl p-2 border border-stone-200/70"
                  >
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={choice.name}
                        onChange={(e) =>
                          updateChoice(gIdx, cIdx, { name: e.target.value })
                        }
                        placeholder="Option label (e.g., 2 Pounds)"
                        className="w-full rounded-lg bg-white border border-stone-200 px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400">
                          +{currency}
                        </span>
                        <input
                          type="number"
                          value={choice.priceDelta}
                          onChange={(e) =>
                            updateChoice(gIdx, cIdx, {
                              priceDelta: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg bg-white border border-stone-200 pl-7 pr-2 py-1.5 text-xs font-bold text-stone-900 tabular-nums focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          updateChoice(gIdx, cIdx, {
                            defaultSelected: !choice.defaultSelected,
                          })
                        }
                        title="Default selected"
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold cursor-pointer ${
                          choice.defaultSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-stone-200 text-stone-500'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span className="hidden sm:inline">Default</span>
                      </button>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => deleteChoice(gIdx, cIdx)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200 flex items-center justify-center cursor-pointer"
                        title="Remove choice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Optional choice image URL */}
                    <div className="col-span-12">
                      <input
                        type="text"
                        value={choice.image_url || ''}
                        onChange={(e) =>
                          updateChoice(gIdx, cIdx, {
                            image_url: e.target.value
                              ? normalizeImageUrl(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Optional choice thumbnail URL (HTTPS or Google Drive public link)"
                        className="w-full rounded-lg bg-white/80 border border-stone-200/80 px-2.5 py-1 text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addChoice(gIdx)}
                  className="inline-flex items-center gap-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1 text-[11px] font-extrabold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Choice</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OptionGroupBuilder;
