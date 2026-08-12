import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft, ChevronDown, ChevronsUpDown, ChevronsDownUp,
  Check,
  Loader2,
  Upload,
  Info,
  X,
} from 'lucide-react';
import "./rutinas.css"
import { sileo } from 'sileo';
import { fetchFriendships, getPublicProfiles, sendRoutineShare } from '../../lib/social';
import { Chart, PlayIcon, MoreHorizontal, TrenUp, TrenDown, MinusSquare, AddSquare, InfoIcon, AirDrop, SendIcon, CopyIcon, Edit, TrashIcon, Letras } from '../../icons/icons';
import EnviarAmigosModal from '../modales/enviarAmigos.jsx';
import { StatNumber } from './count.jsx';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const MUSCLE_COLORS = ['#22c55e', '#3b82f6', '#ff9a4a', '#ff5a4a', '#b28aff', '#b2d5e5', '#ff1493', '#c6ff34'];

// alpha suffix appended to a hex color to make a soft translucent chip background (~18% alpha)
const CHIP_ALPHA = '2e';

function formatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days} día${days > 1 ? 's' : ''}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
  const years = Math.floor(days / 365);
  return `hace ${years} año${years > 1 ? 's' : ''}`;
}

function MuscleChip({ active, color, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pill ${active ? 'activo' : ''}`}
      style={{ width: 'auto', padding: '0 12px' }}
    >
      {active && color && (
        <span className="muscle-dot" style={{ background: color }} />
      )}
      {children}
    </button >
  );
}

export default function RutinaDetalle({
  routine, kebabOpen, onToggleKebab, onBack, onEdit, onDuplicate, onDelete, onStartSession,
  authSession, onRevertTempOverride,
  onRename, onShare, onCopyText, history, reminder, onSaveReminder, onClearReminder
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState(null);
  const kebabRef = useRef(null);
  const [distMode, setDistMode] = useState("bar");
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [sending, setSending] = useState(false);

  const [distReveal, setDistReveal] = useState(false);

  useEffect(() => {
    setDistReveal(false);
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setDistReveal(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [distMode]);

  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
    touchEnd.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    touchEnd.current = e.touches[0].clientX;
    if (touchStart.current == null) return;
    const raw = touchEnd.current - touchStart.current;
    // solo respondemos al swipe hacia la derecha (gesto "volver" de iOS),
    // con resistencia progresiva como en un sheet nativo
    setSwipeX(raw > 0 ? Math.min(raw * 0.55, 160) : 0);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    if (!touchStart.current || !touchEnd.current) {
      setSwipeX(0);
      touchStart.current = null;
      touchEnd.current = null;
      return;
    }

    const distance = touchEnd.current - touchStart.current;

    if (distance > 100) {
      // gesto completado: desliza la página afuera y recién ahí navega,
      // en vez de cortar en seco a la pantalla anterior
      setIsExiting(true);
      if (navigator.vibrate) {
        try { navigator.vibrate(8); } catch (_) { }
      }
      setTimeout(onBack, 220);
    } else {
      // no llegó al umbral: vuelve a su lugar con resorte
      setSwipeX(0);
    }

    touchStart.current = null;
    touchEnd.current = null;
  };

  useEffect(() => {
    if (!kebabOpen) return;
    const handleClickOutside = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) {
        onToggleKebab();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [kebabOpen, onToggleKebab]);

  const hoy = new Date().getDay();

  if (!routine) return null;
  const hasTempOverride = !!routine.tempOverride;
  const effectiveExercises = routine.tempOverride?.exercises || routine.exercises;
  const esHoy = routine.days?.includes(hoy);

  const totalSets = effectiveExercises.reduce((s, e) => s + e.sets.length, 0);

  const muscles = useMemo(() => {
    return Array.from(new Set(effectiveExercises.map(ex => ex.muscle).filter(Boolean)));
  }, [effectiveExercises]);

  const muscleColorMap = useMemo(() => {
    const map = {};
    muscles.forEach((m, i) => { map[m] = MUSCLE_COLORS[i % MUSCLE_COLORS.length]; });
    return map;
  }, [muscles]);

  const colorFor = (m) => muscleColorMap[m] || 'var(--texto-gris)';

  const exercises = useMemo(() => {
    if (!muscleFilter) return effectiveExercises;
    return effectiveExercises.filter(ex => ex.muscle === muscleFilter);
  }, [effectiveExercises, muscleFilter]);

  const lastEntry = useMemo(() => {
    return history
      .filter(h => h.routineId === routine.id)
      .sort((a, b) => b.date - a.date)[0] || null;
  }, [history, routine.id]);

  const muscleVolume = useMemo(() => {
    const counts = {};
    let total = 0;
    effectiveExercises.forEach(ex => {
      const m = ex.muscle || 'Sin músculo';
      counts[m] = (counts[m] || 0) + ex.sets.length;
      total += ex.sets.length;
    });
    return Object.entries(counts)
      .map(([muscle, count]) => ({ muscle, count, pct: total ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [effectiveExercises]);

  const exerciseHistoryMap = useMemo(() => {
    const routineHistory = history
      .filter(h => h.routineId === routine.id)
      .sort((a, b) => b.date - a.date);
    const map = {};
    effectiveExercises.forEach(ex => {
      const occurrences = [];
      for (const entry of routineHistory) {
        const match = entry.exercises.find(e => e.name === ex.name);
        if (match) {
          const volume = match.sets.reduce((s, st) => s + (+st.weight || 0) * (+st.reps || 0), 0);
          occurrences.push({ date: entry.date, volume });
          if (occurrences.length === 2) break;
        }
      }
      map[ex.id] = occurrences;
    });
    return map;
  }, [history, routine.id, effectiveExercises]);

  const toggleCollapse = (id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRenombrarRapido = (routineId, currentName) => {
    onToggleKebab();
    const nameRef = { current: currentName };
    let toastId;

    toastId = sileo.action({
      title: "Renombrar rutina",
      duration: null,
      description: (
        <input
          type="text"
          className='input-sileo'
          defaultValue={currentName}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { nameRef.current = e.target.value; }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              onRename(routineId, nameRef.current);
              sileo.dismiss(toastId);
            }
          }}
        />
      ),
      button: {
        title: "Guardar",
        className: "btn-principal transicion flex justifyContentCenter borderRadiusChip borde borde-hover fontSize9",
        onClick: () => {
          onRename(routineId, nameRef.current);
          sileo.dismiss(toastId);
        },
      },
      styles: {
        container: "sileo-cont",
        title: "sileo-title",
        description: "sileo-description",
        button: "btns agregar sileo",
      },
    });
  };

  const userId = authSession?.user?.id;

  async function openSendModal() {
    onToggleKebab();
    setSelectedFriendId(null);
    setSendModalOpen(true);
    setLoadingFriends(true);

    const { data: fData } = await fetchFriendships(userId);
    const accepted = (fData || []).filter(f => f.status === 'accepted');
    const friendIds = accepted.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id);

    if (friendIds.length === 0) {
      setFriends([]);
      setLoadingFriends(false);
      return;
    }

    const { data: profData } = await getPublicProfiles(friendIds);
    setFriends(profData || []);
    setLoadingFriends(false);
  }

  async function confirmSendToFriend() {
    if (!selectedFriendId || !userId) return;
    setSending(true);
    const { error } = await sendRoutineShare(userId, selectedFriendId, routine);
    setSending(false);

    if (error) {
      sileo.error({ title: 'No se pudo enviar la rutina', description: error.message });
      return;
    }
    sileo.success({ title: 'Rutina enviada' });
    setSendModalOpen(false);
  }

  const toggleCollapseAll = (e) => {
    e.stopPropagation();
    if (allCollapsed) {
      setCollapsed(new Set());
      setAllCollapsed(false);
    } else {
      setCollapsed(new Set(effectiveExercises.map(ex => ex.id)));
      setAllCollapsed(true);
    }
  };

  return (
    <>
      <div
        className={`page ${isExiting ? 'exiting' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform .4s var(--ease-spring)',
        }}
      >
        <div className="header" ref={kebabRef}>
          <div className="icon-btn" title='Volver' onClick={onBack}><ChevronLeft size={20} /></div>

          <div className='flex gap10'>
            <button
              type="button"
              className="btn-circle tooltipe"
              title={allCollapsed ? "Expandir todo" : "Colapsar todo"}
              onClick={toggleCollapseAll}
              data-tooltip={allCollapsed ? "Expandir todo" : "Colapsar todo"}
            >
              <span key={allCollapsed ? 'exp' : 'col'} className="icon-pop">
                {allCollapsed ? <AddSquare size={14} /> : <MinusSquare size={14} />}
              </span>
            </button>
            <button
              className={`icon-btn accent tooltipe ${esHoy ? 'pulse-cta' : ''}`}
              data-tooltip="Empezar"
              title='Empezar'
              onClick={onStartSession}
            ><PlayIcon size={20} /></button>
            <div className="icon-btn" title='Opciones' onClick={onToggleKebab}
            ><MoreHorizontal size={18} /></div>
          </div>
          {kebabOpen && (
            <div className="kebab">
              <div className="kebab-item" onClick={onEdit}>
                <span>Editar rutina</span>
                <Edit size={15} />
              </div>
              <div className="kebab-item" onClick={() => handleRenombrarRapido(routine.id, routine.name)}>
                <span>Renombrar rápido</span>
                <Letras size={15} />
                {/* <Type size={15} /> */}
              </div>
              <div className="kebab-item" onClick={onDuplicate}>
                <span>Duplicar rutina</span>
                <CopyIcon size={15} />
              </div>
              {/* <div className="kebab-item" onClick={openSendModal}>
                <span>Enviar a un amigo</span>
                <SendIcon size={15} />
              </div> */}
              <div className="kebab-item" onClick={() => onShare(routine.id)}>
                <span>Compartir</span>
                <AirDrop size={15} />
              </div>
              <div className="kebab-item" onClick={() => { onToggleKebab(); onCopyText(routine.id); }}>
                <span>Copiar como texto</span>
                <CopyIcon size={15} />
              </div>
              <div className="kebab-item danger" onClick={onDelete}>
                <span>Eliminar rutina</span>
                <TrashIcon size={15} />
              </div>
            </div>
          )}
        </div>

        <div className="hero hero-in">
          <div className="hero-top">
            <h1 className="hero-title">{routine.name}</h1>
            {routine.days?.length > 0 && (
              <div className="flex gap8" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {DIAS.map((d, i) => (
                  routine.days.includes(i) && (
                    <span
                      key={i}
                      className={`day-badge ${i === hoy ? 'today' : ''}`}
                    >
                      {d.slice(0, 3)}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="hero-meta">
            {lastEntry
              ? `Última vez: ${formatRelative(lastEntry.date)} · ${lastEntry.totalSets} series · ${Math.round(lastEntry.totalVolume).toLocaleString('es-AR')} kg`
              : 'Todavía no registraste ninguna sesión de esta rutina'}
          </div>
        </div>

        {hasTempOverride && (
          <div style={{ padding: '0 20px' }}>
            <div
              className="flex gap10 info-cont componente-transp borde borderRadiusCards marginTop5 marginBottom10"
              onClick={() => setInfoCollapsed(v => !v)}
              style={{ cursor: "pointer" }}
            >
              <InfoIcon
                size={16}
                color="var(--acento)"
                style={{
                  flexShrink: 0,
                  transition: "transform .2s",
                  transform: infoCollapsed ? "scale(.9)" : "scale(1)"
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className='fontSize1'>
                  Cambios guardados solo para la próxima vez
                </h3>

                <div
                  className={`grid transicion grid-rows1 ${infoCollapsed ? "grid-rows0" : ""}`}
                >
                  <div style={{ overflow: "hidden" }}>
                    <p className="sub fontSize7">
                      Estás viendo la versión modificada que se va a usar la próxima vez que empieces esta rutina.
                      Después vuelve sola a como estaba.
                    </p>

                    {onRevertTempOverride && (
                      <button
                        className="btn-principal transicion flex justifyContentCenter borderRadiusChip borde borde-hover fontSize9 tooltipe"
                        data-tooltip="Descartar y volver a la versión original"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRevertTempOverride(routine.id);
                        }}
                      >
                        Descartar cambios
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className='stat-row-detail'>
          {[
            { n: effectiveExercises.length, label: 'Ejercicios' },
            { n: totalSets, label: 'Series' },
            { n: lastEntry ? Math.round(lastEntry.totalVolume).toLocaleString('es-AR') : '—', label: 'Último vol.' },
          ].map((s, i) => (
            <div key={s.label} className='stat-card stat-card-in'
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <StatNumber value={s.n} />
              <h3 className='stat-label'>{s.label}</h3>
            </div>
          ))}
        </div>

        {muscleVolume.length > 0 && (
          <div className="dist-section">
            <div
              className="dist-header flex gap8"
              onClick={() => setDistMode(prev => prev === "bar" ? "ring" : "bar")}
            >
              <Chart size={13} className={`dist-toggle-icon ${distMode === 'ring' ? 'flipped' : ''}`} />
              <h3 className='fontSize8 gris'>
                Distribución muscular
              </h3>
            </div>

            <div className="dist-morph">

              {/* BARRA */}
              <div className={`dist-bar-wrap ${distMode === "bar" ? "is-active" : "is-hidden"}`}>
                <div className="dist-bar">
                  {muscleVolume.map((mv, i) => (
                    <div
                      key={mv.muscle}
                      className="dist-bar-seg"
                      title={`${mv.muscle}: ${Math.round(mv.pct)}%`}
                      style={{
                        width: (distMode === "bar" && distReveal) ? `${mv.pct}%` : "0%",
                        background: colorFor(mv.muscle),
                        transitionDelay: distMode === "bar" ? `${i * 45}ms` : "0ms"
                      }}
                    />
                  ))}
                </div>

                <div className="dist-legend">
                  {muscleVolume.map(mv => (
                    <div key={mv.muscle} className="legend-pill">
                      <span className="muscle-dot" style={{ background: colorFor(mv.muscle) }} />
                      {mv.muscle} · {Math.round(mv.pct)}%
                    </div>
                  ))}
                </div>
              </div>

              {/* RING */}
              <div className={`dist-ring-wrap ${distMode === "ring" ? "is-active" : "is-hidden"}`}>
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="var(--componente)" strokeWidth="11" />
                  {(() => {
                    let offset = 0;
                    return muscleVolume.map((mv, i) => {
                      const dash = 251.2 * (mv.pct / 100);
                      const currentDash = (distMode === "ring" && distReveal) ? dash : 0;
                      const circle = (
                        <circle
                          key={mv.muscle}
                          className="ring-seg"
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke={colorFor(mv.muscle)}
                          strokeWidth="11"
                          strokeLinecap="round"
                          strokeDasharray={`${currentDash} 251.2`}
                          strokeDashoffset={-offset}
                          style={{ transitionDelay: distMode === "ring" ? `${i * 70}ms` : "0ms" }}
                        />
                      );
                      offset += dash;
                      return circle;
                    });
                  })()}
                </svg>

                <div className="ring-legend column flex gap4">
                  {muscleVolume.map(mv => (
                    <div key={mv.muscle} className="legend-pill">
                      <span className="muscle-dot" style={{ background: colorFor(mv.muscle) }} />
                      {mv.muscle} · {Math.round(mv.pct)}%
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="ex-filter-row">
          <MuscleChip active={!muscleFilter} onClick={() => setMuscleFilter(null)}>
            Todos
          </MuscleChip>
          {muscles.map(m => (
            <MuscleChip
              key={m}
              active={muscleFilter === m}
              color={colorFor(m)}
              onClick={() => setMuscleFilter(prev => (prev === m ? null : m))}
            >
              {m}
            </MuscleChip>
          ))}
        </div>

        <div className="ex-list">
          {exercises.map((ex, idx) => {
            const isCollapsed = collapsed.has(ex.id);
            const occurrences = exerciseHistoryMap[ex.id] || [];
            const last = occurrences[0];
            const prev = occurrences[1];
            const delta = last && prev ? last.volume - prev.volume : null;
            const muscleColor = colorFor(ex.muscle);

            return (
              <div
                key={ex.id}
                className={`ex-card ex-card-in ${isCollapsed ? '' : 'open'}`}
                style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
              >
                <div
                  className="ex-head"
                  title={isCollapsed ? "Expandir" : "Colapsar"}
                  onClick={() => toggleCollapse(ex.id)}
                >
                  <ChevronDown size={16} className="chev" />

                  <div className="ex-title-block">
                    <div className="ex-name">{ex.name}</div>
                    <div className="ex-sub">
                      {last
                        ? `${formatRelative(last.date)} · ${Math.round(last.volume).toLocaleString('es-AR')} kg`
                        : `${ex.sets.length} serie${ex.sets.length !== 1 ? 's' : ''}`}
                    </div>
                  </div>

                  {ex.muscle && (
                    <span
                      className="muscle-chip"
                      style={{ background: `${muscleColor}${CHIP_ALPHA}`, color: muscleColor }}
                    >
                      {ex.muscle}
                    </span>
                  )}

                  {delta !== null && Math.round(delta) !== 0 && (
                    <span
                      className="delta-badge delta-badge-in"
                      style={{ color: delta > 0 ? 'var(--acento)' : 'var(--rojo)' }}
                    >
                      {delta > 0 ? <TrenUp size={16} /> : <TrenDown size={16} />}
                      {Math.abs(Math.round(delta)).toLocaleString('es-AR')}
                    </span>
                  )}
                </div>

                <div
                  className="ex-body"
                  style={{
                    display: 'grid',
                    gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                    transition: 'grid-template-rows .38s var(--ease-out-ios)',
                  }}
                >
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    <div
                      className="ex-body-inner"
                      style={{
                        opacity: isCollapsed ? 0 : 1,
                        transform: isCollapsed ? 'translateY(-4px)' : 'translateY(0)',
                        transition: 'opacity .28s var(--ease-out-ios) .05s, transform .28s var(--ease-out-ios) .05s',
                      }}
                    >
                      <div className="set-table-head">
                        <span>Kg</span>
                        <span>Reps</span>
                      </div>
                      {ex.sets.map((s, i) => (
                        <div key={s.id} className="set-row">
                          <div className="set-idx">{i + 1}</div>
                          <div className="set-val">{s.weight || 0}</div>
                          <div className="set-val">{s.reps || 0}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {exercises.length === 0 && (
            <div className="sub" style={{ marginTop: 20, padding: '0 4px' }}>
              No hay ejercicios de "{muscleFilter}" en esta rutina.
            </div>
          )}
        </div>

        {sendModalOpen && (
          <EnviarAmigosModal
            routines={[routine]}
            friends={friends}
            loadingFriends={loadingFriends}
            selectedFriendId={selectedFriendId}
            onSelectFriend={setSelectedFriendId}
            sending={sending}
            onClose={() => !sending && setSendModalOpen(false)}
            onConfirm={confirmSendToFriend}
          />
        )}
      </div>
    </>
  );
}