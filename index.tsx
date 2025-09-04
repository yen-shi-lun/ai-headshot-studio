/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";
import Cropper from 'cropperjs';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = "gemini-2.5-flash-image-preview";

// Data Presets
const SIZE_PRESETS = [
  {
    id: 'passport',
    name: '護照照',
    size_mm: { width: 35, height: 45 },
    size_inch: { width: 1.38, height: 1.77 },
    size_px: { width: 413, height: 531 },
    note: '國際標準護照/簽證常用尺寸'
  },
  {
    id: 'taiwan_id',
    name: '台灣身分證／健保卡',
    size_mm: { width: 33, height: 48 },
    size_inch: { width: 1.30, height: 1.89 },
    size_px: { width: 390, height: 567 },
    note: '台灣官方證件規格'
  },
  {
    id: 'us_visa',
    name: '美國簽證／USCIS',
    size_mm: { width: 51, height: 51 },
    size_inch: { width: 2.0, height: 2.0 },
    size_px: { width: 600, height: 600 },
    note: '美國常見規格，頭部比例有嚴格規定'
  },
  {
    id: 'resume',
    name: '商務履歷照（4:5）',
    size_mm: { width: 40, height: 50 },
    size_inch: { width: 1.57, height: 1.97 },
    size_px: { width: 472, height: 590 },
    note: '建議 4:5 比例，適合 LinkedIn、履歷'
  },
  {
    id: 'avatar',
    name: '社群頭像（1:1）',
    size_mm: null,
    size_inch: null,
    size_px: { width: 600, height: 600 },
    note: '1:1 正方形，適合 FB/IG/Line/LinkedIn 頭像'
  },
  {
    id: 'cover',
    name: '封面照（16:9）',
    size_mm: null,
    size_inch: null,
    size_px: { width: 1920, height: 1080 },
    note: '16:9 比例，適合簡報首圖、FB/LinkedIn 封面'
  }
] as const;

// UI Elements
const imageUpload = document.getElementById("image-upload") as HTMLInputElement;
const fileNameSpan = document.getElementById("file-name");
const generateButton = document.getElementById("generate-button") as HTMLButtonElement;
const loadingIndicator = document.getElementById("loading-indicator");
const errorMessage = document.getElementById("error-message");
const cropSelect = document.getElementById("crop-select") as HTMLSelectElement;
const sizeDetails = document.getElementById("size-details");

const originalImageContainer = document.getElementById("original-image-container");
const editedImageContainer = document.getElementById("edited-image-container");
const originalImageGallery = document.getElementById("original-image-gallery");
const editedImageGallery = document.getElementById("edited-image-gallery");

// Cropper Modal Elements
const cropModal = document.getElementById("crop-modal") as HTMLDivElement;
const imageToCrop = document.getElementById("image-to-crop") as HTMLImageElement;
const confirmCropButton = document.getElementById("confirm-crop-button") as HTMLButtonElement;
const cancelCropButton = document.getElementById("cancel-crop-button") as HTMLButtonElement;


// App State
let uploadedImage: { mimeType: string; data: string; } | null = null;
let cropper: Cropper | null = null;
let originalFile: File | null = null;

// --- Event Listeners ---

imageUpload.addEventListener("change", handleImageUpload);
generateButton.addEventListener("click", generateEditedImages);
cropSelect.addEventListener("change", () => updateSizeDetails(cropSelect.value));
confirmCropButton.addEventListener("click", handleCropConfirm);
cancelCropButton.addEventListener("click", handleCropCancel);


