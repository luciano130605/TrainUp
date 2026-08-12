import React, { useEffect } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

export default function ReordenarEjerciciosModal({
    exercises = [],
    onMove,     // (index, dir) -> dir: -1 sube, +1 baja
    onClose,
}) {
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

    return (
        <div className="modal-overlay fixed flex justifyContentCenter" onClick={onClose}>
            <div className="action-sheet" onClick={e => e.stopPropagation()}>
                <div className="action-sheet-card">
                    <h3 className="action-sheet-title">Reordenar ejercicios</h3>
                    <p className="action-sheet-desc">
                        Usá las flechas para mover cada ejercicio dentro de la rutina.
                    </p>

                    <div className="action-sheet-divider" />

                    <div style={{ maxHeight: 320, overflowY: 'auto', padding: '10px 16px' }}>
                        {exercises.length === 0 && (
                            <div className="modal-empty">No hay ejercicios para reordenar.</div>
                        )}

                        {exercises.length > 0 && (
                            <div className="friend-list">
                                {exercises.map((ex, i) => (
                                    <div key={ex.id} className="friend-row" style={{ cursor: 'default' }}>
                                        <span className="flex gap10" style={{ alignItems: 'center' }}>
                                            <span className="friend-avatar">{i + 1}</span>
                                            {ex.name}
                                        </span>

                                        <span className="flex gap8">
                                            <button
                                                type="button"
                                                className="btn-circle small"
                                                title="Subir"
                                                disabled={i === 0}
                                                onClick={() => onMove(i, -1)}
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-circle small"
                                                title="Bajar"
                                                disabled={i === exercises.length - 1}
                                                onClick={() => onMove(i, 1)}
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="action-sheet-divider" />
                    <button
                        className="action-sheet-btn"
                        style={{ fontWeight: 700 }}
                        onClick={onClose}
                    >
                        Listo
                    </button>
                </div>

                <button className="action-sheet-cancel" onClick={onClose}>
                    Cerrar
                </button>
            </div>
        </div>
    );
}