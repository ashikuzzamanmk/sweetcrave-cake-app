import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Wand2,
  Upload,
  Check,
  Image as ImageIcon,
  Copy,
} from 'lucide-react';
import {
  extractGoogleDriveFileId,
  isGoogleDriveUrl,
  normalizeImageUrl,
} from '../../utils/cacheEngine';

export interface ImageInspectionResult {
  status: 'idle' | 'loading' | 'valid' | 'error';
  width: number;
  height: number;
  aspectBadge: string;
}

export function useImageInspector(url: string): ImageInspectionResult {
  const [result, setResult] = useState<ImageInspectionResult>({
    status: 'idle',
    width: 0,
    height: 0,
    aspectBadge: '',
  });

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setResult({ status: 'idle', width: 0, height: 0, aspectBadge: '' });
      return;
    }

    let cancelled = false;
    setResult((prev) => ({ ...prev, status: 'loading' }));

    const img = new Image();
    const resolvedSrc = normalizeImageUrl(trimmed, 1000);
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const ratio = w / Math.max(1, h);
      let aspectBadge = 'Needs Square Crop';
      if (Math.abs(ratio - 1) <= 0.06) {
        aspectBadge = '1:1 Square';
      } else if (ratio >= 1.65 && ratio <= 2.6) {
        aspectBadge = '16:9 Wide';
      } else if (ratio > 1.06) {
        aspectBadge = `${w}:${h} Landscape`;
      } else {
        aspectBadge = `${w}:${h} Portrait`;
      }

      setResult({
        status: 'valid',
        width: w,
        height: h,
        aspectBadge,
      });
    };

    img.onerror = () => {
      if (cancelled) return;
      setResult({
        status: 'error',
        width: 0,
        height: 0,
        aspectBadge: isGoogleDriveUrl(trimmed)
          ? 'Set Drive to "Anyone with the link"'
          : 'Broken / Slow Link',
      });
    };

    img.src = resolvedSrc;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return result;
}

export function optimizeImageUrlParams(
  rawUrl: string,
  targetWidth: number,
  targetHeight: number,
  quality: number,
  format: 'webp' | 'png' | 'jpeg'
): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Direct Google Drive public ("Anyone with the link") conversion
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${Math.max(
      160,
      Math.min(2000, targetWidth)
    )}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname.includes('unsplash.com') ||
      parsed.hostname.includes('imgix.net')
    ) {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(targetWidth));
      parsed.searchParams.set('h', String(targetHeight));
      parsed.searchParams.set('q', String(quality));
      parsed.searchParams.set('fm', format === 'jpeg' ? 'jpg' : format);
      return parsed.toString();
    }
    if (parsed.hostname.includes('cloudinary.com')) {
      return trimmed.replace(
        '/upload/',
        `/upload/c_fill,w_${targetWidth},h_${targetHeight},q_${quality},f_${format}/`
      );
    }
    // Generic query parameter fallback so URL still reflects requested dimensions
    parsed.searchParams.set('w', String(targetWidth));
    parsed.searchParams.set('h', String(targetHeight));
    parsed.searchParams.set('q', String(quality));
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export interface ImageInspectorBadgeProps {
  url: string;
  onQuickOptimize?: (optimizedUrl: string) => void;
  targetSize?: { w: number; h: number; label: string };
}

