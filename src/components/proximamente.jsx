import React, { useState } from 'react';
import { Wrench, BarChart3, Users, Watch, Bell, Check, User } from 'lucide-react';
import './proximamente.css';

const FEATURES = [

];

export default function ProximamentePage() {
    const [notified, setNotified] = useState(false);

    return (
        <>
            <div className="header-cont">
                <div>
                    <h1 className="header-titulo">Próximamente</h1>
                    <div className="header-sub">En desarrollo</div>
                </div>
            </div>

            <div className="page-cont top">
                <div className="page-sin" style={{ paddingTop: 30, paddingBottom: 10 }}>
                    <Wrench size={60} strokeWidth={2} />
                    <h3>Estamos construyendo esto</h3>
                    <p>Estas funciones están en camino. Mientras tanto, seguí entrenando — te avisamos apenas estén listas.</p>
                </div>

                {FEATURES.map((f, i) => (
                    <div className="proximamente-feature" key={i}>
                        <div className="proximamente-feature-icon">
                            <f.icon size={20} />
                        </div>
                        <div>
                            <h4>{f.title}</h4>
                            <p>{f.desc}</p>
                        </div>
                    </div>
                ))}

                <button
                    className={`btns ${notified ? 'agregar' : 'primario'}`}
                    style={{ marginTop: 10 }}
                    onClick={() => setNotified(true)}
                    disabled={notified}
                >
                    {notified ? <Check size={16} /> : <Bell size={16} />}
                    {notified ? 'Te vamos a avisar' : 'Avisame cuando esté'}
                </button>
            </div>
        </>
    );
}