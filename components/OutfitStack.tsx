/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { OutfitLayer } from '../types';
import { Trash2Icon, RotateCcwIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface OutfitStackProps {
  outfitHistory: OutfitLayer[];
  onRemoveLayer: (index: number) => void;
  onRegenerateLayer: (index: number) => void;
  isLoading: boolean;
  currentOutfitIndex: number;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ outfitHistory, onRemoveLayer, onRegenerateLayer, isLoading, currentOutfitIndex }) => {
  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-serif tracking-wide text-primary border-b border-gray-300/60 pb-3 mb-4">Các lớp trang phục</h2>
      <div className="space-y-3">
        <AnimatePresence>
          {outfitHistory.map((layer, index) => {
            const isCurrent = index === currentOutfitIndex;
            return (
              <motion.div
                key={layer.garment?.id || 'base'}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`flex items-center justify-between bg-white/70 p-2 rounded-xl shadow-soft transition-all ${isCurrent ? 'ring-2 ring-accent' : ''}`}
              >
                <div className="flex items-center overflow-hidden">
                    <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 mr-3 text-sm font-bold text-secondary bg-gray-200 rounded-full">
                      {index + 1}
                    </span>
                    {layer.garment && (
                        <img src={layer.garment.url} alt={layer.garment.name} className="flex-shrink-0 w-12 h-12 object-cover rounded-lg mr-3" />
                    )}
                    <span className="font-semibold text-primary truncate" title={layer.garment?.name}>
                      {layer.garment ? layer.garment.name : 'Người mẫu gốc'}
                    </span>
                </div>
                <div className="flex items-center">
                  {index > 0 ? (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onRegenerateLayer(index)}
                        disabled={isLoading}
                        className="flex-shrink-0 text-secondary hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Tạo lại ${layer.garment?.name}`}
                      >
                        <RotateCcwIcon className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onRemoveLayer(index)}
                        disabled={isLoading}
                        className="flex-shrink-0 text-secondary hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Xóa ${layer.garment?.name}`}
                      >
                        <Trash2Icon className="w-5 h-5" />
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onRemoveLayer(index)}
                      disabled={isLoading}
                      className="flex-shrink-0 text-secondary hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Xóa người mẫu và bắt đầu lại`}
                    >
                      <Trash2Icon className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {outfitHistory.length === 1 && (
            <p className="text-center text-sm text-secondary pt-4">Các món đồ bạn chọn sẽ hiện ở đây. Chọn một món đồ từ tủ quần áo bên dưới.</p>
        )}
      </div>
    </div>
  );
};

export default OutfitStack;