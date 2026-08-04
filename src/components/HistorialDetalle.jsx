import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, X, Dumbbell } from 'lucide-react';
import { formatElapsed } from '../utils/time';
import { MoreHorizontal, TrenUp, TrenDown, PlayIcon } from '../icons/icons';
import { sileo } from 'sileo';
import "./rutina.css";
import "./historial.css";
import { MUSCLE_COLORS } from './rutinaDetalle';



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

  useEffect(() => {
    if (!kebabOpen) return;
    const handleClickOutside = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) setKebabOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [kebabOpen]);

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
      <div className="header-cont" ref={kebabRef}>
        <div className="btn" title="Volver" onClick={onBack}><ChevronLeft size={20} /></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onRepeat && (
            <button className="btn primario tooltipe" title="Repetir entrenamiento" onClick={() => onRepeat(entry)}
            data-tooltip={
                  "Repetir entrenamiento"
              }
            >
              <PlayIcon size={20} />
            </button>
          )}
          <div className="btn" title="Opciones" onClick={() => setKebabOpen(v => !v)}>
            <MoreHorizontal size={18} />
          </div>
        </div>

        {kebabOpen && (
          <div className="kebab-menu">
            {onRepeat && <div className="item" onClick={() => { setKebabOpen(false); onRepeat(entry); }}>Repetir entrenamiento</div>}
            <div className="item" onClick={handleShare}>Compartir</div>
            {onDelete && <div className="item danger" onClick={handleDelete}>Eliminar entrenamiento</div>}
          </div>
        )}
      </div>

      <div className="page-cont top">
        <h1 className="header-titulo">{entry.routineName}</h1>
        <div className="header-sub" style={{ marginTop: 2, marginBottom: 18, fontSize: '.65rem', textTransform: 'capitalize' }}>
          {dateStr}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {[
            { n: formatElapsed(entry.durationSec * 1000), label: 'Duración' },
            { n: entry.totalSets, label: 'Series' },
            { n: `${Math.round(entry.totalVolume).toLocaleString('es-AR')} kg`, label: 'Volumen' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center', background: 'var(--componente)',
              border: '1px solid var(--borde)', borderRadius: 12, padding: '14px 6px',
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.2rem', color: 'var(--acento)' }}>
                {s.n}
              </div>
              <div style={{ ...eyebrowStyle, fontSize: '.6rem', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {muscleVolume.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Distribución muscular</div>
            <div style={{ display: 'flex', width: '100%', height: 7, borderRadius: 4, overflow: 'hidden' }}>
              {muscleVolume.map(mv => (
                <div key={mv.muscle} title={`${mv.muscle}: ${Math.round(mv.pct)}%`}
                  style={{ width: `${mv.pct}%`, background: colorFor(mv.muscle) }} />
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

        <div style={{ ...eyebrowStyle, marginBottom: 10 }}>
          Ejercicios · {entry.exercises.length}
        </div>

        {entry.exercises.map((ex, i) => {
          const nombre = nombreEx(ex);
          const musculo = muscEx(ex);
          const gif = ex.gif ?? ex.gifUrl;
          const gifFailed = gifFailedIds.has(i);
          const isCollapsed = collapsed.has(i);
          const vol = ex.sets.reduce((s, st) => s + (+st.weight || 0) * (+st.reps || 0), 0);
          const prevVol = prevOccurrenceMap[nombre];
          const delta = prevVol !== undefined ? vol - prevVol : null;

          return (
            <div key={i} className="rutina-card">
              <div className="rutina-card-cont" title={isCollapsed ? 'Expandir' : 'Colapsar'} onClick={() => toggleCollapse(i)}>
                <div className="rutina-card-header">
                  {gif && !gifFailed ? (
                    <img
                      src={gif} alt={nombre} loading="lazy"
                      style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', cursor: 'zoom-in', flexShrink: 0 }}
                      onClick={(e) => { e.stopPropagation(); setGifPreview({ url: gif, nombre }); }}
                      onError={() => markGifFailed(i)}
                    />
                  ) : (
                    <div className="ejercicio-placeholder" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}>
                      <Dumbbell size={16} strokeWidth={1.5} />
                    </div>
                  )}
                  <h4 className="titulo-rutina">{nombre}</h4>
                </div>
                {musculo && <span className="musc-span">{musculo}</span>}
              </div>

              {delta !== null && Math.round(delta) !== 0 && (
                <div className="header-sub" style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '2px 2px 6px',
                  color: delta > 0 ? 'var(--acento)' : 'var(--rojo)', fontWeight: 700,
                }}>
                  {delta > 0 ? <TrenUp size={16} /> : <TrenDown size={16} />}
                  {Math.abs(Math.round(delta)).toLocaleString('es-AR')} kg vs. sesión anterior
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                transition: 'grid-template-rows .2s ease',
              }}>
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  {ex.sets.map((s, j) => (
                    <div key={j} className="historial-detalle">
                      <span>Serie {j + 1}</span>
                      <span>{s.weight || 0} kg × {s.reps || 0} reps</span>
                    </div>
                  ))}
                  {ex.notes && <div className="header-sub" style={{ marginTop: 6 }}>{ex.notes}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {gifPreview && (
        <div className="modal-overlay" onClick={() => setGifPreview(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button className="mini-btn" style={{ position: 'absolute', top: -14, right: -14, background: '#fff' }}
              onClick={() => setGifPreview(null)} aria-label="Cerrar">
              <X size={16} />
            </button>
            <img src={gifPreview.url} alt={gifPreview.nombre}
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, display: 'block' }} />
          </div>
        </div>
      )}
    </>
  );
}