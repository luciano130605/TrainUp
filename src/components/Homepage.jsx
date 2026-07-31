import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Dumbbell, History, User, ChevronRight, Play, Flame, Plus, Clock, CircleArrowOutUpRight } from 'lucide-react';
import ProgresoModal, { buildMuscleRecovery } from './ProgresoModal';
import "./HomePage.css";
import RutinasIconFill from "../icons/rutinasFIll"
import HistorialIconFill from "../icons/historialFill"
import UserIconFill from "../icons/userFill"

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function calcRacha(history) {
    if (!history?.length) return 0;
    const dias = new Set(history.map(h => new Date(h.date).toDateString()));
    let cursor = new Date();

    if (!dias.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    let racha = 0;
    while (dias.has(cursor.toDateString())) {
        racha++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return racha;
}

function formatDuration(sec) {
    if (!sec && sec !== 0) return '';
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h ${mm}m` : `${mm} min`;
}

function formatFecha(ts) {
    const d = new Date(ts);
    const hoy = new Date();
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Bolitas de paginación reutilizables para los carruseles con scroll-snap
function DotsIndicator({ count, active, onDotClick }) {
    if (count <= 1) return null;
    return (
        <div className="home-dots">
            {Array.from({ length: count }).map((_, i) => (
                <button
                    key={i}
                    type="button"
                    className={`home-dot${i === active ? ' active' : ''}`}
                    aria-label={`Ir a la tarjeta ${i + 1} de ${count}`}
                    onClick={() => onDotClick?.(i)}
                />
            ))}
        </div>
    );
}

// Trackea qué "página" del carrusel horizontal (scroll-snap) está activa
function useCarouselDots(count) {
    const ref = useRef(null);
    const [active, setActive] = useState(0);

    const handleScroll = useCallback(() => {
        const el = ref.current;
        if (!el || !el.clientWidth) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setActive(prev => (prev === idx ? prev : idx));
    }, []);

    useEffect(() => {
        // si la cantidad de items cambia (ej. cambia el historial), reseteamos
        setActive(0);
        ref.current?.scrollTo({ left: 0 });
    }, [count]);

    const goTo = useCallback((idx) => {
        const el = ref.current;
        if (!el) return;
        el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
        setActive(idx);
    }, []);

    return { ref, active, handleScroll, goTo };
}

export default function HomePage({
    routines = [], history = [], session,
    onStartSession, onSelectRoutine, onNewRoutine,
    onNavigate, onSelectHistoryEntry,
}) {
    const hoy = new Date().getDay();
    const [progresoOpen, setProgresoOpen] = useState(false);

    const rutinasHoy = useMemo(
        () => routines.filter(r => r.days?.includes(hoy)),
        [routines, hoy]
    );

    const racha = useMemo(() => calcRacha(history), [history]);
    const ultimoEntreno = history[0] || null;

    const recovery = useMemo(() => buildMuscleRecovery(history), [history]);
    const pendientes = useMemo(
        () => recovery.filter(r => !r.recovered).slice(0, 5),
        [recovery]
    );

    const saludo = useMemo(() => {
        const h = new Date().getHours();
        if (h < 6) return 'Buenas noches';
        if (h < 12) return 'Buen día';
        if (h < 20) return 'Buenas tardes';
        return 'Buenas noches';
    }, []);

    const fechaLarga = useMemo(() => {
        const s = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    }, []);

    // Accesos rápidos: 3 items, 1 por "página" (grid-template-rows: 1)
    const quickCarousel = useCarouselDots(3);

    // Recuperación: grid-template-rows: 2 -> páginas = ceil(items / 2)
    const recupPages = Math.max(1, Math.ceil(pendientes.length / 2));
    const recupCarousel = useCarouselDots(recupPages);

    return (
        <>
            <div className="home-header">

                <div className='cont-head'>
                    <h1 className="header-titulo">{saludo}</h1>
                    <div className="home-logo-row">
                        <div className="home-logo">
                            Train<span className="home-logo-acento">Up</span>
                        </div>

                    </div>
                </div>
                <div className="header-sub">{fechaLarga}</div>
            </div>

            <div className="page-cont home-cont">

                <div className="home-hoy-card">
                    <div className="home-hoy-head">
                        <span className="home-hoy-tag">Hoy toca</span>
                    </div>

                    {rutinasHoy.length === 0 ? (
                        <div className="home-hoy-vacio">
                            <p>No tenés rutinas programadas para hoy.</p>
                            {routines.length === 0 ? (
                                <button className="btns primario home-hoy-btn" onClick={onNewRoutine}>
                                    <Plus size={16} /> Crear tu primera rutina
                                </button>
                            ) : (
                                <button className="btns agregar home-hoy-btn" onClick={() => onNavigate('routines')}>
                                    Ver mis rutinas
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="home-hoy-lista">
                            {rutinasHoy.map(r => (
                                <div key={r.id} className="home-hoy-item">
                                    <div className="home-hoy-item-info" onClick={() => onSelectRoutine(r.id)}>
                                        <div className="home-hoy-item-icon"><Dumbbell size={16} /></div>
                                        <div>
                                            <div className="home-hoy-item-nombre">{r.name}</div>
                                            <div className="home-hoy-item-sub">
                                                {r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="home-hoy-play"
                                        title="Empezar"
                                        onClick={() => onStartSession(r.id)}
                                    >
                                        <Play size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {history.length > 0 && (
                    <div className="home-recup-card">
                        <div className="home-recup-head" onClick={() => setProgresoOpen(true)}>
                            <span className="home-hoy-tag">Recuperación muscular</span>
                            <ChevronRight size={16} className="home-quick-chev" />
                        </div>

                        {pendientes.length === 0 ? (
                            <p className="home-recup-vacio">Todos tus músculos están recuperados 💪</p>
                        ) : (
                            <>
                                <div
                                    className="home-recup-lista"
                                    ref={recupCarousel.ref}
                                    onScroll={recupCarousel.handleScroll}
                                >
                                    {pendientes.map(r => (
                                        <div key={r.muscle} className="home-recup-item" onClick={() => setProgresoOpen(true)}>
                                            <div className="home-recup-fill" style={{ width: `${r.pct}%` }} />
                                            <div className="home-recup-icon"><Dumbbell size={18} /></div>
                                            <div className="home-recup-info">
                                                <span className="home-recup-nombre">{r.muscle}</span>
                                                <span className="home-recup-pct">{r.pct}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <DotsIndicator
                                    count={recupPages}
                                    active={recupCarousel.active}
                                    onDotClick={recupCarousel.goTo}
                                />
                            </>
                        )}
                    </div>
                )}


                <h3 className="home-section-titulo">Accesos rápidos</h3>
                <div
                    className="home-quick-grid"
                    ref={quickCarousel.ref}
                    onScroll={quickCarousel.handleScroll}
                >
                    <div className="home-quick-item" onClick={() => onNavigate('routines')}>
                        <div className="home-quick-icon"><RutinasIconFill /></div>
                        <span>Rutinas</span>
                        <ChevronRight size={14} className="home-quick-chev" />
                    </div>
                    <div className="home-quick-item" onClick={() => onNavigate('history')}>
                        <div className="home-quick-icon"><HistorialIconFill /></div>
                        <span>Historial</span>
                        <ChevronRight size={14} className="home-quick-chev" />
                    </div>
                    <div className="home-quick-item" onClick={() => onNavigate('proximamente')}>
                        <div className="home-quick-icon"><UserIconFill /></div>
                        <span>Perfil</span>
                        <ChevronRight size={14} className="home-quick-chev" />
                    </div>
                </div>
                <DotsIndicator
                    count={3}
                    active={quickCarousel.active}
                    onDotClick={quickCarousel.goTo}
                />

                {ultimoEntreno && (
                    <>
                        <div className="home-section-titulo">Último entrenamiento</div>
                        <div
                            className="home-ultimo-card"
                            onClick={() => onSelectHistoryEntry?.(ultimoEntreno.id)}
                        >
                            <div className="home-ultimo-icon"><Dumbbell size={16} /></div>
                            <div className="home-ultimo-info">
                                <div className="home-ultimo-nombre">{ultimoEntreno.routineName}</div>
                                <div className="home-ultimo-sub">
                                    {formatFecha(ultimoEntreno.date)}
                                    {ultimoEntreno.durationSec ? ` · ${formatDuration(ultimoEntreno.durationSec)}` : ''}
                                    {ultimoEntreno.totalSets ? ` · ${ultimoEntreno.totalSets} series` : ''}
                                </div>
                            </div>
                            <ChevronRight size={16} className="home-quick-chev" />
                        </div>
                    </>
                )}

            </div>

            {progresoOpen && (
                <ProgresoModal history={history} onClose={() => setProgresoOpen(false)} />
            )}
        </>
    );
}