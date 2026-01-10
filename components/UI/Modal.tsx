import React, { MouseEvent } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="bg-zuno-card border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-slideUp">
                {title && (
                    <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
                )}
                {children}
            </div>
        </div>
    );
};
