import React, { useState, useRef } from 'react';
import { X, Download, Link as LinkIcon, Upload, FileDown, ClipboardPaste } from 'lucide-react';
import "./backupModal.css"

const canPaste = typeof navigator !== 'undefined'
    && !!navigator.clipboard
    && typeof navigator.clipboard.readText === 'function';

export default function BackupModal({ mode, kind, onClose, onExportFile, onExportLink, onImportText, onImportFile }) {
    const [pasteValue, setPasteValue] = useState('');
    const fileInputRef = useRef(null);
    const kindLabel = kind === 'routines' ? 'rutinas' : 'historial';

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
            alert("No se pudo acceder al portapapeles.");
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-cont" onClick={e => e.stopPropagation()}>
                <button className="mini-btn" style={{ position: 'absolute', top: 12, right: 12 }} onClick={onClose} aria-label="Cerrar" title='Cerrar'>
                    <X size={16} />
                </button>

                {mode === 'export' ? (
                    <>
                        <h3>Exportar {kindLabel}</h3>
                        <p className="header-sub" style={{ marginBottom: 16 }}>Elegí cómo querés exportar.</p>
                        <div className='modal-btns'>
                            <button className="btns agregar" onClick={onExportFile}>
                                <FileDown size={15} /> Descargar archivo (.json)
                            </button>
                            <button className="btns agregar" onClick={onExportLink}>
                                <LinkIcon size={15} /> Copiar link
                            </button>
                        </div>
                        {kind === 'history' && (
                            <p className="header-sub" style={{ marginTop: 14, fontSize: 11 }}>
                                Si tenés muchos entrenamientos, el link puede quedar muy largo (algunos navegadores lo cortan). Para historiales grandes, mejor usá el archivo.
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <h3>Importar {kindLabel}</h3>
                        <p className="header-sub" style={{ marginBottom: 16 }}>Pegá el link o subí el archivo .json.</p>
                        <div className="input-link-cont">
                            <input
                                className="input-link"
                                placeholder="Pegá acá el link o el código..."
                                value={pasteValue}
                                onChange={e => setPasteValue(e.target.value)}
                            />

                            {canPaste && (
                                <button
                                    className="mini-btn modal"
                                    type="button"
                                    title="Pegar"
                                    aria-label="Pegar"
                                    onClick={handlePaste}
                                >
                                    <ClipboardPaste size={16} />
                                </button>
                            )}
                        </div>
                        <button
                            className="btns agregar modal"
                            disabled={!pasteValue.trim()}
                            onClick={() => onImportText(pasteValue.trim())}

                        >
                            Importar desde texto
                        </button>
                        <div className='separador-cont'>
                            <div className='separador-linea' />
                            o
                            <div className='separador-linea' />
                        </div>
                        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFileChange} />
                        <button
                            className="btns agregar"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={15} /> Subir archivo .json
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}