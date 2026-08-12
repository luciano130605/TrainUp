import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { sileo } from "sileo";
import { formatElapsed } from '../../utils/time';
import { playBeep } from '../../utils/audio';
import "./descanso.css";
import "../rutinas/rutina.css";
import { scheduleServerPush, cancelServerPush } from '../../utils/push';
import { AgregarQuince, PauseIcon, PlayIcon, Retroceder15, TimerIcon } from '../../icons/icons';
import { X } from 'lucide-react';

const stopAll = (e) => e.stopPropagation();

let store = null;         // { total, running, endTime, pausedRemaining }
let intervalId = null;
let beeped = false;
let wakeLock = null;
const listeners = new Set();
let serverTimerId = null;

function notify() {
    listeners.forEach(fn => fn());
}

// --- Núcleo: tiempo restante calculado contra un timestamp real ---
function getRemaining() {
    if (!store) return 0;
    if (!store.running) return store.pausedRemaining;
    return Math.max(0, Math.round((store.endTime - Date.now()) / 1000));
}
function tick() {
    if (!store) return;
    const remaining = getRemaining();
    if (remaining <= 0 && !beeped) {
        beeped = true;
        playBeep();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 80, 200, 80, 200]);
        }
        sileo.success({ title: "Tiempo terminado", duration: 3000 });
        showBrowserNotification();

        setTimeout(() => {
            dismiss();
        }, 1000);
    }
    notify();
}

function adjust(delta) {
    if (!store) return;
    if (store.running) {
        store.endTime += delta * 1000;
        const remaining = getRemaining();
        store.total = Math.max(store.total, remaining);
        if (remaining > 0) beeped = false;
        scheduleServerPush(store.endTime, serverTimerId).then(id => { serverTimerId = id; }); // 👈
    } else {
        store.pausedRemaining = Math.max(0, store.pausedRemaining + delta);
        store.total = Math.max(store.total, store.pausedRemaining);
        if (store.pausedRemaining > 0) beeped = false;
    }
    notify();
}
function togglePause() {
    if (!store) return;
    if (store.running) {
        store.pausedRemaining = getRemaining();
        store.running = false;
        cancelServerPush(serverTimerId); // 👈 pausado = no queremos push
    } else {
        store.endTime = Date.now() + store.pausedRemaining * 1000;
        store.running = true;
        scheduleServerPush(store.endTime, serverTimerId).then(id => { serverTimerId = id; }); // 👈
    }
    notify();
}

let notificationPermissionRequested = false;

function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default' && !notificationPermissionRequested) {
        notificationPermissionRequested = true;
        Notification.requestPermission();
    }
}

function showBrowserNotification() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    try {
        const n = new Notification('⏱️ Descanso terminado', {
            body: 'Volvé a entrenar',
            tag: 'descanso-timer',
            renotify: true,
        });
        n.onclick = () => {
            window.focus();
            n.close();
        };
    } catch (e) { /* algunos navegadores tiran error si la pestaña está en foco */ }
}
// --- Wake lock (best-effort, no rompe nada si el navegador no lo soporta) ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (e) { /* silencioso: iOS viejo, permisos, etc. */ }
}
function releaseWakeLock() {
    try { wakeLock && wakeLock.release(); } catch (e) { }
    wakeLock = null;
}



function dismiss() {
    clearInterval(intervalId);
    intervalId = null;
    cancelServerPush(serverTimerId);
    serverTimerId = null;
    store = null;
    releaseWakeLock();
    notify();
}


function useDescansoStore() {
    const [, force] = useState(0);
    useEffect(() => {
        const fn = () => force(v => v + 1);
        listeners.add(fn);
        return () => listeners.delete(fn);
    }, []);
    return store;
}

// Recalcula apenas la pestaña vuelve a estar visible (se pone al día al toque)
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            tick();
            if (store && store.running) requestWakeLock();
        }
    });
}

function RelojDescanso({ remaining, total, size = 14 }) {
    const stroke = 1.6;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    const elapsedPct = total > 0 ? Math.min(100, Math.max(0, ((total - remaining) / total) * 100)) : 0;
    const offset = circumference * (1 - elapsedPct / 100);

    const angleDeg = -90 + (elapsedPct / 100) * 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    const handLen = radius * 0.6;
    const cx = size / 2;
    const cy = size / 2;
    const hx = cx + handLen * Math.cos(angleRad);
    const hy = cy + handLen * Math.sin(angleRad);

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="reloj-descanso">
            <circle cx={cx} cy={cy} r={radius} fill="none" strokeWidth={stroke} className="reloj-descanso-bg" />
            <circle
                cx={cx} cy={cy} r={radius}
                fill="none" strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                className="reloj-descanso-fill"
            />
            <line x1={cx} y1={cy} x2={hx} y2={hy} strokeWidth={stroke} strokeLinecap="round" className="reloj-descanso-mano" />
        </svg>
    );
}

