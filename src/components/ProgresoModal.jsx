import React, { useMemo } from 'react';
import { X, Check } from 'lucide-react';
import './progreso.css';

const MUSCLE_BASE_RECOVERY_HOURS = 48;
const MUSCLE_MAX_RECOVERY_HOURS = 120;

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

function buildMuscleRecovery(history) {
    const byMuscleDay = new Map();
    history.forEach(entry => {
        const dayKey = startOfDay(new Date(entry.date)).getTime();
        entry.exercises.forEach(ex => {
            const muscle = ex.parteDelCuerpo ?? ex.muscle;
            if (!muscle) return;
            const vol = ex.sets.reduce((a, s) => a + (+s.weight || 0) * (+s.reps || 0), 0);
            if (!byMuscleDay.has(muscle)) byMuscleDay.set(muscle, new Map());
            const dayMap = byMuscleDay.get(muscle);
            dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + vol);
        });
    });

    const now = Date.now();
    const results = [];
    byMuscleDay.forEach((dayMap, muscle) => {
        const days = [...dayMap.keys()].sort((a, b) => b - a);
        const lastDay = days[0];
        const lastVol = dayMap.get(lastDay);
        const maxVolEver = Math.max(...dayMap.values());
        const intensityRatio = maxVolEver > 0 ? lastVol / maxVolEver : 0;
        const recoveryHours = MUSCLE_BASE_RECOVERY_HOURS + intensityRatio * (MUSCLE_MAX_RECOVERY_HOURS - MUSCLE_BASE_RECOVERY_HOURS);

        const hoursSince = (now - lastDay) / 3600000;
        const pct = Math.min(100, Math.round((hoursSince / recoveryHours) * 100));
        const daysSince = Math.floor(hoursSince / 24);

        results.push({ muscle, daysSince, pct, recovered: pct >= 100 });
    });

    return results.sort((a, b) => a.pct - b.pct);
}

export default function ProgresoModal({ history, onClose }) {
    const recovery = useMemo(() => buildMuscleRecovery(history), [history]);

    const pending = recovery.filter(r => !r.recovered);
    const recovered = recovery.filter(r => r.recovered);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-cont progreso-modal" onClick={e => e.stopPropagation()}>
                <div className="progreso-header">
                    <h3>Recuperación muscular</h3>
                    <button className="mini-btn" onClick={onClose}><X size={16} /></button>
                </div>

                {history.length === 0 ? (
                    <p className="header-sub">Entrená al menos una vez para ver tu progreso acá.</p>
                ) : (
                    <div className="progreso-body">
                        <p className="header-sub progreso-disclaimer">
                            Estimado según cuánto entrenaste cada músculo la última vez, comparado con tu propio historial. No es un dato médico.
                        </p>

                        {pending.length > 0 && (
                            <div className="progreso-seccion">
                                {pending.map(r => (
                                    <div key={r.muscle} className="musc-recovery-card">
                                        <div className="musc-recovery-ring" style={{ '--pct': r.pct }}>
                                            <span>{r.pct}%</span>
                                        </div>
                                        <div className="musc-recovery-info">
                                            <span className="musc-recovery-nombre">{r.muscle}</span>
                                            <span className="musc-recovery-sub">
                                                {r.daysSince === 0 ? 'Entrenado hoy' : `Hace ${r.daysSince} día${r.daysSince !== 1 ? 's' : ''}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {recovered.length > 0 && (
                            <div className="progreso-recuperados-seccion">
                                <div className="progreso-subtitulo">Recuperados</div>
                                <div className="musc-chip-grid">
                                    {recovered.map(r => (
                                        <div key={r.muscle} className="musc-chip">
                                            <Check size={12} className="musc-chip-check" />
                                            <span>{r.muscle}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}