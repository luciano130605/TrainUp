import React, { useMemo, useState } from 'react';
import {
  Plus, Bell, Dumbbell, ChevronRight, Download, Upload, Loader2,
  UserPlus, Check,
  Clipboard,
  Image,
  X
} from 'lucide-react';
import { sileo } from 'sileo';
import { fetchFriendships, getPublicProfiles, sendRoutineShare } from '../../lib/social.js';
import { CopyIcon, ExportIcon, ImgIcon, ImportIcon, NotificationIcon, SendIcon, UsersIcon } from '../../icons/icons.jsx';
import "../style.css"
import EnviarAmigosModal from '../modales/enviarAmigos.jsx';
import { StatNumber } from "./count.jsx"

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const MUSCLE_COLORS = {
  Pecho: "#FF6B6B",
  Espalda: "#4D96FF",
  Hombros: "#FFD93D",
  Biceps: "#ff9a4a",
  Triceps: "#b28aff",
  Antebrazos: "#6366F1",
  Cuadriceps: "#22C55E",
  Isquiotibiales: "#0EA5A4",
  Gluteos: "#ff1493",
  Gemelos: "#14B8A6",
  Abductores: "#c6ff34",
  Aductores: "#65A30D",
  Abdominales: "#F97316",
};

const getMuscleColor = (muscle) =>
  MUSCLE_COLORS[muscle] || MUSCLE_COLORS.Otro;