function TituloDescanso() {
    const s = useDescansoStore();
    if (!s) return null;
    const remaining = getRemaining();
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RelojDescanso remaining={remaining} total={s.total} /> {formatElapsed(remaining * 1000)}
        </span>
    );
}

function ContenidoDescanso() {
    const s = useDescansoStore();
    const rootRef = React.useRef(null);
    const remaining = s ? getRemaining() : 0;

    React.useEffect(() => {
        if (!s || !rootRef.current) return;
        const cont = rootRef.current.closest('.sileo-cont');
        if (!cont) return;
        const pct = s.total > 0
            ? Math.min(100, Math.max(0, ((s.total - remaining) / s.total) * 100))
            : 0;
        cont.style.setProperty('--pct', `${pct}%`);
    }, [remaining, s?.total]);

    if (!s) return null;
    const { running } = s;

    return (
        <div ref={rootRef} className="tiempo-toast" onPointerDown={stopAll} onMouseDown={stopAll} onClick={stopAll}>
            <div className="tiempo-controles minimal">
                <div role="button" tabIndex={0} className="btn-circle" title="Restar 15s" onClick={() => adjust(-15)}>
                    <Retroceder15 size={16} />
                </div>
                <div role="button" tabIndex={0} className="btn-circle descanso" title={running ? 'Pausar' : 'Reanudar'} onClick={togglePause}>
                    {running ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                </div>
                <div role="button" tabIndex={0} className="btn-circle" title="Sumar 15s" onClick={() => adjust(15)}>
                    <AgregarQuince size={16} />
                </div>
            </div>
        </div>
    );
}


export function DescansoBarraFija({ compact = false }) {
    const s = useDescansoStore();
    const [snapshot, setSnapshot] = useState(null);
    const [leaving, setLeaving] = useState(false);
    const leaveTimeoutRef = React.useRef(null);

    useEffect(() => {
        if (s) {
            // hay timer activo: mostramos y cancelamos cualquier salida pendiente
            clearTimeout(leaveTimeoutRef.current);
            setLeaving(false);
            setSnapshot({ remaining: getRemaining(), running: s.running, total: s.total });
        } else if (snapshot) {
            // el timer se fue (cancelado o terminado): animamos la salida y recién
            // después desmontamos de verdad
            setLeaving(true);
            leaveTimeoutRef.current = setTimeout(() => setSnapshot(null), 320);
        }
        return () => clearTimeout(leaveTimeoutRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [s]);

    if (!snapshot) return null;

    const remaining = s ? getRemaining() : snapshot.remaining;
    const total = s ? s.total : snapshot.total;
    const running = s ? s.running : snapshot.running;
    const pct = total > 0 ? Math.min(100, Math.max(0, ((total - remaining) / total) * 100)) : 0;

    const bar = (
        <div className={`descanso-barra-fija ${compact ? 'compacta' : ''} ${leaving ? 'saliendo' : 'entrando'}`}>
            <div className="descanso-barra-progreso" style={{ width: `${pct}%` }} />
            <div className="descanso-barra-info">
                <RelojDescanso remaining={remaining} total={total} size={compact ? 16 : 22} />
                <div className="descanso-barra-textos">
                    {!compact && <span className="descanso-barra-label">Descanso</span>}
                    <span className="descanso-barra-tiempo">{formatElapsed(remaining * 1000)}</span>
                </div>
            </div>
            <div className="descanso-barra-controles">
                {!compact && (
                    <button type="button" className="btn-circle" title="Restar 15s" onClick={() => adjust(-15)}>
                        <Retroceder15 size={16} />
                    </button>
                )}
                <button type="button" className="btn-circle descanso" title={running ? 'Pausar' : 'Reanudar'} onClick={togglePause}>
                    {running ? <PauseIcon size={compact ? 14 : 16} /> : <PlayIcon size={compact ? 14 : 16} />}
                </button>
                {!compact && (
                    <button type="button" className="btn-circle" title="Sumar 15s" onClick={() => adjust(15)}>
                        <AgregarQuince size={16} />
                    </button>
                )}
                <button type="button" className="btn-circle danger" title="Cancelar descanso" onClick={dismiss}>
                    <X size={compact ? 14 : 16} />
                </button>
            </div>
        </div>
    );

    return ReactDOM.createPortal(bar, document.body);
}


export default function openTiempoDescansoToast(seconds) {
    beeped = false;
    requestNotificationPermission();

    if (store) {
        clearInterval(intervalId);
        intervalId = null;
        cancelServerPush(serverTimerId);
        serverTimerId = null;
        store = null;
    }

    const endTime = Date.now() + seconds * 1000;
    store = { total: seconds, running: true, endTime, pausedRemaining: seconds };
    intervalId = setInterval(tick, 1000);

    scheduleServerPush(endTime).then(id => { serverTimerId = id; });

    requestWakeLock();
    notify();
}

export function resetDescansoState() {
    dismiss();
}