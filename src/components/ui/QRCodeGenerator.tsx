'use client';

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiDownload } from 'react-icons/fi';
import Button from './Button';
import styles from './QRCodeGenerator.module.css';

interface QRCodeGeneratorProps {
    url: string;
    appName?: string;
    primaryColor?: string;
}

export default function QRCodeGenerator({ url, appName = 'Cardápio', primaryColor = '#ff6b35' }: QRCodeGeneratorProps) {
    const qrRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        if (!qrRef.current) return;

        const svg = qrRef.current.querySelector('svg');
        if (!svg) return;

        // Create a canvas to draw the QR code with padding and label
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 300;
        const padding = 40;
        const labelHeight = 50;
        canvas.width = size + padding * 2;
        canvas.height = size + padding * 2 + labelHeight;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw border
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Convert SVG to image and draw
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, padding, padding, size, size);

            // Draw label
            ctx.fillStyle = primaryColor;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(appName, canvas.width / 2, size + padding + 35);

            // Download
            const link = document.createElement('a');
            link.download = `qrcode-${appName.toLowerCase().replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    return (
        <div className={styles.container}>
            <div className={styles.qrWrapper} ref={qrRef}>
                <QRCodeSVG
                    value={url}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin
                />
            </div>
            <div className={styles.info}>
                <p className={styles.url}>{url}</p>
                <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FiDownload />}
                    onClick={handleDownload}
                >
                    Baixar QR Code
                </Button>
            </div>
        </div>
    );
}
