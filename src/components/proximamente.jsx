import React, { useState } from 'react';
import { Wrench, BarChart3, Users, Watch, Bell, Check } from 'lucide-react';
import './proximamente.css';
import { Chart, MagicPen, NotificationIcon, UsersIcon, WatchIcon } from '../icons/icons';

const FEATURES = [
    { icon: Chart, title: 'Estadísticas avanzadas', desc: 'Gráficos detallados de tu progreso a lo largo del tiempo.' },
    { icon: UsersIcon, title: 'Entrenamiento en grupo', desc: 'Sumate a rutinas compartidas con amigos.' },
    { icon: WatchIcon, title: 'Sincronización con reloj', desc: 'Conectá tu Apple Watch para seguir tus sesiones en vivo.' },
];

export default function ProximamentePage() {
    const [notified, setNotified] = useState(false);

    return (
        <>
            <div className="header">
                <div>
                    <h1 className="page-title">Próximamente</h1>
                    <div className="sub">En desarrollo</div>
                </div>
            </div>

            <div className="cont top">
                <div className="proximamente-hero">
                    <div className="proximamente-hero-icon">
                        <MagicPen size={32} strokeWidth={2} />
                    </div>
                    <h3>Estamos construyendo esto</h3>
                    <p className='sub'>Estas funciones están en camino. Mientras tanto, seguí entrenando — te avisamos apenas estén listas.</p>
                </div>

                {FEATURES.length > 0 && (
                    <div className="proximamente-eyebrow">PRÓXIMAS FUNCIONES</div>
                )}

                <div className="proximamente-lista">
                    {FEATURES.map((f, i) => (
                        <div className="proximamente-fila" key={i}>
                            <div className="proximamente-fila-icon">
                                <f.icon size={18} strokeWidth={2} />
                            </div>
                            <div className="proximamente-fila-texto">
                                <h4 className='hero-title'>{f.title}</h4>
                                <p className='hero-meta'>{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className={`btn-avisar ${notified ? 'agregar' : 'primario'}`}
                    onClick={() => setNotified(true)}
                    disabled={notified}
                >
                    {notified ? <Check size={17} strokeWidth={2.5} /> : <NotificationIcon size={17} strokeWidth={2.5} />}
                    {notified ? 'Te vamos a avisar' : 'Avisame cuando esté'}
                </button>
            </div>
        </>
    );
}