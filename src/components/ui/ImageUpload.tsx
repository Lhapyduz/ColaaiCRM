'use client';

import React, { useState, useRef, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { FiCamera, FiX, FiUpload, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    value: string | null;
    onChange: (url: string | null) => void;
    bucket?: string;
    folder?: string;
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    quality?: number;
    placeholder?: string;
    disabled?: boolean;
    aspectRatio?: number;
}

// Helper function to create cropped image
const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;

    await new Promise((resolve) => {
        image.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas is empty'));
                }
            },
            'image/jpeg',
            0.95
        );
    });
};

export default function ImageUpload({
    value,
    onChange,
    bucket = 'product-images',
    folder = '',
    maxSizeMB = 0.1,
    maxWidthOrHeight = 800,
    quality = 0.8,
    placeholder = 'Adicionar foto',
    disabled = false,
    aspectRatio = 1
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    React.useEffect(() => {
        setPreview(value);
    }, [value]);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const compressAndConvertToWebP = async (blob: Blob): Promise<Blob> => {
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });

        const options = {
            maxSizeMB,
            maxWidthOrHeight,
            useWebWorker: true,
            fileType: 'image/webp' as const,
            initialQuality: quality,
        };

        try {
            const compressedFile = await imageCompression(file, options);
            return compressedFile;
        } catch (err) {
            console.error('Compression error:', err);
            throw new Error('Erro ao comprimir imagem');
        }
    };

    const uploadToStorage = async (blob: Blob): Promise<string> => {
        const fileName = `${folder ? folder + '/' : ''}${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

        const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, blob, {
                contentType: 'image/webp',
                cacheControl: '31536000',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Erro ao fazer upload');
        }

        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    };

    const deleteFromStorage = async (url: string) => {
        try {
            const urlParts = url.split(`${bucket}/`);
            if (urlParts.length < 2) return;
            const filePath = urlParts[1];
            await supabase.storage.from(bucket).remove([filePath]);
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Selecione apenas imagens');
            return;
        }

        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            setImageToCrop(event.target?.result as string);
            setShowCropper(true);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleCropConfirm = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        setUploading(true);
        setShowCropper(false);

        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const compressedBlob = await compressAndConvertToWebP(croppedBlob);

            if (value) {
                await deleteFromStorage(value);
            }

            const newUrl = await uploadToStorage(compressedBlob);
            onChange(newUrl);
            setPreview(newUrl);
        } catch (err: any) {
            setError(err.message || 'Erro ao processar imagem');
            setPreview(value);
        } finally {
            setUploading(false);
            setImageToCrop(null);
        }
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setImageToCrop(null);
    };

    const handleRemove = useCallback(async () => {
        if (!value || disabled) return;

        setUploading(true);
        try {
            await deleteFromStorage(value);
            onChange(null);
            setPreview(null);
        } catch (err) {
            setError('Erro ao remover imagem');
        } finally {
            setUploading(false);
        }
    }, [value, disabled, onChange, bucket]);

    const handleClick = () => {
        if (!disabled && !uploading) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="w-full">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || uploading}
            />

            <div
                className={cn(
                    'relative w-full max-w-[200px] aspect-square rounded-lg border-2 border-dashed border-border bg-bg-tertiary cursor-pointer overflow-hidden transition-all duration-200',
                    'hover:enabled:border-primary hover:enabled:bg-primary/5',
                    preview && 'border-solid',
                    disabled && 'opacity-60 cursor-not-allowed',
                    'max-[480px]:max-w-[150px]'
                )}
                onClick={handleClick}
            >
                {uploading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary bg-bg-tertiary">
                        <FiRefreshCw className="text-[2rem] animate-spin" />
                        <span>Processando...</span>
                    </div>
                ) : preview ? (
                    <>
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                            <button
                                type="button"
                                className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-[0.8rem] font-medium bg-primary text-white cursor-pointer border-none transition-all duration-150 hover:brightness-110 max-[480px]:px-3 max-[480px]:py-1.5 max-[480px]:text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClick();
                                }}
                            >
                                <FiCamera /> Trocar
                            </button>
                            <button
                                type="button"
                                className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-[0.8rem] font-medium bg-error/90 text-white cursor-pointer border-none transition-all duration-150 hover:bg-error max-[480px]:px-3 max-[480px]:py-1.5 max-[480px]:text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove();
                                }}
                            >
                                <FiX /> Remover
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                        <FiUpload size={32} />
                        <span className="text-sm">{placeholder}</span>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-2 text-[0.8125rem] text-error">{error}</p>
            )}

            {/* Crop Modal */}
            {showCropper && imageToCrop && (
                <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-9999 p-5">
                    <div className="bg-bg-secondary rounded-lg max-w-[500px] w-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                        <div className="px-5 py-4 border-b border-border">
                            <h3 className="m-0 text-lg font-semibold text-text-primary">Recortar Imagem</h3>
                        </div>
                        <div className="relative h-[350px] bg-black max-[480px]:h-[280px]">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspectRatio}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                cropShape="rect"
                                showGrid={false}
                            />
                        </div>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                            <span className="text-sm text-text-secondary min-w-[40px]">Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-1 h-1 appearance-none bg-border rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                            />
                        </div>
                        <div className="flex gap-3 px-5 py-4 justify-end">
                            <button
                                type="button"
                                className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-[0.9375rem] font-medium bg-bg-tertiary text-text-secondary cursor-pointer border-none transition-all duration-150 hover:bg-border"
                                onClick={handleCropCancel}
                            >
                                <FiX /> Cancelar
                            </button>
                            <button
                                type="button"
                                className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-[0.9375rem] font-medium bg-primary text-white cursor-pointer border-none transition-all duration-150 hover:brightness-110"
                                onClick={handleCropConfirm}
                            >
                                <FiCheck /> Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
