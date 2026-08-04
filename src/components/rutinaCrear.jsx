import React, { useState, useMemo } from 'react';
import {
  X, Check, ChevronUp, ChevronDown, GripVertical,
  Plus, ChevronsDownUp, Play, Pause, RotateCcw, Dumbbell
} from 'lucide-react';
import { openDescansoToast } from './descansoToastModal';
import "./rutina.css"
import EjercicioModal from './ejercicioModal';
import { AddSquare, CopyIcon, MinusSquare, Remplazar, TimerIcon } from '../icons/icons';

const DIAS = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'M', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 0 },
];

// Misma paleta que RutinaDetalle, para que los músculos se identifiquen
// con el mismo color en todas las pantallas de la rutina.
const MUSCLE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

const eyebrowStyle = {
  fontSize: '.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--texto-gris)',
  fontFamily: "'Oswald', sans-serif",
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

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
        <button className="mini-btn" title={remaining === 0 ? 'Reiniciar' : 'Detener'} onClick={reset}>
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
      <button className="mini-btn" title="Iniciar" disabled={disabled} onClick={start}>
        <Play size={13} />
      </button>
    </div>
  );
}

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

  const handleDragStart = (exi) => (e) => {
    setDragIndex(exi);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (exi) => (e) => {
    e.preventDefault();
    if (exi !== dragOverIndex) setDragOverIndex(exi);
  };

  const handleDrop = (exi) => (e) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== exi) {
      onReorderExercise(dragIndex, exi);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
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

  return (
    <>
      <div className="header-cont">
        <div className="btn" onClick={onCancel}><X size={18} /></div>
        <div className='titulo'>
          {isSingle ? 'Editar ejercicio' : (d.id ? 'Editar rutina' : 'Nueva rutina')}
        </div>
        <div className="btn acento" title='Guardar' onClick={onSave}><Check size={18} /></div>
      </div>

      <div className="page-cont top">
        {!isSingle && (
          <>
            <div className="crear-input" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Nombre de la rutina</label>
                <input type="text" placeholder="Ej. Lunes — Pecho y hombros" value={d.name} onChange={e => onChangeName(e.target.value)} />
              </div>
              {d.exercises.length > 0 && (
                <div className="btn" style={{ marginLeft: "15px" }} title='Descanso para todos' onClick={openRestToastAll}>
                  <TimerIcon size={16} />
                </div>
              )}
            </div>

            <div className="crear-input">
              <label>¿Qué día la hacés?</label>
              <div className="dias-selector">
                {DIAS.map(dia => (
                  <div
                    key={dia.value}
                    className={`dia-chip${days.includes(dia.value) ? ' activo' : ''}`}
                    title={dia.value === hoy ? '' : undefined}
                    onClick={() => toggleDay(dia.value)}
                  >
                    {dia.label}
                  </div>
                ))}
              </div>
            </div>

            {d.exercises.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {[
                  { n: d.exercises.length, label: 'Ejercicios' },
                  { n: totalSets, label: 'Series' },
                ].map(s => (
                  <div
                    key={s.label}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: 'var(--componente)',
                      border: '1px solid var(--borde)',
                      borderRadius: 12,
                      padding: '14px 6px',
                    }}
                  >
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.3rem', color: 'var(--acento)' }}>
                      {s.n}
                    </div>
                    <div style={{ ...eyebrowStyle, fontSize: '.6rem', marginTop: 2, justifyContent: 'center' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {d.exercises.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={eyebrowStyle}>Ejercicios · {d.exercises.length}</div>
                <button
                  type="button"
                  className="mini-btn"
                  title={allCollapsed ? 'Expandir todo' : 'Colapsar todo'}
                  onClick={toggleAll}
                >
                  {allCollapsed ? <AddSquare size={14} /> : <MinusSquare size={14} />}
                </button>
              </div>
            )}
          </>
        )}

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
              className="ejercicio-cont"
              draggable={!isSingle}
              onDragStart={!isSingle ? handleDragStart(exi) : undefined}
              onDragOver={!isSingle ? handleDragOver(exi) : undefined}
              onDrop={handleDrop(exi)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: isDragging ? 0.5 : 1,
                borderColor: isDragOver ? 'var(--acento)' : undefined,
                transition: 'opacity .15s ease, border-color .15s ease',
              }}
            >
              <div className="ejercicio-header" onClick={() => toggleOne(ex.id)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>

                  <ChevronDown
                    size={15}
                    style={{
                      flexShrink: 0,
                      color: 'var(--texto-gris)',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform .15s ease',
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ex.name}</h4>
                    <div className="musculo" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>

                      {ex.muscle}
                      <span
                        className="descanso-badge"
                        title={ex.rest ? `Descanso: ${ex.rest}s` : 'Sin descanso configurado'}
                        onClick={(e) => { e.stopPropagation(); openRestToast(exi); }}
                      >
                        <TimerIcon size={11} /> {ex.rest ? `${ex.rest}s` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ejercicio-acciones" onClick={e => e.stopPropagation()}>
                  {!isSingle && exi > 0 && <div className="mini-btn" title='Subir' onClick={() => onMoveExercise(exi, -1)}><ChevronUp size={14} /></div>}
                  {!isSingle && exi < d.exercises.length - 1 && <div className="mini-btn" title='Bajar' onClick={() => onMoveExercise(exi, 1)}><ChevronDown size={14} /></div>}
                  <div className="mini-btn" title='Reemplazar ejercicio' onClick={() => onOpenPicker(exi)}><Remplazar size={14} /></div>
                  {!isSingle && <div className="mini-btn danger" title='Eliminar ejercicio' onClick={() => onRemoveExercise(exi)}><X size={14} /></div>}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                  transition: 'grid-template-rows .2s ease',
                }}
              >
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  <div className="ejercicio-inputs">
                    <div className="ejercicio-inputs-header" style={{ opacity: .8 }}>
                      <span style={{ width: 26 }} />
                      {isTimed ? <span style={{ flex: 1, textAlign: 'center' }}>Segundos</span> : (
                        <>
                          <span style={{ flex: 1, textAlign: 'center' }}>Kg</span>
                          <span style={{ flex: 1, textAlign: 'center' }}>Reps</span>
                        </>
                      )}
                    </div>

                    {ex.sets.map((s, si) => (
                      <div key={s.id} className="ejercicio-inputs-header">
                        <span
                          style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: '', color: 'var(--texto)',
                            fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem', fontWeight: 700,
                          }}
                        >{si + 1}</span>
                        {isTimed ? (
                          <input
                            type="text" inputMode="numeric"
                            value={s.reps}
                            placeholder="0"
                            onChange={e => onUpdateSetField(exi, si, 'reps', e.target.value)}
                          />
                        ) : (
                          <>
                            <input
                              type="text" inputMode="decimal"
                              value={s.weight}
                              disabled={isBodyweight}
                              placeholder="0"
                              onChange={e => onUpdateSetField(exi, si, 'weight', e.target.value.replace(',', '.'))}
                            />
                            <input
                              type="text" inputMode="numeric"
                              value={s.reps}
                              placeholder="0"
                              onChange={e => onUpdateSetField(exi, si, 'reps', e.target.value)}
                            />
                          </>
                        )}
                        <button className="check right" title="Quitar serie" onClick={() => onRemoveSet(exi, si)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button className="btns agregar" onClick={() => onAddSet(exi)}><Plus size={12} /> Añadir serie</button>
                      {ex.sets.length > 0 && (
                        <button className="btns agregar" onClick={() => onDuplicateLastSet(exi)}><CopyIcon size={12} /> Duplicar</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!isSingle && d.exercises.length === 0 && (
          <div className="page-sin" style={{ padding: '40px 20px 20px' }}>
            <Dumbbell size={40} style={{ opacity: 0.5, marginBottom: 16 }} />
            <h3>Sin ejercicios todavía</h3>
            <p>Agregá el primer ejercicio para armar esta rutina.</p>
          </div>
        )}

        {!isSingle && (
          <button
            className="btns agregar"

            onClick={() => onOpenPicker()}
          >
            Añadir ejercicio
          </button>
        )}
      </div>

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