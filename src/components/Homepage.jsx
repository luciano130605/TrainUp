import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
    Dumbbell, ChevronRight, Plus,
    Check, X, Flame, TrendingUp, Minus,
} from 'lucide-react';
import ProgresoModal, { buildMuscleRecovery } from './ProgresoModal';
import "./HomePage.css";
import "./mensajes.css";
import RutinasIconFill from "../icons/rutinasFIll"
import HistorialIconFill from "../icons/historialFill"
import MsjIconFill from "../icons/msjFill"
import UserIconFill from "../icons/userFill"
import { supabase } from '../lib/supabaseClient';
import {
    fetchFriendships, fetchSharedRoutines, getPublicProfiles, subscribeSocial,
    respondFriendRequest, respondRoutineShare,
} from '../lib/social';
import Logo from '../../public/logo';
import { PlayIcon, TrenDown, TrenUp } from '../icons/icons';

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

// Lunes como inicio de semana (getDay(): 0=Domingo ... 6=Sábado)
function startOfWeekMonday(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay();
    const diff = day === 0 ? 6 : day - 1;
    x.setDate(x.getDate() - diff);
    return x;
}

// Top 2 músculos más entrenados en lo que va de la semana actual, por cantidad de series.
function buildWeeklyMuscleStats(history) {
    const weekStart = startOfWeekMonday(new Date()).getTime();
    const counts = new Map(); // muscle -> series

    history.forEach(entry => {
        if (entry.date < weekStart) return;
        entry.exercises.forEach(ex => {
            const muscle = ex.muscle;
            if (!muscle) return;
            const sets = ex.sets?.length || 0;
            if (sets === 0) return;
            counts.set(muscle, (counts.get(muscle) || 0) + sets);
        });
    });

    return [...counts.entries()]
        .map(([muscle, sets]) => ({ muscle, sets }))
        .sort((a, b) => b.sets - a.sets)
}

function normalizeMuscle(m) {
    return m.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}



// Para cada músculo, en cuántos días (0 = hoy) le toca según las rutinas programadas.
// Si un músculo aparece en varias rutinas programadas, se queda con la más próxima.
function buildNextMuscleOffsets(routines) {
    const todayDow = new Date().getDay();
    const offsets = new Map(); // muscle normalizado -> offset en días

    routines.forEach(r => {
        if (!r.days || r.days.length === 0) return;
        const routineOffset = Math.min(...r.days.map(d => (d - todayDow + 7) % 7));
        r.exercises.forEach(ex => {
            if (!ex.muscle) return;
            const key = normalizeMuscle(ex.muscle);
            const current = offsets.get(key);
            if (current === undefined || routineOffset < current) {
                offsets.set(key, routineOffset);
            }
        });
    });

    return offsets;
}

