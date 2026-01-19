'use client';

import React, { useState, useRef, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { FiCamera, FiX, FiUpload, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import styles from './ImageUpload.module.css';

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

    // Set canvas size to the crop area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
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

    // Convert to blob
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
    aspectRatio = 1 // Square by default
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop states
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

        // Read file and show cropper
        const reader = new FileReader();
        reader.onload = (event) => {
            setImageToCrop(event.target?.result as string);
            setShowCropper(true);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
        };
        reader.readAsDataURL(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleCropConfirm = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        setUploading(true);
        setShowCropper(false);

        try {
            // Get cropped image
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);

            // Compress and convert to WebP
            const compressedBlob = await compressAndConvertToWebP(croppedBlob);

            // Delete old image if exists
            if (value) {
                await deleteFromStorage(value);
            }

            // Upload new image
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
        <div className={styles.container}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className={styles.hiddenInput}
                disabled={disabled || uploading}
            />

            <div
                className={`${styles.uploadArea} ${styles.square} ${preview ? styles.hasImage : ''} ${disabled ? styles.disabled : ''}`}
                onClick={handleClick}
            >
                {uploading ? (
                    <div className={styles.uploading}>
                        <FiRefreshCw className={styles.spinIcon} />
                        <span>Processando...</span>
                    </div>
                ) : preview ? (
                    <>
                        <img src={preview} alt="Preview" className={styles.previewImage} />
                        <div className={styles.imageOverlay}>
                            <button
                                type="button"
                                className={styles.changeBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClick();
                                }}
                            >
                                <FiCamera /> Trocar
                            </button>
                            <button
                                type="button"
                                className={styles.removeBtn}
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
                    <div className={styles.placeholder}>
                        <FiUpload size={32} />
                        <span>{placeholder}</span>
                    </div>
                )}
            </div>

            {error && (
                <p className={styles.error}>{error}</p>
            )}

            {/* Crop Modal */}
            {showCropper && imageToCrop && (
                <div className={styles.cropperOverlay}>
                    <div className={styles.cropperModal}>
                        <div className={styles.cropperHeader}>
                            <h3>Recortar Imagem</h3>
                        </div>
                        <div className={styles.cropperContainer}>
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
                        <div className={styles.cropperZoom}>
                            <span>Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                onChange={(e) => setZoom(Number(e.target.value))}
                            />
                        </div>
                        <div className={styles.cropperActions}>
                            <button
                                type="button"
                                className={styles.cropCancelBtn}
                                onClick={handleCropCancel}
                            >
                                <FiX /> Cancelar
                            </button>
                            <button
                                type="button"
                                className={styles.cropConfirmBtn}
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
