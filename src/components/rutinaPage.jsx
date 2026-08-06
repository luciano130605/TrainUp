import React, { useMemo, useState } from 'react';
import {
  Plus, Bell, Dumbbell, ChevronRight, Download, Upload, Loader2,
  UserPlus, Check,
  Clipboard,
  Image
} from 'lucide-react';
import "./rutina.css"
import SwipeCard from "./SwipeCard.jsx"
import { sileo } from 'sileo';
import { fetchFriendships, getPublicProfiles, sendRoutineShare } from '../lib/social';
import { CopyIcon, ExportIcon, ImgIcon, ImportIcon, NotificationIcon, SendIcon } from '../icons/icons.jsx';


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
  const [sortBy, setSortBy] = useState("week");

  const userId = authSession?.user?.id;

  const DIAS_ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo

  function buildWeekRows() {
    const conDia = DIAS_ORDEN_SEMANA
      .map(dayIdx => ({ day: DIAS[dayIdx], routines: routines.filter(r => r.days?.includes(dayIdx)) }))
      .filter(row => row.routines.length > 0);

    const sinDia = routines.filter(r => !r.days || r.days.length === 0);
    if (sinDia.length > 0) conDia.push({ day: 'Sin día fijo', routines: sinDia });
    return conDia;
  }

  function buildWeekText() {
    const rows = buildWeekRows();
    if (rows.length === 0) return '';

    const lines = ['Mi semana de entrenamiento', ''];
    rows.forEach(row => {
      lines.push(row.day.toUpperCase());
      row.routines.forEach(r => {
        lines.push(`  ${r.name} (${r.exercises.length} ejercicio${r.exercises.length !== 1 ? 's' : ''})`);
        r.exercises.forEach(ex => {
          lines.push(`    · ${ex.name}${ex.muscle ? ' — ' + ex.muscle : ''}`);
        });
      });
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  async function copyWeekAsText() {
    cerrarFab();
    const text = buildWeekText();
    if (!text) {
      sileo.error({ title: 'No tenés rutinas programadas por día para copiar' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      sileo.success({ title: 'Semana copiada al portapapeles' });
    } catch (e) {
      sileo.error({ title: 'No se pudo copiar' });
    }
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function downloadWeekAsImage() {
    cerrarFab();
    if (routines.length === 0) {
      sileo.error({ title: 'No tenés rutinas para descargar' });
      return;
    }

    const cs = getComputedStyle(document.documentElement);
    const colorFondo = cs.getPropertyValue('--fondo').trim() || '#0d0d10';
    const colorComponente = cs.getPropertyValue('--componente').trim() || '#17171c';
    const colorTexto = cs.getPropertyValue('--texto').trim() || '#ffffff';
    const colorTextoGris = cs.getPropertyValue('--texto-gris').trim() || 'rgba(255,255,255,0.55)';
    const colorBorde = cs.getPropertyValue('--borde').trim() || 'rgba(255,255,255,0.12)';
    const colorAcento = cs.getPropertyValue('--acento').trim() || '#7dd3a0';
    const colorTxtBtn = cs.getPropertyValue('--txt-btn').trim() || '#0d0d10';

    const diasColumnas = DIAS_ORDEN_SEMANA.map(dayIdx => ({
      dayIdx,
      label: DIAS[dayIdx],
      esHoy: dayIdx === hoy,
      routines: routines.filter(r => r.days?.includes(dayIdx)),
    }));

    const scale = 2;
    const padding = 26;
    const colWidth = 168;
    const colGap = 12;
    const cardHeight = 78;
    const cardGap = 10;
    const colHeaderHeight = 42;
    const topHeight = 96;

    const width = padding * 2 + colWidth * 7 + colGap * 6;
    const maxCards = Math.max(1, ...diasColumnas.map(c => c.routines.length));
    const columnsHeight = colHeaderHeight + 6 + (maxCards * (cardHeight + cardGap));
    const height = topHeight + columnsHeight + padding;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // fondo
    ctx.fillStyle = colorFondo;
    ctx.fillRect(0, 0, width, height);

    // título
    ctx.fillStyle = colorTexto;
    ctx.font = "700 24px 'Oswald', sans-serif";
    ctx.fillText('MI SEMANA DE ENTRENAMIENTO', padding, 44);

    ctx.fillStyle = colorTextoGris;
    ctx.font = "500 12px 'JetBrains Mono', monospace";
    ctx.fillText(
      `${routines.length} rutina${routines.length !== 1 ? 's' : ''} guardada${routines.length !== 1 ? 's' : ''}`,
      padding, 66
    );

    function truncate(text, maxWidth) {
      if (ctx.measureText(text).width <= maxWidth) return text;
      let t = text;
      while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
      return t + '…';
    }

    diasColumnas.forEach((col, i) => {
      const x = padding + i * (colWidth + colGap);
      const headerY = topHeight;

      // header de columna (resaltado si es hoy)
      if (col.esHoy) {
        ctx.fillStyle = colorAcento;
        drawRoundedRect(ctx, x, headerY, colWidth, colHeaderHeight, 10);
        ctx.fill();
      } else {
        ctx.strokeStyle = colorBorde;
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, x + 0.5, headerY + 0.5, colWidth - 1, colHeaderHeight - 1, 10);
        ctx.stroke();
      }

      ctx.fillStyle = col.esHoy ? colorTxtBtn : colorTexto;
      ctx.font = "700 13px 'Oswald', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(col.label.toUpperCase(), x + colWidth / 2, headerY + colHeaderHeight / 2 + 5);
      ctx.textAlign = 'left';

      // cards de rutinas de ese día
      let y = headerY + colHeaderHeight + 10;
      if (col.routines.length === 0) {
        ctx.fillStyle = colorTextoGris;
        ctx.font = "400 20px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.fillText('—', x + colWidth / 2, y + 30);
        ctx.textAlign = 'left';
      } else {
        col.routines.forEach(r => {
          ctx.fillStyle = colorComponente;
          drawRoundedRect(ctx, x, y, colWidth, cardHeight, 10);
          ctx.fill();
          ctx.strokeStyle = colorBorde;
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, x + 0.5, y + 0.5, colWidth - 1, cardHeight - 1, 10);
          ctx.stroke();

          // barra de acento
          ctx.fillStyle = colorAcento;
          drawRoundedRect(ctx, x, y, 4, cardHeight, 2);
          ctx.fill();

          // nombre de la rutina
          ctx.fillStyle = colorTexto;
          ctx.font = "700 13px 'Oswald', sans-serif";
          ctx.fillText(truncate(r.name, colWidth - 24), x + 14, y + 24);

          // cantidad de ejercicios
          ctx.fillStyle = colorTextoGris;
          ctx.font = "400 11px 'JetBrains Mono', monospace";
          ctx.fillText(
            `${r.exercises.length} ejercicio${r.exercises.length !== 1 ? 's' : ''}`,
            x + 14, y + 42
          );

          // chip con el primer músculo trabajado
          const primerMusculo = r.exercises.find(e => e.muscle)?.muscle;
          if (primerMusculo) {
            const chipText = primerMusculo.toUpperCase();
            ctx.font = "600 10px 'JetBrains Mono', monospace";
            const chipWidth = Math.min(ctx.measureText(chipText).width + 16, colWidth - 28);
            ctx.fillStyle = colorFondo;
            drawRoundedRect(ctx, x + 14, y + 52, chipWidth, 18, 9);
            ctx.fill();
            ctx.fillStyle = colorAcento;
            ctx.fillText(truncate(chipText, chipWidth - 12), x + 22, y + 64);
          }

          y += cardHeight + cardGap;
        });
      }
    });

    canvas.toBlob(blob => {
      if (!blob) {
        sileo.error({ title: 'No se pudo generar la imagen' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mi-semana-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sileo.success({ title: 'Imagen descargada' });
    }, 'image/png');
  }
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

  const listaMostrada = useMemo(() => {
    let lista =
      selectedDay === null
        ? [...routines]
        : routines.filter(r => r.days?.includes(selectedDay));

    switch (sortBy) {
      case "alpha":
        lista.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case "week":
        lista.sort((a, b) => {
          const dayA = a.days?.length ? Math.min(...a.days.map(d => d === 0 ? 7 : d)) : 99;
          const dayB = b.days?.length ? Math.min(...b.days.map(d => d === 0 ? 7 : d)) : 99;

          if (dayA !== dayB) return dayA - dayB;

          return a.name.localeCompare(b.name);
        });
        break;

      default:
        break;
    }

    return lista;
  }, [routines, selectedDay, sortBy]);
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

    {
      key: 'copiar-semana',
      title: diasConRutina.size === 0 ? 'No hay rutinas programadas por día' : 'Copiar semana como texto',
      tooltip: 'Copiar semana',
      icon: <CopyIcon size={18} />,
      disabled: diasConRutina.size === 0,
      onClick: copyWeekAsText,
    },
    {
      key: 'descargar-semana',
      title: diasConRutina.size === 0 ? 'No hay rutinas programadas por día' : 'Descargar semana como imagen',
      tooltip: 'Descargar semana',
      icon: <ImgIcon size={18} />,
      disabled: diasConRutina.size === 0,
      onClick: downloadWeekAsImage,
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


            <div style={{ marginBottom: 10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={eyebrowStyle}>
                  {selectedDay === null ? 'Todas tus rutinas' : `Rutinas de ${DIAS[selectedDay]}`}
                </div>
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="select"
                  style={{ width: "auto" }}
                >
                  <option value="week">Semana</option>
                  <option value="alpha">A-Z</option>
                </select>
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