export default function RutinaPage({
  routines = [], sharedRoutines = [], pendingInvites = [],
  onNewRoutine, onSelectRoutine, onSelectSharedRoutine,
  onAcceptInvite, onRejectInvite,
  onExport, onImport, history = [],
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
  const [viewTab, setViewTab] = useState('individual'); // ★ NUEVO: 'individual' | 'grupal'
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
    const hoyStr = new Date().toDateString();
    return (routines ?? []).filter(
      r => r.days?.includes(hoy) && !history.some(h => h.routineId === r.id && new Date(h.date).toDateString() === hoyStr)
    );
  }, [routines, hoy, history]);

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
    // {
    //   key: 'enviar-todas',
    //   title: routines.length === 0
    //     ? 'No hay rutinas para enviar'
    //     : 'Enviar todas a un amigo',
    //   icon: <SendIcon size={18} />,
    //   disabled: routines.length === 0,
    //   onClick: () => {
    //     if (routines.length > 0) openSendAllModal();
    //   },
    // },
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

  function renderCard(r, i) {
    const muscles = [...new Set(r.exercises.map(e => e.muscle))].filter(Boolean).slice(0, 4);
    const primerMusculo = muscles[0];
    const esHoy = r.days?.includes(hoy);
    const diasActivos = (r.days || []).slice().sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

    return (
      <div
        key={r.id}
        className="routine-card routine-card-in"
        style={{
          "--card-accent": getMuscleColor(primerMusculo),
          animationDelay: `${Math.min(i, 8) * 45}ms`
        }}
        role="button"
        tabIndex={0}
        onClick={() => onSelectRoutine(r.id)}
        onKeyDown={(e) => e.key === 'Enter' && onSelectRoutine(r.id)}
      >
        {esHoy && <span className="dot absolute" title="Hoy toca" />}
        <div className='top'>
          <div>
            <h3 className='routine-name'>{r.name}</h3>
            <div className="routine-meta">{r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}</div>
          </div>

          {diasActivos.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {diasActivos.map(i => (
                <span
                  key={i}
                  className={`day-badge ${i === hoy ? 'today' : ''}`}
                >
                  {DIAS[i].slice(0, 3)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="tag-row">
          {muscles.map((m) => (
            <div key={m} className="tag">
              <span
                className="dot"
                style={{
                  background: getMuscleColor(m)
                }}
              />
              <span>{m}</span>
            </div>
          ))}
        </div>

      </div>
    );
  }

  return (
    <>
      <div className="header">
        <div>
          <h1 className='page-title'>Rutinas</h1>
          <div className="sub">{routines.length} guardada{routines.length !== 1 ? 's' : ''}</div>
        </div>

        <div className='flex gap10'>

          {rutinasDeHoy.length > 0 && (
            <>
              <div
                className={`icon-btn`}
                title='Rutina de hoy'
                style={{ position: 'relative' }}
                onClick={() => setShowHoy(v => !v)}
              >
                <NotificationIcon size={20} />
                <span className="dot absolute" style={{
                  top: 5,
                  left: 30
                }} />
              </div>
              {showHoy && (
                <>
                  <div className="pop absolute" onClick={(e) => e.stopPropagation()}>

                    <div className="flex padding14 gap10 borderBottom">
                      <div className="pop-icon borderRadiusCards flex"><NotificationIcon size={14} /></div>
                      <div>
                        <h3 className='fontSize9'>Hoy toca</h3>
                        <div className="sub fontSize6">
                          {rutinasDeHoy.length} rutina{rutinasDeHoy.length !== 1 ? 's' : ''} programada{rutinasDeHoy.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="padding6">
                      {rutinasDeHoy.map(r => (
                        <div
                          key={r.id}
                          title="Ir a la rutina"
                          className="flex gap10 justifyContentSpaceBet borderRadiusCards padding9 transicion item"
                          onClick={() => { setShowHoy(false); onSelectRoutine(r.id); }}
                        >

                          <div className="flex column">
                            <h3>{r.name}</h3>
                            <span className="sub fontSize6">
                              {r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <ChevronRight size={15} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="relative fab" data-open={fabOpen}>
            <div
              className="absolute gap10 flex column fabs"
              aria-hidden={!fabOpen}
            >
              {fabItems.map((item, idx) => (
                <div
                  key={item.key}
                  className={`btn-circle fab-item ${item.className || ''} ${item.disabled ? 'disabled' : ''}`}
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
              className={`icon-btn accent fab-item-head ${fabOpen ? 'abierto' : ''}`}
              title={fabOpen ? 'Cerrar' : 'Menu'}
              aria-expanded={fabOpen}
              aria-label={fabOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setFabOpen(o => !o)}
            >
              <Plus size={20} />
            </div>
          </div>
        </div>
      </div >

      {fabOpen && <div className="fixed cerrar-afuera" onClick={cerrarFab} />
      }
      <div className="pills justifyContentCenter" style={{ padding: '0 20px 14px', marginTop: 10 }}>
        <button
          type="button"
          className={`pill ${viewTab === 'individual' ? 'activo' : ''}`}
          style={{ width: 'auto', padding: '0 16px' }}
          onClick={() => setViewTab('individual')}
        >
          Individual
        </button>
        <button
          type="button"
          className={`pill ${viewTab === 'grupal' ? 'activo' : ''}`}
          style={{ width: 'auto', padding: '0 16px' }}
          onClick={() => setViewTab('grupal')}
        >
          Grupal
          {pendingInvites.length > 0 && (
            <span className="dot" style={{ marginLeft: 4 }} />
          )}
        </button>
      </div>
      <div className="cont">
        {viewTab === 'individual' && (
          routines.length === 0 ? (
            <div className="sin flex column textCenter justifyContentCenter">
              <h3 className='fontSize1-5'>Aún no tienes rutinas</h3>
              <p className='fontSize8'>Crea tu primera rutina para organizar tus ejercicios, series y empezar a entrenar.</p>
            </div>
          ) : (
            <>
              <div className='stat-row'>
                {[
                  { n: routines.length, label: 'Rutinas' },
                  { n: rutinasDeHoy.length, label: 'Hoy' },
                  { n: totalEjercicios, label: 'Ejercicios' },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className='stat-card stat-card-in'
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <StatNumber value={s.n} />
                    <label className='stat-label'>{s.label}</label>
                  </div>
                ))}
              </div>

              <div className='marginBottom20'>
                <div className='day-pills'>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className={`pill ${selectedDay === null ? 'active' : ''}`}
                    style={{ width: 'auto', padding: '0 12px' }}
                    title="Todas"
                  >
                    Todas
                  </button>
                  {DIAS_CORTO.map((d, i) => diasConRutina.has(i) && (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`pill ${selectedDay === i ? 'active' : ''} ${i === hoy ? 'esHoy' : ''}`}
                      title={DIAS[i]}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>


              <div className='cont-title-sub'
              >
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="select"
                    style={{ width: "auto", marginLeft: 25 }}
                  >
                    <option value="week">Semana</option>
                    <option value="alpha">A-Z</option>
                  </select>
                </div>
                <div>
                  <h3 className='section-label'
                    style={{

                      padding: "22px 20px 10px"
                    }}>
                    {selectedDay === null ? 'Todas tus rutinas' : `Rutinas de ${DIAS[selectedDay]}`}
                  </h3>
                </div>


              </div>


              {
                listaMostrada.length === 0 ? (
                  <div>No tenés rutinas programadas para {DIAS[selectedDay]}.</div>
                ) : (
                  <div className='routine-list'>
                    {listaMostrada.map((r, i) => renderCard(r, i))}
                  </div>
                )
              }
            </>
          )
        )}
        {viewTab === 'grupal' && (
          <>
            {pendingInvites.length === 0 && sharedRoutines.length === 0 ? (
              <div className="sin flex column textCenter justifyContentCenter">
                <h3 className='fontSize1-5'>Sin rutinas grupales</h3>
                <p className='fontSize8'>Cuando te inviten a entrenar en conjunto, va a aparecer acá.</p>
              </div>
            ) : (
              <>
                {pendingInvites.length > 0 && (
                  <div>
                    <h3 className='section-label' style={{ padding: "10px 20px" }}>Invitaciones</h3>
                    <div className='routine-list'>
                      {pendingInvites.map(inv => (
                        <div key={inv.id} className="routine-card" style={{ "--card-accent": "var(--acento)" }}>
                          <div className='top'>
                            <div>
                              <h3 className='routine-name'>{inv.routineName}</h3>
                              <div className="routine-meta">Te invitaron a entrenar en conjunto</div>
                            </div>
                          </div>
                          <div className="flex gap10" style={{ marginTop: 10 }}>
                            <button className="btn-circle acento" title="Aceptar" onClick={() => onAcceptInvite(inv.id)}>
                              <Check size={16} />
                            </button>
                            <button className="btn-circle danger" title="Rechazar" onClick={() => onRejectInvite(inv.id)}>
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sharedRoutines.length > 0 && (
                  <div className={pendingInvites.length > 0 ? "marginTop20" : ""}>
                    <h3 className='section-label' style={{ padding: "10px 20px" }}>Rutinas en conjunto</h3>
                    <div className='routine-list'>
                      {sharedRoutines.map((r, i) => (
                        <div
                          key={r.id}
                          className="routine-card routine-card-in"
                          style={{ "--card-accent": "var(--acento)", animationDelay: `${Math.min(i, 8) * 45}ms` }}
                          role="button" tabIndex={0}
                          onClick={() => onSelectSharedRoutine(r.id)}
                        >
                          <div className='top'>
                            <div>
                              <h3 className='routine-name'>{r.name}</h3>
                              <div className="routine-meta">
                                {r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''} · {r.members.length} integrante{r.members.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {sendAllModalOpen && (
        <EnviarAmigosModal
          routines={routines}
          friends={friends}
          loadingFriends={loadingFriends}
          selectedFriendId={selectedFriendId}
          onSelectFriend={setSelectedFriendId}
          sending={sending}
          sendProgress={sendProgress}
          onClose={() => !sending && setSendAllModalOpen(false)}
          onConfirm={confirmSendAll}
        />
      )}
    </>
  );
}