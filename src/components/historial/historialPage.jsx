import React, { useState, useMemo } from 'react';
import { Search, Trash2, Calendar, ArrowUpDown, X, ChevronLeft, ChevronRight, Flame, Download, Upload, BicepsFlexed, SlidersHorizontal, Check, Filter, BrushCleaning } from 'lucide-react';
import { formatElapsed } from '../../utils/time';
import "./historial.css"
import "./historial-final.css"
import "../rutinas/rutinas.css"
import CalendarRange from '../modales/calendario';
import RecuperacionMuscularModal from '../modales/recuperacionMuscularModal';
import { CalendarIcon, ExportIcon, ImportIcon, Order } from '../../icons/icons';
import { StatNumber } from '../rutinas/count';

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

function calcStreak(routines, history) {
  const scheduledDays = new Set();
  routines.forEach(r => (r.days || []).forEach(d => scheduledDays.add(d)));
  if (scheduledDays.size === 0) return 0;

  const historyDates = new Set(history.map(h => startOfDay(new Date(h.date)).getTime()));
  const hoy = startOfDay(new Date());
  const inicioSemanaActual = startOfWeek(hoy).getTime();

  let racha = 0;
  let weekStart = startOfWeek(hoy);

  while (true) {
    let huboDiaProgramado = false;
    let semanaCompleta = true;

    for (let i = 0; i < 7; i++) {
      const dia = new Date(weekStart);
      dia.setDate(weekStart.getDate() + i);
      dia.setHours(0, 0, 0, 0);

      if (dia > hoy) continue;
      if (!scheduledDays.has(dia.getDay())) continue;

      const entrenado = historyDates.has(dia.getTime());

      if (dia.getTime() === hoy.getTime() && !entrenado) {
        continue; // hoy todavía puede entrenar más tarde
      }

      huboDiaProgramado = true;
      if (!entrenado) semanaCompleta = false;
    }

    if (!huboDiaProgramado) {
      if (weekStart.getTime() === inicioSemanaActual) {
        weekStart.setDate(weekStart.getDate() - 7);
        continue;
      }
      break;
    }

    if (!semanaCompleta) break;

    racha++;
    weekStart.setDate(weekStart.getDate() - 7);
  }

  return racha;
}

export default function HistorialPage({ routines = [], history, onSelectEntry, onDeleteEntry, onExport, onImport }) {
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

  const streak = useMemo(() => calcStreak(routines, history), [routines, history]);

  const weekly = useMemo(() => { const weekStart = startOfWeek(new Date()).getTime(); const entries = history.filter(e => Number(e.date) >= weekStart); const trainedDays = new Set(entries.filter(e => Number.isFinite(Number(e.date))).map(e => startOfDay(new Date(Number(e.date))).getTime())); const volume = entries.reduce((total, e) => { const value = Number(e.totalVolume); return total + (Number.isFinite(value) ? value : 0); }, 0); const sets = entries.reduce((total, e) => { const value = Number(e.totalSets); return total + (Number.isFinite(value) ? value : 0); }, 0); return { days: trainedDays.size, volume: Math.round(volume), sets }; }, [history]);

  const activeFilterCount = (selectedMuscles.size > 0 ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Ordenar';

  const clearAllFilters = () => {
    setSelectedMuscles(new Set());
    setDateFrom(null);
    setDateTo(null);
  };

  return (
    <>
      <div className="header">
        <div><h1 className='page-title'>Historial</h1><div className="sub">{history.length} entrenamiento{history.length !== 1 ? 's' : ''}</div></div>
        <div style={{ display: 'flex', gap: 8 }}>

          <button
            className="btn-circle tooltipe"
            disabled={history.length === 0}
            title={history.length === 0 ? "No hay historial para exportar" : "Exportar"}
            onClick={() => history.length > 0 && onExport()}
            data-tooltip={
              history.length === 0 ? "No hay historial para exportar" : "Exportar"
            }
          >
            <ExportIcon size={18} />
          </button>
          <div className="btn-circle tooltipe" title="Importar" onClick={onImport}
            data-tooltip={
              "Importar"
            }
          ><ImportIcon size={18} /></div>

          <button className="btn-circle acento tooltipe-left" title="Ver recuperacion muscular" onClick={() => setProgresoOpen(true)}
            data-tooltip={
              "Ver recuperacion muscular"
            }

          >
            <BicepsFlexed size={18} />
          </button>
        </div>
      </div >

      <div className="cont">

        {history.length > 0 && (
          <>
            <div className="stat-row">
              {[
                { n: streak, label: 'Racha (días)' },
                { n: `${weekly.days}/7`, label: 'Días esta semana' },
                { n: `${weekly.volume}kg`, label: 'Volumen semanal' },
                { n: weekly.sets, label: 'Series semanales' },
              ].map((s, i) => (
                <div key={s.label} className="stat-card stat-card-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <StatNumber value={s.n} />
                  <div className="hist-stat-label">{s.label}</div>
                </div>
              ))}
            </div>


            <div className="hist-search-row">
              <div className="hero-title-wrap">
                <span className="border-bottom" />
                <span className="border-top" />
                <input
                  type="text"
                  className='hist-title-input'
                  placeholder="Buscar rutina o ejercicio..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />

              </div>

              <div className="sort-select-wrapper">
                <select
                  className="sort-native-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Ordenar por"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-hist"
                  title="Ordenar por"
                  data-tooltip="Ordenar"
                  tabIndex={-1}
                >
                  <Order size={12} />
                </button>
              </div>


              <button className={`btn-hist`} title="Filtrar por fecha" onClick={() => setCalendarOpen(true)}
                data-tooltip={
                  "Filtrar"
                }
              >
                <CalendarIcon size={12} />
              </button>
            </div>


          </>
        )}

        {history.length === 0 ? (
          <div className="sin flex column textCenter justifyContentCenter">

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
            <div className='hist-list'>
              <div key={entry.id} className="routine-card routine-card-in" onClick={() => onSelectEntry(entry.id)}>
                {esHoy && <span className="dot absolute" title="Hoy" />}
                <h3 className='routine-name'>{entry.routineName}</h3>
                <div className="routine-meta hist">
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
      </div >

      {
        progresoOpen && (
          <RecuperacionMuscularModal history={history} onClose={() => setProgresoOpen(false)} />
        )
      }
      {
        calendarOpen && (
          <CalendarRange
            from={dateFrom}
            to={dateTo}
            onApply={(f, t) => { setDateFrom(f); setDateTo(t); setCalendarOpen(false); }}
            onClose={() => setCalendarOpen(false)}
          />
        )
      }
    </>
  );
}