export const ImageInspectorBadge: React.FC<ImageInspectorBadgeProps> = ({
  url,
  onQuickOptimize,
  targetSize = { w: 800, h: 800, label: '800×800' },
}) => {
  const info = useImageInspector(url);
  const isDrive = isGoogleDriveUrl(url);
  const previewSrc = normalizeImageUrl(url, 320);

  if (!url.trim()) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 bg-[#FAF6F0] rounded-[14px] px-3 py-2 border border-stone-200/80 text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        {info.status === 'valid' && previewSrc && (
          <img
            src={previewSrc}
            alt="Live preview"
            className="w-10 h-10 rounded-[10px] object-cover bg-white border border-stone-200 shadow-2xs shrink-0"
          />
        )}
        {info.status === 'loading' && (
          <span className="font-bold text-amber-600">
            ⏳ Image Check করা হচ্ছে...
          </span>
        )}
        {info.status === 'valid' && (
          <>
            <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isDrive ? 'Google Drive Ready ✓' : 'Valid Link'}</span>
            </span>
            <span className="font-extrabold text-stone-800 tabular-nums bg-white rounded-full px-2.5 py-0.5 border border-stone-200">
              {info.width} × {info.height} px
            </span>
            <span
              className={`font-bold rounded-full px-2 py-0.5 ${
                info.aspectBadge === '1:1 Square'
                  ? 'bg-emerald-100/80 text-emerald-800'
                  : 'bg-amber-100/80 text-amber-800'
              }`}
            >
              {info.aspectBadge}
            </span>
          </>
        )}
        {info.status === 'error' && (
          <span className="inline-flex items-center gap-1 font-extrabold text-rose-600 bg-rose-50 rounded-full px-2.5 py-0.5">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>
              {isDrive
                ? 'Set Drive sharing to "Anyone with the link" (Viewer)'
                : '⚠️ Broken / Slow Link'}
            </span>
          </span>
        )}
      </div>

      {onQuickOptimize && info.status === 'valid' && (
        <button
          type="button"
          onClick={() =>
            onQuickOptimize(
              optimizeImageUrlParams(url, targetSize.w, targetSize.h, 85, 'webp')
            )
          }
          className="inline-flex items-center gap-1 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all"
        >
          <Wand2 className="w-3 h-3 text-amber-300" />
          <span>
            {isDrive ? `Optimize Drive (${targetSize.label})` : `Resize (${targetSize.label})`}
          </span>
        </button>
      )}
    </div>
  );
};

interface PresetTarget {
  id: string;
  label: string;
  sublabel: string;
  width: number;
  height: number;
}

const PRESET_TARGETS: PresetTarget[] = [
  {
    id: 'cake-hero',
    label: 'Cake Hero / Card (800 × 800 px — 1:1)',
    sublabel: 'Cake Card ও Hero Image-এর জন্য সেরা',
    width: 800,
    height: 800,
  },
  {
    id: 'ingredient-cutout',
    label: 'Ingredient / Garnish Cutout (300 × 300 px — 1:1)',
    sublabel: 'Topping ও Garnish Icon-এর জন্য',
    width: 300,
    height: 300,
  },
  {
    id: 'promo-banner',
    label: 'Promo Offer Banner (1200 × 480 px)',
    sublabel: 'Homepage Discount Banner-এর জন্য',
    width: 1200,
    height: 480,
  },
  {
    id: 'custom',
    label: 'Custom Width × Height',
    sublabel: 'ইচ্ছেমতো Size দিন',
    width: 600,
    height: 600,
  },
];

export interface ImageResizerStudioProps {
  initialUrl?: string;
  onApplyUrl?: (url: string) => void;
}

