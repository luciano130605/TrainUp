import React from 'react';
import { X, Check, Plus, Copy, Repeat, Pencil, ChevronsUpDown, ChevronsDownUp, Pause, Play, Award, Dumbbell, CheckCircle2, ChevronDown, RotateCcw } from 'lucide-react';
import { formatElapsed } from '../utils/time';
import EjercicioModal from './ejercicioModal';
import ResumenRutina from './ResumenRutina';
import "./rutina.css"
import { DescansoBotonFlotante, resetDescansoState } from './TiempoDescansoToast';
import { sileo } from 'sileo';
import { AddSquare, Edit, Maxime, Minimize, MinusSquare, PauseIcon, PlayIcon, Remplazar, Rotate, TickIcon, Eye, EyeSlash } from '../icons/icons';
import { MUSCLE_COLORS } from './rutinaDetalle';

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

// Patrones de vibración diferenciados
const VIBRACION_SERIE = 25;                 // toque corto: se marcó una serie suelta
const VIBRACION_EJERCICIO_COMPLETO = [40, 30, 40, 30, 90]; // patrón más largo: se terminó el ejercicio

const EJERCICIOS_TIEMPO = ['Plancha'];

function esEjercicioDeTiempo(ex) {
  const nombre = ex.nombre ?? ex.name ?? '';
  return !!ex.esTiempo || EJERCICIOS_TIEMPO.includes(nombre);
}

// ---- Auto-completado de series al terminar una ----
const AUTOFILL_OPTIONS = [
  { value: 'vacio', label: 'Dejar vacío' },
  { value: 'ultima', label: 'Copiar última serie' },
  { value: 'rutina', label: 'Copiar de la rutina' },
];
const AUTOFILL_LABELS = {
  vacio: 'Auto: vacío',
  ultima: 'Auto: última serie',
  rutina: 'Auto: rutina',
};

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
      <div className="ejercicio-inputs-cont">
        <span className={`tiempo-set-num ${remaining === 0 ? 'listo' : ''}`}>{remaining}</span>
        <button
          className="mini-btn"
          title={remaining === 0 ? 'Reiniciar' : 'Detener'}
          onClick={reset}
        >
          {remaining === 0 ? <Rotate size={13} /> : <PauseIcon size={13} />}
        </button>
      </div>
    );
  }

  return (
    <div className="ejercicio-inputs-cont">
      <input
        type="text" inputMode="numeric"
        value={value}
        disabled={disabled}
        placeholder={placeholder || '0'}
        onChange={e => onChange(e.target.value)}
      />
      <button className={`mini-btn`} title="Iniciar" disabled={disabled} onClick={start}>
        <PlayIcon size={13} />
      </button>
    </div>
  );
}

// // Menú desplegable de modo de auto-completado por ejercicio
// function AutofillMenu({ mode, open, onToggle, onSelect }) {
//   return (
//     <div style={{ position: 'relative' }}>
//       <button
//         type="button"
//         className="btns agregar"
//         onClick={onToggle}
//       >
//         <Repeat size={12} /> {AUTOFILL_LABELS[mode]}
//       </button>
//       {open && (
//         <>
//           <div
//             style={{ position: 'fixed', inset: 0, zIndex: 40 }}
//             onClick={() => onToggle()}
//           />
//           <div
//             style={{
//               position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
//               background: 'var(--fondo-tarjeta, #1c1c1e)', border: '1px solid var(--borde, #333)',
//               borderRadius: 8, zIndex: 41, minWidth: 190, overflow: 'hidden',
//               boxShadow: '0 4px 16px rgba(0,0,0,.35)',
//             }}
//           >
//             {AUTOFILL_OPTIONS.map(opt => (
//               <button
//                 key={opt.value}
//                 type="button"
//                 onClick={() => onSelect(opt.value)}
//                 style={{
//                   display: 'block', width: '100%', textAlign: 'left',
//                   padding: '9px 12px', background: opt.value === mode ? 'var(--acento-suave, rgba(255,255,255,.06))' : 'transparent',
//                   border: 'none', color: opt.value === mode ? 'var(--acento)' : 'var(--texto)',
//                   fontSize: 13, cursor: 'pointer',
//                 }}
//               >
//                 {opt.label}
//               </button>
//             ))}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

