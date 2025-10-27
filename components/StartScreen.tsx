/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, RotateCcwIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized }) => {
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn một tệp hình ảnh.');
        return;
    }
    setUserImageFile(file);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setIsGenerating(true);
        setLoadingMessage('Đang tạo người mẫu của bạn...');
        setGeneratedModelUrl(null);
        setError(null);
        try {
            const result = await generateModelImage(file);
            setGeneratedModelUrl(result);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Không thể tạo người mẫu'));
            setUserImageUrl(null);
            setUserImageFile(null);
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };
  
  const handleRegenerate = useCallback(async () => {
    if (!userImageFile || isGenerating) return;

    setIsGenerating(true);
    setLoadingMessage('Đang tạo lại diện mạo...');
    setError(null);
    try {
        const result = await generateModelImage(userImageFile);
        setGeneratedModelUrl(result);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Không thể tạo lại người mẫu'));
    } finally {
        setIsGenerating(false);
        setLoadingMessage('');
    }
  }, [userImageFile, isGenerating]);

  const reset = () => {
    setUserImageFile(null);
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
  };

  const screenVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="max-w-lg">
              <h1 className="text-5xl md:text-6xl font-serif font-bold text-primary leading-tight">
                Tạo Người Mẫu Của Bạn Cho Mọi Phong Cách.
              </h1>
              <p className="mt-4 text-lg text-secondary">
                Bạn đã bao giờ tự hỏi một bộ trang phục sẽ trông như thế nào trên người mình chưa? Đừng đoán nữa. Tải ảnh lên và tự mình xem. AI của chúng tôi sẽ tạo ra người mẫu cá nhân của bạn, sẵn sàng thử bất cứ thứ gì.
              </p>
              <hr className="my-8 border-gray-200" />
              <div className="flex flex-col items-center lg:items-start w-full gap-3">
                <label htmlFor="image-upload-start" className="w-full relative flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-primary rounded-xl cursor-pointer group hover:bg-gray-800 transition-colors shadow-soft hover:shadow-soft-lg">
                  <UploadCloudIcon className="w-5 h-5 mr-3" />
                  Tải ảnh lên
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} />
                <p className="text-secondary text-sm">Chọn một bức ảnh toàn thân, rõ nét. Ảnh chỉ có khuôn mặt cũng được, nhưng ảnh toàn thân được ưu tiên để có kết quả tốt nhất.</p>
                <p className="text-gray-400 text-xs mt-1">Bằng cách tải lên, bạn đồng ý không tạo nội dung có hại, khiêu dâm hoặc bất hợp pháp. Dịch vụ này chỉ dành cho mục đích sử dụng sáng tạo và có trách nhiệm.</p>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center">
            <Compare
              firstImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon.jpg"
              secondImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon-model.png"
              slideMode="drag"
              className="w-full max-w-sm aspect-[2/3] rounded-2xl bg-gray-200 shadow-soft-lg"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          className="w-full max-w-6xl mx-auto h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="md:w-1/2 flex-shrink-0 flex flex-col items-center md:items-start">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary leading-tight">
                Diện Mạo Mới Của Bạn
              </h1>
              <p className="mt-2 text-md text-secondary">
                Kéo thanh trượt để xem sự biến đổi của bạn.
              </p>
            </div>
            
            {isGenerating && (
              <div className="flex items-center gap-3 text-lg text-secondary font-serif mt-6">
                <Spinner />
                <span>{loadingMessage}</span>
              </div>
            )}

            {error && 
              <div className="text-center md:text-left text-red-600 max-w-md mt-6">
                <p className="font-semibold">Tạo thất bại</p>
                <p className="text-sm mb-4">{error}</p>
                <button onClick={reset} className="text-sm font-semibold text-secondary hover:underline">Thử lại</button>
              </div>
            }
            
            <AnimatePresence>
              {generatedModelUrl && !isGenerating && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col sm:flex-row items-center gap-4 mt-8"
                >
                  <motion.button 
                    onClick={reset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-secondary bg-gray-200/80 rounded-lg cursor-pointer hover:bg-gray-300/80 transition-colors"
                  >
                    Dùng ảnh khác
                  </motion.button>
                  <motion.button
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto flex items-center justify-center px-6 py-3 text-base font-semibold text-primary bg-white border border-gray-300/80 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
                  >
                      <RotateCcwIcon className="w-5 h-5 mr-2"/>
                      Tạo lại
                  </motion.button>
                  <motion.button 
                    onClick={() => onModelFinalized(generatedModelUrl)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-primary rounded-lg cursor-pointer group hover:bg-gray-800 transition-colors shadow-soft hover:shadow-soft-lg"
                  >
                    Tiếp tục tạo kiểu &rarr;
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="md:w-1/2 w-full flex items-center justify-center">
            <div 
              className={`relative rounded-2xl transition-all duration-700 ease-in-out shadow-soft-lg ${isGenerating ? 'border border-gray-300 animate-pulse' : 'border-none'}`}
            >
              <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl ?? userImageUrl}
                slideMode="drag"
                className="w-[280px] h-[420px] sm:w-[320px] sm:h-[480px] lg:w-[400px] lg:h-[600px] rounded-2xl bg-gray-200"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;