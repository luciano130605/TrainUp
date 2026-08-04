import React, { useMemo, useState } from 'react';
import { X, Share2, Trophy, Check } from 'lucide-react';
import { sileo } from 'sileo';
import './resumenRutina.css';
import { AirDrop } from '../icons/icons';

function formatDuracion(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
}

export default function ResumenRutina({ session, routineName, prs = [], onClose, onConfirm }) {
    const [guardar, setGuardar] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const finishedAtRef = React.useRef(Date.now());

    const { totalSets, totalVolume, duracionMs, ejerciciosHechos } = useMemo(() => {
        let sets = 0, volume = 0, ejercicios = 0;
        (session?.exercises || []).forEach(ex => {
            const hechos = ex.sets.filter(st => st.done);
            if (hechos.length > 0) ejercicios += 1;
            sets += hechos.length;
            hechos.forEach(st => { volume += (+st.weight || 0) * (+st.reps || 0); });
        });
        const dur = finishedAtRef.current - session.startedAt - (session.pausedMs || 0);
        return { totalSets: sets, totalVolume: volume, duracionMs: dur, ejerciciosHechos: ejercicios };
    }, [session]);

    const resumenTexto = useMemo(() => {
        const lineas = [
            `${routineName} — resumen`,
            `${ejerciciosHechos} ejercicios · ${totalSets} series · ${Math.round(totalVolume).toLocaleString('es-AR')} kg totales`,
            `Duración: ${formatDuracion(duracionMs)}`,
        ];
        if (prs.length > 0) {
            lineas.push('', 'Récords nuevos:');
            prs.forEach(p => lineas.push(`· ${p.nombre}: ${p.weight}kg × ${p.reps}`));
        }
        return lineas.join('\n');
    }, [routineName, ejerciciosHechos, totalSets, totalVolume, duracionMs, prs]);

    async function handleCompartir() {
        setProcesando(true);
        try {
            if (navigator.share) {
                await navigator.share({ title: `${routineName} — resumen`, text: resumenTexto });
                return;
            }
            await navigator.clipboard.writeText(resumenTexto);
            sileo.success({ title: 'Resumen copiado', description: 'Tu navegador no soporta compartir directamente.' });
        } catch (err) {
            if (err?.name !== 'AbortError') {
                console.error('Error compartiendo resumen:', err);
                sileo.success({ title: 'No se pudo compartir', description: 'Intentá de nuevo en un momento.' });
            }
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="resumen-modal" onClick={e => e.stopPropagation()}>
                <div className="resumen-modal-head">
                    <h3 style={{ margin: 0 }}>Rutina terminada</h3>
                    <div className='acciones-cont'>
                        <button type="button" className="mini-btn" disabled={procesando} onClick={handleCompartir}>
                            <AirDrop size={14} />
                        </button>
                        <button type="button" className="mini-btn" title="Cerrar" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="resumen-card">
                    <div className="resumen-stats">
                        <div className="resumen-stat">
                            <p>Duración</p>
                            <b>{formatDuracion(duracionMs)}</b>
                        </div>
                        <div className="resumen-stat">
                            <p>Series</p>
                            <b>{totalSets}</b>
                        </div>
                        <div className="resumen-stat">
                            <p>Volumen</p>
                            <b>{Math.round(totalVolume).toLocaleString('es-AR')}</b>
                        </div>
                    </div>

                    {prs.length > 0 && (
                        <div className="resumen-prs">
                            <div className="resumen-prs-title"><Trophy size={13} /> Récords nuevos</div>
                            {prs.map((p, i) => (
                                <div key={i} className="resumen-prs-item">
                                    <span>{p.nombre}</span>
                                    <span>{p.weight}kg × {p.reps}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    role="checkbox"
                    aria-checked={guardar}
                    className={`resumen-check ${guardar ? 'checked' : ''}`}
                    onClick={() => setGuardar(v => !v)}
                >
                    <span className="resumen-check-box">
                        <Check size={13} strokeWidth={3} />
                    </span>
                    Guardar esta sesión en el historial
                </button>

                <button
                    type="button"
                    className="btns primario"
                    style={{ marginTop: 10 }}
                    onClick={() => onConfirm(guardar)}
                >
                    {guardar ? 'Guardar y salir' : 'Salir sin guardar'}
                </button>
            </div>
        </div>
    );
}