import React from 'react';
import { X, Check, Copy, ChevronDown, Dumbbell, ChevronLeft } from 'lucide-react';
import { formatElapsed } from '../../utils/time';
import EjercicioModal from '../modales/ejercicioModal';
import ResumenRutina from '../modales/ResumenRutina';
import "./rutina.css"
import {
  AddSquare, Edit, Minimize, MinusSquare, PauseIcon, PlayIcon, Remplazar,
  Rotate, TickIcon, Eye, EyeSlash, CopyIcon, TimerIcon,
  MoreHorizontal,
  TrashIcon
} from '../../icons/icons';
import { sileo } from 'sileo';
import { MUSCLE_COLORS } from './rutinaDetalle';
import confetti from "canvas-confetti";

function formatElapsedFull(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function vibrar(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}

const VIBRACION_SERIE = 25;
const VIBRACION_EJERCICIO_COMPLETO = [40, 30, 40, 30, 90];

const EJERCICIOS_TIEMPO = ['Plancha'];

function esEjercicioDeTiempo(ex) {
  const nombre = ex.nombre ?? ex.name ?? '';
  return !!ex.esTiempo || EJERCICIOS_TIEMPO.includes(nombre);
}

// ---- Timer inline de una serie, mismo componente que usa RutinaCrear ----
function TimerInput({ value, placeholder, disabled, onChange, onComplete }) {
  const [running, setRunning] = React.useState(false);
  const [remaining, setRemaining] = React.useState(null);
  const intervalRef = React.useRef(null);

  React.useEffect(() => () => clearInterval(intervalRef.current), []);

  const start = () => {
    const raw = (value === '' || value == null) ? placeholder : value;
    const target = parseInt(raw, 10);
    if (!target || target <= 0) return;
    setRemaining(target);
    setRunning(true);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setRemaining(null);
  };

  const isCounting = running || remaining === 0;

  if (isCounting) {
    return (
      <div className="set-val timer-counting">
        <span className={`tiempo-set-num ${remaining === 0 ? 'listo' : ''}`}>{remaining}</span>
        <button className="mini-btn" type="button" title={remaining === 0 ? 'Reiniciar' : 'Detener'} onClick={reset}>
          {remaining === 0 ? <Rotate size={13} /> : <PauseIcon size={13} />}
        </button>
      </div>
    );
  }

  return (
    <div className="set-val timer-input-wrap">
      <input
        className="timer-input-field"
        type="text" inputMode="numeric"
        value={value}
        disabled={disabled}
        placeholder={placeholder || '0'}
        onChange={e => onChange(e.target.value)}
      />
      <button className="mini-btn" type="button" title="Iniciar" disabled={disabled} onClick={start}>
        <PlayIcon size={13} />
      </button>
    </div>
  );
}

const AUTOFILL_CYCLE = ['vacio', 'ultima', 'rutina'];
const AUTOFILL_LABELS = { vacio: 'Vacío', ultima: 'Última serie', rutina: 'Rutina' };
function autofillIcon(mode, size = 12) {
  if (mode === 'ultima') return <CopyIcon size={size} />;
  if (mode === 'rutina') return <Remplazar size={size} />;
  return <X size={size} />;
}

export default function RutinaCurso({
  session, restTimer, restDefault, history = [], routineName, onSetAutofillMode,
  sharedWithNames = [],
  onCancel, onToggleSet, onUpdateField, onAddSet, onFinish, partnerProgress,
  onSetRestDefault, onAdjustRest, onTogglePause, onDismissRest,
  onDuplicateLastSet, onOpenPicker, onToggleSessionPause, onEditExercise,
  onUpdateNotes, onRemoveExercise,
  onMinimize, autoOpenResumen, onAutoResumenHandled,
  pickerOpen, allExercises, pickerQuery, onPickerQueryChange, pickerSelection,
  onTogglePick, onCreateCustomExercise, onConfirmPicker, onClosePicker
}) {
  const s = session;
  const [collapsedIds, setCollapsedIds] = React.useState(new Set());
  const [, forceTick] = React.useState(0);
  const [gifPreview, setGifPreview] = React.useState(null);
  const [gifFailedIds, setGifFailedIds] = React.useState(new Set());
  const exerciseRefs = React.useRef({});
  const [showDone, setShowDone] = React.useState(false);
  const [resumenOpen, setResumenOpen] = React.useState(false);
  const [prsSesion, setPrsSesion] = React.useState([]);
  const [finishingKeys, setFinishingKeys] = React.useState(new Set());
  const [soloActualMode, setSoloActualMode] = React.useState(false);
  const [bouncingSets, setBouncingSets] = React.useState(new Set());
  const [musculosOpen, setMusculosOpen] = React.useState(false);
  const [kebabOpen, setKebabOpen] = React.useState(false);


  React.useEffect(() => {
    if (s?.paused) return;
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [s?.paused]);

  React.useEffect(() => {
    if (autoOpenResumen) {
      setResumenOpen(true);
      onAutoResumenHandled?.();
    }
  }, [autoOpenResumen]);

  const records = React.useMemo(() => {
    const map = new Map();
    history.forEach(entry => {
      entry.exercises.forEach(ex => {
        const name = ex.nombre ?? ex.name;
        ex.sets.forEach(set => {
          const w = +set.weight || 0;
          const r = +set.reps || 0;
          if (w <= 0) return;
          const prev = map.get(name);
          if (!prev || w > prev.weight || (w === prev.weight && r > prev.reps)) {
            map.set(name, { weight: w, reps: r });
          }
        });
      });
    });
    return map;
  }, [history]);

  const muscleStats = React.useMemo(() => {
    const exs = s?.exercises || [];
    const counts = {};
    let totalAll = 0;
    exs.forEach(ex => {
      const m = (ex.parteDelCuerpo ?? ex.muscle) || 'Otro';
      const total = ex.sets.length;
      const done = ex.sets.filter(st => st.done).length;
      if (!counts[m]) counts[m] = { total: 0, done: 0 };
      counts[m].total += total;
      counts[m].done += done;
      totalAll += total;
    });
    return Object.entries(counts)
      .map(([muscle, v]) => ({
        muscle,
        total: v.total,
        done: v.done,
        pct: totalAll ? (v.total / totalAll) * 100 : 0,
        donePct: v.total ? (v.done / v.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [s?.exercises]);

  const muscleColorMap = React.useMemo(() => {
    const map = {};
    muscleStats.forEach((mv, i) => { map[mv.muscle] = MUSCLE_COLORS[i % MUSCLE_COLORS.length]; });
    return map;
  }, [muscleStats]);

  const { totalSets, doneSets } = React.useMemo(() => {
    if (!s) return { totalSets: 0, doneSets: 0 };
    let total = 0, done = 0;
    s.exercises.forEach(ex => {
      total += ex.sets.length;
      done += ex.sets.filter(st => st.done).length;
    });
    return { totalSets: total, doneSets: done };
  }, [s]);

  const confettiPlayed = React.useRef(false);

  React.useEffect(() => {
    if (!s) return;
    const doneEntriesNow = s.exercises.filter(ex => ex.sets.length > 0 && ex.sets.every(st => st.done));
    const pendingEntriesNow = s.exercises.filter(ex => !(ex.sets.length > 0 && ex.sets.every(st => st.done)));
    const finishedNow = pendingEntriesNow.length === 0 && doneEntriesNow.length > 0 && !showDone;

    if (finishedNow && !confettiPlayed.current) {
      confettiPlayed.current = true;
      const duration = 1200;
      const end = Date.now() + duration;
      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 70, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 70, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    if (!finishedNow) confettiPlayed.current = false;
  }, [s, showDone]);

  if (!s) return null;


  const autofillMode = s.autofillMode ?? 'Rutina';



  const elapsedMs = (s.paused ? s.pausedAt : Date.now()) - s.startedAt - (s.pausedMs || 0);
  const globalPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  const allCollapsed = s.exercises.length > 0 && s.exercises.every((ex, exi) => collapsedIds.has(ex.id ?? exi));

  const toggleAll = () => {
    setCollapsedIds(allCollapsed ? new Set() : new Set(s.exercises.map((ex, exi) => ex.id ?? exi)));
  };

  const toggleOne = (key) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const markGifFailed = (key) => {
    setGifFailedIds(prev => new Set(prev).add(key));
  };

  const handleToggleSet = (exi, si) => {
    const ex = s.exercises[exi];
    const set = ex.sets[si];
    if (set.done) return;
    const key = ex.id ?? exi;
    const willComplete = !set.done && ex.sets.every((st, idx) => idx === si || st.done);

    const bounceKey = `${exi}-${si}`;
    setBouncingSets(prev => new Set(prev).add(bounceKey));
    setTimeout(() => {
      setBouncingSets(prev => {
        const next = new Set(prev);
        next.delete(bounceKey);
        return next;
      });
    }, 350);

    vibrar(willComplete ? VIBRACION_EJERCICIO_COMPLETO : VIBRACION_SERIE);

    let weightVal = set.weight;
    let repsVal = set.reps;
    if (!set.done) {
      if ((weightVal === '' || weightVal == null) && set.placeholderWeight) {
        weightVal = set.placeholderWeight;
        onUpdateField(exi, si, 'weight', weightVal);
      }
      if ((repsVal === '' || repsVal == null) && set.placeholderReps) {
        repsVal = set.placeholderReps;
        onUpdateField(exi, si, 'reps', repsVal);
      }
    }

    const isLastExercise = exi === s.exercises.length - 1;
    const isLastSet = si === ex.sets.length - 1;
    const isVeryLastSet = isLastExercise && isLastSet;

    let isPR = false;
    let nombre, w, r;
    if (willComplete) {
      nombre = ex.nombre ?? ex.name;
      w = +(weightVal || set.placeholderWeight) || 0;
      r = +(repsVal || set.placeholderReps) || 0;
      const record = records.get(nombre);
      isPR = w > 0 && (!record || w > record.weight || (w === record.weight && r > record.reps));
    }

    if (isPR) setPrsSesion(prev => [...prev, { nombre, weight: w, reps: r }]);

    onToggleSet(exi, si, { celebrate: isPR, skipRest: isVeryLastSet });

    if (isPR) {
      sileo.success({
        title: `¡Nuevo récord en ${nombre} 🏆`,
        description: `${w}kg × ${r} reps`,
        duration: 4800,
        styles: { title: "sileo-title-pr" },
      });
    }

    const nextSi = si + 1;
    const nextSet = ex.sets[nextSi];
    if (nextSet && !nextSet.done) {
      if (autofillMode === 'ultima') {
        if (nextSet.weight === '' || nextSet.weight == null) onUpdateField(exi, nextSi, 'weight', weightVal ?? '');
        if (nextSet.reps === '' || nextSet.reps == null) onUpdateField(exi, nextSi, 'reps', repsVal ?? '');
      } else if (autofillMode === 'rutina') {
        if ((nextSet.weight === '' || nextSet.weight == null) && nextSet.placeholderWeight) {
          onUpdateField(exi, nextSi, 'weight', nextSet.placeholderWeight);
        }
        if ((nextSet.reps === '' || nextSet.reps == null) && nextSet.placeholderReps) {
          onUpdateField(exi, nextSi, 'reps', nextSet.placeholderReps);
        }
      }
    }

    if (!willComplete) return;

    let nextKey = null;
    for (let i = exi + 1; i < s.exercises.length; i++) {
      const nextEx = s.exercises[i];
      const isDone = nextEx.sets.length > 0 && nextEx.sets.every(st => st.done);
      if (!isDone) { nextKey = nextEx.id ?? i; break; }
    }

    setCollapsedIds(prev => {
      const next = new Set(prev);
      next.add(key);
      if (nextKey !== null) next.delete(nextKey);
      return next;
    });

    setFinishingKeys(prev => new Set(prev).add(key));
    setTimeout(() => {
      setFinishingKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 380);

    if (nextKey !== null) {
      setTimeout(() => {
        const node = exerciseRefs.current[nextKey];
        if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  };

  const exercisesWithIndex = s.exercises.map((ex, exi) => ({ ex, exi }));
  const doneEntries = exercisesWithIndex.filter(({ ex }) => ex.sets.length > 0 && ex.sets.every(st => st.done));
  const pendingEntries = exercisesWithIndex.filter(
    ({ ex, exi }) => !(ex.sets.length > 0 && ex.sets.every(st => st.done)) || finishingKeys.has(ex.id ?? exi)
  );

  let visibleEntries;
  if (showDone) {
    visibleEntries = exercisesWithIndex;
  } else if (soloActualMode) {
    const actual = pendingEntries.find(({ ex, exi }) => !finishingKeys.has(ex.id ?? exi));
    const actualKey = actual ? (actual.ex.id ?? actual.exi) : null;
    visibleEntries = pendingEntries.filter(({ ex, exi }) => {
      const k = ex.id ?? exi;
      return finishingKeys.has(k) || k === actualKey;
    });
  } else {
    visibleEntries = pendingEntries;
  }

  return (
    <>
      <div className="header">
        <div className="flex gap8">
          <div className="btn-circle tooltipe" title="Volver" data-tooltip="Volver" onClick={onMinimize}>
            <ChevronLeft size={18} />
          </div>

        </div>

        <div className="session-timer">
          <h3 className="fontSize1-2 txt-acento">{formatElapsedFull(elapsedMs)}</h3>
          {sharedWithNames.length > 0 && (
            <span className="sub fontSize6" title={`Entrenando junto a ${sharedWithNames.join(', ')}`}>
              con {sharedWithNames.join(', ')}
              {partnerProgress && ` · ${partnerProgress.name}: ${partnerProgress.doneSets}/${partnerProgress.totalSets}`}
            </span>
          )}
          {onToggleSessionPause && (
            <button
              type="button"
              className="btn-circle small"
              title={s.paused ? 'Reanudar' : 'Pausar'}
              onClick={onToggleSessionPause}
            >
              {s.paused ? <PlayIcon size={13} /> : <PauseIcon size={13} />}
            </button>
          )}
        </div>

        {s.exercises.length > 0 ? (
          <div
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className={`btn-circle`}
              title="Opciones"
              onClick={() => setKebabOpen(v => !v)}
            >
              <MoreHorizontal size={19} />
            </button>

            {kebabOpen && (
              <div className="kebab">
                <button
                  type="button"
                  className={`kebab-item ${soloActualMode ? 'active' : ''}`}

                  style={{
                    width: "100%"
                  }}
                  onClick={() => {
                    setSoloActualMode(v => !v);
                    setKebabOpen(false);
                  }}
                >
                  <span>
                    {soloActualMode
                      ? 'Ver todos los ejercicios'
                      : 'Ver solo ejercicio actual'}
                  </span>
                  {soloActualMode ? (
                    <Eye size={17} />
                  ) : (
                    <EyeSlash size={17} />
                  )}

                </button>

                {/* Ejercicios terminados */}
                {doneEntries.length > 0 && (
                  <button
                    type="button"
                    style={{
                      width: "100%"
                    }}
                    className={`kebab-item ${showDone ? 'active' : ''}`}
                    onClick={() => {
                      setShowDone(v => !v);
                      setKebabOpen(false);
                    }}
                  >

                    <span>
                      {showDone
                        ? 'Ocultar terminados'
                        : 'Ver ejercicios terminados'}
                    </span>

                    <TickIcon size={17} />

                  </button>
                )}

                {/* Autocompletado */}
                <div className="kebab-item kebab-item-select justifyContentSpaceBet">

                  <span>Autocompletado</span>

                  <select
                    value={autofillMode}
                    onChange={e => {
                      onSetAutofillMode?.(e.target.value);
                      setKebabOpen(false);
                    }}
                    className="kebab-select"
                  >
                    {AUTOFILL_CYCLE.map(mode => (
                      <option key={mode} value={mode}>
                        {AUTOFILL_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  style={{
                    width: "100%"
                  }}
                  className={`kebab-item danger`}
                  onClick={onCancel}
                >

                  <span>Cancelar rutina</span>

                  <TrashIcon size={17} />

                </button>

              </div>
            )}
          </div>
        ) : <div style={{ width: 40 }} />}
      </div>

      {totalSets > 0 && (
        <div className="session-progress">
          <div className="flex justifyContentSpaceBet fontSize7 gris" style={{ marginBottom: 6 }}>
            <span>{doneSets}/{totalSets} series</span>
            <span>{globalPct}%</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill${globalPct > 0 && globalPct < 100 ? ' shimmering' : ''}`}
              style={{ width: `${globalPct}%` }}
            />
          </div>
        </div>
      )}

      {muscleStats.length > 0 && (
        <div className="dist-section">
          <div className="dist-header flex gap8" onClick={() => setMusculosOpen(v => !v)}>
            <h3 className="fontSize8 gris">Músculos trabajados</h3>
            <ChevronDown
              size={14}
              style={{ transform: musculosOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
            />
          </div>

          <div className="dist-bar">
            {muscleStats.map(mv => (
              <div
                key={mv.muscle}
                title={`${mv.muscle}: ${mv.done}/${mv.total} series`}
                style={{ width: `${mv.pct}%`, background: hexToRgba(muscleColorMap[mv.muscle], .28), position: 'relative' }}
              >
                <div style={{ width: `${mv.donePct}%`, height: '100%', background: muscleColorMap[mv.muscle], transition: 'width .25s ease' }} />
              </div>
            ))}
          </div>

          {musculosOpen && (
            <div className="dist-legend">
              {muscleStats.map(mv => (
                <div key={mv.muscle} className="legend-pill">
                  <span className="muscle-dot" style={{ background: muscleColorMap[mv.muscle] }} />
                  {mv.muscle} · {mv.done}/{mv.total} series
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ex-list">
        {visibleEntries.map(({ ex, exi }) => {
          const key = ex.id ?? exi;
          const isCollapsed = collapsedIds.has(key);
          const nombre = ex.nombre ?? ex.name;
          const musculo = ex.parteDelCuerpo ?? ex.muscle;
          const gif = ex.gif ?? ex.gifUrl;
          const gifFailed = gifFailedIds.has(key);
          const doneInEx = ex.sets.filter(st => st.done).length;
          const isExDone = ex.sets.length > 0 && doneInEx === ex.sets.length;
          const isTimed = esEjercicioDeTiempo(ex);
          const isBodyweight = (ex.equipo ?? ex.equipment) === 'P. corporal';

          return (
            <div
              key={key}
              ref={node => { exerciseRefs.current[key] = node; }}
              className={`ex-card ex-card-in ${!isCollapsed ? 'open' : ''} ${isExDone ? 'done' : ''} ${finishingKeys.has(key) ? 'finishing pulso' : ''}`}
              style={{ animationDelay: `${Math.min(exi, 8) * 40}ms` }}
            >
              <div className="ex-head" onClick={() => toggleOne(key)}>
                {gif && !gifFailed ? (
                  <img
                    src={gif}
                    alt={nombre}
                    loading="lazy"
                    className="ex-thumb"
                    title="Ver gif"
                    onClick={e => { e.stopPropagation(); setGifPreview({ src: gif, nombre }); }}
                    onError={() => markGifFailed(key)}
                  />
                ) : (
                  <div className="ex-thumb-placeholder">
                    <Dumbbell size={18} strokeWidth={1.5} />
                  </div>
                )}


                <div className="ex-title-block">
                  <div className="ex-name">{nombre}</div>
                  <div className="ex-sub">
                    {musculo && <span className="muscle-chip">{musculo}</span>}
                    {ex.rest ? (
                      <span className="delta-badge" style={{ color: 'var(--acento)' }}>
                        <TimerIcon size={11} /> {ex.rest}s
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="ex-actions" onClick={e => e.stopPropagation()}>
                  {onEditExercise && (
                    <button type="button" className="btn-circle small" title="Editar ejercicio" onClick={() => onEditExercise(exi)}>
                      <Edit size={14} />
                    </button>
                  )}
                  {onOpenPicker && (
                    <button type="button" className="btn-circle small" title="Reemplazar ejercicio" onClick={() => onOpenPicker(exi)}>
                      <Remplazar size={14} />
                    </button>
                  )}
                  {onRemoveExercise && (
                    <button type="button" className="btn-circle small" title="Quitar de hoy" onClick={() => onRemoveExercise(exi)}>
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                  transition: 'grid-template-rows .25s cubic-bezier(.2,.8,.2,1)',
                }}
              >
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  <div className="ex-body-inner">
                    <div className="set-table-head">
                      {isTimed ? <span>Segundos</span> : isBodyweight ? (
                        <span>Reps</span>
                      ) : (
                        <><span>Kg</span><span>Reps</span></>
                      )}
                      <span style={{ flex: '0 0 36px' }} />
                    </div>

                    {ex.sets.map((set, si) => {
                      const setKey = `${exi}-${si}`;
                      return (
                        <div key={set.id ?? si} className={`set-row ${set.done ? 'done' : ''}`}>
                          <div className={`set-idx ${set.done ? 'done' : ''}`}>{si + 1}</div>

                          {isTimed ? (
                            <TimerInput
                              value={set.reps}
                              placeholder={set.placeholderReps}
                              onChange={v => onUpdateField(exi, si, 'reps', v)}
                              onComplete={() => handleToggleSet(exi, si)}
                            />
                          ) : isBodyweight ? (
                            <input
                              className={`set-val ${set.done ? 'done' : ''}`}
                              style={{ maxWidth: "100%" }}
                              type="text" inputMode="numeric"
                              value={set.reps}
                              placeholder={set.placeholderReps || '0'}
                              onChange={e => onUpdateField(exi, si, 'reps', e.target.value)}
                            />
                          ) : (
                            <>
                              <input
                                className={`set-val ${set.done ? 'done' : ''}`}
                                style={{ maxWidth: "35%" }}
                                type="text" inputMode="decimal"
                                value={set.weight}
                                placeholder={set.placeholderWeight || '0'}
                                onChange={e => {
                                  let val = e.target.value.replace(',', '.');
                                  const parts = val.split('.');
                                  if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                                  onUpdateField(exi, si, 'weight', val);
                                }}
                              />
                              <input
                                className={`set-val ${set.done ? 'done' : ''}`}
                                style={{ maxWidth: "40%" }}
                                type="text" inputMode="numeric"
                                value={set.reps}
                                placeholder={set.placeholderReps || '0'}
                                onChange={e => onUpdateField(exi, si, 'reps', e.target.value)}
                              />
                            </>
                          )}

                          <button
                            type="button"
                            title="Terminado"
                            className={`set-check ${set.done ? 'done' : ''} ${bouncingSets.has(setKey) ? 'bounce' : ''}`}
                            onClick={() => handleToggleSet(exi, si)}
                          >
                            <Check size={15} />
                          </button>
                        </div>
                      );
                    })}

                    <div className="set-actions">
                      {ex.sets.length > 0 && onDuplicateLastSet && (
                        <button type="button" className="pill" onClick={() => onDuplicateLastSet(exi)}>
                          <Copy size={13} /> Duplicar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {pendingEntries.length === 0 && doneEntries.length > 0 && !showDone && (
          <div className="session-done-msg">¡Terminaste todos los ejercicios! 🎉</div>
        )}

        <button
          type="button"
          className="add-exercise-btn"
          style={{ marginTop: 6, marginBottom: restTimer ? 110 : 0 }}
          onClick={() => setResumenOpen(true)}
        >
          Finalizar rutina
        </button>
      </div>

      {resumenOpen && (
        <ResumenRutina
          session={s}
          routineName={routineName}
          prs={prsSesion}
          onClose={() => setResumenOpen(false)}
          onConfirm={(guardarEnHistorial) => onFinish({ guardarEnHistorial })}
        />
      )}



      {gifPreview && (
        <div className="modal-overlay fixed flex justifyContentCenter" onClick={() => setGifPreview(null)}>
          <div className="gif-preview-card" onClick={e => e.stopPropagation()}>
            <button className="btn-circle small close-btn" title="Cerrar" onClick={() => setGifPreview(null)}>
              <X size={16} />
            </button>
            <img src={gifPreview.src} alt={gifPreview.nombre} />
            <div className="gif-preview-name">{gifPreview.nombre}</div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <EjercicioModal
          isOpen={pickerOpen}
          onClose={onClosePicker}
          onSelect={onConfirmPicker}
        />
      )}
    </>
  );
}