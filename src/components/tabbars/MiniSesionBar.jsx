import React, { useEffect, useState } from 'react';
import { Check, Dumbbell } from 'lucide-react';
import '../rutinas/rutina.css';
import './miniSesion.css';
import { PauseIcon, PlayIcon } from '../../icons/icons';

function formatElapsedFull(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// raised: pasar true cuando en esta pantalla también se muestra <TabBar />,
// para que la mini-sesión flote arriba de los tabs y no se pisen.
// Pasar false (o no pasar nada) en pantallas sin TabBar, para que baje
// hasta el borde inferior.
export default function MiniSesionBar({ session, raised, onExpand, onTogglePause, onFinish }) {
    const [, forceTick] = useState(0);

    useEffect(() => {
        if (!session || session.paused) return;
        const id = setInterval(() => forceTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [session, session?.paused]);

    if (!session) return null;

    const elapsedMs = (session.paused ? session.pausedAt : Date.now()) - session.startedAt - (session.pausedMs || 0);

    let totalSets = 0, doneSets = 0;
    session.exercises.forEach(ex => {
        totalSets += ex.sets.length;
        doneSets += ex.sets.filter(s => s.done).length;
    });
    const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

    return (
        <div className={`mini-sesion-bar ${raised ? 'raised' : ''}`} onClick={onExpand}>
            <div className="mini-sesion-progress" style={{ width: `${pct}%` }} />
            <div className="mini-sesion-content">
                <div className="mini-sesion-icon"><Dumbbell size={18} /></div>
                <div className="mini-sesion-info">
                    <span className="mini-sesion-nombre">{session.routineName}</span>
                    <span className="mini-sesion-sub">
                        {session.paused ? 'Pausado' : formatElapsedFull(elapsedMs)} · {doneSets}/{totalSets} series
                    </span>
                </div>
                <div className="mini-sesion-acciones" onClick={e => e.stopPropagation()}>
                    <button className="btn-circle" title={session.paused ? 'Reanudar' : 'Pausar'} onClick={onTogglePause}>
                        {session.paused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
                    </button>
                    <button className="btn-circle acento" title="Finalizar rutina" onClick={onFinish}>
                        <Check size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}