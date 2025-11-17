// Novo arquivo: components/ProfileModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { User } from '../types';
import Icon from './common/Icon';
import { generate2FASecret, enable2FA, disable2FA, updateUserProfile } from '../services/apiService';

interface ProfileModalProps {
    user: User;
    onClose: () => void;
    onSave: (updatedUser: User) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onSave }) => {
    const [realName, setRealName] = useState(user.realName);
    const [avatar, setAvatar] = useState(user.avatarUrl || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 2FA State
    const [is2FAEnabled, setIs2FAEnabled] = useState(user.is2FAEnabled);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [token, setToken] = useState('');
    const [error2FA, setError2FA] = useState('');
    const [loading2FA, setLoading2FA] = useState(false);

    useEffect(() => {
        // Atualiza o estado interno se o usuário mudar (após salvar, por exemplo)
        setIs2FAEnabled(user.is2FAEnabled);
    }, [user.is2FAEnabled]);
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Por favor, selecione um arquivo de imagem válido.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB
                setError('O arquivo é muito grande. O limite é de 2MB.');
                return;
            }
            setError('');
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            const updatedUserFromApi = await updateUserProfile(user.id, { realName, avatarUrl: avatar });
            onSave(updatedUserFromApi);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Falha ao salvar o perfil.';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateSecret = async () => {
        setLoading2FA(true);
        setError2FA('');
        try {
            const data = await generate2FASecret(user.id);
            setSecret(data.secret);
            setQrCodeUrl(data.qrCodeUrl);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Falha ao gerar o segredo