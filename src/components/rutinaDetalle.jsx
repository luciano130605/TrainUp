import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft, ChevronDown, ChevronsUpDown, ChevronsDownUp,
  Check,
  Loader2,
  Upload,
} from 'lucide-react';
import "./rutina.css"
import { sileo } from 'sileo';
import { fetchFriendships, getPublicProfiles, sendRoutineShare } from '../lib/social';
import { Chart, PlayIcon, MoreHorizontal, TrenUp, TrenDown, MinusSquare, AddSquare } from '../icons/icons';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const MUSCLE_COLORS = ['#22c55e', '#3b82f6', '#ff9a4a', '#ff5a4a', '#b28aff', '#b2d5e5', '#ff1493', '#c6ff34'];

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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        fontSize: '.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.03em',
        fontFamily: "'Oswald', sans-serif",
        border: active ? '1px solid var(--acento)' : '1px solid var(--borde)',
        background: active ? 'var(--acento)' : 'var(--componente)',
        color: active ? 'var(--txt-btn)' : 'var(--texto)',
        cursor: 'pointer',
        transition: 'all .3s',
      }}
    >
      {color && (
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: active ? 'var(--txt-btn)' : color,
        }} />
      )}
      {children}
    </button>
  );
}

export default function RutinaDetalle({
  routine, kebabOpen, onToggleKebab, onBack, onEdit, onDuplicate, onDelete, onStartSession,
  authSession,
  onRename, onShare, onCopyText, history, reminder, onSaveReminder, onClearReminder
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState(null);
  const kebabRef = useRef(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [sending, setSending] = useState(false);

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
  const totalSets = routine.exercises.reduce((s, e) => s + e.sets.length, 0);

  const muscles = useMemo(() => {
    return Array.from(new Set(routine.exercises.map(ex => ex.muscle).filter(Boolean)));
  }, [routine.exercises]);

  const muscleColorMap = useMemo(() => {
    const map = {};
    muscles.forEach((m, i) => { map[m] = MUSCLE_COLORS[i % MUSCLE_COLORS.length]; });
    return map;
  }, [muscles]);

  const colorFor = (m) => muscleColorMap[m] || 'var(--texto-gris)';

  const exercises = useMemo(() => {
    if (!muscleFilter) return routine.exercises;
    return routine.exercises.filter(ex => ex.muscle === muscleFilter);
  }, [routine.exercises, muscleFilter]);

  const lastEntry = useMemo(() => {
    return history
      .filter(h => h.routineId === routine.id)
      .sort((a, b) => b.date - a.date)[0] || null;
  }, [history, routine.id]);

  const muscleVolume = useMemo(() => {
    const counts = {};
    let total = 0;
    routine.exercises.forEach(ex => {
      const m = ex.muscle || 'Sin músculo';
      counts[m] = (counts[m] || 0) + ex.sets.length;
      total += ex.sets.length;
    });
    return Object.entries(counts)
      .map(([muscle, count]) => ({ muscle, count, pct: total ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [routine.exercises]);

  const exerciseHistoryMap = useMemo(() => {
    const routineHistory = history
      .filter(h => h.routineId === routine.id)
      .sort((a, b) => b.date - a.date);
    const map = {};
    routine.exercises.forEach(ex => {
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
  }, [history, routine.id, routine.exercises]);

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
        className: "btns agregar",
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

  const iniciales = (p) => (p?.nombre?.[0] || p?.username?.[0] || '?').toUpperCase();

  const toggleCollapseAll = (e) => {
    e.stopPropagation();
    if (allCollapsed) {
      setCollapsed(new Set());
      setAllCollapsed(false);
    } else {
      setCollapsed(new Set(routine.exercises.map(ex => ex.id)));
      setAllCollapsed(true);
    }
  };

  return (
    <>
      <div className="header-cont" ref={kebabRef}>
        <div className="btn" title='Volver' onClick={onBack}><ChevronLeft size={20} /></div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="btn primario tooltipe"
            data-tooltip={
              "Empezar"
            }
            title='Empezar' onClick={onStartSession}><PlayIcon size={20} /></button>
          <div className="btn" title='Opciones' onClick={onToggleKebab}
          ><MoreHorizontal size={18} /></div>
        </div>
        {kebabOpen && (
          <div className="kebab-menu">
            <div className="item" onClick={onEdit}>Editar rutina</div>
            <div className="item" onClick={() => handleRenombrarRapido(routine.id, routine.name)}>Renombrar rápido</div>
            <div className="item" onClick={onDuplicate}>Duplicar rutina</div>
            <div className="item" onClick={openSendModal}>Enviar a un amigo</div>
            <div className="item" onClick={() => onShare(routine.id)}>Compartir</div>
            <div className="item" onClick={() => { onToggleKebab(); onCopyText(routine.id); }}>Copiar como texto</div>
            <div className="item danger" onClick={onDelete}>Eliminar rutina</div>
          </div>
        )}
      </div>

      <div className="page-cont top">

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1>{routine.name}</h1>
          {routine.days?.length > 0 && (
            <div className="card-dias">
              {DIAS.map((d, i) => (
                <span
                  key={i}
                  className={`card-dia-chip-detalle ${routine.days.includes(i) ? 'activo' : 'no'} ${i === hoy ? 'es-hoy' : ''}`}
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="header-sub" style={{ marginTop: 2, marginBottom: 18, fontSize: ".6rem" }}>
          {lastEntry
            ? `Última vez: ${formatRelative(lastEntry.date)} · ${lastEntry.totalSets} series · ${Math.round(lastEntry.totalVolume).toLocaleString('es-AR')} kg`
            : 'Todavía no registraste ninguna sesión de esta rutina'}
        </div>
        <div className="header-sub" style={{ marginTop: 2, marginBottom: 18, fontSize: ".6rem" }}>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {[
            { n: routine.exercises.length, label: 'Ejercicios' },
            { n: totalSets, label: 'Series' },
            { n: lastEntry ? Math.round(lastEntry.totalVolume).toLocaleString('es-AR') : '—', label: 'Último volumen' },
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



        {/* ---- Distribución muscular ---- */}
        {muscleVolume.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...eyebrowStyle, marginBottom: 8 }}>
              <Chart size={13} /> Distribución muscular
            </div>
            <div style={{ display: 'flex', width: '100%', height: 7, borderRadius: 4, overflow: 'hidden' }}>
              {muscleVolume.map(mv => (
                <div
                  key={mv.muscle}
                  title={`${mv.muscle}: ${Math.round(mv.pct)}%`}
                  style={{ width: `${mv.pct}%`, background: colorFor(mv.muscle) }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {muscleVolume.map(mv => (
                <span key={mv.muscle} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--texto-gris)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: colorFor(mv.muscle), display: 'inline-block' }} />
                  {mv.muscle} · {Math.round(mv.pct)}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---- Filtro por músculo + colapsar ---- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={eyebrowStyle}>
            Ejercicios · {exercises.length}
          </div>
          <button
            type="button"
            className="mini-btn tooltipe"
            title={allCollapsed ? "Expandir todo" : "Colapsar todo"}
            onClick={toggleCollapseAll}
            data-tooltip={
              allCollapsed
                ? "Expandir todo"
                : "Colapsar todo"
            }
          >
            {allCollapsed ? <AddSquare size={14} /> : <MinusSquare size={14} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 18, paddingBottom: 2 }}>
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

        {exercises.map(ex => {
          const isCollapsed = collapsed.has(ex.id);
          const occurrences = exerciseHistoryMap[ex.id] || [];
          const last = occurrences[0];
          const prev = occurrences[1];
          const delta = last && prev ? last.volume - prev.volume : null;

          return (
            <div key={ex.id} className="rutina-card">
              <div
                className='rutina-card-cont'
                title={isCollapsed ? "Expandir" : "Colapsar"}
                onClick={() => toggleCollapse(ex.id)}
              >
                <div className='rutina-card-header'>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform .15s ease"
                    }}
                  />
                  <h4 className='titulo-rutina'>{ex.name}</h4>
                </div>
                <span className='musc-span'>{ex.muscle}</span>
              </div>

              {last && (
                <div
                  className="header-sub"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, padding: '0 2px 6px', opacity: 0.85
                  }}
                >
                  <span>{formatRelative(last.date)} · {Math.round(last.volume).toLocaleString('es-AR')} kg</span>
                  {delta !== null && Math.round(delta) !== 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontWeight: 700, fontSize: 11,
                      color: delta > 0 ? 'var(--acento)' : 'var(--rojo)',
                    }}>
                      {delta > 0 ? <TrenUp size={18} /> : <TrenDown size={18} />}
                      {Math.abs(Math.round(delta)).toLocaleString('es-AR')} kg
                    </span>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                  transition: 'grid-template-rows .2s ease',
                }}
              >
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  {ex.sets.map((s, i) => (
                    <div key={s.id} className="card-ejercicios top">
                      <span>Serie {i + 1} </span>
                      <span>{s.weight || 0} kg × {s.reps || 0} reps</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {exercises.length === 0 && (
          <div className="header-sub" style={{ marginTop: 20 }}>
            No hay ejercicios de "{muscleFilter}" en esta rutina.
          </div>
        )}

        <div style={{ height: 10 }}></div>
        <button className="btns primario fixed" onClick={onStartSession}>
          Empezar rutina
        </button>
      </div >

      {sendModalOpen && (
        <div className="modal-overlay" onClick={() => !sending && setSendModalOpen(false)}>
          <div className="modal-cont" onClick={(e) => e.stopPropagation()}>
            <h3>Enviar "{routine.name}"</h3>
            <p className="header-sub" style={{ marginBottom: 16 }}>Elegí a qué amigo se la mandás.</p>

            {loadingFriends && (
              <div className="header-sub"><Loader2 size={16} className="login-spin" /> Cargando amigos...</div>
            )}

            {!loadingFriends && friends.length === 0 && (
              <div className="header-sub" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div>Todavía no tenés amigos agregados.</div>
                <div style={{ fontSize: 12, color: "var(--texto-gris)" }}>Andá a Mensajes para agregar a alguien primero.</div>
              </div>
            )}

            {!loadingFriends && friends.map(f => (
              <div
                key={f.id}
                className={`mensajes-routine-pick${selectedFriendId === f.id ? ' selected' : ''}`}
                onClick={() => setSelectedFriendId(f.id)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mensajes-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                    {iniciales(f)}
                  </span>
                  {f.nombre || f.username}
                </span>
                {selectedFriendId === f.id && <Check size={16} />}
              </div>
            ))}

            <div className="btn-cont-modal">
              <button className="btns agregar login-btn" onClick={() => setSendModalOpen(false)} disabled={sending}>
                Cancelar
              </button>
              <button
                className="btns primario m"
                onClick={confirmSendToFriend}
                disabled={!selectedFriendId || sending}
              >
                {sending ? <Loader2 size={16} className="login-spin" /> : ""}
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )
      }
    </>
  );
}