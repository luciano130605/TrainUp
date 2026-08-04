import React, { useState, useEffect } from 'react';
import {
    Lock, UserPlus, Check, X, Send, Dumbbell, Loader2, Copy,
    ChevronLeft, MoreVertical, Share2, UserX
} from 'lucide-react';
import { sileo } from 'sileo';
import {
    getProfileView, sendFriendRequest, respondFriendRequest,
    removeFriendship, sendRoutineShare, fetchFriendships,
} from '../lib/social';
import PerfilStats from './PerfilStats';
import './perfil.css';
import './mensajes.css';
import { SendIcon, CopyIcon, Lockicon } from '../icons/icons';

export default function PerfilPublico({ userId, targetId, myRoutines, onBack, onImportRoutine }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [selectedRoutineId, setSelectedRoutineId] = useState(null);
    const [sending, setSending] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('stats');

    async function load() {
        setLoading(true);
        const { data: d, error } = await getProfileView(targetId);
        if (error || !d) {
            sileo.error({ title: 'No se pudo cargar el perfil' });
            onBack();
            return;
        }

        const { data: friendships } = await fetchFriendships(userId);
        const row = (friendships || []).find(f =>
            (f.requester_id === userId && f.addressee_id === targetId) ||
            (f.requester_id === targetId && f.addressee_id === userId)
        );

        let friendship_status = null;
        if (row) {
            if (row.status === 'accepted') friendship_status = 'accepted';
            else if (row.status === 'pending') {
                friendship_status = row.requester_id === userId ? 'sent' : 'received';
            }
        }

        setData({
            ...d,
            friendship_id: row?.id ?? null,
            friendship_status,
        });
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
        sileo.success({ title: 'Dejar de ser amigos' });
        setConfirmRemoveOpen(false);
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



    async function handleShareProfile() {
        setMenuOpen(false);

        const profileUrl = `${window.location.origin}/perfil/${targetId}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Perfil de ${nombreVisible}`,
                    text: `Mirá el perfil de ${nombreVisible}`,
                    url: profileUrl,
                });
            } else {
                await navigator.clipboard.writeText(profileUrl);
                sileo.success({ title: 'Link copiado' });
            }
        } catch (error) {
            if (error?.name !== 'AbortError') {
                console.error('Error al compartir:', error);
                sileo.error({ title: 'No se pudo compartir el perfil' });
            }
        }
    }



    if (loading) {
        return (
            <div className="page-cont top">
                <div className="perfil-topbar">
                    <button className="mini-btn" onClick={onBack}><ChevronLeft size={16} /></button>
                    <div className="skeleton skeleton-chip" />
                </div>

                <div className="perfil-banner">
                    <div className="skeleton skeleton-avatar-lg" />
                </div>

                <div className="perfil-info">
                    <div className="perfil-nombre-row">
                        <div className="skeleton skeleton-line" style={{ width: 140, height: 22 }} />
                    </div>
                    <div className="skeleton skeleton-line" style={{ width: 90, height: 12, marginTop: 6 }} />
                </div>



                <div className="perfil-cta-row">
                    <div className="skeleton skeleton-pill" style={{ flex: 1 }} />
                </div>

                <div className="perfil-tabbar">
                    <div className="skeleton skeleton-tab" />
                    <div className="skeleton skeleton-tab" />
                </div>

                <div className="skeleton skeleton-row" style={{ marginBottom: 8 }} />
                <div className="skeleton skeleton-row" style={{ marginBottom: 8 }} />
                <div className="skeleton skeleton-row" />
            </div>
        );
    }

    const iniciales = (data.mostrar_nombre && data.nombre?.[0]) || data.username?.[0] || '?';
    const nombreVisible = data.mostrar_nombre
        ? (data.nombre || data.username)
        : data.username;



    return (
        <div className="page-cont top">
            <div className="perfil-topbar">
                <button className="btn" onClick={onBack}>
                    <ChevronLeft size={16} />
                </button>
                <div className="perfil-menu-wrap">
                    <button className="btn" onClick={() => setMenuOpen(o => !o)} aria-label="Más opciones">
                        <MoreVertical size={16} />
                    </button>
                    {menuOpen && (
                        <>
                            <div className="perfil-menu-backdrop" onClick={() => setMenuOpen(false)} />
                            <div className="perfil-menu">
                                <button className="perfil-menu-item" onClick={handleShareProfile}>
                                    Compartir perfil
                                </button>
                                {data.friendship_status === 'accepted' && (
                                    <button
                                        className="perfil-menu-item perfil-menu-item--danger"
                                        onClick={() => { setMenuOpen(false); setConfirmRemoveOpen(true); }}
                                    >
                                        Dejar de ser amigos
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="perfil-banner">
                <div className="perfil-avatar-lg">{iniciales.toUpperCase()}</div>
            </div>

            <div className="perfil-info">
                <div className="perfil-nombre-row">
                    <h2 className="perfil-nombre">{nombreVisible}</h2>
                    {data.friendship_status === 'accepted' && (
                        <span className="perfil-chip perfil-chip--amigos">Amigos</span>
                    )}
                </div>
                <span className="perfil-email">@{data.username}</span>
            </div>


            {data.friendship_status === 'accepted' && (
                <>

                    <div className="perfil-cta-row">
                        <button className="btns primario" onClick={() => setShareOpen(true)}>
                            Enviar rutina
                        </button>
                    </div>
                    <div className="perfil-cta-row">
                        <button className="btns eliminar" onClick={() => { setMenuOpen(false); setConfirmRemoveOpen(true); }}>
                            Dejar de ser amigos
                        </button>
                    </div>
                </>
            )}
            {data.friendship_status === 'sent' && (<div className="perfil-cta-row"> <button className="perfil-cta perfil-cta--fantasma solicitud-pendiente" disabled style={{ flex: 1 }} > <span>Solicitud pendiente</span> </button> </div>)}
            {data.friendship_status === 'received' && (
                <div className="perfil-cta-row">
                    <button className="perfil-cta perfil-cta--primario" onClick={() => handleRespond(true)} disabled={busy}>
                        <Check size={15} /> Aceptar
                    </button>
                    <button
                        className="perfil-cta perfil-cta--fantasma perfil-cta--icono"
                        onClick={() => handleRespond(false)}
                        disabled={busy}
                        aria-label="Rechazar solicitud"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}
            {!data.friendship_status && (
                <div className="perfil-cta-row">
                    <button className="perfil-cta perfil-cta--primario" onClick={handleAddFriend} disabled={busy}>
                        Agregar amigo
                    </button>
                </div>
            )}

            <div className="perfil-tabbar">
                <button
                    className={`perfil-tab${activeTab === 'stats' ? ' activo' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    Stats
                </button>
                <button
                    className={`perfil-tab${activeTab === 'rutinas' ? ' activo' : ''}`}
                    onClick={() => setActiveTab('rutinas')}
                >
                    Rutinas
                </button>
            </div>

            {activeTab === 'stats' && (
                data.mostrar_stats ? (
                    <PerfilStats data={data} />
                ) : (
                    <div className="mensajes-empty">
                        <Lockicon size={18} style={{ marginBottom: 6 }} />
                        <div>Stats privadas.</div>
                    </div>
                )
            )}

            {activeTab === 'rutinas' && (
                data.mostrar_rutinas ? (
                    (data.routines || []).length === 0 ? (
                        <div className="mensajes-empty">No tiene rutinas cargadas.</div>
                    ) : data.routines.map(r => (
                        <div className="mensajes-row" key={r.id} style={{ marginTop: 10 }}>
                            <div className="mensajes-avatar"><Dumbbell size={18} /></div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{r.name}</div>
                                <div className="mensajes-row-username">{r.exerciseCount} ejercicios</div>
                            </div>
                            <button
                                className="mini-btn"
                                type="button"
                                onClick={() => onImportRoutine({ name: r.name, exercises: r.exercises })}
                                aria-label={`Copiar rutina ${r.name}`}
                            >
                                <CopyIcon size={16} />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="mensajes-empty">
                        <Lockicon size={18} style={{ marginBottom: 6 }} />
                        <div>Rutinas privadas.</div>
                    </div>
                )
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
                                {sending ? <Loader2 size={16} className="login-spin" /> : ""}
                                {sending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmRemoveOpen && (
                <div className="modal-overlay" onClick={() => !busy && setConfirmRemoveOpen(false)}>
                    <div className="modal-cont modal-cont--danger" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-icons-cont" >
                        </div>
                        <h3>¿Dejar de ser amigos?</h3>
                        <p className="header-sub" style={{ marginBottom: 16 }}>
                            Vas a dejar de ser amigo de {nombreVisible}. Vas a poder volver a enviarle una solicitud más adelante.
                        </p>
                        <div className="login-step-actions" style={{ justifyContent: 'center' }}>
                            <button className="btns agregar login-btn" onClick={() => setConfirmRemoveOpen(false)} disabled={busy}>
                                Cancelar
                            </button>
                            <button className="btns eliminar login-btn" onClick={handleRemove} disabled={busy}>
                                {busy ? <Loader2 size={16} className="login-spin" /> : ""}
                                {busy ? 'Procesando...' : 'Dejar de ser amigos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}