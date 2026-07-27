import React, { useState, useMemo } from 'react';
import { Search, Trash2, Calendar, ArrowUpDown, X, ChevronLeft, ChevronRight, Flame, Download, Upload, BicepsFlexed } from 'lucide-react';
import { formatElapsed } from '../utils/time';
import "./historial.css"
import "./rutina.css"
import CalendarRange from './calendario';
import ProgresoModal from './ProgresoModal';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function sameDay(a, b) { return a && b && startOfDay(a).getTime() === startOfDay(b).getTime(); }
function fmtShort(d) { return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); }


function calcStreak(history) {
  if (history.length === 0) return 0;
  const days = [...new Set(history.map(e => startOfDay(new Date(e.date)).getTime()))].sort((a, b) => b - a);
  const today = startOfDay(new Date()).getTime();
  const oneDay = 86400000;
  let streak = 0;
  let cursor = today;
  // si no entrenó hoy, el streak arranca a contar desde ayer (no se rompe por "hoy" aún no jugado)
  if (days[0] !== today) cursor = today - oneDay;
  for (const d of days) {
    if (d === cursor) { streak++; cursor -= oneDay; }
    else if (d < cursor) break;
  }
  return streak;
}

export default function HistorialPage({ history, onSelectEntry, onDeleteEntry, onExport, onImport }) {
  const [query, setQuery] = useState('');
  const [progresoOpen, setProgresoOpen] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState(new Set());
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // recent | volume | duration
  const [showFilters, setShowFilters] = useState(false);

  const allMuscles = useMemo(() => {
    const set = new Set();
    history.forEach(e => e.exercises.forEach(ex => { if (ex.muscle) set.add(ex.muscle); }));
    return [...set].sort();
  }, [history]);

  const toggleMuscle = (m) => {
    setSelectedMuscles(prev => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = history.filter(entry => {
      if (dateFrom && entry.date < dateFrom.getTime()) return false;
      if (dateTo && entry.date > dateTo.getTime()) return false;
      if (selectedMuscles.size > 0 && !entry.exercises.some(ex => selectedMuscles.has(ex.muscle))) return false;
      if (q) {
        const matchesRoutine = entry.routineName.toLowerCase().includes(q);
        const matchesExercise = entry.exercises.some(ex => ex.name.toLowerCase().includes(q));
        if (!matchesRoutine && !matchesExercise) return false;
      }
      return true;
    });
    if (sortBy === 'volume') list = [...list].sort((a, b) => b.totalVolume - a.totalVolume);
    else if (sortBy === 'duration') list = [...list].sort((a, b) => b.durationSec - a.durationSec);
    else list = [...list].sort((a, b) => b.date - a.date);
    return list;
  }, [history, query, selectedMuscles, dateFrom, dateTo, sortBy]);

  const streak = useMemo(() => calcStreak(history), [history]);
  const weekly = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const entries = history.filter(e => e.date >= weekAgo);
    return {
      count: entries.length,
      volume: Math.round(entries.reduce((a, e) => a + e.totalVolume, 0)),
      sets: entries.reduce((a, e) => a + e.totalSets, 0)
    };
  }, [history]);

  const activeFilterCount = (selectedMuscles.size > 0 ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  return (
    <>
      <div className="header-cont">
        <div><h1 className='header-titulo'>Historial</h1><div className="header-sub">{history.length} entrenamiento{history.length !== 1 ? 's' : ''}</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" title="Ver recuperacion muscular" onClick={() => setProgresoOpen(true)}>
            <BicepsFlexed size={18} />
          </button>
          <button
            className="btn export"
            disabled={history.length === 0}
            title={history.length === 0 ? "No hay historial para exportar" : "Exportar"}
            onClick={() => history.length > 0 && onExport()}
          >
            <Upload size={18} />
          </button>
          <div className="btn" title="Importar" onClick={onImport}><Download size={18} /></div>
        </div>
      </div>

      <div className="page-cont top">

        {history.length > 0 && (
          <>
            <div className="stats-cont">
              <div className="stats-cont-item">
                <div><b>{streak}</b><span>racha (días)</span></div>
              </div>
              <div className="stats-cont-item">
                <div><b>{weekly.count}</b><span>esta semana</span></div>
              </div>
              <div className="stats-cont-item">
                <div><b>{weekly.volume}kg</b><span>volumen semanal</span></div>
              </div>
              <div className="stats-cont-item">
                <div><b>{weekly.sets}</b><span>series semanales</span></div>
              </div>
            </div>


            <div className="hist-search-row">
              <div className="hist-search-input">
                <Search size={15} className='icon' />
                <input
                  type="text"
                  placeholder="Buscar rutina o ejercicio..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {query && <X size={14} onClick={() => setQuery('')} style={{ cursor: 'pointer' }} />}
              </div>
              <button className={`mini-btn`} title="Filtrar por fecha" onClick={() => setCalendarOpen(true)}>
                <Calendar size={16} />
              </button>

            </div>

            {(dateFrom || dateTo) && (
              <div className="hist-active-range">
                {fmtShort(dateFrom)} → {fmtShort(dateTo)}
              </div>
            )}


          </>
        )}

        {history.length === 0 ? (
          <div className="page-sin">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="30" cy="30" r="22" />
              <path d="M30 18v12l9 6" />
            </svg>
            <h3>Sin entrenamientos aún</h3>
            <p>Cuando termines una rutina, aparecerá aquí con tu progreso.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="page-sin">
            <h3>Sin resultados</h3>
            <p>Probá cambiar la búsqueda o los filtros.</p>
          </div>
        ) : filtered.map(entry => {
          const dt = new Date(entry.date);
          const dateStr = dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <div key={entry.id} className="hist-card-compact" onClick={() => onSelectEntry(entry.id)}>
              <div className="hist-card-main">
                <h4>{entry.routineName}</h4>
                <div className="hist-card-meta">
                  <span>{dateStr}</span>
                  <span>·</span>
                  <span>{formatElapsed(entry.durationSec * 1000)}</span>
                  <span>·</span>
                  <span>{entry.totalSets} series</span>
                  <span>·</span>
                  <span>{Math.round(entry.totalVolume)}kg</span>
                </div>
              </div>
              {onDeleteEntry && (
                <button className="mini-btn danger" title="Eliminar" onClick={e => { e.stopPropagation(); onDeleteEntry(entry.id); }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {progresoOpen && (
        <ProgresoModal history={history} onClose={() => setProgresoOpen(false)} />
      )}
      {calendarOpen && (
        <CalendarRange
          from={dateFrom}
          to={dateTo}
          onApply={(f, t) => { setDateFrom(f); setDateTo(t); setCalendarOpen(false); }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </>
  );
}