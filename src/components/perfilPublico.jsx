import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, UserPlus, Check, X, Send, Dumbbell, Loader2, Copy } from 'lucide-react';
import { sileo } from 'sileo';
import {
    getProfileView, sendFriendRequest, respondFriendRequest,
    removeFriendship, sendRoutineShare,
} from '../lib/social';
import PerfilStats from './PerfilStats';
import './perfil.css';
import './mensajes.css';

export default function PerfilPublico({ userId, targetId, myRoutines, onBack, onImportRoutine }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [selectedRoutineId, setSelectedRoutineId] = useState(null);
    const [sending, setSending] = useState(false);

    async function load() {
        setLoading(true);
        const { data: d, error } = await getProfileView(targetId);
        if (error || !d) {
            sileo.error({ title: 'No se pudo cargar el perfil' });
            onBack();
            return;
        }
        setData(d);
        setLoading(false);
    }

    useEffect(() => { load(); }, [targetId]);

    async function handleAddFriend() {
        setBusy(true);
        const { error } = await sendFriendRequest(userId, targetId);
        setBusy(false);
        if (error) { sileo.error({ title: 'No se pudo enviar la solicitud' }); return; }
        sileo.success({ title: 'Solicitud enviada' });
        load();
    }

    async function handleRespond(accept) {
        setBusy(true);
        const { error } = await respondFriendRequest(data.friendship_id, accept);
        setBusy(false);
        if (error) { sileo.error({ title: 'No se pudo procesar' }); return; }
        load();
    }

    async function handleRemove() {
        setBusy(true);
        const { error } = await removeFriendship(data.friendship_id);
        setBusy(false);
        if (error) { sileo.error({ title: 'No se pudo eliminar' }); return; }
        load();
    }

    async function confirmShareRoutine() {
        const routine = myRoutines.find(r => r.id === selectedRoutineId);
        if (!routine) return;
        setSending(true);
        const { error } = await sendRoutineShare(userId, targetId, routine);
        setSending(false);
        if (error) { sileo.error({ title: 'No se pudo enviar la rutina' }); return; }
        sileo.success({ title: 'Rutina enviada' });
        setShareOpen(false);
    }

    if (loading) {
        return (
            <div className="page-cont top">
                <button className="mini-btn" onClick={onBack}><ArrowLeft size={16} /></button>
                <div className="header-sub" style={{ marginTop: 20 }}>
                    <Loader2 size={18} className="login-spin" /> Cargando perfil...
                </div>
            </div>
        );
    }

    const iniciales = (data.mostrar_nombre && data.nombre?.[0]) || data.username?.[0] || '?';
    const nombreVisible = data.mostrar_nombre ? (data.nombre || data.username) : data.username;

    return (
        <div className="page-cont top">
            <button className="mini-btn" onClick={onBack} style={{ marginBottom: 12 }}>
                <ArrowLeft size={16} />
            </button>

            <div className="perfil-header">
                <div className="perfil-avatar">{iniciales.toUpperCase()}</div>
                <div>
                    <h2 className="perfil-nombre">{nombreVisible}</h2>
                    <span className="perfil-email">@{data.username}</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 22 }}>
                {data.friendship_status === 'accepted' && (
                    <>
                        <button className="btns primario" style={{ flex: 1 }} onClick={() => setShareOpen(true)}>
                            <Send size={16} /> Enviar rutina
                        </button>
                        <button className="btns eliminar" onClick={handleRemove} disabled={busy}>
                            <X size={16} />
                        </button>
                    </>
                )}
                {data.friendship_status === 'sent' && (
                    <button className="btns agregar" style={{ flex: 1 }} disabled>Solicitud pendiente</button>
                )}
                {data.friendship_status === 'received' && (
                    <>
                        <button className="btns primario" style={{ flex: 1 }} onClick={() => handleRespond(true)} disabled={busy}>
                            <Check size={16} /> Aceptar
                        </button>
                        <button className="btns eliminar" onClick={() => handleRespond(false)} disabled={busy}>
                            <X size={16} />
                        </button>
                    </>
                )}
                {!data.friendship_status && (
                    <button className="btns primario" style={{ flex: 1 }} onClick={handleAddFriend} disabled={busy}>
                        <UserPlus size={16} /> Agregar amigo
                    </button>
                )}
            </div>

            <h3 className="perfil-seccion-titulo">Stats</h3>
            {data.mostrar_stats ? (
                <PerfilStats data={data} />
            ) : (
                <div className="mensajes-empty">
                    <Lock size={18} style={{ marginBottom: 6 }} />
                    <div>Stats privadas.</div>
                </div>
            )}

            <h3 className="perfil-seccion-titulo">Rutinas</h3>
            {data.mostrar_rutinas ? (
                (data.routines || []).length === 0 ? (
                    <div className="mensajes-empty">No tiene rutinas cargadas.</div>
                ) : data.routines.map(r => (
                    <div className="mensajes-row" key={r.id}>
                        <div className="mensajes-avatar"><Dumbbell size={18} /></div>
                        <div className="mensajes-row-info">
                            <div className="mensajes-row-nombre">{r.name}</div>
                            <div className="mensajes-row-username">{r.exerciseCount} ejercicios</div>
                        </div>
                        <button
                            className="mini-btn"
                            type="button"
                            onClick={() => {
                                onImportRoutine({ name: r.name, exercises: r.exercises });
                            }}
                            aria-label={`Copiar rutina ${r.name}`}
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                ))
            ) : (
                <div className="mensajes-empty">
                    <Lock size={18} style={{ marginBottom: 6 }} />
                    <div>Rutinas privadas.</div>
                </div>
            )}

            {shareOpen && (
                <div className="modal-overlay" onClick={() => setShareOpen(false)}>
                    <div className="modal-cont" onClick={e => e.stopPropagation()}>
                        <h3>Enviar rutina a {nombreVisible}</h3>
                        <p className="header-sub" style={{ marginBottom: 16 }}>Elegí qué rutina querés compartir.</p>
                        {myRoutines.length === 0 && <div className="mensajes-empty">No tenés rutinas creadas.</div>}
                        {myRoutines.map(r => (
                            <div
                                key={r.id}
                                className={`mensajes-routine-pick${selectedRoutineId === r.id ? ' selected' : ''}`}
                                onClick={() => setSelectedRoutineId(r.id)}
                            >
                                <span>{r.name}</span>
                                {selectedRoutineId === r.id && <Check size={16} />}
                            </div>
                        ))}
                        <div className="login-step-actions">
                            <button className="btns agregar login-btn" onClick={() => setShareOpen(false)} disabled={sending}>
                                Cancelar
                            </button>
                            <button className="btns primario" onClick={confirmShareRoutine} disabled={!selectedRoutineId || sending}>
                                {sending ? <Loader2 size={16} className="login-spin" /> : <Send size={16} />}
                                {sending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}