function updateSizeDetails(presetId: string) {
    const preset = SIZE_PRESETS.find(p => p.id === presetId);
    if (!preset || !sizeDetails) return;

    let badgesHTML = '';
    if (preset.size_mm) {
        badgesHTML += `<span class="size-badge">mm: ${preset.size_mm.width} × ${preset.size_mm.height}</span>`;
    }
    if (preset.size_inch) {
        badgesHTML += `<span class="size-badge">inch: ${preset.size_inch.width} × ${preset.size_inch.height}</span>`;
    }
    if (preset.size_px) {
        badgesHTML += `<span class="size-badge">px (300dpi): ${preset.size_px.width} × ${preset.size_px.height}</span>`;
    }

    sizeDetails.innerHTML = `
        <div class="size-badges">${badgesHTML}</div>
        <p class="size-note">備註：${preset.note}</p>
    `;
}


function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        originalFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                openCropModal(e.target.result);
            }
        };
        reader.readAsDataURL(file);
    }
}

function openCropModal(imageSrc: string) {
    if (cropModal && imageToCrop) {
        imageToCrop.src = imageSrc;
        cropModal.style.display = "flex";

        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(imageToCrop, {
            aspectRatio: 0,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            background: false,
        });
    }
}

function handleCropConfirm() {
    if (cropper && originalFile) {
        const croppedCanvas = cropper.getCroppedCanvas();
        const croppedImageDataUrl = croppedCanvas.toDataURL(originalFile.type);
        
        const base64Data = croppedImageDataUrl.split(",")[1];
        uploadedImage = {
            mimeType: originalFile.type,
            data: base64Data,
        };
        
        if (fileNameSpan) {
            fileNameSpan.textContent = originalFile.name;
        }

        displayOriginalImage(croppedImageDataUrl);
        updateButtonState();
        closeCropModal();
    }
}

function handleCropCancel() {
    if (fileNameSpan) {
       fileNameSpan.textContent = "尚未選擇檔案";
    }
    uploadedImage = null;
    originalFile = null;
    imageUpload.value = ""; // Allow re-uploading the same file
    updateButtonState();
    closeCropModal();
}

function closeCropModal() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (cropModal) {
        cropModal.style.display = "none";
    }
}


function updateButtonState() {
    generateButton.disabled = !uploadedImage;
}

function displayOriginalImage(src: string) {
    if (originalImageGallery && originalImageContainer) {
        originalImageGallery.innerHTML = "";
        const img = new Image();
        img.src = src;
        img.alt = "上傳的原始圖片";
        originalImageGallery.appendChild(img);
        originalImageContainer.style.display = "block";
    }
}

function setLoading(isLoading: boolean) {
    if (loadingIndicator && generateButton && errorMessage) {
        loadingIndicator.style.display = isLoading ? "flex" : "none";
        generateButton.disabled = isLoading;
        if (isLoading) {
             errorMessage.style.display = 'none';
             if (editedImageContainer) editedImageContainer.style.display = 'none';
             if (editedImageGallery) editedImageGallery.innerHTML = '';
        }
    }
}

function displayError(message: string) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

