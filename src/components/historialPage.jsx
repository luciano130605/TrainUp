import React, { useState, useMemo } from 'react';
import { Search, Trash2, Calendar, ArrowUpDown, X, ChevronLeft, ChevronRight, Flame, Download, Upload, BicepsFlexed, SlidersHorizontal, Check, Filter, BrushCleaning } from 'lucide-react';
import { formatElapsed } from '../utils/time';
import "./historial.css"
import "./rutina.css"
import CalendarRange from './calendario';
import ProgresoModal from './ProgresoModal';
import { CalendarIcon, ExportIcon, ImportIcon, Order } from '../icons/icons';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'volume', label: 'Mayor volumen' },
  { value: 'duration', label: 'Mayor duración' },
];

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function sameDay(a, b) { return a && b && startOfDay(a).getTime() === startOfDay(b).getTime(); }
function fmtShort(d) { return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); }

// Lunes como inicio de semana (getDay(): 0=Domingo ... 6=Sábado)
function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1; // días transcurridos desde el lunes
  x.setDate(x.getDate() - diff);
  return x;
}

function calcStreak(history) {
  if (history.length === 0) return 0;
  const days = [...new Set(history.map(e => startOfDay(new Date(e.date)).getTime()))].sort((a, b) => b - a);
  const today = startOfDay(new Date()).getTime();
  const oneDay = 86400000;
  let streak = 0;
  let cursor = today;

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
  const [sortOpen, setSortOpen] = useState(false);
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

  // Semana calendario: lunes 00:00 -> ahora
  const weekly = useMemo(() => {
    const weekStart = startOfWeek(new Date()).getTime();
    const entries = history.filter(e => e.date >= weekStart);
    const trainedDays = new Set(entries.map(e => startOfDay(new Date(e.date)).getTime()));
    return {
      days: trainedDays.size,
      volume: Math.round(entries.reduce((a, e) => a + e.totalVolume, 0)),
      sets: entries.reduce((a, e) => a + e.totalSets, 0)
    };
  }, [history]);

  const activeFilterCount = (selectedMuscles.size > 0 ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Ordenar';

  const clearAllFilters = () => {
    setSelectedMuscles(new Set());
    setDateFrom(null);
    setDateTo(null);
  };

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
            <ExportIcon size={18} />
          </button>
          <div className="btn" title="Importar" onClick={onImport}><ImportIcon size={18} /></div>
        </div>
      </div>

      <div className="page-cont top">

        {history.length > 0 && (
          <>
            <div className="hist-stats-grid">
              {[
                { n: streak, label: 'Racha (días)' },
                { n: `${weekly.days}/7`, label: 'Días esta semana' },
                { n: `${weekly.volume}kg`, label: 'Volumen semanal' },
                { n: weekly.sets, label: 'Series semanales' },
              ].map(s => (
                <div key={s.label} className="hist-stat-card">
                  <div className="hist-stat-num">{s.n}</div>
                  <div className="hist-stat-label">{s.label}</div>
                </div>
              ))}
            </div>


            <div className="hist-search-row">
              <div className="hist-search-input">
                <input
                  type="text"
                  placeholder="Buscar rutina o ejercicio..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {query && <X size={14} onClick={() => setQuery('')} style={{ cursor: 'pointer' }} />}
              </div>

              <div style={{ position: 'relative' }}>
                <button className="mini-btn" title="Ordenar por" onClick={() => setSortOpen(v => !v)}>
                  <Order size={16} />
                </button>
                {sortOpen && (
                  <>
                    <div className='mini-drop-cont' onClick={() => setSortOpen(false)} />
                    <div className='mini-drop'>
                      {SORT_OPTIONS.map(opt => (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setSortOpen(false);
                          }}
                          className={`mini-drop-item ${sortBy === opt.value ? "activo" : ""}`}
                        >
                          {opt.label}
                          {sortBy === opt.value && <Check size={14} />}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>


              <button className={`mini-btn`} title="Filtrar por fecha" onClick={() => setCalendarOpen(true)}>
                <CalendarIcon size={16} />
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
            {activeFilterCount > 0 && (
              <button className="mini-btn" onClick={clearAllFilters} style={{ marginTop: 8 }}><BrushCleaning size={16} style={{ position: "relative", top: 6 }} /></button>
            )}
          </div>
        ) : filtered.map(entry => {
          const dt = new Date(entry.date);
          const esHoy = sameDay(dt, new Date());
          const dateStr = dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <div key={entry.id} className="hist-card-compact" onClick={() => onSelectEntry(entry.id)}>
              {esHoy && <span className="dot-hoy" title="Hoy" />}
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