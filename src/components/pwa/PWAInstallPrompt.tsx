'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiX, FiShare } from 'react-icons/fi';
import Image from 'next/image';

declare global {
    interface Navigator {
        standalone?: boolean;
    }
}

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
    appName: string;
    logoUrl?: string;
    className?: string;
}

export default function PWAInstallPrompt({ appName, logoUrl, className }: PWAInstallPromptProps) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    // Derive platform status directly in render since this component only shows on client
    // (isVisible starts false, ensuring no SSR mismatch for the main UI)
    const isBrowser = typeof window !== 'undefined';
    const isIOS = isBrowser && /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()) &&
        !(window as unknown as { MSStream: unknown }).MSStream;
    const isFirefox = isBrowser && navigator.userAgent.toLowerCase().includes('firefox');
    const isVivaldi = isBrowser && navigator.userAgent.toLowerCase().includes('vivaldi');

    useEffect(() => {
        if (!isBrowser) return;

        // Detect platform and installation status
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true;

        if (isStandalone) {
            // If already installed, we just ensure it doesn't show
            return;
        }

        // Check for permanent dismissal
        const hasDismissedPermanently = localStorage.getItem('pwa-prompt-never-show');
        const hasDismissedSession = sessionStorage.getItem('pwa-prompt-dismissed-session');

        if (hasDismissedPermanently === 'true' || hasDismissedSession === 'true') {
            return;
        }

        // Listen for installation prompt
        let gotPromptEvent = false;
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            gotPromptEvent = true;
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Delay showing to not be intrusive immediately
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Fallback: if no prompt event fires after 8 seconds, show manual instruction
        // This covers iOS, Firefox, Vivaldi, and other browsers that don't fire the event
        const fallbackTimer = setTimeout(() => {
            if (!gotPromptEvent && !isStandalone) {
                setIsVisible(true);
            }
        }, isIOS ? 5000 : 8000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            clearTimeout(fallbackTimer);
        };
    }, [isBrowser, isIOS, isFirefox]);

    const handleInstall = async () => {
        if (isIOS) return;

        if (!deferredPrompt) {
            // No deferred prompt — show browser-specific instruction
            // For Vivaldi/Firefox, the install is done via menu
            return;
        }

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        } catch (err) {
            console.error('PWA: Install error', err);
        }
    };

    const handleDismiss = (permanent: boolean = false) => {
        setIsVisible(false);
        if (permanent) {
            localStorage.setItem('pwa-prompt-never-show', 'true');
        } else {
            sessionStorage.setItem('pwa-prompt-dismissed-session', 'true');
        }
    };

    if (!isVisible || isInstalled) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                className={`fixed left-4 right-4 md:left-auto md:right-6 md:max-w-md z-dropdown transition-all duration-300 ${className || 'bottom-6'}`}
            >
                <div className="bg-bg-card/80 border border-white/10 p-5 rounded-3xl shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
                    <div className="absolute -inset-1 bg-linear-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-bg-secondary border border-white/10 shrink-0 overflow-hidden shadow-2xl relative flex items-center justify-center">
                            <Image
                                src={logoUrl || "/icon-192x192.png"}
                                alt={appName}
                                fill
                                className="object-cover"
                            />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <h3 className="text-base font-black text-text-primary truncate">Instalar {appName}</h3>
                            <p className="text-xs text-text-muted leading-relaxed font-medium">
                                {isIOS
                                    ? "Compartilhar > Adicionar à Tela de Início para ter acesso rápido."
                                    : (isFirefox || isVivaldi || !deferredPrompt)
                                        ? `Abra o menu do navegador (⋮) e selecione 'Instalar app' ou 'Instalar ${appName}'.`
                                        : "Instale como aplicativo nativo para uma experiência premium e mais rápida."}
                            </p>

                            <div className="mt-3 flex items-center gap-3">
                                {(!isIOS && !isFirefox && !isVivaldi && deferredPrompt) ? (
                                    <button
                                        onClick={handleInstall}
                                        className="bg-primary hover:bg-primary-hover text-white text-xs font-black py-2.5 px-6 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(255,107,53,0.5)] active:scale-95 flex items-center gap-2"
                                    >
                                        <FiDownload size={14} /> Instalar Agora
                                    </button>
                                ) : (
                                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-primary font-bold text-xs flex items-center gap-2">
                                        {isIOS ? <FiShare size={14} /> : <FiDownload size={14} />}
                                        {isIOS ? 'iOS: Menu Compartilhar' : 'Menu ⋮ > Instalar app'}
                                    </div>
                                )}

                                <button
                                    onClick={() => handleDismiss(true)}
                                    className="text-[10px] text-text-muted hover:text-white font-bold underline decoration-dotted underline-offset-4 transition-colors"
                                >
                                    Não mostrar mais
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => handleDismiss(false)}
                            className="bg-white/5 hover:bg-white/10 p-2 rounded-xl text-text-muted transition-all active:scale-90"
                        >
                            <FiX size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
