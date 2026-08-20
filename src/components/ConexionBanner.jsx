import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, Check } from 'lucide-react';
import "./conexion.css"

export default function ConexionBanner({ isOnline, syncStatus }) {
    const [showOk, setShowOk] = useState(false);
    const wasOffline = useRef(false);

    useEffect(() => {
        if (!isOnline) { wasOffline.current = true; return; }
        if (wasOffline.current && syncStatus === 'synced') {
            wasOffline.current = false;
            setShowOk(true);
            const t = setTimeout(() => setShowOk(false), 2200);
            return () => clearTimeout(t);
        }
    }, [isOnline, syncStatus]);

    if (!isOnline) {
        return (
            <div className="conexion-banner offline">
                <WifiOff size={14} />
                <span>Sin conexión — guardando los cambios localmente</span>
            </div>
        );
    }
    if (syncStatus === 'error') {
        return (
            <div className="conexion-banner error">
                <RefreshCw size={14} className="spin" />
                <span>No se pudo sincronizar, reintentando…</span>
            </div>
        );
    }
    if (showOk) {
        return (
            <div className="conexion-banner ok">
                <Check size={14} />
                <span>Sincronizado</span>
            </div>
        );
    }
    return null;
}