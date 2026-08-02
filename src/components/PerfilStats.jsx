import React from 'react';
import { Flame, Dumbbell, Repeat, TrendingUp } from 'lucide-react';
import './PerfilStats.css';

/**
 * Muestra las estadísticas de un perfil (racha, rutinas, sesiones, volumen)
 * con la racha como estadística "hero" y el resto como fila tipo ficha técnica.
 *
 * Uso:
 *   <PerfilStats data={viewingProfile.data} />
 */
export default function PerfilStats({ data }) {
    if (!data) return null;

    const { racha = 0, total_rutinas = 0, total_sesiones = 0, total_volume = 0 } = data;
    const volumenFmt = Math.round(total_volume || 0).toLocaleString('es-AR');

    return (
        <div className="perfil-stats">
            <div className={`perfil-stats-hero${racha > 0 ? ' activa' : ''}`}>
                <Flame size={26} className="perfil-stats-hero-icon" />
                <div className="perfil-stats-hero-texto">
                    <span className="perfil-stats-hero-valor">{racha}</span>
                    <span className="perfil-stats-hero-label">
                        {racha === 1 ? 'día de racha' : 'días de racha'}
                    </span>
                </div>
            </div>

            <div className="perfil-stats-fila">
                <div className="perfil-stats-item">
                    <Dumbbell size={15} className="perfil-stats-item-icon" />
                    <span className="perfil-stats-item-valor">{total_rutinas}</span>
                    <span className="perfil-stats-item-label">rutinas</span>
                </div>

                <span className="perfil-stats-sep" aria-hidden="true" />

                <div className="perfil-stats-item">
                    <Repeat size={15} className="perfil-stats-item-icon" />
                    <span className="perfil-stats-item-valor">{total_sesiones}</span>
                    <span className="perfil-stats-item-label">sesiones</span>
                </div>

                <span className="perfil-stats-sep" aria-hidden="true" />

                <div className="perfil-stats-item">
                    <TrendingUp size={15} className="perfil-stats-item-icon" />
                    <span className="perfil-stats-item-valor">{volumenFmt}</span>
                    <span className="perfil-stats-item-label">kg totales</span>
                </div>
            </div>
        </div>
    );
}