// Compara, para cada ejercicio, el peso máximo de la última sesión contra la anterior.
// Devuelve como mucho 1 ejercicio progresando (el de mayor salto) y 1 estancado
// (3 sesiones seguidas con el mismo peso máximo).
function buildExerciseProgress(history) {
    const sorted = [...history].sort((a, b) => a.date - b.date);
    const byExercise = new Map(); // nombre -> [{date, maxWeight}]

    sorted.forEach(entry => {
        entry.exercises.forEach(ex => {
            const weights = (ex.sets || [])
                .map(s => +s.weight || 0)
                .filter(w => w > 0);
            if (weights.length === 0) return;
            const maxWeight = Math.max(...weights);
            if (!byExercise.has(ex.name)) byExercise.set(ex.name, []);
            byExercise.get(ex.name).push({ date: entry.date, maxWeight });
        });
    });

    const progresando = [];
    const estancados = [];

    byExercise.forEach((sesiones, name) => {
        if (sesiones.length < 2) return;
        const last = sesiones[sesiones.length - 1];
        const prev = sesiones[sesiones.length - 2];

        if (last.maxWeight > prev.maxWeight) {
            progresando.push({ name, delta: last.maxWeight - prev.maxWeight });
        } else if (sesiones.length >= 3) {
            const ultimas3 = sesiones.slice(-3);
            const igualSiempre = ultimas3.every(s => s.maxWeight === ultimas3[0].maxWeight);
            if (igualSiempre) estancados.push({ name, sesiones: ultimas3.length });
        }
    });

    progresando.sort((a, b) => b.delta - a.delta);
    estancados.sort((a, b) => b.sesiones - a.sesiones);

    const resultado = [];
    if (progresando[0]) resultado.push({ type: 'up', ...progresando[0] });
    if (estancados[0]) resultado.push({ type: 'flat', ...estancados[0] });
    return resultado;
}

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
    routines = [], history = [], session, authSession,
    onStartSession, onSelectRoutine, onNewRoutine,
    onNavigate, onSelectHistoryEntry, onImportRoutine,
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
        () => recovery.filter(r => !r.recovered),
        [recovery]
    );

    const nextMuscleOffsets = useMemo(() => buildNextMuscleOffsets(routines), [routines]);

    // Entre los músculos recuperados, priorizamos el que corresponde a la rutina
    // programada más próxima (pecho y tríceps recuperados, pero el próximo día
    // toca pecho -> mostramos pecho). Si ninguno coincide con algo programado,
    // caemos al que se recuperó hace menos tiempo.
    const justRecovered = useMemo(() => {
        const recuperados = recovery.filter(r => r.recovered);
        if (recuperados.length === 0) return null;

        const conOffset = recuperados
            .map(r => ({ ...r, offset: nextMuscleOffsets.get(normalizeMuscle(r.muscle)) }))
            .filter(r => r.offset !== undefined)
            .sort((a, b) => a.offset - b.offset);
        if (conOffset.length > 0) return conOffset[0];

        return [...recuperados].sort((a, b) => a.daysSince - b.daysSince)[0];
    }, [recovery, nextMuscleOffsets]);

    const weeklyMuscles = useMemo(() => buildWeeklyMuscleStats(history), [history]);
    const exerciseProgress = useMemo(() => buildExerciseProgress(history), [history]);

    const saludo = useMemo(() => {
        const h = new Date().getHours();
        if (h < 6) return 'Buenas noches';
        if (h < 12) return 'Buen día';
        if (h < 20) return 'Buenas tardes';
        return 'Buenas noches';
    }, []);

    const weeklyGroups = useMemo(() => {
        const groups = [];
        for (let i = 0; i < weeklyMuscles.length; i += 2) {
            groups.push(weeklyMuscles.slice(i, i + 2));
        }
        return groups;
    }, [weeklyMuscles]);

    const fechaLarga = useMemo(() => {
        const s = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    }, []);

    // Accesos rápidos: 3 items, 1 por "página" (grid-template-rows: 1)
    const quickCarousel = useCarouselDots(3);

    // Recuperación: grid-template-rows: 2 -> páginas = ceil(items / 2)
    const recupPages = Math.max(1, Math.ceil(pendientes.length / 2));
    const recupCarousel = useCarouselDots(recupPages);

    const weekPages = Math.max(1, weeklyGroups.length);
    const weekCarousel = useCarouselDots(weekPages);

    // Progreso de ejercicios: 1 ejercicio por página
    const progressCarousel = useCarouselDots(exerciseProgress.length);

    const userId = authSession?.user?.id;
    const [friendships, setFriendships] = useState([]);
    const [shares, setShares] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [socialLoaded, setSocialLoaded] = useState(false);

    const loadSocialSummary = useCallback(async () => {
        if (!supabase || !userId) return;
        const [{ data: fData }, { data: sData }] = await Promise.all([
            fetchFriendships(userId),
            fetchSharedRoutines(userId),
        ]);
        const friendshipsList = fData || [];
        const sharesList = sData || [];
        setFriendships(friendshipsList);
        setShares(sharesList);

        const idsNeeded = new Set();
        friendshipsList.forEach(f => {
            idsNeeded.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
        });
        sharesList.forEach(s => {
            idsNeeded.add(s.sender_id === userId ? s.receiver_id : s.sender_id);
        });
        if (idsNeeded.size > 0) {
            const { data: profData } = await getPublicProfiles([...idsNeeded]);
            if (profData) {
                setProfiles(prev => {
                    const next = { ...prev };
                    profData.forEach(p => { next[p.id] = p; });
                    return next;
                });
            }
        }
        setSocialLoaded(true);
    }, [userId]);

    useEffect(() => { loadSocialSummary(); }, [loadSocialSummary]);

    useEffect(() => {
        const unsubscribe = subscribeSocial(userId, loadSocialSummary);
        return unsubscribe;
    }, [userId, loadSocialSummary]);

    // ---------- listas derivadas (mismo criterio que Mensajes.jsx) ----------
    const friends = useMemo(() => friendships
        .filter(f => f.status === 'accepted')
        .map(f => {
            const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
            return { friendshipId: f.id, ...profiles[otherId], id: otherId };
        }), [friendships, profiles, userId]);

    const incomingRequests = useMemo(() => friendships
        .filter(f => f.status === 'pending' && f.addressee_id === userId)
        .map(f => ({ friendshipId: f.id, ...profiles[f.requester_id], id: f.requester_id })),
        [friendships, profiles, userId]);

    const incomingShares = useMemo(() => shares
        .filter(s => s.status === 'pending' && s.receiver_id === userId)
        .map(s => ({ ...s, from: profiles[s.sender_id] })),
        [shares, profiles, userId]);

    const pendingCount = incomingRequests.length + incomingShares.length;
    const iniciales = (p) => (p?.nombre?.[0] || p?.username?.[0] || '?').toUpperCase();

    // ---------- acciones rápidas desde el home ----------
    async function handleRespondRequest(e, friendshipId, accept) {
        e.stopPropagation();
        const { error } = await respondFriendRequest(friendshipId, accept);
        if (!error) loadSocialSummary();
    }

    async function handleRespondShare(e, share, accept) {
        e.stopPropagation();
        const { error } = await respondRoutineShare(share.id, accept);
        if (!error) {
            if (accept) onImportRoutine?.(share.routine_data);
            loadSocialSummary();
        }
    }
    return (
        <>
            <div className="home-header">

                <div className='cont-head' style={{ justifyContent: 'space-between' }}>
                    <h1 className="header-titulo">{saludo}</h1>
                    {racha > 0 && (
                        <span className="home-racha-pill">
                            <span className="home-racha-dot" />
                            <Flame size={11} />
                            {racha} {racha === 1 ? 'día' : 'días'}
                        </span>
                    )}

                </div>
                <div className="header-sub">
                    {fechaLarga}

                </div>
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
                                        className="btn primario"
                                        title="Empezar"
                                        onClick={() => onStartSession(r.id)}
                                    >
                                        <PlayIcon size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {(weeklyMuscles.length > 0 || exerciseProgress.length > 0) && (
                    <div className="home-msj-card">
                        <span className="home-hoy-tag">Tu semana</span>

                        {weeklyMuscles.length > 0 && (
                            <>
                                <div
                                    className="home-week-carousel"
                                    ref={weekCarousel.ref}
                                    onScroll={weekCarousel.handleScroll}
                                >
                                    {weeklyGroups.map((group, page) => (
                                        <div key={page} className="home-week-page">
                                            {group.map((m, index) => (
                                                <div key={m.muscle} className="home-week-chip">
                                                    <span className="home-week-chip-rank">
                                                        {page * 2 + index + 1}
                                                    </span>

                                                    <span className="home-week-chip-nombre">
                                                        {m.muscle}
                                                    </span>

                                                    <span className="home-week-chip-sets">
                                                        {m.sets} serie{m.sets !== 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <DotsIndicator
                                    count={weekPages}
                                    active={weekCarousel.active}
                                    onDotClick={weekCarousel.goTo}
                                />
                            </>
                        )}

                        {exerciseProgress.length > 0 && (
                            <>
                                <div
                                    className="home-progress-carousel"
                                    ref={progressCarousel.ref}
                                    onScroll={progressCarousel.handleScroll}
                                >
                                    {exerciseProgress.map(p => (
                                        <div key={p.name} className="home-progress-item">
                                            {p.type === 'up' ? (
                                                <TrenUp size={25} color='var(--acento)' />
                                            ) : (
                                                <TrenDown size={25} color='var(--rojo)' />
                                            )}
                                            <span className="home-progress-nombre">{p.name}</span>
                                            <span className="home-progress-sub">
                                                {p.type === 'up' ? `+${p.delta}kg` : 'Estancado'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <DotsIndicator
                                    count={exerciseProgress.length}
                                    active={progressCarousel.active}
                                    onDotClick={progressCarousel.goTo}
                                />
                            </>
                        )}
                    </div>
                )}

                {history.length > 0 && (
                    <div className="home-recup-card">
                        <div className="home-recup-head" onClick={() => setProgresoOpen(true)}>
                            <span className="home-hoy-tag">Recuperación muscular</span>
                            <ChevronRight size={16} className="home-quick-chev" />
                        </div>

                        {justRecovered && pendientes.length > 0 && (
                            <div className="home-recup-alert">
                                <span className="home-recup-alert-emoji">💪</span>
                                {justRecovered.muscle} recuperado, ¡listo para entrenar!
                            </div>
                        )}

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


                {userId && socialLoaded && (
                    <div className="home-msj-card">
                        <div className="home-msj-head" onClick={() => onNavigate('mensajes')}>
                            <div className="home-msj-tag-row">
                                <span className="home-hoy-tag">Mensajes</span>
                                {pendingCount > 0 && <span className="mensajes-badge">{pendingCount}</span>}
                            </div>
                            <ChevronRight size={16} className="home-quick-chev" />
                        </div>

                        {incomingRequests.length > 0 && (
                            <div className="home-msj-subseccion">
                                <span className="home-msj-subtitulo">Solicitudes de amistad</span>
                                <div className="home-msj-scroll-list">
                                    {incomingRequests.map(r => (
                                        <div className="mensajes-row" key={r.friendshipId}>
                                            <div className="mensajes-row-clickable" onClick={() => onNavigate('mensajes')}>
                                                <div className="mensajes-avatar">{iniciales(r)}</div>
                                                <div className="mensajes-row-info">
                                                    <div className="mensajes-row-nombre">{r.nombre || r.username}</div>
                                                    <div className="mensajes-row-username">@{r.username}</div>
                                                </div>
                                            </div>
                                            <div className="mensajes-row-actions">
                                                <button className="btns primario" style={{ padding: '6px 10px' }} onClick={(e) => handleRespondRequest(e, r.friendshipId, true)}>
                                                    <Check size={14} />
                                                </button>
                                                <button className="btns eliminar" style={{ padding: '6px 10px' }} onClick={(e) => handleRespondRequest(e, r.friendshipId, false)}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rutinas compartidas pendientes */}
                        {incomingShares.length > 0 && (
                            <div className="home-msj-subseccion">
                                <span className="home-msj-subtitulo">Rutinas compartidas</span>
                                <div className="home-msj-scroll-list">
                                    {incomingShares.map(s => (
                                        <div className="mensajes-row" key={s.id}>
                                            <div className="mensajes-row-clickable" onClick={() => onNavigate('mensajes')}>
                                                <div className="mensajes-avatar"><Dumbbell size={16} /></div>
                                                <div className="mensajes-row-info">
                                                    <div className="mensajes-row-nombre">{s.routine_name}</div>
                                                    <div className="mensajes-row-username">de @{s.from?.username || '...'}</div>
                                                </div>
                                            </div>
                                            <div className="mensajes-row-actions">
                                                <button className="btns primario" style={{ padding: '6px 10px' }} onClick={(e) => handleRespondShare(e, s, true)}>
                                                    <Check size={14} />
                                                </button>
                                                <button className="btns eliminar" style={{ padding: '6px 10px' }} onClick={(e) => handleRespondShare(e, s, false)}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amigos */}
                        <div className="home-msj-subseccion">
                            <span className="home-msj-subtitulo">
                                Tus amigos {friends.length > 0 && `(${friends.length})`}
                            </span>
                            {friends.length === 0 ? (
                                <p className="home-msj-vacio">Todavía no agregaste amigos. Buscalos acá.</p>
                            ) : (
                                <div className="home-msj-scroll-list">
                                    {friends.map(f => (
                                        <div className="mensajes-row" key={f.friendshipId} onClick={() => onNavigate('mensajes')}>
                                            <div className="mensajes-row-clickable">
                                                <div className="mensajes-avatar">{iniciales(f)}</div>
                                                <div className="mensajes-row-info">
                                                    <div className="mensajes-row-nombre">{f.nombre || f.username}</div>
                                                    <div className="mensajes-row-username">@{f.username}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className="home-msj-card">
                    <h3 className="home-hoy-tag">Accesos rápidos</h3>
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
                        <div className="home-quick-item" onClick={() => onNavigate('mensajes')}>
                            <div className="home-quick-icon"><MsjIconFill /></div>
                            <span>Mensajes</span>
                            <ChevronRight size={14} className="home-quick-chev" />
                        </div>
                        <div className="home-quick-item" onClick={() => onNavigate('perfil')}>
                            <div className="home-quick-icon"><UserIconFill /></div>
                            <span>Perfil</span>
                            <ChevronRight size={14} className="home-quick-chev" />
                        </div>
                    </div>
                    <DotsIndicator
                        count={4}
                        active={quickCarousel.active}
                        onDotClick={quickCarousel.goTo}
                    />
                </div>
                {ultimoEntreno && (
                    <>
                        <div className="home-msj-card">

                            <div className="home-hoy-tag">Último entrenamiento</div>
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