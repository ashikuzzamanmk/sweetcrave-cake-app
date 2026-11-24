import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  FolderKanban,
  AlertTriangle,
} from 'lucide-react';
import { CategoryItem } from '../../data/cakesData';
import { ActionResult } from '../../context/StoreContext';
import { StorageImageUploader } from './StorageImageUploader';

export interface AdminCategoriesProps {
  categories: CategoryItem[];
  onUpsertCategory: (cat: CategoryItem) => Promise<ActionResult>;
  onDeleteCategory: (id: string) => Promise<ActionResult>;
  onTriggerToast: (msg: string) => void;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`
  );
}

export const AdminCategories: React.FC<AdminCategoriesProps> = ({
  categories,
  onUpsertCategory,
  onDeleteCategory,
  onTriggerToast,
}) => {
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const startNew = () => {
    setEditing({
      id: `cat-${Date.now()}`,
      name: '',
      slug: '',
      description: '',
      image_url: '',
      sortOrder: categories.length,
      isVisible: true,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    setIsSaving(true);
    try {
      const payload: CategoryItem = {
        ...editing,
        name: editing.name.trim(),
        slug: editing.slug.trim() || slugify(editing.name),
      };
      const res = await onUpsertCategory(payload);
      if (res.ok) {
        onTriggerToast(`Category "${payload.name}" saved live ✓`);
        setEditing(null);
      } else {
        onTriggerToast(res.error || 'Could not save category');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (cat: CategoryItem) => {
    const res = await onUpsertCategory({ ...cat, isVisible: !cat.isVisible });
    if (res.ok) {
      onTriggerToast(
        `"${cat.name}" is now ${!cat.isVisible ? 'visible' : 'hidden'}`
      );
    } else {
      onTriggerToast(res.error || 'Update failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const res = await onDeleteCategory(confirmDeleteId);
    if (res.ok) {
      onTriggerToast('Category deleted ✓');
    } else {
      onTriggerToast(res.error || 'Delete failed');
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-stone-700" />
          <h3 className="font-display text-sm font-extrabold text-stone-900">
            Product Categories ({categories.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 text-xs font-extrabold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Category</span>
        </button>
      </div>

      {/* Category Editor Form */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl p-4 border-2 border-stone-900 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs font-extrabold text-stone-900 uppercase">
              {categories.some((c) => c.id === editing.id)
                ? 'Edit Category'
                : 'Create Category'}
            </h4>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-stone-400 hover:text-stone-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: e.target.value,
                    slug: slugify(e.target.value),
                  })
                }
                placeholder="e.g., Wedding Cakes"
                className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    sortOrder: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-stone-600 block mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={editing.description || ''}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
              placeholder="Short description for this category"
              className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
            />
          </div>

          <StorageImageUploader
            label="Category Thumbnail (optional)"
            value={editing.image_url || ''}
            onChange={(url) => setEditing({ ...editing, image_url: url })}
            folder="categories"
            compact
            showInspector={false}
            onNotify={onTriggerToast}
          />

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isVisible}
                onChange={(e) =>
                  setEditing({ ...editing, isVisible: e.target.checked })
                }
                className="accent-stone-900"
              />
              <span>Visible on Storefront</span>
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-extrabold cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Category'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        {sorted.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl p-3 border border-stone-200/80 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-10 h-10 rounded-xl object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-stone-200 flex items-center justify-center text-xs font-extrabold text-stone-500 shrink-0">
                  #{cat.sortOrder}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-extrabold text-stone-900 truncate">
                    {cat.name}
                  </p>
                  {!cat.isVisible && (
                    <span className="rounded-full bg-stone-200 text-stone-600 px-2 py-0.5 text-[10px] font-bold">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 truncate">
                  slug: {cat.slug} {cat.description ? `• ${cat.description}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleVisibility(cat)}
                title={cat.isVisible ? 'Hide Category' : 'Show Category'}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 cursor-pointer"
              >
                {cat.isVisible ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditing(cat)}
                title="Edit Category"
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(cat.id)}
                title="Delete Category"
                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[80] bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-display font-extrabold text-sm">
                Delete Category?
              </h4>
            </div>
            <p className="text-xs text-stone-600">
              This removes the category from Supabase. Existing products assigned to this category name will remain intact.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-full bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-extrabold cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
