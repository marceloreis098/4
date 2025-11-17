import React, { useState, useEffect } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { User } from '../types';
import Icon from './common/Icon';
import { generate2FASecret, enable2FA } from '../services/apiService';

interface Admin2FASetupModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const Admin2FASetupModal: React.FC<Admin2FASetupModalProps> = ({ user, onClose, onSuccess }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateSecret = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await generate2FASecret(user.id);
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
      } catch (err: any) {
        setError(err.message || 'Falha ao gerar o QR Code para 2FA.');
      } finally {
        setIsLoading(false);
      }
    };
    generateSecret();
  }, [user.id]);

  const handleVerifyAndEnable = async () => {
    if (!secret || token.length !== 6) {
      setError("Por favor, insira um código válido de 6 dígitos.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await enable2FA(user.id, token);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Código de verificação inválido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setToken(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerifyAndEnable();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-brand-dark dark:text-dark-text-primary">
            Configurar 2FA para {user.username}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><Icon name="X" size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <p className="text-gray-600 dark:text-dark-text-secondary mt-2 mb-6 text-center">
            O usuário precisará escanear este QR code com um aplicativo autenticador.
          </p>

          {isLoading && !error && (
            <div className="my-8 flex flex-col items-center">
              <Icon name="Loader2" className="animate-spin text-brand-primary" size={48} />
              <p className="mt-4 text-gray-500">Gerando código de segurança...</p>
            </div>
          )}

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6 text-left" role="alert">{error}</div>}

          {!isLoading && qrCodeUrl && secret && (
            <div className="my-6 space-y-6 text-left animate-fade-in">
              <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-dark-text-primary mb-2">1. Peça ao usuário para escanear este QR Code.</p>
                <div className="mt-2 p-4 border dark:border-dark-border rounded-lg bg-white inline-block">
                  <QRCode value={qrCodeUrl} size={160} level="H" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-dark-text-primary text-center">2. Ou, para inserir a chave manualmente:</p>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-center tracking-widest">{secret}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-dark-text-primary">3. Insira o código de 6 dígitos gerado pelo aplicativo para verificar.</p>
                  <input
                    id="token"
                    type="text"
                    value={token}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="mt-2 shadow appearance-none border dark:border-dark-border rounded w-full py-3 px-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-dark-text-primary text-center text-3xl tracking-[0.5em] leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="_ _ _ _ _ _"
                    autoFocus
                  />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-50 dark:bg-dark-card/50 border-t dark:border-dark-border flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
          <button type="button" onClick={handleVerifyAndEnable} disabled={isLoading || !qrCodeUrl} className="bg-brand-primary text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? 'Verificando...' : 'Verificar e Ativar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin2FASetupModal;
