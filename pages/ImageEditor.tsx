import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Wand2, Download, ArrowRight } from 'lucide-react';

// Image editing feature disabled (requires external AI service)
const editImage = async (image: string, prompt: string): Promise<string | null> => {
    console.warn('Image editing feature is disabled');
    return null;
};

export const ImageEditor: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setOriginalImage(reader.result as string);
                setGeneratedImage(null); // Reset generated on new upload
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setOriginalImage(reader.result as string);
                setGeneratedImage(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!originalImage || !prompt.trim()) return;

        setIsLoading(true);
        try {
            alert("Recurso de edição de imagem desabilitado. Configure uma API de IA para usar esta funcionalidade.");
        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com a mágica. Verifique sua conexão ou API Key.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `zuno-magic-edit-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-24">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-zuno-accent mb-4">
                    <Sparkles size={24} />
                    <span className="uppercase tracking-widest text-xs font-bold">Magic Studio</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">Transforme sua visão.</h2>
                <p className="text-zuno-muted max-w-lg mx-auto">
                    Use IA para editar capas de playlists e álbuns. Basta descrever o que você quer mudar.
                </p>
            </div>

            {/* Editor Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                {/* Upload / Original Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zuno-muted uppercase tracking-wider">Original</h3>

                    {!originalImage ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="aspect-square rounded-xl border-2 border-dashed border-zuno-dark bg-zuno-dark/30 hover:bg-zuno-dark/50 hover:border-zuno-muted transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
                        >
                            <div className="p-4 rounded-full bg-zuno-black group-hover:scale-110 transition-transform">
                                <Upload className="text-zuno-muted group-hover:text-white" size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">Clique ou arraste</p>
                                <p className="text-xs text-zuno-muted mt-1">JPG, PNG (max 5MB)</p>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                    ) : (
                        <div className="relative group aspect-square rounded-xl overflow-hidden bg-zuno-black border border-white/10">
                            <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
                            <button
                                onClick={() => setOriginalImage(null)}
                                className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* Controls & Result Section */}
                <div className="space-y-4 flex flex-col h-full">
                    <h3 className="text-sm font-semibold text-zuno-muted uppercase tracking-wider">
                        {generatedImage ? 'Resultado' : 'Sua Criação'}
                    </h3>

                    {generatedImage ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-zuno-black border border-white/10 group">
                            <img src={generatedImage} alt="Generated" className="w-full h-full object-cover animate-in fade-in zoom-in duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button
                                    onClick={handleDownload}
                                    className="bg-zuno-accent text-zuno-black px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                                >
                                    <Download size={18} /> Baixar
                                </button>
                                <button
                                    onClick={() => setGeneratedImage(null)}
                                    className="bg-white text-black px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform"
                                >
                                    Novo
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center gap-6 p-6 rounded-xl bg-gradient-to-br from-zuno-dark/40 to-transparent border border-white/5">
                            {!originalImage ? (
                                <div className="text-center text-zuno-muted opacity-50">
                                    <Wand2 size={48} className="mx-auto mb-4" />
                                    <p>Faça upload de uma imagem para começar a mágica.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm text-white font-medium">O que você deseja mudar?</label>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="Ex: Adicione um filtro vintage, remova o fundo, coloque óculos escuros..."
                                            className="w-full bg-zuno-black border border-white/10 rounded-lg p-3 text-white placeholder-zuno-muted focus:outline-none focus:border-zuno-accent focus:ring-1 focus:ring-zuno-accent resize-none h-32"
                                        />
                                    </div>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading || !prompt.trim()}
                                        className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isLoading || !prompt.trim()
                                            ? 'bg-zuno-dark text-zuno-muted cursor-not-allowed'
                                            : 'bg-gradient-to-r from-zuno-accent to-emerald-400 text-zuno-black hover:scale-[1.02] shadow-lg shadow-emerald-900/20'
                                            }`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                                Criando Mágica...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 size={20} />
                                                Gerar Imagem
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
