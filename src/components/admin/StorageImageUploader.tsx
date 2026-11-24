import React, { useRef, useState } from 'react';
import { Upload, Link2, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  uploadProductImageToStorage,
  deleteProductImageFromStorage,
  PRODUCT_IMAGES_BUCKET,
} from '../../lib/supabase';
import { normalizeImageUrl } from '../../utils/cacheEngine';
import { ImageInspectorBadge } from './ImageResizerStudio';

export interface StorageImageUploaderProps {
  label?: string;
  value: string;
  onChange: (nextUrl: string) => void;
  folder?: 'products' | 'categories' | 'banners' | 'options';
  compact?: boolean;
  showInspector?: boolean;
  onNotify?: (msg: string) => void;
}

export const StorageImageUploader: React.FC<StorageImageUploaderProps> = ({
  label = 'Product Image',
  value,
  onChange,
  folder = 'products',
  compact = false,
  showInspector = true,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isStorageUrl = value.includes(
    `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const previousUrl = value;
      const res = await uploadProductImageToStorage(file, folder);
      if (!res.ok || !res.publicUrl) {
        setUploadError(res.error || 'Upload failed.');
        return;
      }
      onChange(res.publicUrl);
      onNotify?.('Image uploaded to Supabase Storage ✓');
      if (
        previousUrl &&
        previousUrl.includes(`/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`)
      ) {
        void deleteProductImageFromStorage(previousUrl);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (isStorageUrl) {
      await deleteProductImageFromStorage(value);
      onNotify?.('Removed image from Storage');
    }
    onChange('');
  };

  const normalizedPreview = value ? normalizeImageUrl(value) : '';

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-extrabold text-stone-700 uppercase tracking-wide">
            {label}
          </label>
          {isStorageUrl && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <CheckCircle2 className="w-3 h-3" />
              Supabase Storage
            </span>
          )}
        </div>
      )}

      <div className={`flex items-start gap-3 ${compact ? 'flex-row' : 'flex-col sm:flex-row'}`}>
        {/* Preview Thumbnail */}
        <div
          className={`${
            compact ? 'w-14 h-14 rounded-2xl' : 'w-20 h-20 rounded-2xl'
          } bg-[#FAF6F0] border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center relative`}
        >
          {normalizedPreview ? (
            <img
              src={normalizedPreview}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-bold text-stone-400 text-center px-1">
              No Image
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2 w-full">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 text-[11px] font-extrabold cursor-pointer disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>
                {isUploading
                  ? 'Uploading...'
                  : value
                  ? 'Upload / Replace'
                  : 'Upload Image'}
              </span>
            </button>

            {value && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex items-center gap-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Direct URL / Google Drive Public Link Input */}
          <div className="relative">
            <Link2 className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setUploadError(null);
                onChange(normalizeImageUrl(e.target.value));
              }}
              placeholder="Paste HTTPS URL or Google Drive 'Anyone with link' URL..."
              className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 pl-8 pr-3 py-2 text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white"
            />
          </div>

          {uploadError && (
            <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </p>
          )}

          {showInspector && normalizedPreview && (
            <ImageInspectorBadge url={normalizedPreview} />
          )}
        </div>
      </div>
    </div>
  );
};

export default StorageImageUploader;
