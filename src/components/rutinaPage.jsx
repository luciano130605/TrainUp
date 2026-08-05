import React, { useMemo, useState } from 'react';
import {
  Plus, Bell, Dumbbell, ChevronRight, Download, Upload, Loader2,
  UserPlus, Check
} from 'lucide-react';
import "./rutina.css"
import SwipeCard from "./SwipeCard.jsx"
import { sileo } from 'sileo';
import { fetchFriendships, getPublicProfiles, sendRoutineShare } from '../lib/social';
import { ExportIcon, ImportIcon, NotificationIcon, SendIcon } from '../icons/icons.jsx';


const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTO = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const eyebrowStyle = {
  fontSize: '.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--texto-gris)',
  fontFamily: "'Oswald', sans-serif",
  fontWeight: 700,
};

export default function RutinaPage({
  routines = [], onNewRoutine, onSelectRoutine, onExport, onImport,
  swipeGestures = true, getSwipeActionFor, swipeLeftAction = 'delete', swipeRightAction = 'edit',
  authSession
}) {
  const hoy = new Date().getDay();
  const [showHoy, setShowHoy] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const [sendAllModalOpen, setSendAllModalOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  const userId = authSession?.user?.id;

  const rutinasDeHoy = useMemo(() => {
    return (routines ?? []).filter(r => r.days?.includes(hoy));
  }, [routines, hoy]);

  const diasConRutina = useMemo(() => {
    const s = new Set();
    (routines ?? []).forEach(r => (r.days || []).forEach(d => s.add(d)));
    return s;
  }, [routines]);

  const totalEjercicios = useMemo(() => {
    return (routines ?? []).reduce((acc, r) => acc + (r.exercises?.length || 0), 0);
  }, [routines]);

  const listaMostrada = selectedDay === null
    ? routines
    : routines.filter(r => r.days?.includes(selectedDay));

  const toggleDay = (i) => setSelectedDay(prev => (prev === i ? null : i));
  const cerrarFab = () => setFabOpen(false);

  async function openSendAllModal() {
    cerrarFab();
    setSelectedFriendId(null);
    setSendAllModalOpen(true);
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

  async function confirmSendAll() {
    if (!selectedFriendId || !userId || routines.length === 0) return;
    setSending(true);
    setSendProgress(0);

    let fallidas = 0;
    for (let i = 0; i < routines.length; i++) {
      const { error } = await sendRoutineShare(userId, selectedFriendId, routines[i]);
      if (error) fallidas++;
      setSendProgress(i + 1);
    }

    setSending(false);

    if (fallidas === 0) {
      sileo.success({ title: `${routines.length} rutina${routines.length !== 1 ? 's' : ''} enviada${routines.length !== 1 ? 's' : ''}` });
      setSendAllModalOpen(false);
    } else if (fallidas === routines.length) {
      sileo.error({ title: 'No se pudo enviar ninguna rutina' });
    } else {
      sileo.error({ title: `Se enviaron ${routines.length - fallidas} de ${routines.length}`, description: 'Algunas fallaron, podés reintentar.' });
      setSendAllModalOpen(false);
    }
  }

  const iniciales = (p) => (p?.nombre?.[0] || p?.username?.[0] || '?').toUpperCase();

  const fabItems = [
    {
      key: 'nueva',
      title: 'Agregar rutina',
      tooltip: 'Agregar rutina',
      icon: <Plus size={20} />,
      className: 'acento',
      onClick: () => {
        cerrarFab();
        onNewRoutine();
      },
    },
    {
      key: 'enviar-todas',
      title: routines.length === 0
        ? 'No hay rutinas para enviar'
        : 'Enviar todas a un amigo',
      icon: <SendIcon size={18} />,
      disabled: routines.length === 0,
      onClick: () => {
        if (routines.length > 0) openSendAllModal();
      },
    },
    {
      key: 'export',
      title: routines.length === 0
        ? 'No hay rutinas para exportar'
        : 'Exportar',
      tooltip: routines.length === 0
        ? 'No hay rutinas para exportar'
        : 'Exportar',
      icon: <ExportIcon size={18} />,

      disabled: routines.length === 0,
      onClick: () => {
        if (routines.length > 0) {
          cerrarFab();
          onExport();
        }
      },
    },
    {
      key: 'import',
      title: 'Importar',
      tooltip: 'Importar',
      icon: <ImportIcon size={18} />,
      onClick: () => {
        cerrarFab();
        onImport();
      },
    },
  ];

  function renderCard(r) {
    const muscles = [...new Set(r.exercises.map(e => e.muscle))].slice(0, 4);
    const esHoy = r.days?.includes(hoy);
    return (
      <div
        key={r.id}
        className="rutina-card"
        role="button"
        tabIndex={0}
        onClick={() => onSelectRoutine(r.id)}
        onKeyDown={(e) => e.key === 'Enter' && onSelectRoutine(r.id)}
        style={{ position: 'relative' }}
      >
        {esHoy && <span className="dot-hoy" title="Hoy toca" />}
        <h3>{r.name}</h3>
        <div className="card-ejercicios">{r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}</div>

        <div style={{ display: "flex", gap: "10px" }}>
          {r.days?.length > 0 && (
            <div className="card-dias">
              {DIAS.map((d, i) => (
                <span
                  key={i}
                  className={`card-dia-chip ${r.days.includes(i) ? 'activo' : 'no'} ${i === hoy ? 'es-hoy' : ''}`}
                >
                  {d}
                </span>
              ))}
            </div>
          )}
          <div className="card-musc">{muscles.map(m => <span key={m} className="musc-span">{m}</span>)}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="header-cont">
        <div>
          <h1 className='header-titulo'>Rutinas</h1>
          <div className="header-sub">{routines.length} guardada{routines.length !== 1 ? 's' : ''}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>

          {rutinasDeHoy.length > 0 && (
            <>
              <div
                className={`btn ${showHoy ? 'activo' : ''}`}
                title='Rutina de hoy'
                style={{ position: 'relative' }}
                onClick={() => setShowHoy(v => !v)}
              >
                <NotificationIcon size={20} />
                <span className="notif-dot" />
              </div>
              {showHoy && (
                <>
                  <div className="notif-backdrop" onClick={() => setShowHoy(false)} />
                  <div className="notif-pop" onClick={(e) => e.stopPropagation()}>

                    <div className="notif-pop-head">
                      <div className="notif-pop-icon"><NotificationIcon size={14} /></div>
                      <div>
                        <div className="notif-pop-title">Hoy toca</div>
                        <div className="notif-pop-sub">
                          {rutinasDeHoy.length} rutina{rutinasDeHoy.length !== 1 ? 's' : ''} programada{rutinasDeHoy.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="notif-pop-list">
                      {rutinasDeHoy.map(r => (
                        <div
                          key={r.id}
                          title="Ir a la rutina"
                          className="notif-pop-item"
                          onClick={() => { setShowHoy(false); onSelectRoutine(r.id); }}
                        >
                          <div className="notif-pop-item-icon"><Dumbbell size={14} /></div>
                          <div className="notif-pop-item-info">
                            <span className="notif-pop-title">{r.name}</span>
                            <span className="notif-pop-sub">
                              {r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <ChevronRight size={15} className="notif-pop-item-chev" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="fab-wrap">
            <div className="fab-stack" aria-hidden={!fabOpen}>
              {fabItems.map((item, idx) => (
                <div
                  key={item.key}
                  className={`btn fab-item ${item.className || ''} ${item.disabled ? 'disabled' : ''}`}
                  data-tooltip={item.tooltip || item.title}
                  style={{
                    transitionDelay: fabOpen
                      ? `${idx * 45}ms`
                      : `${(fabItems.length - 1 - idx) * 35}ms`,
                  }}
                  onClick={item.disabled ? undefined : item.onClick}
                >
                  {item.icon}
                </div>
              ))}
            </div>

            <div
              className={`btn acento fab-main ${fabOpen ? 'abierto' : ''}`}
              title={fabOpen ? 'Cerrar' : 'Menu'}
              onClick={() => setFabOpen(o => !o)}
            >
              <Plus size={20} className="fab-main-icon" />
            </div>
          </div>
        </div>
      </div >

      {fabOpen && <div className="fab-backdrop" onClick={cerrarFab} />
      }

      <div className="page-cont">
        {routines.length === 0 ? (
          <div className="page-sin">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="6" y="27" width="8" height="10" rx="1.5" />
              <rect x="50" y="27" width="8" height="10" rx="1.5" />
              <rect x="14" y="22" width="6" height="20" rx="1.5" />
              <rect x="44" y="22" width="6" height="20" rx="1.5" />
              <line x1="20" y1="32" x2="44" y2="32" />
            </svg>
            <h3>Aún no tienes rutinas</h3>
            <p>Crea tu primera rutina para organizar tus ejercicios, series y empezar a entrenar.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, marginTop: 20, }}>
              {[
                { n: routines.length, label: 'Rutinas' },
                { n: rutinasDeHoy.length, label: 'Hoy' },
                { n: totalEjercicios, label: 'Ejercicios' },
              ].map(s => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    boxShadow: "var(--box-shadow)",
                    background: 'var(--componente)',
                    border: '1px solid var(--borde)',
                    borderRadius: 12,
                    padding: '14px 6px',
                  }}
                >
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.4rem', color: 'var(--acento)' }}>
                    {s.n}
                  </div>
                  <div style={{ ...eyebrowStyle, fontSize: '.62rem', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Semana</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setSelectedDay(null)}
                  className={`dia-chip ${selectedDay === null ? 'activo' : ''}`}
                  style={{ width: 'auto', borderRadius: 16, padding: '0 12px' }}
                  title="Todas"
                >
                  Todas
                </button>
                {DIAS_CORTO.map((d, i) => diasConRutina.has(i) && (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`dia-chip ${selectedDay === i ? 'activo' : ''} ${i === hoy ? 'esHoy' : ''}`}
                    title={DIAS[i]}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={eyebrowStyle}>
                {selectedDay === null ? 'Todas tus rutinas' : `Rutinas de ${DIAS[selectedDay]}`}
              </div>
            </div>

            {listaMostrada.length === 0 ? (
              <div className="mensajes-empty">No tenés rutinas programadas para {DIAS[selectedDay]}.</div>
            ) : (
              listaMostrada.map(renderCard)
            )}
          </>
        )}
      </div>

      {
        sendAllModalOpen && (
          <div className="modal-overlay" onClick={() => !sending && setSendAllModalOpen(false)}>
            <div className="modal-cont" onClick={(e) => e.stopPropagation()}>
              <h3>Enviar todas tus rutinas</h3>
              <p className="header-sub" style={{ marginBottom: 16 }}>
                Se van a enviar {routines.length} rutina{routines.length !== 1 ? 's' : ''}. Elegí a qué amigo.
              </p>

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
                  onClick={() => !sending && setSelectedFriendId(f.id)}
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
                <button className="btns agregar login-btn" onClick={() => setSendAllModalOpen(false)} disabled={sending}>
                  Cancelar
                </button>
                <button
                  className="btns primario m"
                  onClick={confirmSendAll}
                  disabled={!selectedFriendId || sending}
                >
                  {sending ? <Loader2 size={16} className="login-spin" /> : ""}
                  {sending ? `Enviando ${sendProgress} de ${routines.length}...` : 'Enviar todas'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}