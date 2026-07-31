import React from 'react';
import { X, Check, Plus, Copy, Repeat, Pencil, ChevronsUpDown, ChevronsDownUp, Pause, Play, Award, Dumbbell, Eye, CheckCircle2, ChevronDown, RotateCcw } from 'lucide-react';
import { formatElapsed } from '../utils/time';
import EjercicioModal from './ejercicioModal';
import ResumenRutina from './ResumenRutina';
import "./rutina.css"
import { DescansoBotonFlotante, resetDescansoState } from './TiempoDescansoToast';
import { sileo } from 'sileo';

function formatElapsedFull(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}


const EJERCICIOS_TIEMPO = ['Plancha'];

function esEjercicioDeTiempo(ex) {
  const nombre = ex.nombre ?? ex.name ?? '';
  return !!ex.esTiempo || EJERCICIOS_TIEMPO.includes(nombre);
}
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
          {remaining === 0 ? <RotateCcw size={13} /> : <Pause size={13} />}
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
        <Play size={13} />
      </button>
    </div>
  );
}
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
    const willComplete = !set.done && ex.sets.every((st, idx) => idx === si || st.done);

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
      w = +set.weight || 0;
      r = +set.reps || 0;
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

    if (!willComplete) return;

    const currentKey = ex.id ?? exi;

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
      next.add(currentKey);
      if (nextKey !== null) next.delete(nextKey);
      return next;
    });

    // Animamos la salida del ejercicio recién completado antes de sacarlo de la vista principal
    setFinishingKeys(prev => new Set(prev).add(currentKey));
    setTimeout(() => {
      setFinishingKeys(prev => {
        const next = new Set(prev);
        next.delete(currentKey);
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
  const visibleEntries = showDone ? exercisesWithIndex : pendingEntries;
  return (
    <>
      <DescansoBotonFlotante />
      <div className="header-cont">
        <div style={{ display: 'flex', gap: 6 }}>

          <div className="btn" onClick={onCancel}><X size={18} /></div>
          <div className="btn" title="Achicar y ver rutinas" onClick={onMinimize}><ChevronDown size={18} /></div>
        </div>
        <div>
          <div className="tiempo" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            {formatElapsedFull(elapsedMs)}
            {onToggleSessionPause && (
              <span className={`mini-btn`} title={s.paused ? 'Reanudar' : 'Pausar'} onClick={onToggleSessionPause}>
                {s.paused ? <Play size={13} /> : <Pause size={13} />}
              </span>
            )}
          </div>
          <div className="header-sub">{s.paused ? ' · Pausado' : ''}</div>
        </div>
        {s.exercises.length > 0 ? (
          <div style={{ display: 'flex', gap: 6 }}>
            {doneEntries.length > 0 && (
              <div
                className="btn"
                title={showDone ? 'Ocultar terminados' : 'Ver terminados'}
                onClick={() => setShowDone(v => !v)}
                style={{ position: 'relative' }}
              >
                <CheckCircle2 size={16} color={showDone ? 'var(--acento)' : undefined} />
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
            <div className="btn" title={allCollapsed ? 'Expandir todo' : 'Colapsar todo'} onClick={toggleAll}>
              {allCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}
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
                      <Dumbbell size={20} strokeWidth={1.5} />
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
                      <Eye size={14} />
                    </button>
                  )}
                  {onEditExercise && (
                    <button className="mini-btn" title="Editar ejercicio" onClick={() => onEditExercise(exi)}>
                      <Pencil size={14} />
                    </button>
                  )}
                  {onOpenPicker && (
                    <button className="mini-btn" title="Cambiar ejercicio" onClick={() => onOpenPicker(exi)}>
                      <Repeat size={14} />
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
                        <span></span>
                        {isTimed ? <span className='segs'>Segundos</span> : <><span>Kg</span><span>Reps</span></>}
                      </div>
                    );
                  })()}
                  {ex.sets.map((set, si) => {
                    const isBodyweight = ex.equipment === 'P. corporal';
                    const isTimed = esEjercicioDeTiempo(ex);
                    return (
                      <div key={set.id ?? si} className={`ejercicio-inputs-cont ${set.done ? 'done' : ''}`}>
                        <span className="ejercicio-num">{si + 1}</span>
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    {ex.sets.length > 0 && onDuplicateLastSet && (
                      <button className="btns agregar" onClick={() => onDuplicateLastSet(exi)}><Copy size={12} /> Duplicar</button>
                    )}
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