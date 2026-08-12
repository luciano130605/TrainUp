import React from 'react';
import { Flame } from 'lucide-react';
import './PerfilStats.css';

export default function PerfilStats({ data }) {
    if (!data) return null;

    const { racha = 0, total_rutinas = 0, total_sesiones = 0, total_volume = 0 } = data;
    const volumenFmt = Math.round(total_volume || 0).toLocaleString('es-AR');

    const stats = [
        { valor: total_rutinas, label: total_rutinas === 1 ? 'rutina' : 'rutinas' },
        { valor: total_sesiones, label: total_sesiones === 1 ? 'sesión' : 'sesiones' },
        { valor: volumenFmt, label: 'kg' },
    ];

    return (
        <div className="perfil-stats-bar">
            <div className={`perfil-stats-racha${racha > 0 ? ' activa' : ''}`}>
                <Flame size={14} />
                <span>{racha}</span>
            </div>
            {stats.map((s, i) => (
                <React.Fragment key={i}>
                    <span className="perfil-stats-dot" aria-hidden="true" />
                    <div className="perfil-stats-num">
                        <span className="perfil-stats-num-valor">{s.valor}</span>
                        <span className="perfil-stats-num-label">{s.label}</span>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}