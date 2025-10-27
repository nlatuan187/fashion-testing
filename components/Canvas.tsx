/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
}

const Canvas: React.FC<CanvasProps> = ({ displayImageUrl, onStartOver, isLoading, loadingMessage, onSelectPose, poseInstructions, currentPoseIndex, availablePoseKeys }) => {
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);
  
  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);
    
    // Fallback if current pose not in available list (shouldn't happen)
    if (currentIndexInAvailable === -1) {
        onSelectPose((currentPoseIndex - 1 + poseInstructions.length) % poseInstructions.length);
        return;
    }

    const prevIndexInAvailable = (currentIndexInAvailable - 1 + availablePoseKeys.length) % availablePoseKeys.length;
    const prevPoseInstruction = availablePoseKeys[prevIndexInAvailable];
    const newGlobalPoseIndex = poseInstructions.indexOf(prevPoseInstruction);
    
    if (newGlobalPoseIndex !== -1) {
        onSelectPose(newGlobalPoseIndex);
    }
  };

  const handleNextPose = () => {
    if (isLoading) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);

    // Fallback or if there are no generated poses yet
    if (currentIndexInAvailable === -1 || availablePoseKeys.length === 0) {
        onSelectPose((currentPoseIndex + 1) % poseInstructions.length);
        return;
    }
    
    const nextIndexInAvailable = currentIndexInAvailable + 1;
    if (nextIndexInAvailable < availablePoseKeys.length) {
        // There is another generated pose, navigate to it
        const nextPoseInstruction = availablePoseKeys[nextIndexInAvailable];
        const newGlobalPoseIndex = poseInstructions.indexOf(nextPoseInstruction);
        if (newGlobalPoseIndex !== -1) {
            onSelectPose(newGlobalPoseIndex);
        }
    } else {
        // At the end of generated poses, generate the next one from the master list
        const newGlobalPoseIndex = (currentPoseIndex + 1) % poseInstructions.length;
        onSelectPose(newGlobalPoseIndex);
    }
  };

  const handleDownload = () => {
    if (!displayImageUrl) return;
    const link = document.createElement('a');
    link.href = displayImageUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `outfit-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="w-full flex flex-col items-center justify-center relative group animate-zoom-in py-4 gap-4">
      {/* Top Controls */}
      <div className="absolute top-4 left-0 z-30 flex items-center gap-2">
        <motion.button 
            onClick={onStartOver}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-center bg-white/80 border border-gray-200/80 text-secondary font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white active:scale-95 text-sm backdrop-blur-md shadow-soft"
        >
            <RotateCcwIcon className="w-4 h-4 mr-2" />
            Làm lại từ đầu
        </motion.button>

        {displayImageUrl && !isLoading && (
          <motion.button
            onClick={handleDownload}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-center bg-white/80 border border-gray-200/80 text-secondary font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white active:scale-95 text-sm backdrop-blur-md shadow-soft"
            aria-label="Tải xuống ảnh"
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Tải xuống
          </motion.button>
        )}
      </div>

      {/* Image Display Container - Constrained height and aspect ratio */}
      <div 
        className="relative w-full max-w-lg aspect-[2/3]"
        style={{ maxHeight: '70vh' }}
      >
        {displayImageUrl ? (
          <img
            key={displayImageUrl} // Use key to force re-render and trigger animation on image change
            src={displayImageUrl}
            alt="Virtual try-on model"
            className="w-full h-full object-contain transition-opacity duration-500 animate-fade-in rounded-xl"
          />
        ) : (
            <div className="w-full h-full bg-gray-100 border border-gray-200 rounded-xl flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-md font-serif text-secondary mt-4">Đang tải người mẫu...</p>
            </div>
        )}
        
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 bg-soft-bg/80 backdrop-blur-lg flex flex-col items-center justify-center z-20 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <Spinner />
                  {loadingMessage && (
                      <p className="text-lg font-serif text-secondary mt-4 text-center px-4">{loadingMessage}</p>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pose Controls Container */}
      <div className="relative w-full max-w-lg flex items-center justify-center">
        {displayImageUrl && !isLoading && (
          <div 
            className="z-30 opacity-100 transition-opacity duration-300"
          >
            {/* Pose popover menu */}
            <AnimatePresence>
                {isPoseMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-full mb-3 w-64 bg-white/90 backdrop-blur-lg rounded-xl p-2 shadow-soft-lg"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            {poseInstructions.map((pose, index) => (
                                <button
                                    key={pose}
                                    onClick={() => {
                                      onSelectPose(index);
                                      setIsPoseMenuOpen(false);
                                    }}
                                    disabled={isLoading || index === currentPoseIndex}
                                    className="w-full text-left text-sm font-medium text-primary p-2 rounded-lg hover:bg-gray-400/10 disabled:opacity-50 disabled:bg-gray-400/20 disabled:font-bold disabled:cursor-not-allowed"
                                >
                                    {pose}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md rounded-full p-2 shadow-soft">
              <motion.button 
                onClick={handlePreviousPose}
                aria-label="Dáng trước"
                className="p-2 rounded-full hover:bg-white/80 transition-all disabled:opacity-50"
                disabled={isLoading}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeftIcon className="w-5 h-5 text-primary" />
              </motion.button>
              <button 
                onClick={() => setIsPoseMenuOpen(prev => !prev)}
                aria-haspopup="true"
                aria-expanded={isPoseMenuOpen}
                className="text-sm font-semibold text-primary w-48 text-center truncate px-2" 
                title={poseInstructions[currentPoseIndex]}
              >
                {poseInstructions[currentPoseIndex]}
              </button>
              <motion.button 
                onClick={handleNextPose}
                aria-label="Dáng sau"
                className="p-2 rounded-full hover:bg-white/80 transition-all disabled:opacity-50"
                disabled={isLoading}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRightIcon className="w-5 h-5 text-primary" />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;
