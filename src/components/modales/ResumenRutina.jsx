import React, { useEffect, useMemo, useState } from 'react';
import { X, Trophy, Check } from 'lucide-react';
import { sileo } from 'sileo';
import { AirDrop } from '../../icons/icons';

function formatDuracion(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
}

// ---- Hook simple de count-up (ease-out cúbico) para animar números ----
function useCountUp(target, duration = 700) {
    const [value, setValue] = React.useState(0);
    React.useEffect(() => {
        let raf;
        let start = null;
        function step(ts) {
            if (start === null) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(target * eased);
            if (progress < 1) raf = requestAnimationFrame(step);
        }
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);
    return value;
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

    const animatedSets = useCountUp(totalSets);
    const animatedVolume = useCountUp(totalVolume);
    const animatedDuracion = useCountUp(duracionMs, 700);

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
        <div className="modal-overlay fixed flex" onClick={onClose}>
            <div className="ejercicio-modal resumen-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                    <div>
                        <h3 style={{ margin: 0 }}>Rutina terminada</h3>
                        <p className="sub" style={{ marginTop: 2 }}>{routineName}</p>
                    </div>
                    <div className="flex gap8">
                        <button
                            type="button"
                            className="btn-circle small"
                            title="Compartir"
                            disabled={procesando}
                            onClick={handleCompartir}
                        >
                            <AirDrop size={16} />
                        </button>
                        <button type="button" className="btn-circle small" title="Cerrar" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="stats-cont">
                    <div className="stats-item">
                        <div className="stat-num">{formatDuracion(animatedDuracion)}</div>
                        <div className="stat-label">Duración</div>
                    </div>
                    <div className="stats-item">
                        <div className="stat-num">{Math.round(animatedSets)}</div>
                        <div className="stat-label">Series</div>
                    </div>
                    <div className="stats-item">
                        <div className="stat-num">{Math.round(animatedVolume).toLocaleString('es-AR')}</div>
                        <div className="stat-label">Kg totales</div>
                    </div>
                </div>

                {prs.length > 0 && (
                    <div className="record-section">
                        <div className="section-label record-section-label">Récords nuevos</div>
                        <div className="record-list">
                            {prs.map((p, i) => (
                                <div className="record-item" key={i}>
                                    <span className="record-icon"><Trophy size={14} /></span>
                                    <span className="record-name">{p.nombre}</span>
                                    <span className="record-val">{p.weight}kg × {p.reps}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="modal-footer resumen-footer">
                    <button
                        type="button"
                        role="checkbox"
                        aria-checked={guardar}
                        className={`guardar-toggle ${guardar ? 'checked' : ''}`}
                        onClick={() => setGuardar(v => !v)}
                    >
                        <span className="check-box borde borderRadiusCards flex justifyContentCenter">
                            <Check size={13} strokeWidth={3} className="icon" />
                        </span>
                        Guardar esta sesión en el historial
                    </button>

                    <button
                        type="button"
                        className="add-exercise-btn"
                        onClick={() => onConfirm(guardar)}
                    >
                        {guardar ? 'Guardar y salir' : 'Salir sin guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}