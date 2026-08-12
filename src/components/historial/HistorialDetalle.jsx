import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, X, Dumbbell, ChevronDown } from 'lucide-react';
import { formatElapsed } from '../../utils/time';
import { MoreHorizontal, TrenUp, TrenDown, PlayIcon, Chart, AirDrop, TrashIcon } from '../../icons/icons';
import { sileo } from 'sileo';
import "../rutinas/rutina.css";
import "./historial.css";
import { MUSCLE_COLORS } from '../rutinas/rutinaDetalle';
import { StatNumber } from '../rutinas/count';


const CHIP_ALPHA = '2e';

const eyebrowStyle = {
  fontSize: '.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--texto-gris)',
  fontFamily: "'Oswald', sans-serif",
  fontWeight: 700,
};

const nombreEx = (ex) => ex.nombre ?? ex.name;
const muscEx = (ex) => ex.parteDelCuerpo ?? ex.muscle;

function buildEntryText(entry) {
  const dt = new Date(entry.date);
  const dateStr = dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [
    `🏋️ ${entry.routineName}`,
    `${dateStr} · ${formatElapsed(entry.durationSec * 1000)} · ${entry.totalSets} series · ${Math.round(entry.totalVolume)}kg`,
    '',
  ];
  entry.exercises.forEach(ex => {
    lines.push(`${nombreEx(ex)}${muscEx(ex) ? ` (${muscEx(ex)})` : ''}`);
    ex.sets.forEach((s, i) => {
      lines.push(`  Serie ${i + 1}: ${s.weight || 0}kg × ${s.reps || 0} reps`);
    });
    if (ex.notes) lines.push(`  · ${ex.notes}`);
    lines.push('');
  });
  return lines.join('\n').trim();
}

