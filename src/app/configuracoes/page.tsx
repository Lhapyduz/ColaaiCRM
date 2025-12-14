'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiSave, FiCheck, FiTrash2 } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

const colorPresets = [
    { name: 'Laranja', primary: '#ff6b35', secondary: '#2d3436' },
    { name: 'Vermelho', primary: '#e74c3c', secondary: '#2c3e50' },
    { name: 'Azul', primary: '#3498db', secondary: '#1a1a2e' },
    { name: 'Verde', primary: '#00b894', secondary: '#1e272e' },
    { name: 'Roxo', primary: '#9b59b6', secondary: '#1a1a2e' },
    { name: 'Rosa', primary: '#e84393', secondary: '#2d3436' },
    { name: 'Amarelo', primary: '#f39c12', secondary: '#2c3e50' },
    { name: 'Cyan', primary: '#00cec9', secondary: '#1e272e' }
];

export default function ConfiguracoesPage() {
    const { user, userSettings, updateSettings, signOut, previewSettings } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [appName, setAppName] = useState(userSettings?.app_name || 'Cola Aí');
    const [primaryColor, setPrimaryColor] = useState(userSettings?.primary_color || '#ff6b35');
    const [secondaryColor, setSecondaryColor] = useState(userSettings?.secondary_color || '#2d3436');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        try {
            const { error } = await updateSettings({
                app_name: appName,
                primary_color: primaryColor,
                secondary_color: secondaryColor
            });

            if (!error) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/logo.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(fileName);

            await updateSettings({ logo_url: publicUrl });
        } catch (error) {
            console.error('Error uploading logo:', error);
        } finally {
            setUploading(false);
        }
    };

    const applyPreset = (preset: typeof colorPresets[0]) => {
        setPrimaryColor(preset.primary);
        setSecondaryColor(preset.secondary);
        previewSettings({ primary_color: preset.primary, secondary_color: preset.secondary });
    };

    const handleRemoveLogo = async () => {
        if (!user || !userSettings?.logo_url) return;

        try {
            // Extract filename from URL and delete from storage
            const urlParts = userSettings.logo_url.split('/');
            const fileName = `${user.id}/${urlParts[urlParts.length - 1]}`;

            await supabase.storage
                .from('logos')
                .remove([fileName]);

            // Update settings to remove logo_url
            await updateSettings({ logo_url: null } as any);
        } catch (error) {
            console.error('Error removing logo:', error);
        }
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Configurações</h1>
                    <p className={styles.subtitle}>Personalize seu aplicativo</p>
                </div>

                <div className={styles.content}>
                    {/* Appearance Settings */}
                    <Card className={styles.settingsCard}>
                        <h2 className={styles.cardTitle}>Aparência</h2>

                        {/* App Name */}
                        <div className={styles.settingRow}>
                            <label className={styles.settingLabel}>Nome do Negócio</label>
                            <Input
                                value={appName}
                                onChange={(e) => {
                                    setAppName(e.target.value);
                                    previewSettings({ app_name: e.target.value });
                                }}
                                placeholder="Nome do seu negócio"
                            />
                        </div>

                        {/* Logo */}
                        <div className={styles.settingRow}>
                            <label className={styles.settingLabel}>Logo</label>
                            <div className={styles.logoUpload}>
                                <div className={styles.currentLogo}>
                                    {userSettings?.logo_url ? (
                                        <img src={userSettings.logo_url} alt="Logo" />
                                    ) : (
                                        <span className={styles.logoEmoji}>🌭</span>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    hidden
                                />
                                <Button
                                    variant="outline"
                                    leftIcon={<FiUpload />}
                                    onClick={() => fileInputRef.current?.click()}
                                    isLoading={uploading}
                                >
                                    {userSettings?.logo_url ? 'Trocar Logo' : 'Carregar Logo'}
                                </Button>
                                {userSettings?.logo_url && (
                                    <Button
                                        variant="danger"
                                        leftIcon={<FiTrash2 />}
                                        onClick={handleRemoveLogo}
                                    >
                                        Remover
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Colors */}
                        <div className={styles.settingRow}>
                            <label className={styles.settingLabel}>Cores do Tema</label>

                            <div className={styles.colorPresets}>
                                {colorPresets.map((preset) => (
                                    <button
                                        key={preset.name}
                                        className={`${styles.presetBtn} ${primaryColor === preset.primary ? styles.active : ''}`}
                                        onClick={() => applyPreset(preset)}
                                        title={preset.name}
                                    >
                                        <span
                                            className={styles.presetColor}
                                            style={{ background: preset.primary }}
                                        />
                                        <span className={styles.presetName}>{preset.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className={styles.customColors}>
                                <div className={styles.colorPicker}>
                                    <label>Cor Principal</label>
                                    <div className={styles.colorInput}>
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => {
                                                setPrimaryColor(e.target.value);
                                                previewSettings({ primary_color: e.target.value });
                                            }}
                                        />
                                        <span>{primaryColor}</span>
                                    </div>
                                </div>
                                <div className={styles.colorPicker}>
                                    <label>Cor Secundária</label>
                                    <div className={styles.colorInput}>
                                        <input
                                            type="color"
                                            value={secondaryColor}
                                            onChange={(e) => {
                                                setSecondaryColor(e.target.value);
                                                previewSettings({ secondary_color: e.target.value });
                                            }}
                                        />
                                        <span>{secondaryColor}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className={styles.settingRow}>
                            <label className={styles.settingLabel}>Preview</label>
                            <div className={styles.preview}>
                                <div
                                    className={styles.previewSidebar}
                                    style={{ background: secondaryColor }}
                                >
                                    <div
                                        className={styles.previewLogo}
                                        style={{ background: `${primaryColor}20` }}
                                    >
                                        {userSettings?.logo_url ? (
                                            <img src={userSettings.logo_url} alt="" />
                                        ) : (
                                            <span>🌭</span>
                                        )}
                                    </div>
                                    <div
                                        className={styles.previewName}
                                        style={{ color: primaryColor }}
                                    >
                                        {appName}
                                    </div>
                                </div>
                                <div className={styles.previewContent}>
                                    <div
                                        className={styles.previewButton}
                                        style={{ background: primaryColor }}
                                    >
                                        Exemplo de Botão
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            leftIcon={saved ? <FiCheck /> : <FiSave />}
                            onClick={handleSave}
                            isLoading={saving}
                            style={saved ? { background: 'var(--accent)' } : {}}
                        >
                            {saved ? 'Salvo!' : 'Salvar Alterações'}
                        </Button>
                    </Card>

                    {/* Account Settings */}
                    <Card className={styles.settingsCard}>
                        <h2 className={styles.cardTitle}>Conta</h2>

                        <div className={styles.accountInfo}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Email</span>
                                <span className={styles.infoValue}>{user?.email}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Membro desde</span>
                                <span className={styles.infoValue}>
                                    {user?.created_at && new Intl.DateTimeFormat('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    }).format(new Date(user.created_at))}
                                </span>
                            </div>
                        </div>

                        <div className={styles.dangerZone}>
                            <h3>Sair da Conta</h3>
                            <p>Você será desconectado do sistema</p>
                            <Button variant="danger" onClick={signOut}>
                                Sair
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
