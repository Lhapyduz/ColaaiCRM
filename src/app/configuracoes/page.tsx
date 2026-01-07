'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiUpload, FiSave, FiCheck, FiTrash2, FiLink, FiCopy, FiLock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import QRCodeGenerator from '@/components/ui/QRCodeGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
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
    const { canAccess } = useSubscription();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [appName, setAppName] = useState(userSettings?.app_name || 'Cola Aí');
    const [primaryColor, setPrimaryColor] = useState(userSettings?.primary_color || '#ff6b35');
    const [secondaryColor, setSecondaryColor] = useState(userSettings?.secondary_color || '#2d3436');
    const [whatsappNumber, setWhatsappNumber] = useState(userSettings?.whatsapp_number || '');
    const [publicSlug, setPublicSlug] = useState(userSettings?.public_slug || '');
    const [pixKey, setPixKey] = useState(userSettings?.pix_key || '');
    const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>(userSettings?.pix_key_type || 'cpf');
    const [merchantCity, setMerchantCity] = useState(userSettings?.merchant_city || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [slugError, setSlugError] = useState('');
    const [copied, setCopied] = useState(false);

    // Update state when userSettings changes
    useEffect(() => {
        if (userSettings) {
            setAppName(userSettings.app_name || 'Cola Aí');
            setPrimaryColor(userSettings.primary_color || '#ff6b35');
            setSecondaryColor(userSettings.secondary_color || '#2d3436');
            setWhatsappNumber(userSettings.whatsapp_number || '');
            setPublicSlug(userSettings.public_slug || '');
            setPixKey(userSettings.pix_key || '');
            setPixKeyType(userSettings.pix_key_type || 'cpf');
            setMerchantCity(userSettings.merchant_city || '');
        }
    }, [userSettings]);

    const getMenuUrl = () => {
        if (typeof window !== 'undefined' && publicSlug) {
            return `${window.location.origin}/menu/${publicSlug}`;
        }
        return '';
    };

    const handleSlugChange = (value: string) => {
        // Only allow lowercase letters, numbers, and hyphens
        const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        setPublicSlug(sanitized);
        setSlugError('');
    };

    const checkSlugAvailability = async (slug: string): Promise<boolean> => {
        if (!slug) return true;

        const { data, error } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('public_slug', slug)
            .neq('user_id', user?.id)
            .maybeSingle();

        return !data && !error;
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setSlugError('');

        try {
            // Check if slug is available
            if (publicSlug) {
                const isAvailable = await checkSlugAvailability(publicSlug);
                if (!isAvailable) {
                    setSlugError('Este link já está em uso. Escolha outro.');
                    setSaving(false);
                    return;
                }
            }

            const { error } = await updateSettings({
                app_name: appName,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                whatsapp_number: whatsappNumber || null,
                public_slug: publicSlug || null,
                pix_key: pixKey || null,
                pix_key_type: pixKeyType || null,
                merchant_city: merchantCity || null
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

    const copyMenuLink = () => {
        const url = getMenuUrl();
        if (url) {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatWhatsApp = (value: string) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');

        // Format as (XX) XXXXX-XXXX
        if (digits.length <= 2) {
            return digits;
        } else if (digits.length <= 7) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        } else {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
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
                    {/* Online Menu Settings */}
                    <Card className={styles.settingsCard}>
                        <h2 className={styles.cardTitle}>
                            <FiLink style={{ marginRight: '10px' }} />
                            Cardápio Online
                        </h2>

                        {!canAccess('digitalMenu') ? (
                            <div className={styles.blockedFeature}>
                                <FiLock className={styles.blockedIcon} />
                                <h3>Recurso não disponível no seu plano</h3>
                                <p>O Cardápio Online está disponível nos planos Avançado e Profissional.</p>
                                <a href="/assinatura" className={styles.upgradeLink}>
                                    Fazer Upgrade
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* WhatsApp Number */}
                                <div className={styles.settingRow}>
                                    <label className={styles.settingLabel}>
                                        <FaWhatsapp style={{ marginRight: '8px', color: '#25D366' }} />
                                        Número do WhatsApp
                                    </label>
                                    <Input
                                        value={formatWhatsApp(whatsappNumber)}
                                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                                        placeholder="(11) 99999-9999"
                                        maxLength={16}
                                    />
                                    <p className={styles.helpText}>
                                        Os clientes usarão este número para enviar pedidos via WhatsApp
                                    </p>
                                </div>

                                {/* Public Slug */}
                                <div className={styles.settingRow}>
                                    <label className={styles.settingLabel}>Link do Cardápio</label>
                                    <div className={styles.slugInput}>
                                        <span className={styles.slugPrefix}>
                                            {typeof window !== 'undefined' ? window.location.origin : ''}/menu/
                                        </span>
                                        <Input
                                            value={publicSlug}
                                            onChange={(e) => handleSlugChange(e.target.value)}
                                            placeholder="seu-negocio"
                                            className={styles.slugField}
                                        />
                                    </div>
                                    {slugError && <p className={styles.errorText}>{slugError}</p>}
                                    <p className={styles.helpText}>
                                        Crie um link personalizado para compartilhar seu cardápio
                                    </p>
                                </div>

                                {/* QR Code */}
                                {publicSlug && userSettings?.public_slug && (
                                    <div className={styles.settingRow}>
                                        <label className={styles.settingLabel}>QR Code do Cardápio</label>
                                        <div className={styles.qrCodeSection}>
                                            <QRCodeGenerator
                                                url={getMenuUrl()}
                                                appName={appName}
                                                primaryColor={primaryColor}
                                            />
                                            <div className={styles.linkActions}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    leftIcon={copied ? <FiCheck /> : <FiCopy />}
                                                    onClick={copyMenuLink}
                                                >
                                                    {copied ? 'Copiado!' : 'Copiar Link'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    leftIcon={<FiLink />}
                                                    onClick={() => window.open(getMenuUrl(), '_blank')}
                                                >
                                                    Abrir Cardápio
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>

                    {/* PIX Settings */}
                    <Card className={styles.settingsCard}>
                        <h2 className={styles.cardTitle}>
                            <svg viewBox="0 0 512 512" fill="currentColor" style={{ width: 20, height: 20, marginRight: 10, color: '#32BCAD' }}>
                                <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.9 231.1 518.9 200.8 488.6L103.3 391.1H117.4C137.5 391.1 156.3 383.3 170.5 369.1L242.4 292.5zM262.5 218.9C257.1 224.4 247.9 224.5 242.4 218.9L170.5 142C156.3 127.8 137.4 119.1 117.4 119.1H103.3L200.8 22.51C231.1-7.86 280.3-7.86 310.6 22.51L407.8 119.1H392.7C372.6 119.1 353.8 127.8 339.6 142L262.5 218.9zM112.6 142.7C119.1 136.3 127.5 132.5 136.8 132.5H141.1C146.1 132.5 150.9 134.5 154.4 138L226.2 214.5C247.4 235.8 282 235.8 303.2 214.5L375 138.7C378.5 135.2 383.3 133.3 388.3 133.3H392.7C401.9 133.3 410.3 137.1 416.7 143.5L481.1 207.9C495.4 222.3 495.4 245.3 481.1 259.7L416.8 324.1C410.4 330.5 402 334.3 392.8 334.3H388.4C383.4 334.3 378.6 332.3 375.1 328.8L303.2 252.9C282 231.6 247.4 231.6 226.2 252.9L154.4 328.6C150.9 332.2 146.1 334.2 141.1 334.2H136.8C127.5 334.2 119.2 330.3 112.7 323.9L48.34 259.5C34.02 245.2 34.02 222.2 48.34 207.8L112.6 142.7z" />
                            </svg>
                            Pagamento PIX
                        </h2>

                        <div className={styles.settingRow}>
                            <label className={styles.settingLabel}>Tipo de Chave PIX</label>
                            <div className={styles.pixKeyTypes}>
                                {[
                                    { value: 'cpf', label: 'CPF' },
                                    { value: 'cnpj', label: 'CNPJ' },
                                    { value: 'email', label: 'E-mail' },
                                    { value: 'phone', label: 'Telefone' },
                                    { value: 'random', label: 'Aleatória' }
                                ].map((type) => (
                                    <button
                                        key={type.value}
                                        className={`${styles.keyTypeBtn} ${pixKeyType === type.value ? styles.active : ''}`}
                                        onClick={() => setPixKeyType(type.value as typeof pixKeyType)}
                                        type="button"
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.settingRow}>
                            <label className={styles.settingLabel}>Chave PIX</label>
                            <Input
                                value={pixKey}
                                onChange={(e) => setPixKey(e.target.value)}
                                placeholder={
                                    pixKeyType === 'cpf' ? '000.000.000-00' :
                                        pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                                            pixKeyType === 'email' ? 'email@exemplo.com' :
                                                pixKeyType === 'phone' ? '+5511999999999' :
                                                    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                                }
                            />
                            <p className={styles.helpText}>
                                Esta chave será usada para gerar QR Codes PIX nos pedidos
                            </p>
                        </div>

                        <div className={styles.settingRow}>
                            <label className={styles.settingLabel}>Cidade do Estabelecimento</label>
                            <Input
                                value={merchantCity}
                                onChange={(e) => setMerchantCity(e.target.value)}
                                placeholder="São Paulo"
                                maxLength={15}
                            />
                            <p className={styles.helpText}>
                                Cidade que aparecerá no comprovante PIX (máx. 15 caracteres)
                            </p>
                        </div>
                    </Card>

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
