/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REMIX_SUGGESTIONS = [
  "Gợi ý phối đồ: Tạo một lookbook có thể chia sẻ.",
  "Gợi ý phối đồ: Tích hợp API e-commerce để tìm các món đồ tương tự.",
  "Gợi ý phối đồ: Thêm phụ kiện như mũ, kính râm, hoặc túi xách.",
  "Gợi ý phối đồ: Tạo 'điểm phong cách' cho các bộ trang phục.",
  "Gợi ý phối đồ: Cho phép người dùng lưu lại trang phục yêu thích.",
  "Gợi ý phối đồ: Tạo các phiên bản màu sắc khác nhau cho trang phục.",
];

interface FooterProps {
  isOnDressingScreen?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isOnDressingScreen = false }) => {
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prevIndex) => (prevIndex + 1) % REMIX_SUGGESTIONS.length);
    }, 4000); // Change suggestion every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className={`fixed bottom-0 left-0 right-0 bg-soft-bg/80 backdrop-blur-lg border-t border-gray-200/60 p-3 z-50 ${isOnDressingScreen ? 'hidden sm:block' : ''}`}>
      <div className="mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-secondary max-w-7xl px-4">
        <p>
          Tạo bởi{' '}
          <a 
            href="https://sutralab.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            SutraLab
          </a>
        </p>
        <div className="h-4 mt-1 sm:mt-0 flex items-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={suggestionIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="text-center sm:text-right"
              >
                {REMIX_SUGGESTIONS[suggestionIndex]}
              </motion.p>
            </AnimatePresence>
        </div>
      </div>
    </footer>
  );
};

export default Footer;