export const ImageResizerStudio: React.FC<ImageResizerStudioProps> = ({
  initialUrl = 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=85',
  onApplyUrl,
}) => {
  const [sourceUrl, setSourceUrl] = useState<string>(initialUrl);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cake-hero');
  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(800);
  const [quality, setQuality] = useState<number>(85);
  const [format, setFormat] = useState<'webp' | 'png' | 'jpeg'>('webp');

  const [optimizedUrl, setOptimizedUrl] = useState<string>('');
  const [canvasDataUrl, setCanvasDataUrl] = useState<string>('');
  const [canvasSizeKb, setCanvasSizeKb] = useState<number>(0);
  const [originalEstKb, setOriginalEstKb] = useState<number>(0);
  const [canvasStatus, setCanvasStatus] = useState<string>('');
  const [copiedMsg, setCopiedMsg] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const optimizedInspection = useImageInspector(optimizedUrl || sourceUrl);

  const handleSelectPreset = (preset: PresetTarget) => {
    setSelectedPresetId(preset.id);
    if (preset.id !== 'custom') {
      setTargetWidth(preset.width);
      setTargetHeight(preset.height);
    }
  };

  // 1. Smart URL Optimizer (Rewrites Unsplash/Cloudinary/Query Params in 1 click)
  const handleSmartUrlOptimize = () => {
    const rewritten = optimizeImageUrlParams(
      sourceUrl,
      targetWidth,
      targetHeight,
      quality,
      format
    );
    setOptimizedUrl(rewritten);
    setSourceUrl(rewritten);
    setCanvasStatus(
      `✅ Smart URL Optimized: ${targetWidth} × ${targetHeight} px (${format.toUpperCase()}, ${quality}%)`
    );
  };

  // 2. Client-Side HTML5 Canvas Pixel Resizer & Center-Cropper
  const runCanvasResize = (imgSource: string) => {
    setCanvasStatus('⏳ HTML5 Canvas-এ Resize হচ্ছে...');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const estBefore = Math.max(
          28,
          Math.round((origW * origH * 0.22) / 1024)
        );
        setOriginalEstKb(estBefore);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setCanvasStatus('⚠️ Browser Canvas Support পাওয়া যায়নি');
          return;
        }

        // Center-crop calculation
        const targetRatio = targetWidth / targetHeight;
        const srcRatio = origW / origH;
        let sx = 0;
        let sy = 0;
        let sw = origW;
        let sh = origH;

        if (srcRatio > targetRatio) {
          sw = origH * targetRatio;
          sx = (origW - sw) / 2;
        } else {
          sh = origW / targetRatio;
          sy = (origH - sh) / 2;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

        const mimeType =
          format === 'webp'
            ? 'image/webp'
            : format === 'png'
            ? 'image/png'
            : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality / 100);
        const approxKb = Math.max(
          4,
          Math.round(((dataUrl.length - 22) * 3) / 4 / 1024)
        );

        setCanvasDataUrl(dataUrl);
        setCanvasSizeKb(approxKb);
        setCanvasStatus(
          `✅ সফলভাবে ${targetWidth} × ${targetHeight} px-এ Resize হয়েছে! (~${approxKb} KB)`
        );
      } catch {
        // Fallback to URL optimizer if external server blocks CORS canvas export
        const rewritten = optimizeImageUrlParams(
          sourceUrl,
          targetWidth,
          targetHeight,
          quality,
          format
        );
        setOptimizedUrl(rewritten);
        setSourceUrl(rewritten);
        setCanvasStatus(
          `✅ Smart URL Parameter দিয়ে ${targetWidth} × ${targetHeight} px সেট করা হয়েছে`
        );
      }
    };
    img.onerror = () => {
      setCanvasStatus(
        '⚠️ এই Link-এ সরাসরি CORS নেই — Smart URL Optimizer ব্যবহার করা হয়েছে'
      );
      handleSmartUrlOptimize();
    };
    img.src = imgSource;
  };

  const handleLocalFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceUrl(reader.result);
        runCanvasResize(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyUrl = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 1800);
    } catch {
      // Ignore
    }
  };

  const activePreviewUrl =
    canvasDataUrl ||
    normalizeImageUrl(optimizedUrl || sourceUrl, targetWidth || 800);

  return (
    <div className="bg-white rounded-[28px] p-4 sm:p-6 shadow-md border border-stone-200/80 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-extrabold text-stone-900 leading-[1.35]">
              Image Dimension Detector & Resizer Studio
            </h3>
            <p className="text-xs text-stone-500">
              যেকোনো Image Link-এর আসল Size (Width × Height px) দেখুন এবং 1-Click-এ 800×800 বা 300×300-এ Resize করুন
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF6F0] hover:bg-stone-200/70 border border-stone-300/80 px-3.5 py-2 text-xs font-extrabold text-stone-800 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Local Photo Upload & Resize</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLocalFilePick}
          className="hidden"
        />
      </div>

      {/* Step 1: Image URL Input + Live Dimension Inspector */}
      <div className="space-y-2">
        <label className="text-xs font-extrabold text-stone-700 block">
          1. Cake বা Topping-এর Image Link (Image URL) পেস্ট করুন:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              setCanvasDataUrl('');
            }}
            placeholder="https://images.unsplash.com/photo-..."
            className="flex-1 rounded-[18px] bg-[#FAF6F0] border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-stone-900/15"
          />
          <button
            type="button"
            onClick={() => handleCopyUrl(sourceUrl)}
            className="rounded-[18px] bg-stone-100 hover:bg-stone-200 px-4 py-2.5 text-xs font-extrabold text-stone-800 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {copiedMsg ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Live Automatic Image Link Inspector Pill */}
        <ImageInspectorBadge
          url={sourceUrl}
          onQuickOptimize={(optUrl) => {
            setOptimizedUrl(optUrl);
            setSourceUrl(optUrl);
          }}
          targetSize={{
            w: targetWidth,
            h: targetHeight,
            label: `${targetWidth}×${targetHeight}`,
          }}
        />
      </div>

      {/* Step 2: Target Preset Sizes + Quality & Format Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div>
            <label className="text-xs font-extrabold text-stone-700 block mb-2">
              2. Preset Resize Size বেছে নিন:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_TARGETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`rounded-[18px] p-3 text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                        : 'bg-[#FAF6F0] text-stone-800 border-stone-200/80 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-xs font-extrabold leading-snug">
                      {preset.label}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-stone-300' : 'text-stone-500'
                      }`}
                    >
                      {preset.sublabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Width × Height Inputs + Quality + Format */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF6F0] rounded-[20px] p-3.5 border border-stone-200/70">
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">
                Width (px)
              </label>
              <input
                type="number"
                min={60}
                max={2400}
                value={targetWidth}
                onChange={(e) => {
                  setSelectedPresetId('custom');
                  setTargetWidth(Number(e.target.value) || 800);
                }}
                className="w-full rounded-[12px] bg-white border border-stone-200 px-2.5 py-1.5 text-xs font-extrabold text-stone-900 tabular-nums"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">
                Height (px)
              </label>
              <input
                type="number"
                min={60}
                max={2400}
                value={targetHeight}
                onChange={(e) => {
                  setSelectedPresetId('custom');
                  setTargetHeight(Number(e.target.value) || 800);
                }}
                className="w-full rounded-[12px] bg-white border border-stone-200 px-2.5 py-1.5 text-xs font-extrabold text-stone-900 tabular-nums"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">
                Quality ({quality}%)
              </label>
              <input
                type="range"
                min={60}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-stone-900 mt-1.5 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) =>
                  setFormat(e.target.value as 'webp' | 'png' | 'jpeg')
                }
                className="w-full rounded-[12px] bg-white border border-stone-200 px-2 py-1.5 text-xs font-extrabold text-stone-900"
              >
                <option value="webp">WebP (Fast)</option>
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>
          </div>

          {/* Dual Resize Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleSmartUrlOptimize}
              className="rounded-full bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>
                Smart URL Resize ({targetWidth}×{targetHeight})
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => runCanvasResize(sourceUrl)}
              className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>HTML5 Canvas Crop & Resize</span>
            </motion.button>

            {canvasDataUrl && (
              <a
                href={canvasDataUrl}
                download={`sweetcrave-${targetWidth}x${targetHeight}.${format}`}
                className="rounded-full bg-[#FAF6F0] hover:bg-stone-200 border border-stone-300 text-stone-900 px-4 py-2.5 text-xs font-extrabold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ({canvasSizeKb} KB)</span>
              </a>
            )}

            {onApplyUrl && (
              <button
                type="button"
                onClick={() => onApplyUrl(activePreviewUrl)}
                className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Image</span>
              </button>
            )}
          </div>

          {canvasStatus && (
            <div className="rounded-[14px] bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800">
              {canvasStatus}
              {canvasSizeKb > 0 && originalEstKb > 0 && (
                <span className="ml-2 text-emerald-600">
                  (Before ~{originalEstKb} KB → Now ~{canvasSizeKb} KB)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Visual Before/After Preview Card */}
        <div className="lg:col-span-5 bg-[#FAF6F0] rounded-[24px] p-4 border border-stone-200/80 flex flex-col items-center text-center">
          <span className="text-[11px] font-extrabold text-stone-500 mb-2">
            Live Preview ({optimizedInspection.width || targetWidth} ×{' '}
            {optimizedInspection.height || targetHeight} px)
          </span>

          <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-[24px] bg-white p-2 shadow-md border border-stone-200/80 flex items-center justify-center overflow-hidden">
            {activePreviewUrl ? (
              <img
                src={activePreviewUrl}
                alt="Resized Preview"
                className="w-full h-full object-cover rounded-[18px]"
              />
            ) : (
              <span className="text-xs text-stone-400">No Image</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-stone-600">
            <span className="rounded-full bg-white px-2.5 py-0.5 border border-stone-200 tabular-nums">
              Target: {targetWidth} × {targetHeight} px
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 border border-stone-200 uppercase">
              {format} • {quality}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageResizerStudio;
