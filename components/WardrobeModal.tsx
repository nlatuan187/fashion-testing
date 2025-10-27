/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon } from './icons';
import { urlToFile } from '../lib/utils';
import { motion } from 'framer-motion';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
}

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe }) => {
    const [error, setError] = useState<string | null>(null);

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || activeGarmentIds.includes(item.id)) return;
        setError(null);
        try {
            // If the item was from an upload, its URL is a blob URL. We need to fetch it to create a file.
            // If it was a default item, it's a regular URL. This handles both.
            const file = await urlToFile(item.url, item.name);
            onGarmentSelect(file, item);
        } catch (err) {
            const detailedError = `Không thể tải món đồ từ tủ. Đây thường là sự cố CORS. Kiểm tra bảng điều khiển của nhà phát triển để biết chi tiết.`;
            setError(detailedError);
            console.error(`[CORS Check] Failed to load and convert wardrobe item from URL: ${item.url}. The browser's console should have a specific CORS error message if that's the issue.`, err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('Vui lòng chọn một tệp hình ảnh.');
                return;
            }
            const customGarmentInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
            };
            onGarmentSelect(file, customGarmentInfo);
        }
    };

  return (
    <div className="pt-6 border-t border-gray-300/60">
        <h2 className="text-2xl font-serif tracking-wide text-primary mb-4">Tủ đồ</h2>
        <div className="grid grid-cols-3 gap-3">
            {wardrobe.map((item) => {
            const isActive = activeGarmentIds.includes(item.id);
            return (
                <motion.button
                  key={item.id}
                  onClick={() => handleGarmentClick(item)}
                  disabled={isLoading || isActive}
                  className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 focus:outline-none group disabled:opacity-60 disabled:cursor-not-allowed ${isActive ? 'ring-2 ring-inset ring-accent' : 'shadow-soft'}`}
                  aria-label={`Chọn ${item.name}`}
                  // FIX: Framer Motion uses the `boxShadow` property, not `shadow`, for animations.
                  whileHover={!isActive && !isLoading ? { y: -4, scale: 1.05, boxShadow: 'var(--tw-shadow-soft-lg)' } : {}}
                  whileTap={!isActive && !isLoading ? { scale: 0.98 } : {}}
                >
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-bold text-center drop-shadow-md">{item.name}</p>
                  </div>
                </motion.button>
            );
            })}
            <label htmlFor="custom-garment-upload" className={`relative aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-secondary transition-colors ${isLoading ? 'cursor-not-allowed bg-gray-100' : 'hover:border-accent hover:text-accent cursor-pointer'}`}>
                <UploadCloudIcon className="w-6 h-6 mb-1"/>
                <span className="text-xs font-semibold text-center">Tải lên</span>
                <input id="custom-garment-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} disabled={isLoading}/>
            </label>
        </div>
        {wardrobe.length === 0 && (
             <p className="text-center text-sm text-secondary mt-4">Trang phục bạn tải lên sẽ xuất hiện ở đây.</p>
        )}
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
};

export default WardrobePanel;