export default function HistorialDetalle({ entry, onBack, onDelete, onRepeat, history = [] }) {
  const [gifPreview, setGifPreview] = useState(null);
  const [gifFailedIds, setGifFailedIds] = useState(new Set());
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [kebabOpen, setKebabOpen] = useState(false);
  const kebabRef = useRef(null);
  const [distMode, setDistMode] = useState("bar");
  const [distReveal, setDistReveal] = useState(false);

  const muscles = useMemo(() => {
    if (!entry) return [];
    return Array.from(new Set(entry.exercises.map(muscEx).filter(Boolean)));
  }, [entry]);
  const muscleColorMap = useMemo(() => {
    const map = {};
    muscles.forEach((m, i) => { map[m] = MUSCLE_COLORS[i % MUSCLE_COLORS.length]; });
    return map;
  }, [muscles]);

  const colorFor = (m) => muscleColorMap[m] || 'var(--texto-gris)';
  useEffect(() => {
    setDistReveal(false);
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setDistReveal(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [distMode]);
  useEffect(() => {
    if (!kebabOpen) return;
    const handleClickOutside = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) setKebabOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [kebabOpen]);




  const muscleVolume = useMemo(() => {
    if (!entry) return [];
    const counts = {};
    let total = 0;
    entry.exercises.forEach(ex => {
      const m = muscEx(ex) || 'Sin músculo';
      const vol = ex.sets.reduce((s, st) => s + (+st.weight || 0) * (+st.reps || 0), 0) || ex.sets.length;
      counts[m] = (counts[m] || 0) + vol;
      total += vol;
    });
    return Object.entries(counts)
      .map(([muscle, count]) => ({ muscle, count, pct: total ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [entry]);

  const prevOccurrenceMap = useMemo(() => {
    if (!entry) return {};
    const prior = history
      .filter(h => h.routineId === entry.routineId && h.date < entry.date)
      .sort((a, b) => b.date - a.date)[0];
    if (!prior) return {};
    const map = {};
    entry.exercises.forEach(ex => {
      const match = prior.exercises.find(e => nombreEx(e) === nombreEx(ex));
      if (match) {
        map[nombreEx(ex)] = match.sets.reduce((s, st) => s + (+st.weight || 0) * (+st.reps || 0), 0);
      }
    });
    return map;
  }, [entry, history]);

  if (!entry) return null;
  const dt = new Date(entry.date);
  const dateStr = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const markGifFailed = (key) => setGifFailedIds(prev => new Set(prev).add(key));
  const toggleCollapse = (key) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  async function handleCopyText() {
    setKebabOpen(false);
    try {
      await navigator.clipboard.writeText(buildEntryText(entry));
      sileo.success({ title: 'Copiado al portapapeles' });
    } catch {
      sileo.error({ title: 'No se pudo copiar' });
    }
  }

  async function handleShare() {
    setKebabOpen(false);
    const text = buildEntryText(entry);
    if (navigator.share) {
      try {
        await navigator.share({ title: entry.routineName, text });
      } catch {
        // el usuario canceló el share, no hacemos nada
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        sileo.success({ title: 'Copiado al portapapeles', description: 'Tu dispositivo no soporta compartir directo.' });
      } catch {
        sileo.error({ title: 'No se pudo compartir' });
      }
    }
  }

  function handleDelete() {
    setKebabOpen(false);
    onDelete();
    onBack();
  }

  return (
    <>
      <div className="header" ref={kebabRef}>
        <div className="btn-circle" title="Volver" onClick={onBack}><ChevronLeft size={20} /></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          
          {onRepeat && (
            <button className="btn-circle acento tooltipe" title="Repetir entrenamiento" onClick={() => onRepeat(entry)}
              data-tooltip={
                "Repetir entrenamiento"
              }
            >
              <PlayIcon size={20} />
            </button>
          )}
          <div className="btn-circle" title="Opciones" onClick={() => setKebabOpen(v => !v)}>
            <MoreHorizontal size={18} />
          </div>
        </div>

        {kebabOpen && (
          <div className="kebab">

            {onRepeat &&
              <div className="kebab-item" onClick={() => { setKebabOpen(false); onRepeat(entry); }}>
                <span>Repetir entrenamiento</span>
                <PlayIcon size={15} />
              </div>}
            <div className="kebab-item" onClick={handleShare}>
              <span>Compartir</span>
              <AirDrop size={15} /></div>
            {onDelete && <div className="kebab-item danger" onClick={handleDelete}>
              <span>Eliminar entrenamiento</span>
              <TrashIcon size={15} />
            </div>}
          </div>
        )}
      </div>

      <div className="hero hero-in">
        <h1 className="hero-title">{entry.routineName}</h1>
        <div className="hero-meta" >
          {dateStr}
        </div>

        <div className='stat-row-detail'>
          {[
            { n: formatElapsed(entry.durationSec * 1000), label: 'Duración' },
            { n: entry.totalSets, label: 'Series' },
            { n: `${Math.round(entry.totalVolume).toLocaleString('es-AR')} kg`, label: 'Volumen' },
          ].map((s, i) => (
            <div key={s.label} className='stat-card stat-card-in'
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <StatNumber value={s.n} className="stat-num" />
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


        <div className='ex-list'>
          {entry.exercises.map((ex, i) => {
            const nombre = nombreEx(ex);
            const muscleColor = colorFor(ex.muscle);
            const musculo = muscEx(ex);
            const gif = ex.gif ?? ex.gifUrl;
            const gifFailed = gifFailedIds.has(i);
            const isCollapsed = collapsed.has(i);
            const vol = ex.sets.reduce((s, st) => s + (+st.weight || 0) * (+st.reps || 0), 0);
            const prevVol = prevOccurrenceMap[nombre];
            const delta = prevVol !== undefined ? vol - prevVol : null;

            return (
              <div key={i}
                className={`ex-card ex-card-in ${isCollapsed ? '' : 'open'}`}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >

                <div
                  className={`ex-head ${isCollapsed ? '' : 'open'}`}

                  title={isCollapsed ? 'Expandir' : 'Colapsar'} onClick={() => toggleCollapse(i)}>

                  <ChevronDown size={16} className="chev" />

                  <div className="ex-name">{nombre}</div>
                  <div className='flex'>
                    {musculo && <span className="muscle-chip"
                      style={{ background: `${muscleColor}${CHIP_ALPHA}`, color: muscleColor }}
                    >{musculo}</span>}

                    {delta !== null && Math.round(delta) !== 0 && (
                      <div className="delta-badge delta-badge-in" style={{
                        color: delta > 0 ? 'var(--acento)' : 'var(--rojo)'
                      }}>
                        {delta > 0 ? <TrenUp size={16} /> : <TrenDown size={16} />}
                        {Math.abs(Math.round(delta)).toLocaleString('es-AR')} kg
                      </div>
                    )}
                  </div>
                </div>


                <div className="ex-body"
                  style={{
                    display: 'grid',
                    gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                    transition: 'grid-template-rows .38s var(--ease-out-ios)',
                  }}>
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    <div className="ex-body-inner"
                      style={{
                        opacity: isCollapsed ? 0 : 1,
                        transform: isCollapsed ? 'translateY(-4px)' : 'translateY(0)',
                        transition: 'opacity .28s var(--ease-out-ios) .05s, transform .28s var(--ease-out-ios) .05s',
                      }}>
                      <div className="set-table-head">
                        <span>Kg</span>
                        <span>Reps</span>
                      </div>
                      {ex.sets.map((s, j) => (
                        <div key={j} className="set-row">
                          <div className="set-idx">{j + 1}</div>
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
        </div >
      </div >

    </>
  );
}