export default function RutinaCurso({
  session, restTimer, restDefault, history = [], routineName,
  onCancel, onToggleSet, onUpdateField, onAddSet, onFinish,
  onSetRestDefault, onAdjustRest, onTogglePause, onDismissRest,
  onDuplicateLastSet, onOpenPicker, onToggleSessionPause, onEditExercise,
  onUpdateNotes,
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
  const [autofillModeByExercise, setAutofillModeByExercise] = React.useState({});
  const [autofillMenuOpen, setAutofillMenuOpen] = React.useState(null);
  const [soloActualMode, setSoloActualMode] = React.useState(false);

  const getAutofillMode = React.useCallback(
    (key) => autofillModeByExercise[key] || 'vacio',
    [autofillModeByExercise]
  );

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

  React.useEffect(() => {
    return () => {
      resetDescansoState();
    };
  }, []);

  // ---- Estos dos hooks estaban DESPUÉS del "if (!s) return null" ----
  // ---- Eso rompía las reglas de los hooks cuando session pasaba a null ----
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




  const [musculosOpen, setMusculosOpen] = React.useState(false);

  const muscleStats = React.useMemo(() => {
    const exs = s?.exercises || [];
    const counts = {}; // muscle -> {total, done}
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

  if (!s) return null;

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
    if (set.done) return; // ya está marcada (evita doble disparo si el timer completa dos veces)
    const key = ex.id ?? exi;
    const willComplete = !set.done && ex.sets.every((st, idx) => idx === si || st.done);

    // Vibración: distinta según si esto termina el ejercicio o es una serie suelta
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

    // Tiene que ir DESPUÉS de calcular isPR/nombre/w/r, si no todavía son undefined (TDZ)
    if (isPR) setPrsSesion(prev => [...prev, { nombre, weight: w, reps: r }]);

    onToggleSet(exi, si, { celebrate: isPR, skipRest: isVeryLastSet });

    if (isPR) {
      sileo.success({
        title: `¡Nuevo récord en ${nombre} 🏆`,
        description: `${w}kg × ${r} reps`,
        duration: 4800,
        styles: {
          title: "sileo-title-pr",
        },
      });
    }

    // Auto-completar la siguiente serie pendiente del mismo ejercicio, según el modo elegido
    const nextSi = si + 1;
    const nextSet = ex.sets[nextSi];
    if (nextSet && !nextSet.done) {
      const mode = getAutofillMode(key);
      if (mode === 'ultima') {
        if (nextSet.weight === '' || nextSet.weight == null) {
          onUpdateField(exi, nextSi, 'weight', weightVal ?? '');
        }
        if (nextSet.reps === '' || nextSet.reps == null) {
          onUpdateField(exi, nextSi, 'reps', repsVal ?? '');
        }
      } else if (mode === 'rutina') {
        if ((nextSet.weight === '' || nextSet.weight == null) && nextSet.placeholderWeight) {
          onUpdateField(exi, nextSi, 'weight', nextSet.placeholderWeight);
        }
        if ((nextSet.reps === '' || nextSet.reps == null) && nextSet.placeholderReps) {
          onUpdateField(exi, nextSi, 'reps', nextSet.placeholderReps);
        }
      }
      // mode === 'vacio' -> no se toca nada
    }

    if (!willComplete) return;

    let nextKey = null;
    for (let i = exi + 1; i < s.exercises.length; i++) {
      const nextEx = s.exercises[i];
      const isDone = nextEx.sets.length > 0 && nextEx.sets.every(st => st.done);
      if (!isDone) {
        nextKey = nextEx.id ?? i;
        break;
      }
    }

    setCollapsedIds(prev => {
      const next = new Set(prev);
      next.add(key);
      if (nextKey !== null) next.delete(nextKey);
      return next;
    });

    // Animamos la salida del ejercicio recién completado antes de sacarlo de la vista principal
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
    // El "actual" es el primer pendiente que no está en animación de salida.
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
      <DescansoBotonFlotante />
      <div className="header-cont">
        <div style={{ display: 'flex', gap: 6 }}>

          <div className="btn" onClick={onCancel}
          ><X size={18} /></div>
          <div className="btn tooltipe" title="Achicar y ver rutinas"
            data-tooltip={
              "Achicar"
            }
            onClick={onMinimize}><Minimize size={18} /></div>
        </div>
        <div>
          <div className="tiempo" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            {formatElapsedFull(elapsedMs)}
            {onToggleSessionPause && (
              <span className={`mini-btn`} title={s.paused ? 'Reanudar' : 'Pausar'} onClick={onToggleSessionPause}>
                {s.paused ? <PlayIcon size={13} /> : <PauseIcon size={13} />}
              </span>
            )}
          </div>
          <div className="header-sub">{s.paused ? ' · Pausado' : ''}</div>
        </div>
        {s.exercises.length > 0 ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <div
              className="btn tooltipe"
              onClick={() => setSoloActualMode(v => !v)}
              data-tooltip={
                soloActualMode
                  ? "Ver todos los ejercicios"
                  : "Ver solo el ejercicio actual"
              }
            >
              {soloActualMode ? <Eye size={18} /> : <EyeSlash size={18} />}
            </div>
            {doneEntries.length > 0 && (
              <div
                className="btn tooltipe"
                title={showDone ? 'Ocultar terminados' : 'Ver terminados'}
                data-tooltip={
                  showDone
                    ? "Ocultar terminados"
                    : "Ver terminados"
                }
                onClick={() => setShowDone(v => !v)}
                style={{ position: 'relative' }}
              >
                <TickIcon size={16} color={showDone ? 'var(--acento)' : undefined} />
                <span
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    background: 'var(--acento)', color: 'var(--txt-btn)',
                    borderRadius: '50%', fontSize: 10, lineHeight: '14px',
                    width: 14, height: 14, textAlign: 'center'
                  }}
                >
                  {doneEntries.length}
                </span>
              </div>
            )}
            <div className="btn tooltipe" title={allCollapsed ? 'Expandir todo' : 'Colapsar todo'} onClick={toggleAll}
              data-tooltip={
                showDone
                  ? "Expandir todo"
                  : "Colapsar todo"
              }
            >
              {allCollapsed ? <AddSquare size={16} /> : <MinusSquare size={16} />}
            </div>
          </div>
        ) : <div style={{ width: 40 }}></div>}
      </div>

      {totalSets > 0 && (
        <div className='total-series-cont'>
          <div className='total-series-span'>
            <span>{doneSets}/{totalSets} series</span>
            <span>{globalPct}%</span>
          </div>
          <div className='total-series-fill'>
            <div
              style={{
                width: `${globalPct}%`,
                height: '100%',
                background: 'var(--acento)',
                transition: 'width .25s ease'
              }}
            />
          </div>
        </div>
      )}

      {muscleStats.length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 12, marginTop: 25 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setMusculosOpen(v => !v)}
          >
            <span style={{
              fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em',
              color: 'var(--texto-gris)', fontFamily: "'Oswald', sans-serif", fontWeight: 700,
            }}>
              Músculos trabajados
            </span>
            <ChevronDown
              size={14}
              style={{ transform: musculosOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
            />
          </div>

          <div style={{ display: 'flex', width: '100%', height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 8, gap: 1 }}>

            {muscleStats.map(mv => {
              const color = muscleColorMap[mv.muscle];
              return (
                <div
                  key={mv.muscle}
                  title={`${mv.muscle}: ${mv.done}/${mv.total} series`}
                  style={{ width: `${mv.pct}%`, background: hexToRgba(color, 0.28), position: 'relative' }}
                >
                  <div style={{ width: `${mv.donePct}%`, height: '100%', background: color, transition: 'width .25s ease' }} />
                </div>
              );
            })}
          </div>

          {musculosOpen && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 14,
                marginTop: 10,
                overflowX: 'auto',
                paddingBottom: 4,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {muscleStats.map(mv => (
                <div
                  key={mv.muscle}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: muscleColorMap[mv.muscle], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--texto)' }}>
                    {mv.muscle} · {Math.round(mv.pct)}%
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--texto-gris)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {mv.done}/{mv.total} series
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="page-cont top">
        {visibleEntries.map(({ ex, exi }) => {
          const key = ex.id ?? exi;
          const isCollapsed = collapsedIds.has(key);
          const nombre = ex.nombre ?? ex.name;
          const musculo = ex.parteDelCuerpo ?? ex.muscle;
          const gif = ex.gif ?? ex.gifUrl;
          const gifFailed = gifFailedIds.has(key);

          const doneInEx = ex.sets.filter(st => st.done).length;
          const isExDone = ex.sets.length > 0 && doneInEx === ex.sets.length;
          const record = records.get(nombre);

          return (
            <div
              key={key}
              className="rutina-card"
              ref={(node) => { exerciseRefs.current[key] = node; }}
              style={{
                position: 'relative',
                transition: 'opacity .35s ease, transform .35s ease, max-height .35s ease',
                ...(finishingKeys.has(key) ? {
                  opacity: 0,
                  transform: 'scale(0.97)',
                } : {}),
                ...(isExDone ? {
                  borderColor: 'var(--acento)',
                } : {})
              }}
            >


              <div className="ejercicio-header" style={{ cursor: 'pointer' }}>
                <div className='sub-cont-wrap' style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {gif && !gifFailed && (
                    <img
                      src={gif}
                      alt={nombre}
                      loading="lazy"
                      className="ejercicio-gif-thumb"
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', cursor: 'zoom-in', flexShrink: 0 }}
                      title="Ver gif"
                      onClick={() => setGifPreview({ src: gif, nombre })}
                      onError={() => markGifFailed(key)}
                    />
                  )}
                  {(!gif || gifFailed) && (
                    <div
                      className="ejercicio-placeholder"
                      style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >

                    </div>
                  )}

                  <div onClick={() => toggleOne(key)} style={{ flex: 1 }}>
                    <div className='sub-cont'>
                      <h4>{nombre}</h4>

                    </div>
                    <div className="musculo">
                      {musculo}

                      {isCollapsed && ex.sets.length > 0 && (
                        <span className="musculo" style={{ marginLeft: 6 }}>
                          {doneInEx}/{ex.sets.length} series
                        </span>
                      )}
                      {ex.rest ? (
                        <span className="descanso-badge">{ex.rest}s</span>
                      ) : null}

                    </div>
                  </div>
                </div>
                <div className="ejercicio-acciones curso" onClick={e => e.stopPropagation()}>
                  {gif && (
                    <button className="mini-btn" title="Ver gif" onClick={() => setGifPreview({ src: gif, nombre })}>
                      <Maxime size={14} />
                    </button>
                  )}
                  {onEditExercise && (
                    <button className="mini-btn" title="Editar ejercicio" onClick={() => onEditExercise(exi)}>
                      <Edit size={14} />
                    </button>
                  )}
                  {onOpenPicker && (
                    <button className="mini-btn" title="Cambiar ejercicio" onClick={() => onOpenPicker(exi)}>
                      <Remplazar size={14} />
                    </button>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="ejercicio-inputs">

                  {(() => {

                    const isTimed = esEjercicioDeTiempo(ex);
                    return (
                      <div className="ejercicio-inputs-header">

                        {isTimed ? <span className='segs'>Segundos</span> : <><span>Kg</span><span>Reps</span></>}
                      </div>
                    );
                  })()}
                  {ex.sets.map((set, si) => {
                    const isBodyweight = ex.equipment === 'P. corporal';
                    const isTimed = esEjercicioDeTiempo(ex);
                    return (
                      <div key={set.id ?? si} className={`ejercicio-inputs-cont ${set.done ? 'done' : ''}`}>
                        <span
                          style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: '', color: 'var(--texto)',
                            fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem', fontWeight: 700,
                          }}
                        >{si + 1}</span>
                        {isTimed ? (
                          <TimerInput
                            value={set.reps}
                            placeholder={set.placeholderReps}
                            onChange={(v) => onUpdateField(exi, si, 'reps', v)}
                            onComplete={() => handleToggleSet(exi, si)}
                          />
                        ) : (
                          <>
                            <input
                              type="text" inputMode="decimal"
                              value={set.weight}
                              disabled={isBodyweight}
                              placeholder={set.placeholderWeight || '0'}
                              onChange={e => {
                                let val = e.target.value.replace(',', '.');
                                const parts = val.split('.');
                                if (parts.length > 2) {
                                  val = parts[0] + '.' + parts.slice(1).join('');
                                }
                                onUpdateField(exi, si, 'weight', val);
                              }}
                            />
                            <input
                              type="text" inputMode="numeric"
                              value={set.reps}
                              placeholder={set.placeholderReps || '0'}
                              onChange={e => onUpdateField(exi, si, 'reps', e.target.value)}
                            />
                          </>
                        )}
                        <div className='check-cont'>
                          <button title='Terminado' className={`check ${set.done ? 'done' : ''}`} onClick={() => handleToggleSet(exi, si)}>
                            {<Check size={15} style={{ position: "relative", right: 1 }} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {ex.sets.length > 0 && onDuplicateLastSet && (
                      <button className="btns agregar" onClick={() => onDuplicateLastSet(exi)}><Copy size={12} /> Duplicar</button>
                    )}
                    {/* {ex.sets.length > 1 && (
                      <AutofillMenu
                        mode={getAutofillMode(key)}
                        open={autofillMenuOpen === key}
                        onToggle={() => setAutofillMenuOpen(prev => prev === key ? null : key)}
                        onSelect={(value) => {
                          setAutofillModeByExercise(prev => ({ ...prev, [key]: value }));
                          setAutofillMenuOpen(null);
                        }}
                      />
                    )} */}
                  </div>
                  {onUpdateNotes && (
                    <input
                      className="input-notas"
                      placeholder="Notas"
                      value={ex.notes || ''}
                      onChange={e => onUpdateNotes(exi, e.target.value)}
                      rows={2}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {pendingEntries.length === 0 && doneEntries.length > 0 && !showDone && (
          <div className="header-sub" style={{ textAlign: 'center', padding: '20px 0', color: "var(--acento)" }}>
            ¡Terminaste todos los ejercicios! 🎉
          </div>
        )}
        <button className="btns primario" style={{ marginTop: 6, marginBottom: restTimer ? 110 : 0 }} onClick={() => setResumenOpen(true)}>Finalizar rutina</button>
      </div >

      {resumenOpen && (
        <ResumenRutina
          session={s}
          routineName={routineName}
          prs={prsSesion}
          onClose={() => setResumenOpen(false)}
          onConfirm={(guardarEnHistorial) => onFinish({ guardarEnHistorial })}
        />
      )}
      {
        gifPreview && (
          <div className="modal-overlay" onClick={() => setGifPreview(null)}>
            <div className="gif-preview-cont" onClick={e => e.stopPropagation()}>
              <button className="mini-btn gif-preview-close" title='Cerrar' onClick={() => setGifPreview(null)}>
                <X size={18} />
              </button>
              <img src={gifPreview.src} alt={gifPreview.nombre} className="gif-preview-img" />
              <div className="gif-preview-title">{gifPreview.nombre}</div>
            </div>
          </div>
        )
      }

      {
        pickerOpen && (
          <EjercicioModal
            isOpen={pickerOpen}
            onClose={onClosePicker}
            onSelect={onConfirmPicker}
          />
        )
      }

    </>
  );
}