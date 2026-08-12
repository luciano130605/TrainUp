import React, { useState, useRef, useEffect } from 'react';
import { Download, Link as LinkIcon, Upload, ClipboardPaste } from 'lucide-react';
import "./backupModal.css"

const canPaste = typeof navigator !== 'undefined'
    && !!navigator.clipboard
    && typeof navigator.clipboard.readText === 'function';

export default function BackupModal({ mode, kind, onClose, onExportFile, onExportLink, onImportText, onImportFile }) {
    const [pasteValue, setPasteValue] = useState('');
    const fileInputRef = useRef(null);
    const kindLabel = kind === 'routines' ? 'rutinas' : 'historial';

    useEffect(() => {
        const bodyOverflow = document.body.style.overflow;
        const htmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = bodyOverflow;
            document.documentElement.style.overflow = htmlOverflow;
        };
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) onImportFile(file);
        e.target.value = '';
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setPasteValue(text);
        } catch {
            alert('No se pudo acceder al portapapeles.');
        }
    };

    return (
        <div className="modal-overlay fixed flex justifyContentCenter" onClick={onClose}>
            <div className="action-sheet" onClick={e => e.stopPropagation()}>
                <div className="action-sheet-card">
                    {mode === 'export' ? (
                        <>
                            <h3 className="action-sheet-title">Exportar {kindLabel}</h3>
                            <p className="action-sheet-desc">
                                Elegí cómo querés exportar tus datos.
                                {kind === 'history' && (
                                    <> Si tenés muchos entrenamientos, el link puede quedar muy largo y algunos
                                        navegadores lo cortan — para historiales grandes, mejor usá el archivo.</>
                                )}
                            </p>

                            <div className="action-sheet-divider" />
                            <button className="action-sheet-btn action-sheet-row" onClick={onExportFile}>
                                <span className="action-sheet-icon">
                                    <Download size={16} strokeWidth={2.25} />
                                </span>
                                Descargar archivo (.json)
                            </button>

                            <div className="action-sheet-divider" />
                            <button className="action-sheet-btn action-sheet-row" onClick={onExportLink}>
                                <span className="action-sheet-icon">
                                    <LinkIcon size={16} strokeWidth={2.25} />
                                </span>
                                Copiar link
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="action-sheet-title">Importar {kindLabel}</h3>
                            <p className="action-sheet-desc">Pegá el link o subí el archivo .json.</p>

                            <div className="action-sheet-field-block">
                                <div className="modal-search action-sheet-field">
                                    <input
                                        placeholder="Pegá acá el link o el código..."
                                        value={pasteValue}
                                        onChange={e => setPasteValue(e.target.value)}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck="false"
                                    />
                                    {canPaste && (
                                        <button
                                            className="mini-btn"
                                            type="button"
                                            title="Pegar"
                                            aria-label="Pegar"
                                            onClick={handlePaste}
                                        >
                                            <ClipboardPaste size={14} strokeWidth={2.25} />
                                        </button>
                                    )}
                                </div>

                                <button
                                    className="add-exercise-btn"
                                    disabled={!pasteValue.trim()}
                                    onClick={() => onImportText(pasteValue.trim())}
                                >
                                    Importar desde texto
                                </button>
                            </div>

                            <div className="action-sheet-o">o</div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/json"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <div className="action-sheet-divider" />
                            <button className="action-sheet-btn action-sheet-row" onClick={() => fileInputRef.current?.click()}>
                                <span className="action-sheet-icon">
                                    <Upload size={16} strokeWidth={2.25} />
                                </span>
                                Subir archivo .json
                            </button>
                        </>
                    )}
                </div>

                <button className="action-sheet-cancel" onClick={onClose}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}