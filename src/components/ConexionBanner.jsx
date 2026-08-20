import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, Check, WifiSync } from 'lucide-react';
import "./conexion.css"


const WifiActivity = ({ size = 14 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="wifi-activity"
    >
        <path
            className="wifi-wave wifi-wave-1"
            d="M3 8.5C8.5 3.8 15.5 3.8 21 8.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />

        <path
            className="wifi-wave wifi-wave-2"
            d="M6.5 12C10.5 8.5 13.5 8.5 17.5 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />

        <path
            className="wifi-wave wifi-wave-3"
            d="M10 15.5C11.2 14.5 12.8 14.5 14 15.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />

        <circle
            cx="12"
            cy="19"
            r="1.5"
            fill="currentColor"
        />
    </svg>
);
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
                <WifiActivity size={14} />
                <span>Sin conexión — guardando los cambios localmente</span>
            </div>
        );
    }
    if (syncStatus === 'error') {
        return (
            <div className="conexion-banner error">
                <WifiSync size={14} className="spin" />
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