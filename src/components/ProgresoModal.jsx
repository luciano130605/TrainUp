import React, { useMemo } from 'react';
import { X, Flame } from 'lucide-react';
import './progreso.css';

const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const HEATMAP_WEEKS = 18;
const MUSCLE_BASE_RECOVERY_HOURS = 48;
const MUSCLE_MAX_RECOVERY_HOURS = 120;

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

function buildHeatmapGrid(history, weeks) {
    const totalDays = weeks * 7;
    const today = startOfDay(new Date());
    const todayDow = today.getDay();
    const end = new Date(today.getTime() + (6 - todayDow) * 86400000);
    const start = new Date(end.getTime() - (totalDays - 1) * 86400000);

    const volByDay = new Map();
    history.forEach(e => {
        const key = startOfDay(new Date(e.date)).getTime();
        volByDay.set(key, (volByDay.get(key) || 0) + (e.totalVolume || 0));
    });
    const maxVol = Math.max(1, ...volByDay.values());

    const grid = [];
    let col = [];
    for (let i = 0; i < totalDays; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        const key = d.getTime();
        const vol = volByDay.get(key) || 0;
        const isFuture = d.getTime() > today.getTime();
        let level = 0;
        if (!isFuture && vol > 0) {
            const ratio = vol / maxVol;
            level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
        }
        col.push({ date: d, vol, level, isFuture });
        if (d.getDay() === 6) { grid.push(col); col = []; }
    }
    if (col.length) grid.push(col);
    return { grid, maxVol };
}

function monthLabelsFor(grid) {
    const labels = [];
    let lastMonth = null;
    grid.forEach((week, i) => {
        const firstDay = week[0]?.date;
        if (firstDay) {
            const m = firstDay.getMonth();
            if (m !== lastMonth) {
                labels.push({ index: i, label: MESES_ABR[m] });
                lastMonth = m;
            }
        }
    });
    return labels;
}

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
    const { grid, maxVol } = useMemo(() => buildHeatmapGrid(history, HEATMAP_WEEKS), [history]);
    const monthLabels = useMemo(() => monthLabelsFor(grid), [grid]);
    const recovery = useMemo(() => buildMuscleRecovery(history), [history]);

    const colWidth = 14; // 11px celda + 3px gap

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
                    <>

                        <div className="progreso-seccion">
                            <p className="header-sub" style={{ marginBottom: 10 }}>
                                Estimado según cuánto entrenaste cada músculo la última vez, comparado con tu propio historial. No es un dato médico.
                            </p>
                            {recovery.map(r => (
                                <div key={r.muscle} className="musc-recovery-card">
                                    <div className="musc-recovery-top">
                                        <span className="musc-recovery-nombre">{r.muscle}</span>
                                        <span className={`musc-recovery-estado ${r.recovered ? 'ok' : ''}`}>
                                            {r.recovered ? 'Recuperado' : `${r.pct}%`}
                                        </span>
                                    </div>
                                    <div className="musc-recovery-bar">
                                        <div
                                            className="musc-recovery-fill"
                                            style={{ width: `${r.pct}%`, background: r.recovered ? 'var(--acento)' : undefined }}
                                        />
                                    </div>
                                    <div className="musc-recovery-sub">
                                        {r.daysSince === 0 ? 'Entrenado hoy' : `Hace ${r.daysSince} día${r.daysSince !== 1 ? 's' : ''}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}