async function generateEditedImages() {
    if (!uploadedImage) {
        displayError("請先上傳一張照片。");
        return;
    }

    setLoading(true);

    try {
        const style = (document.getElementById("style-select") as HTMLSelectElement).value;
        const outfit = (document.getElementById("outfit-select") as HTMLSelectElement).value;
        const effect = (document.getElementById("effect-select") as HTMLSelectElement).value;
        const pose = (document.getElementById("pose-select") as HTMLSelectElement).value;
        const variations = parseInt((document.getElementById("variations-input") as HTMLInputElement).value, 10);
        const cropId = cropSelect.value;
        
        const selectedPreset = SIZE_PRESETS.find(p => p.id === cropId);
        if (!selectedPreset) {
            displayError("無效的尺寸選項，請重新選擇。");
            setLoading(false);
            return;
        }
        const crop = selectedPreset.name;


        // Construct the detailed prompt
        const prompt = `你是一位專業人像修圖師。保留上傳人物的臉部特徵、髮型與真實比例，不可變形或過度美肌。

請針對照片進行以下處理：
1. 膚色均勻、去除油光與小瑕疵，但需保留毛孔與真實質感。
2. 根據「${style}」生成背景：
   - 白底證件：標準純白背景，適合證件照、履歷與正式用途。
   - 商務灰：淺灰中性背景，搭配柔和光線，營造專業、沉穩的商務形象。
   - 科技藍漸層：由深藍到淺藍的漸層，附加科技感光暈，適合科技產業或未來感主題。
   - 品牌色：以單一品牌主色作為背景，保持乾淨簡潔，強調企業識別與個人品牌。
3. 根據「${outfit || '保留原圖服裝'}」調整人物服裝。
4. 自動調整光線，模擬柔光箱 45° 打光，讓臉部自然有立體感，眼神有光。
5. 修正色偏與白平衡，輸出高畫質（最短邊≥1600px）。
6. 若「${effect}」不為「無」，請套用指定的視覺效果濾鏡。
7. 視「${pose}」生成指定的視角與構圖，需保持人物真實五官與髮型一致，避免身份改變或面部扭曲。
8. 按「${crop}」輸出精準尺寸，若原圖比例不同，需先等比例裁切，再少量延展避免臉部變形。
9. 額外輸出一張 16:9 構圖版本，作為封面或社群橫圖。
${variations > 1 ? `10. 若 ${variations} > 1，請在同一組條件下輸出多張不同細微構圖（不改變身份）。` : ''}
${variations > 1 ? '11' : '10'}. 請保留 Google AI 的 SynthID 浮水印標記。

請以 {user_photo} 為基底，進行人像修整、背景替換、服裝設定與角度構圖。

需求：
- 背景風格：${style}
- 服裝：${outfit || '保留原圖服裝'}
- 視覺效果：${effect}
- 角度/構圖：${pose}
- 輸出比例：${crop}
- 變化張數（可選）：${variations}

規範：
- 保留人物五官/髮型/膚色特徵，不得改變身份或年齡。
- 光影需與背景一致，避免塑膠感皮膚與過度銳化。
- 若比例不同，先等比例裁切，必要時輕度延展補邊，避免臉部變形。
- 交付 PNG；若需透明去背可提供帶透明通道版本。`;
        
        const imagePart = {
            inlineData: {
                data: uploadedImage.data,
                mimeType: uploadedImage.mimeType,
            },
        };

        const textPart = {
            text: prompt,
        };
        
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (editedImageGallery && editedImageContainer) {
            editedImageGallery.innerHTML = "";
            let imageFound = false;
            let imageIndex = 0;

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    imageIndex++;
                    const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    
                    const wrapper = document.createElement('div');
                    wrapper.className = 'image-wrapper';

                    const img = new Image();
                    img.src = src;
                    img.alt = `修圖後圖片 ${imageIndex}: ${style}, ${crop}`;
                    
                    const downloadLink = document.createElement('a');
                    downloadLink.href = src;
                    downloadLink.download = `portrait-${style.replace(/\s/g, '_')}-${crop.replace(/\s/g, '_')}-${imageIndex}.png`;
                    downloadLink.textContent = '下載圖片';
                    downloadLink.className = 'download-button';
                    downloadLink.setAttribute('role', 'button');

                    wrapper.appendChild(img);
                    wrapper.appendChild(downloadLink);
                    editedImageGallery.appendChild(wrapper);
                    
                    imageFound = true;
                } else if (part.text) {
                    // Log any text part from the model
                    console.log("Model response text:", part.text);
                }
            }

            if (imageFound) {
                editedImageContainer.style.display = "block";
            } else {
                 displayError("模型未回傳圖片，請嘗試其他選項。");
            }
        }
    } catch (error) {
        console.error("Error generating images:", error);
        displayError("生成圖片時發生錯誤，請查看主控台以獲取詳細資訊。");
    } finally {
        setLoading(false);
        updateButtonState();
    }
}

// Initial setup
updateSizeDetails(cropSelect.value);