import React, { useMemo, useState } from 'react';
import { Plus, Bell, Dumbbell, ChevronRight, Download, Upload, Send, Loader2, UserPlus, Check } from 'lucide-react';
import "./rutina.css"
import SwipeCard from "./SwipeCard.jsx"
import { sileo } from 'sileo';
import { fetchFriendships, getPublicProfiles, sendRoutineShare } from '../lib/social';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function RutinaPage({
  routines = [], onNewRoutine, onSelectRoutine, onExport, onImport,
  swipeGestures = true, getSwipeActionFor, swipeLeftAction = 'delete', swipeRightAction = 'edit',
  authSession
}) {
  const hoy = new Date().getDay();
  const [showHoy, setShowHoy] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // ---- envío masivo de rutinas ----
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

  // Items del FAB, en el orden en que aparecen (de arriba hacia abajo, debajo del +)
  const fabItems = [
    {
      key: 'nueva',
      title: 'Agregar rutina',
      icon: <Plus size={20} />,
      className: 'acento',
      onClick: () => { cerrarFab(); onNewRoutine(); },
    },
    {
      key: 'enviar-todas',
      title: routines.length === 0 ? 'No hay rutinas para enviar' : 'Enviar todas a un amigo',
      icon: <Send size={18} />,
      disabled: routines.length === 0,
      onClick: () => { if (routines.length > 0) openSendAllModal(); },
    },
    {
      key: 'export',
      title: routines.length === 0 ? 'No hay rutinas para exportar' : 'Exportar',
      icon: <Upload size={18} />,
      disabled: routines.length === 0,
      onClick: () => { if (routines.length > 0) { cerrarFab(); onExport(); } },
    },
    {
      key: 'import',
      title: 'Importar',
      icon: <Download size={18} />,
      onClick: () => { cerrarFab(); onImport(); },
    },
  ];

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
                <Bell size={20} />
                <span className="notif-dot" />
              </div>
              {showHoy && (
                <>
                  <div className="notif-backdrop" onClick={() => setShowHoy(false)} />
                  <div className="notif-pop" onClick={(e) => e.stopPropagation()}>

                    <div className="notif-pop-head">
                      <div className="notif-pop-icon"><Bell size={14} /></div>
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
                  title={item.title}
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
      </div>

      {fabOpen && <div className="fab-backdrop" onClick={cerrarFab} />}

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
        ) : routines.map(r => {
          const muscles = [...new Set(r.exercises.map(e => e.muscle))].slice(0, 4);
          const esHoy = r.days?.includes(hoy);
          const leftAction = swipeLeftAction !== 'none' ? getSwipeActionFor?.(swipeLeftAction, r.id) : null;
          const rightAction = swipeRightAction !== 'none' ? getSwipeActionFor?.(swipeRightAction, r.id) : null;
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
        })}
      </div>

      {sendAllModalOpen && (
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
                <UserPlus size={20} style={{ marginBottom: 8 }} />
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
                {sending ? <Loader2 size={16} className="login-spin" /> : <Send size={16} />}
                {sending ? `Enviando ${sendProgress} de ${routines.length}...` : 'Enviar todas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}