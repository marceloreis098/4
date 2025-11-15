import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ChatMessage, Equipment, License } from '../types';
import Icon from './common/Icon';
import { runChat, resetChat } from '../services/geminiService';
import { getEquipment, getLicenses, getUsers } from '../services/apiService';

interface AIAssistantProps {
    currentUser: User;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const widgetRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    useEffect(() => {
        if (!isOpen) {
            resetChat(); // Reseta a sessão do chat quando o widget é fechado
        }
    }, [isOpen]);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!widgetRef.current) return;
        setIsDragging(true);
        const widgetRect = widgetRef.current.getBoundingClientRect();
        dragStartPos.current = {
            x: e.clientX - widgetRect.left,
            y: e.clientY - widgetRect.top,
        };
    };

    const handleDrag = useCallback((e: MouseEvent) => {
        if (!isDragging || !widgetRef.current) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStartPos.current.x,
            y: e.clientY - dragStartPos.current.y
        });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDrag, handleDragEnd]);
    
    const formatDataForContext = (equipment: Equipment[], licenses: License[], users: User[]): string => {
        let context = "Equipamentos:\n";
        equipment.forEach(e => {
            context += `- ${e.equipamento} (Serial: ${e.serial}, Status: ${e.status}, Usuário: ${e.usuarioAtual || 'N/A'})\n`;
        });
        context += "\nLicenças:\n";
        licenses.forEach(l => {
            context += `- ${l.produto} (Usuário: ${l.usuario}, Expira em: ${l.dataExpiracao || 'Perpétua'})\n`;
        });
        context += "\nUsuários:\n";
        users.forEach(u => {
            context += `- ${u.realName} (Username: ${u.username}, Role: ${u.role})\n`;
        });
        return context;
    };


    const handleSend = async () => {
        if (!input.trim()) return;
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const [equipment, licenses, users] = await Promise.all([
                getEquipment(currentUser),
                getLicenses(currentUser),
                getUsers()
            ]);
            const context = formatDataForContext(equipment, licenses, users);
            
            const responseText = await runChat(input, context);
            const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Desculpe, não consegui obter uma resposta. Tente novamente." }] };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-brand-primary text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-transform hover:scale-110"
                    aria-label="Abrir Assistente IA"
                >
                    <Icon name="MessageCircle" size={32} />
                </button>
            )}

            {isOpen && (
                <div
                    ref={widgetRef}
                    className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white dark:bg-dark-card shadow-2xl rounded-lg flex flex-col z-50 animate-fade-in-up"
                    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                >
                    <header
                        onMouseDown={handleDragStart}
                        className="p-4 bg-brand-secondary text-white flex justify-between items-center rounded-t-lg cursor-move"
                    >
                        <h3 className="font-bold text-lg flex items-center gap-2"><Icon name="Bot" size={20} /> Assistente IA - ProAI</h3>
                        <button onClick={() => setIsOpen(false)} className="hover:text-gray-300" aria-label="Fechar chat">
                            <Icon name="X" size={20} />
                        </button>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-dark-bg">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-brand-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-dark-text-primary'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.parts[0].text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center gap-2">
                                         <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce"></span>
                                         <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                         <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <footer className="p-4 border-t dark:border-dark-border bg-white dark:bg-dark-card rounded-b-lg">
                        <div className="flex items-center gap-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Pergunte algo..."
                                className="flex-1 p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-primary resize-none"
                                rows={1}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="bg-brand-primary text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                aria-label="Enviar mensagem"
                            >
                                <Icon name="Send" size={20} />
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </>
    );
};

export default AIAssistant;