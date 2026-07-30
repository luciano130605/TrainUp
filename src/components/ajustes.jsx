import React, { useState } from 'react';
import "./ajustes.css";
import { Check, Moon, Sun, RotateCcw, ArrowUpToLine, ArrowDownToLine, Bell } from 'lucide-react';

const ACENTOS = [
    { id: 'acento-verde', nombre: 'Verde', color: '#c6ff34' },
    { id: 'acento-celeste', nombre: 'Celeste', color: '#b2d5e5' },
    { id: 'acento-naranja', nombre: 'Naranja', color: '#ff9a4a' },
    { id: 'acento-violeta', nombre: 'Violeta', color: '#b28aff' },
];

const MODO_DEFAULT = true;
const ACENTO_DEFAULT = 'acento-verde';
const POSICION_DEFAULT = 'bottom';
const REMINDER_TIME_DEFAULT = '10:00';
const SWIPE_LEFT_DEFAULT = 'delete';
const SWIPE_RIGHT_DEFAULT = 'edit';

export const SWIPE_ACTIONS = [
    { id: 'none', label: 'Ninguna' },
    { id: 'edit', label: 'Editar' },
    { id: 'delete', label: 'Eliminar' },
    { id: 'duplicate', label: 'Duplicar' },
    { id: 'share', label: 'Compartir' },
    { id: 'copyText', label: 'Copiar como texto' },
    { id: 'rename', label: 'Renombrar rápido' },
];

export default function Ajustes({
    open,
    modoOscuro,
    onToggleModo,
    acento,
    onChangeAcento,
    toasterPosition,
    onChangeToasterPosition,
    reminderTime,
    onChangeReminderTime,
    reminderEnabled,
    onToggleReminder,
    swipeGestures,
    onToggleSwipeGestures,
    swipeLeftAction,
    onChangeSwipeLeftAction,
    swipeRightAction,
    onChangeSwipeRightAction,
}) {
    const [resetFeedback, setResetFeedback] = useState(false);

    const resetearAjustes = () => {
        if (modoOscuro !== MODO_DEFAULT) onToggleModo();
        onChangeAcento(ACENTO_DEFAULT);
        onChangeToasterPosition(POSICION_DEFAULT);
        onChangeReminderTime(REMINDER_TIME_DEFAULT);
        if (!reminderEnabled) onToggleReminder();
        if (!swipeGestures) onToggleSwipeGestures();
        onChangeSwipeLeftAction(SWIPE_LEFT_DEFAULT);
        onChangeSwipeRightAction(SWIPE_RIGHT_DEFAULT);
        setResetFeedback(true);
        setTimeout(() => setResetFeedback(false), 1500);
    };

    return (
        <div className={`ajustes-dropdown ${open ? 'abierto' : ''}`}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="ajustes-dropdown-seccion-titulo">Color de acento</div>
                <button className='mini-btn a' role="switch" aria-checked={modoOscuro} onClick={onToggleModo}>
                    {modoOscuro ? <Moon size={16} /> : <Sun size={16} />}
                </button>
            </div>

            {ACENTOS.map((a) => (
                <div key={a.id} className={`ajustes-dropdown-acento-fila ${acento === a.id ? 'select' : ''}`} onClick={() => onChangeAcento(a.id)}>
                    <span className="acento-dot" style={{ background: a.color }} />
                    <span className="ajustes-dropdown-label">{a.nombre}</span>
                    {acento === a.id && <Check size={14} className='acento-check' />}
                </div>
            ))}

            <div className="ajustes-dropdown-separador" />

            <div className="ajustes-dropdown-seccion-titulo">Posición de las notificaciones</div>
            <div className="ajustes-dropdown-toggle-fila">
                <button className={`btns agregar ajustes ${toasterPosition === 'top' ? 'select' : ''}`} onClick={() => onChangeToasterPosition('top')}>Arriba</button>
                <button className={`btns agregar ajustes ${toasterPosition === 'bottom' ? 'select' : ''}`} onClick={() => onChangeToasterPosition('bottom')}>Abajo</button>
            </div>

            <div className="ajustes-dropdown-separador" />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="ajustes-dropdown-seccion-titulo">Recordatorio diario</div>
                <button className={`mini-btn noti ${reminderEnabled ? "activa" : ""}`} role="switch" aria-checked={reminderEnabled} onClick={onToggleReminder}>
                    {reminderEnabled ? "activado" : "Desactivado"}
                </button>
            </div>
            <input
                type="time"
                className={`input-time-ajustes ${!reminderEnabled ? "disabled" : ""}`}
                value={reminderTime}
                onChange={(e) => onChangeReminderTime(e.target.value)}
                disabled={!reminderEnabled}
            />

            {/* <div className="ajustes-dropdown-separador" />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="ajustes-dropdown-seccion-titulo">Deslizar tarjetas</div>
                <button className={`mini-btn noti ${swipeGestures ? "activa" : ""}`} role="switch" aria-checked={swipeGestures} onClick={onToggleSwipeGestures}>
                    {swipeGestures ? "activado" : "Desactivado"}
                </button>
            </div>

            {swipeGestures && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                    <div>
                        <label style={{ fontSize: '.65rem', color: 'var(--texto-gris)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>
                            Deslizar a la izquierda
                        </label>
                        <select
                            className="select-trigger"
                            value={swipeLeftAction}
                            onChange={(e) => onChangeSwipeLeftAction(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            {SWIPE_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '.65rem', color: 'var(--texto-gris)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>
                            Deslizar a la derecha
                        </label>
                        <select
                            className="select-trigger"
                            value={swipeRightAction}
                            onChange={(e) => onChangeSwipeRightAction(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            {SWIPE_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                    </div>
                </div>
            )} */}

            <div className="ajustes-dropdown-separador" />

            <button className="btns agregar ajustes" onClick={resetearAjustes}>
                {resetFeedback ? 'Valores restablecidos' : 'Restablecer valores por defecto'}
            </button>
        </div>
    );
}