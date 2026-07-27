import React, { useMemo } from 'react';
import { X, Check } from 'lucide-react';
import './progreso.css';
import ejerciciosLocal from '../data/ejerciciosData';


const MUSCLE_BASE_HOURS = {
    pecho: 48,
    espalda: 60,
    cuadriceps: 72,
    isquiotibiales: 66,
    gemelos: 30,
    gluteos: 66,
    adductores: 40,
    abductores: 40,
    hombros: 40,
    biceps: 36,
    triceps: 36,
    antebrazos: 26,
    abdominales: 24,
    trapecio: 40,
};


const MUSCLE_ALIASES = {
    dorsales: 'espalda',
    antebrazo: 'antebrazos',
};

const SECONDARY_FACTOR = 0.35;

const DEFAULT_BASE_HOURS = 48;
const MIN_RECOVERY_HOURS = 20;
const MAX_RECOVERY_HOURS = 130;
const WEEK_MS = 7 * 86400000;

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

function normalizeMuscleName(m) {
    return m.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function resolveKey(rawName) {
    const norm = normalizeMuscleName(rawName);
    return MUSCLE_ALIASES[norm] || norm;
}

function getBaseHours(key) {
    if (MUSCLE_BASE_HOURS[key] != null) return MUSCLE_BASE_HOURS[key];
    for (const [k, v] of Object.entries(MUSCLE_BASE_HOURS)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return DEFAULT_BASE_HOURS;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// --- Catálogo de ejercicios: fallback para cuando el historial no guarda
// subMusculos propios en cada entrada (solo el catálogo los tiene) ---
const exerciseById = new Map(ejerciciosLocal.map(e => [e.id, e]));
const exerciseByName = new Map(
    ejerciciosLocal.map(e => [normalizeMuscleName(e.nombre), e])
);

function getSubMusculos(ex) {
    if (Array.isArray(ex.subMusculos) && ex.subMusculos.length > 0) {
        return ex.subMusculos.filter(Boolean);
    }
    const ref =
        exerciseById.get(ex.exerciseId ?? ex.id) ??
        exerciseByName.get(normalizeMuscleName(ex.nombre ?? ex.name ?? ''));
    return (ref?.subMusculos || []).filter(Boolean);
}

function addFatigue(byMuscleDay, key, dayKey, vol, sets) {
    if (!byMuscleDay.has(key)) byMuscleDay.set(key, new Map());
    const dayMap = byMuscleDay.get(key);
    const prev = dayMap.get(dayKey) || { vol: 0, sets: 0 };
    dayMap.set(dayKey, { vol: prev.vol + vol, sets: prev.sets + sets });
}

function buildMuscleRecovery(history) {
    // Por músculo (clave canónica), por día: volumen total y cantidad de series
    const byMuscleDay = new Map();
    // Guarda el nombre "lindo" para mostrar, la primera vez que se ve cada clave
    const labelByKey = new Map();

    history.forEach(entry => {
        const dayKey = startOfDay(new Date(entry.date)).getTime();
        entry.exercises.forEach(ex => {
            const primaryRaw =
                ex.parteDelCuerpo ??
                ex.muscle ??
                exerciseById.get(ex.exerciseId ?? ex.id)?.parteDelCuerpo ??
                exerciseByName.get(normalizeMuscleName(ex.nombre ?? ex.name ?? ''))?.parteDelCuerpo;
            if (!primaryRaw) return;
            const vol = ex.sets.reduce((a, s) => a + (+s.weight || 0) * (+s.reps || 0), 0);
            const setsCount = ex.sets.length;

            const primaryKey = resolveKey(primaryRaw);
            if (!labelByKey.has(primaryKey)) labelByKey.set(primaryKey, capitalize(primaryRaw));
            addFatigue(byMuscleDay, primaryKey, dayKey, vol, setsCount);

            // Submúsculos: trabajo indirecto, cuenta parcial y no duplica al principal
            const subs = getSubMusculos(ex);
            subs.forEach(subRaw => {
                const subKey = resolveKey(subRaw);
                if (subKey === primaryKey) return;
                if (!labelByKey.has(subKey)) labelByKey.set(subKey, capitalize(subRaw));
                addFatigue(byMuscleDay, subKey, dayKey, vol * SECONDARY_FACTOR, setsCount * SECONDARY_FACTOR);
            });
        });
    });

    const now = Date.now();
    const results = [];

    byMuscleDay.forEach((dayMap, muscleKey) => {
        const muscle = labelByKey.get(muscleKey) || capitalize(muscleKey);
        const days = [...dayMap.keys()].sort((a, b) => b - a);
        const lastDay = days[0];
        const lastData = dayMap.get(lastDay);

        // Volumen promedio histórico de ESE músculo (propio historial, no absoluto)
        const allVols = [...dayMap.values()].map(d => d.vol);
        const avgVol = allVols.reduce((a, b) => a + b, 0) / allVols.length;
        const intensityRatio = avgVol > 0 ? clamp(lastData.vol / avgVol, 0.4, 2) : 1;

        // Cuántas veces se entrenó este músculo en los 7 días previos a la última sesión
        const weeklyFreq = days.filter(d => d <= lastDay && d > lastDay - WEEK_MS).length;
        const frequencyFactor = clamp((weeklyFreq - 1) / 4, 0, 1);

        // Series de la última sesión (más series, más fatiga acumulada)
        const setsFactor = clamp(lastData.sets / 15, 0, 1);

        const baseHours = getBaseHours(muscleKey);
        let recoveryHours = baseHours
            * (1 + 0.35 * (intensityRatio - 1))
            * (1 + 0.15 * setsFactor)
            * (1 + 0.25 * frequencyFactor);
        recoveryHours = clamp(recoveryHours, MIN_RECOVERY_HOURS, MAX_RECOVERY_HOURS);

        const hoursSince = (now - lastDay) / 3600000;
        const pct = Math.min(100, Math.round((hoursSince / recoveryHours) * 100));
        const daysSince = Math.floor(hoursSince / 24);

        const tags = [];

        results.push({ muscle, daysSince, pct, recovered: pct >= 100, tags });
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
                                                {r.tags.length > 0 && ` · ${r.tags.join(' · ')}`}
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