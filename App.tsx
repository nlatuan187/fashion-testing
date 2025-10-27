/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation } from './services/geminiService';
import { OutfitLayer, WardrobeItem } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import { getFriendlyErrorMessage, urlToFile } from './lib/utils';
import Spinner from './components/Spinner';

const POSE_INSTRUCTIONS = [
  "Chụp chính diện, tay chống hông",
  "Hơi xoay người, góc 3/4",
  "Chụp góc nghiêng",
  "Nhảy lên, chụp khoảnh khắc",
  "Đi bộ về phía máy ảnh",
  "Dựa vào tường",
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Ensure window.matchMedia is available
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    
    // Handler for when the media query status changes
    const handleChange = () => {
      setMatches(mediaQueryList.matches);
    }
    
    // Set the initial value
    handleChange();
    
    // Add listener for changes
    mediaQueryList.addEventListener('change', handleChange);
    
    // Cleanup listener on component unmount
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]); // Only re-run effect if the query string changes

  return matches;
};


const App: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(true);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;

    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    // Return the image for the current pose, or fallback to the first available image for the current layer.
    // This ensures an image is shown even while a new pose is generating.
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{
      garment: null,
      poseImages: { [POSE_INSTRUCTIONS[0]]: url }
    }]);
    setCurrentOutfitIndex(0);
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;
    
    // Close the sheet on mobile after selection
    if (isMobile) {
      setIsSheetCollapsed(true);
    }

    // Caching: Check if we are re-applying a previously generated layer
    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentPoseIndex(0); // Reset pose when changing layer
        return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Đang thêm ${garmentInfo.name}...`);

    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile);
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        // A new garment layer always starts with the default pose
        poseImages: { [POSE_INSTRUCTIONS[0]]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => {
        // Cut the history at the current point before adding the new layer
        const newHistory = prevHistory.slice(0, currentOutfitIndex + 1);
        return [...newHistory, newLayer];
      });
      setCurrentOutfitIndex(prev => prev + 1);
      setCurrentPoseIndex(0);
      
      // Add to personal wardrobe if it's not already there
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err) {
      // FIX: The `err` object from a catch block is of type `unknown`.
      // It must be converted to a string before being used with `setError`.
      setError(getFriendlyErrorMessage(err, 'Không thể mặc trang phục'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, outfitHistory, currentOutfitIndex, isMobile]);

  const handleRegenerateLayer = useCallback(async (layerIndex: number) => {
    if (isLoading || layerIndex < 1 || layerIndex >= outfitHistory.length) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Đang tạo lại thử đồ...');

    try {
      const layerToRegenerate = outfitHistory[layerIndex];
      const previousLayer = outfitHistory[layerIndex - 1];
      const garmentInfo = layerToRegenerate.garment;

      if (!garmentInfo || !previousLayer) {
        throw new Error("Thông tin trang phục hoặc lớp trước đó không hợp lệ.");
      }
      
      // Always use the first available pose of the previous layer as a stable base
      const baseImageUrl = Object.values(previousLayer.poseImages)[0];
      if (!baseImageUrl) {
        throw new Error("Không tìm thấy hình ảnh cơ sở để tạo lại.");
      }

      const garmentFile = await urlToFile(garmentInfo.url, garmentInfo.name);
      const newImageUrl = await generateVirtualTryOnImage(baseImageUrl, garmentFile);
      const defaultPoseInstruction = POSE_INSTRUCTIONS[0];

      setOutfitHistory(prevHistory => {
        // Truncate history to discard layers above the one being regenerated
        const newHistory = prevHistory.slice(0, layerIndex + 1);
        
        // Create a fresh layer object, clearing any previous pose variations
        const newLayer: OutfitLayer = {
          garment: garmentInfo,
          poseImages: { [defaultPoseInstruction]: newImageUrl }
        };
        
        // Replace the old layer with the new one
        newHistory[layerIndex] = newLayer;
        return newHistory;
      });

      // Set the view to this newly regenerated layer and reset pose
      setCurrentOutfitIndex(layerIndex);
      setCurrentPoseIndex(0);

    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Không thể tạo lại trang phục'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [isLoading, outfitHistory]);

  const handleRemoveLayer = (layerIndex: number) => {
    if (isLoading) return;
    
    // Removing the base layer (index 0) is equivalent to starting over
    if (layerIndex === 0) {
      handleStartOver();
      return;
    }

    if (layerIndex > 0 && layerIndex < outfitHistory.length) {
      // Remove the target layer and all subsequent layers by slicing the history
      setOutfitHistory(prev => prev.slice(0, layerIndex));
      // Set the current outfit to be the one before the removed one
      setCurrentOutfitIndex(layerIndex - 1);
      setCurrentPoseIndex(0); // Reset pose
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];

    // If pose already exists, just update the index to show it.
    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    // Pose doesn't exist, so generate it.
    // Use an existing image from the current layer as the base.
    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return; // Should not happen

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Đang đổi dáng...`);
    
    const prevPoseIndex = currentPoseIndex;
    // Optimistically update the pose index so the pose name changes in the UI
    setCurrentPoseIndex(newIndex);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const updatedLayer = newHistory[currentOutfitIndex];
        updatedLayer.poseImages[poseInstruction] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      // FIX: The `err` object from a catch block is of type `unknown`.
      // It must be converted to a string before being used with `setError`.
      setError(getFriendlyErrorMessage(err, 'Không thể đổi dáng'));
      // Revert pose index on failure
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

  return (
    <div className="font-sans text-primary">
      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div
            key="start-screen"
            className="w-screen min-h-screen flex items-start sm:items-center justify-center bg-soft-bg p-4 pb-20"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className="relative flex flex-col h-screen bg-soft-bg overflow-hidden"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className="flex-1 min-h-0 relative flex flex-col md:flex-row overflow-hidden">
              <div className="relative flex-1 min-h-0 flex items-start justify-center overflow-y-auto p-4 md:p-6">
                <Canvas 
                  displayImageUrl={displayImageUrl}
                  onStartOver={handleStartOver}
                  isLoading={isLoading}
                  loadingMessage={loadingMessage}
                  onSelectPose={handlePoseSelect}
                  poseInstructions={POSE_INSTRUCTIONS}
                  currentPoseIndex={currentPoseIndex}
                  availablePoseKeys={availablePoseKeys}
                />
              </div>

              <aside 
                className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-soft-bg/80 backdrop-blur-xl flex flex-col md:shadow-soft-lg transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-3.5rem)]' : 'translate-y-0'} md:translate-y-0`}
                style={{ transitionProperty: 'transform' }}
              >
                  <div 
                    onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                    className="md:hidden flex-shrink-0 w-full h-14 flex items-center justify-between px-4 cursor-pointer border-t border-gray-200/60"
                    role="button"
                    aria-expanded={!isSheetCollapsed}
                    aria-controls="wardrobe-content"
                    aria-label={isSheetCollapsed ? 'Mở rộng bảng' : 'Thu gọn bảng'}
                  >
                    <h2 className="text-xl font-serif text-primary tracking-wide">Trang phục & Tủ đồ</h2>
                    {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-secondary" /> : <ChevronDownIcon className="w-6 h-6 text-secondary" />}
                  </div>
                  <div id="wardrobe-content" className="p-4 md:p-6 pb-20 overflow-y-auto flex-grow flex flex-col gap-8">
                    {error && (
                      <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-4 rounded-md" role="alert">
                        <p className="font-bold">Lỗi</p>
                        <p>{error}</p>
                      </div>
                    )}
                    <OutfitStack 
                      outfitHistory={activeOutfitLayers}
                      onRemoveLayer={handleRemoveLayer}
                      onRegenerateLayer={handleRegenerateLayer}
                      isLoading={isLoading}
                      currentOutfitIndex={currentOutfitIndex}
                    />
                    <WardrobePanel
                      onGarmentSelect={handleGarmentSelect}
                      activeGarmentIds={activeGarmentIds}
                      isLoading={isLoading}
                      wardrobe={wardrobe}
                    />
                  </div>
              </aside>
            </main>
            <AnimatePresence>
              {isLoading && isMobile && (
                <motion.div
                  className="fixed inset-0 bg-soft-bg/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
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
          </motion.div>
        )}
      </AnimatePresence>
      <Footer isOnDressingScreen={!!modelImageUrl} />
    </div>
  );
};

export default App;