import React, { useState, useMemo } from 'react';
import {
  X, Check, ChevronUp, ChevronDown, GripVertical,
  Plus, Play, Pause, RotateCcw
} from 'lucide-react';
import { openDescansoToast } from '../modales/descansoToastModal';
import "./rutina.css"
import EjercicioModal from '../modales/ejercicioModal';
import { AddSquare, CopyIcon, Grip, MinusSquare, Remplazar, TimerIcon } from '../../icons/icons';
import { MUSCLE_COLORS } from './rutinaDetalle';
import ReordenarEjerciciosModal from '../modales/ReordenarEjerciciosModal';

const DIAS = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'X', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 0 },
];

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
      <div className="set-val timer-counting">
        <span className={`tiempo-set-num ${remaining === 0 ? 'listo' : ''}`}>{remaining}</span>
        <button className="mini-btn" type="button" title={remaining === 0 ? 'Reiniciar' : 'Detener'} onClick={reset}>
          {remaining === 0 ? <RotateCcw size={13} /> : <Pause size={13} />}
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
        <Play size={13} />
      </button>
    </div>
  );
}
const CHIP_ALPHA = '2e';

export default function RutinaCrear({
  draft, onChangeName, onMoveExercise, onRemoveExercise, onAddSet, onRemoveSet, onUpdateSetField,
  onOpenPicker, onSave, onCancel, onDeleteRoutine,
  onDuplicateLastSet, onReorderExercise, onUpdateRest,
  onChangeDays,
  pickerOpen, pickerSelection, onConfirmPicker, onClosePicker,
  mode = 'full'
}) {
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const pointerIdRef = React.useRef(null);
  const listRef = React.useRef(null);

  const getIndexAtPoint = (clientY) => {
    const container = listRef.current;
    if (!container) return null;
    const cards = Array.from(container.querySelectorAll('.ex-card'));
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) {
        return Number(card.dataset.index);
      }
    }
    // si el puntero quedó por debajo de todas las tarjetas -> va al final
    return cards.length ? Number(cards[cards.length - 1].dataset.index) : null;
  };
  const [reorderOpen, setReorderOpen] = useState(false);

  // Todos los hooks deben ejecutarse siempre en el mismo orden, así que
  // este useMemo va ANTES del return temprano por `!draft` (si no, React
  // ve un hook menos en el primer render y tira "Rendered fewer hooks").
  const muscleColorMap = useMemo(() => {
    const exercises = draft?.exercises || [];
    const muscles = Array.from(new Set(exercises.map(ex => ex.muscle).filter(Boolean)));
    const map = {};
    muscles.forEach((m, i) => { map[m] = MUSCLE_COLORS[i % MUSCLE_COLORS.length]; });
    return map;
  }, [draft?.exercises]);
  const colorFor = (m) => muscleColorMap[m] || 'var(--acento)';

  const LONG_PRESS_MS = 320;
  const MOVE_CANCEL_PX = 10;

  const longPressTimerRef = React.useRef(null);
  const startPosRef = React.useRef({ x: 0, y: 0 });
  const suppressClickRef = React.useRef(false);
  const headElRef = React.useRef(null);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startDrag = (exi, target, pointerId) => {
    suppressClickRef.current = true;
    setDragIndex(exi);
    setDragOverIndex(exi);
    if (navigator.vibrate) navigator.vibrate(10);
    headElRef.current = target;
    target.style.touchAction = 'none'; // recién ahora bloqueamos el scroll nativo
    try { target.setPointerCapture(pointerId); } catch { }
  };

  const handleHeadPointerDown = (exi) => (e) => {
    if (isSingle) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.ex-actions, .delta-badge')) return; // no pisar botones ni el toggle de descanso

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    suppressClickRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => startDrag(exi, target, pointerId), LONG_PRESS_MS);
  };

  const handleHeadPointerMove = (e) => {
    if (dragIndex === null) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearLongPress();
      return;
    }
    e.preventDefault();
    const idx = getIndexAtPoint(e.clientY);
    if (idx !== null && idx !== dragOverIndex) setDragOverIndex(idx);
  };

  const endDrag = () => {
    clearLongPress();
    if (headElRef.current) {
      headElRef.current.style.touchAction = '';
      headElRef.current = null;
    }
    if (dragIndex !== null) {
      if (dragOverIndex !== null && dragIndex !== dragOverIndex) {
        onReorderExercise(dragIndex, dragOverIndex);
      }
      setDragIndex(null);
      setDragOverIndex(null);
    }
  };

  const handleHeadPointerUp = () => endDrag();

  // ---------- Reordenar ejercicios: drag exclusivamente desde el grip ----------
  const handleGripPointerDown = (exi) => (e) => {
    if (isSingle) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    pointerIdRef.current = e.pointerId;
    try { target.setPointerCapture(e.pointerId); } catch { }
    setDragIndex(exi);
    setDragOverIndex(exi);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleGripPointerMove = (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    const idx = getIndexAtPoint(e.clientY);
    if (idx !== null && idx !== dragOverIndex) setDragOverIndex(idx);
  };

  const handleGripPointerUp = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onReorderExercise(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    pointerIdRef.current = null;
  };

  const openRestToast = (exi) => {
    const ex = d.exercises[exi];
    openDescansoToast({
      exerciseName: ex.name,
      initialValue: ex.rest,
      onConfirm: (value) => onUpdateRest(exi, value),
    });
  };

  const openRestToastAll = () => {
    openDescansoToast({
      exerciseName: 'todos los ejercicios',
      initialValue: d.exercises[0]?.rest,
      onConfirm: (value) => {
        d.exercises.forEach((_, exi) => onUpdateRest(exi, value));
      },
    });
  };

  if (!draft) return null;
  const d = draft;
  const isSingle = mode === 'single';
  const days = d.days || [];
  const hoy = new Date().getDay();

  const totalSets = d.exercises.reduce((s, e) => s + e.sets.length, 0);
  const allCollapsed = d.exercises.length > 0 && d.exercises.every(ex => collapsedIds.has(ex.id));

  const toggleAll = () => {
    setCollapsedIds(allCollapsed ? new Set() : new Set(d.exercises.map(ex => ex.id)));
  };

  const toggleOne = (id) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDay = (value) => {
    const next = days.includes(value)
      ? days.filter(v => v !== value)
      : [...days, value];
    onChangeDays(next);
  };

  // ---------- Reordenar ejercicios: mantené presionada la tarjeta para arrastrar ----------


  return (
    <>
      <div className="header">
        <div className="btn-circle" title="Cerrar" onClick={onCancel}><X size={18} /></div>
        <h1 className="page-title" style={{ margin: 0 }}>
          {isSingle ? 'Editar ejercicio' : (d.id ? 'Editar rutina' : 'Nueva rutina')}
        </h1>

        <div className="btn-circle acento" title="Guardar" onClick={onSave}><Check size={18} /></div>

      </div>

      {!isSingle && (
        <>
          <div className="hero">
            <div className="hero-title-wrap">
              <span className="border-bottom" />
              <span className="border-top" />
              <input
                className="hero-title-input"
                type="text"
                placeholder="NOMBRE DE LA RUTINA"
                value={d.name}
                onChange={e => onChangeName(e.target.value)}
              />
            </div>
            <div className="hero-meta">
              {d.exercises.length} ejercicio{d.exercises.length !== 1 ? 's' : ''}
              {totalSets > 0 ? ` · ${totalSets} serie${totalSets !== 1 ? 's' : ''}` : ''}
            </div>
          </div>

          <div className="pills">
            {DIAS.map(dia => (
              <button
                key={dia.value}
                type="button"
                className={`pill ${days.includes(dia.value) ? 'activo' : ''}`}
                title={dia.value === hoy ? 'Hoy' : undefined}
                onClick={() => toggleDay(dia.value)}
              >
                {dia.label}
              </button>
            ))}

          </div>

          {d.exercises.length > 0 && (
            <div className="stats-cont">
              <div className="stats-item">
                <div className="stat-num">{d.exercises.length}</div>
                <div className="stat-label">Ejercicios</div>
              </div>
              <div className="stats-item">
                <div className="stat-num">{totalSets}</div>
                <div className="stat-label">Series</div>
              </div>
            </div>
          )}

          {d.exercises.length > 0 && (
            <div className="ex-section-head">
              <div className="flex gap8">
                <button type="button" className="pill pill-rest-all " data-tooltip="Descanso para todos" onClick={openRestToastAll}>
                  <TimerIcon size={13} /> Descanso
                </button>
                <button type="button" className="pill" onClick={() => setReorderOpen(true)}>
                  <Grip size={13} /> Reordenar
                </button>
              </div>
              <button
                type="button"
                className="btn-circle small "
                data-tooltip={allCollapsed ? 'Expandir todo' : 'Colapsar todo'}
                title={allCollapsed ? 'Expandir todo' : 'Colapsar todo'}
                onClick={toggleAll}
              >
                {allCollapsed ? <AddSquare size={14} /> : <MinusSquare size={14} />}
              </button>
            </div>
          )}
        </>
      )}

      <div className="ex-list" ref={listRef}>
        {d.exercises.map((ex, exi) => {
          const isTimed = esEjercicioDeTiempo(ex);
          const isBodyweight = ex.equipment === 'P. corporal';
          const isCollapsed = collapsedIds.has(ex.id);
          const isDragOver = !isSingle && dragOverIndex === exi && dragIndex !== null && dragIndex !== exi;
          const isDragging = dragIndex === exi;
          const mColor = colorFor(ex.muscle);

          return (
            <div
              key={ex.id}
              data-index={exi}
              className={`ex-card ex-card-in ${!isCollapsed ? 'open' : ''} ${isDragOver ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''}`}
              style={{ animationDelay: `${Math.min(exi, 8) * 40}ms` }}
            >
              <div
                className="ex-head"
                onClick={() => toggleOne(ex.id)}
              >


                <ChevronDown size={16} className="chev" />

                <div className="ex-title-block">
                  <div className="ex-name">{ex.name}</div>
                  <div className="ex-sub flex gap8">
                    {ex.muscle && (
                      <span className="muscle-chip" style={{ background: `${mColor}${CHIP_ALPHA}`, color: mColor }}>{ex.muscle}</span>
                    )}
                    <span
                      className="delta-badge"
                      title={ex.rest ? `Descanso: ${ex.rest}s` : 'Sin descanso configurado'}
                      onClick={e => { e.stopPropagation(); openRestToast(exi); }}
                    >
                      <TimerIcon size={11} /> {ex.rest ? `${ex.rest}s` : '—'}
                    </span>
                  </div>
                </div>

                <div className="ex-actions" onClick={e => e.stopPropagation()}>

                  <button type="button" className="btn-circle small" title="Reemplazar ejercicio" onClick={() => onOpenPicker(exi)}>
                    <Remplazar size={14} />
                  </button>
                  {!isSingle && (
                    <button type="button" className="btn-circle small danger" title="Eliminar ejercicio" onClick={() => onRemoveExercise(exi)}>
                      <X size={14} />
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
                      {isTimed ? <span>Segundos</span> : (
                        <>
                          <span>Kg</span>
                          <span>Reps</span>
                        </>
                      )}
                      <span style={{ flex: '0 0 30px' }} />
                    </div>

                    {ex.sets.map((s, si) => (
                      <div key={s.id} className="set-row">
                        <div className="set-idx">{si + 1}</div>

                        {isTimed ? (
                          <TimerInput
                            value={s.reps}
                            placeholder="0"
                            onChange={v => onUpdateSetField(exi, si, 'reps', v)}
                          />
                        ) : (
                          <>
                            <input
                              className="set-val"
                              type="text" inputMode="decimal"
                              value={s.weight}
                              style={{
                                maxWidth: "35%"
                              }}
                              disabled={isBodyweight}
                              placeholder="0"
                              onChange={e => onUpdateSetField(exi, si, 'weight', e.target.value.replace(',', '.'))}
                            />
                            <input
                              className="set-val"
                              style={{
                                maxWidth: "40%"
                              }}
                              type="text" inputMode="numeric"
                              value={s.reps}
                              placeholder="0"
                              onChange={e => onUpdateSetField(exi, si, 'reps', e.target.value)}
                            />
                          </>
                        )}

                        <button type="button" className="btn-circle small" title="Quitar serie" onClick={() => onRemoveSet(exi, si)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    <div className="set-actions">
                      <button type="button" className="pill" onClick={() => onAddSet(exi)}>
                        <Plus size={13} /> Añadir serie
                      </button>
                      {ex.sets.length > 0 && (
                        <button type="button" className="pill" onClick={() => onDuplicateLastSet(exi)}>
                          <CopyIcon size={13} /> Duplicar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!isSingle && d.exercises.length === 0 && (
          <div className="sin flex column textCenter justifyContentCenter" style={{ padding: '40px 20px 20px' }}>
            <h3 className='fontSize1-5'>Sin ejercicios todavía</h3>
            <p className='fontSize8'>Agregá el primer ejercicio para armar esta rutina.</p>
          </div>
        )}
      </div>

      {!isSingle && (
        <div style={{ padding: '0 20px 40px' }}>
          <button type="button" className="add-exercise-btn flex gap8 justifyContentCenter" onClick={() => onOpenPicker()}>
            <Plus size={18} /> Añadir ejercicio
          </button>
        </div>
      )}
      {reorderOpen && (
        <ReordenarEjerciciosModal
          exercises={d.exercises}
          onMove={(i, dir) => onMoveExercise(i, dir)}
          onClose={() => setReorderOpen(false)}
        />
      )}
      {pickerOpen && (
        <EjercicioModal
          isOpen={pickerOpen}
          onClose={onClosePicker}
          onSelect={(exercise) => {
            onConfirmPicker(exercise);
            onClosePicker();
          }}
          apiBaseUrl="https://j3prwv26-4000.brs.devtunnels.ms/api"
        />
      )}
    </>
  );
}