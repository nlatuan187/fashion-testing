/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// As per guidelines, the API key must be provided via environment variables.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set. Please configure it in your environment.");
}

// Initialize the Google Gemini AI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper function to convert a File object to a GoogleGenerativeAI.Part object.
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result includes the Base64 prefix, which we need to remove.
      // e.g., "data:image/png;base64,iVBORw0KGgo..." -> "iVBORw0KGgo..."
      const base64Data = (reader.result as string).split(',')[1];
      resolve(base64Data);
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

// Helper function to convert a data URL string to a GoogleGenerativeAI.Part object.
const dataUrlToGenerativePart = (url: string) => {
    // Expected format: "data:image/png;base64,iVBORw0KGgo..."
    const parts = url.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const base64Data = parts[1];

    if (!mimeType || !base64Data) {
        throw new Error("Invalid data URL format.");
    }
    
    return {
        inlineData: {
            data: base64Data,
            mimeType: mimeType,
        },
    };
};

/**
 * Extracts the base64 image data from a Gemini API response.
 * @param response The response from the generateContent call.
 * @returns The base64 encoded image string.
 * @throws An error if no image is found in the response.
 */
const extractBase64Image = (response: GenerateContentResponse): string => {
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("Không tìm thấy hình ảnh nào trong phản hồi của API.");
};


/**
 * Generates a photorealistic model image from a user-provided photo.
 * @param userImageFile The user's image as a File object.
 * @returns A promise that resolves to a base64 encoded data URL of the generated model.
 */
export const generateModelImage = async (userImageFile: File): Promise<string> => {
    const userImagePart = await fileToGenerativePart(userImageFile);

    const prompt = `From this user-provided image, create a full-body shot from head to toe of a photorealistic fashion model.
    The model in the new image should have the same physical features (face, hair, body type) as the person in the original photo.
    Place the model in a relaxed, standing pose against a clean, minimal, solid light-grey studio background.
    The composition should be framed to make the model's legs appear long and elegant. Crucially, the model's feet must be fully visible and not cropped.
    The model should be dressed in simple, neutral-colored, form-fitting clothing (like a plain t-shirt and jeans) to serve as a neutral base for virtual try-on.
    Ensure the final image is high-resolution, well-lit, and focuses on the model.
    The final image must be fully opaque and not have any transparency.
    The output must be only the image, with no text or other artifacts.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: prompt },
                userImagePart
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const base64Image = extractBase64Image(response);
    const mimeType = response.candidates[0].content.parts.find((p: any) => p.inlineData)?.inlineData.mimeType || 'image/png';
    return `data:${mimeType};base64,${base64Image}`;
};


/**
 * Virtually tries on a garment on a model image.
 * @param modelImageUrl The data URL of the model image.
 * @param garmentFile The garment image as a File object.
 * @returns A promise that resolves to a base64 encoded data URL of the try-on result.
 */
export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentFile: File): Promise<string> => {
    const modelImagePart = dataUrlToGenerativePart(modelImageUrl);
    const garmentImagePart = await fileToGenerativePart(garmentFile);

    const prompt = `Take the person from the first image and the clothing item from the second image. 
    Create a new, photorealistic image where the person is wearing the clothing item. 
    The final image must maintain the full-body composition, pose, body shape, and background from the first image. Ensure the model's feet are not cropped.
    If the original image has elongated proportions, maintain that high-fashion aesthetic.
    The clothing should fit realistically, showing natural folds and drapes.
    The final image must be fully opaque and not have any transparency.
    The output must be only the image, with no text or other artifacts.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: prompt },
                modelImagePart,
                garmentImagePart
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const base64Image = extractBase64Image(response);
    const mimeType = response.candidates[0].content.parts.find((p: any) => p.inlineData)?.inlineData.mimeType || 'image/png';
    return `data:${mimeType};base64,${base64Image}`;
};

/**
 * Generates a variation of a model's pose based on a text instruction.
 * @param baseImageUrl The data URL of the base model image.
 * @param poseInstruction A text description of the desired new pose.
 * @returns A promise that resolves to a base64 encoded data URL of the model in the new pose.
 */
export const generatePoseVariation = async (baseImageUrl: string, poseInstruction: string): Promise<string> => {
    const baseImagePart = dataUrlToGenerativePart(baseImageUrl);

    const prompt = `Using the person in the provided image as a reference, generate a new, full-body photorealistic image from head to toe of the same person, wearing the same outfit, against the same background, but in a new pose.
    The new pose should be: "${poseInstruction}".
    The framing must ensure the model's feet are fully visible and not cropped. For a high-fashion look, compose the shot to make the model's legs appear long and elegant.
    Maintain all other details like facial features, lighting, and clothing style.
    The final image must be fully opaque and not have any transparency.
    The output must be only the image, with no text or other artifacts.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: prompt },
                baseImagePart
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const base64Image = extractBase64Image(response);
    const mimeType = response.candidates[0].content.parts.find((p: any) => p.inlineData)?.inlineData.mimeType || 'image/png';
    return `data:${mimeType};base64,${base64Image}`;
};