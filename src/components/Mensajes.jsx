import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { sileo } from 'sileo';
import { supabase } from '../lib/supabaseClient';
import {
    Check, X, Loader2, Dumbbell,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    searchUsers, getPublicProfiles, fetchFriendships, sendFriendRequest,
    respondFriendRequest, removeFriendship, fetchSharedRoutines, sendRoutineShare,
    respondRoutineShare, subscribeSocial, getProfileView,
} from '../lib/social';
import './mensajes.css';
import "./login.css"
import RutinasIconFill from "../icons/rutinasFIll"
import MensajesIconFill from "../icons/msjFill"
import PerfilStats from './PerfilStats';
import PerfilPublico from './perfilPublico';
import { SearchIcon, SendIcon, TrashIcon } from '../icons/icons';

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export default function Mensajes({ authSession, routines, onImportRoutine, onOpenProfile }) {
    const userId = authSession?.user?.id;

    const [tab, setTab] = useState('amigos');
    const [loading, setLoading] = useState(true);

    const [friendships, setFriendships] = useState([]);
    const [shares, setShares] = useState([]);
    const [profiles, setProfiles] = useState({});

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [viewingProfile, setViewingProfile] = useState(null);

    const [shareModalFor, setShareModalFor] = useState(null);
    const [selectedRoutineId, setSelectedRoutineId] = useState(null);
    const [sendingShare, setSendingShare] = useState(false);

    const [activeThreadId, setActiveThreadId] = useState(null);

    const seenPendingRef = useRef(null);

    const loadAll = useCallback(async () => {
        if (!supabase || !userId) return;
        const [{ data: fData }, { data: sData }] = await Promise.all([
            fetchFriendships(userId),
            fetchSharedRoutines(userId),
        ]);
        const friendshipsList = fData || [];
        const sharesList = sData || [];
        setFriendships(friendshipsList);
        setShares(sharesList);

        const idsNeeded = new Set();
        friendshipsList.forEach(f => {
            idsNeeded.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
        });
        sharesList.forEach(s => {
            idsNeeded.add(s.sender_id === userId ? s.receiver_id : s.sender_id);
        });
        if (idsNeeded.size > 0) {
            const { data: profData } = await getPublicProfiles([...idsNeeded]);
            if (profData) {
                setProfiles(prev => {
                    const next = { ...prev };
                    profData.forEach(p => { next[p.id] = p; });
                    return next;
                });
            }
        }

        const pendingIncomingCount =
            friendshipsList.filter(f => f.status === 'pending' && f.addressee_id === userId).length +
            sharesList.filter(s => s.status === 'pending' && s.receiver_id === userId).length;

        if (seenPendingRef.current !== null && pendingIncomingCount > seenPendingRef.current) {
            sileo.success({ title: 'Tenés novedades en Mensajes', duration: 3000 });
        }
        seenPendingRef.current = pendingIncomingCount;

        setLoading(false);
    }, [userId]);

    useEffect(() => { loadAll(); }, [loadAll]);

    useEffect(() => {
        const unsubscribe = subscribeSocial(userId, () => loadAll());
        return unsubscribe;
    }, [userId, loadAll]);

    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        const t = setTimeout(async () => {
            const { data } = await searchUsers(searchQuery);
            setSearchResults(data || []);
            setSearching(false);
        }, 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const friends = useMemo(() => friendships
        .filter(f => f.status === 'accepted')
        .map(f => {
            const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
            return { friendshipId: f.id, ...profiles[otherId], id: otherId };
        }), [friendships, profiles, userId]);

    const incomingRequests = useMemo(() => friendships
        .filter(f => f.status === 'pending' && f.addressee_id === userId)
        .map(f => ({ friendshipId: f.id, ...profiles[f.requester_id], id: f.requester_id })),
        [friendships, profiles, userId]);

    const outgoingRequests = useMemo(() => friendships
        .filter(f => f.status === 'pending' && f.requester_id === userId)
        .map(f => ({ friendshipId: f.id, ...profiles[f.addressee_id], id: f.addressee_id })),
        [friendships, profiles, userId]);

    const incomingShares = useMemo(() => shares
        .filter(s => s.status === 'pending' && s.receiver_id === userId)
        .map(s => ({ ...s, from: profiles[s.sender_id] })),
        [shares, profiles, userId]);

    const sentShares = useMemo(() => shares
        .filter(s => s.sender_id === userId)
        .map(s => ({ ...s, to: profiles[s.receiver_id] })),
        [shares, profiles, userId]);

    const conversations = useMemo(() => {
        return friends
            .map(f => {
                const msgs = shares
                    .filter(s =>
                        (s.sender_id === f.id && s.receiver_id === userId) ||
                        (s.sender_id === userId && s.receiver_id === f.id)
                    )
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                const last = msgs[msgs.length - 1] || null;
                const unread = msgs.filter(s => s.status === 'pending' && s.receiver_id === userId).length;
                return { ...f, msgs, last, unread };
            })
            .sort((a, b) => {
                if (a.last && b.last) return new Date(b.last.created_at) - new Date(a.last.created_at);
                if (a.last) return -1;
                if (b.last) return 1;
                return (a.nombre || a.username || '').localeCompare(b.nombre || b.username || '');
            });
    }, [friends, shares, userId]);

    const activeConversation = conversations.find(c => c.id === activeThreadId) || null;

    const friendshipStatusWith = useCallback((otherId) => {
        const f = friendships.find(fr => fr.requester_id === otherId || fr.addressee_id === otherId);
        if (!f) return null;
        if (f.status === 'accepted') return 'accepted';
        if (f.status === 'pending') return f.requester_id === userId ? 'sent' : 'received';
        return null;
    }, [friendships, userId]);

    const badgeCount = incomingRequests.length + incomingShares.length;

    async function handleSendRequest(target) {
        const { error } = await sendFriendRequest(userId, target.id);
        if (error) {
            sileo.error({ title: 'No se pudo enviar la solicitud', description: error.message });
            return;
        }
        sileo.success({ title: `Solicitud enviada a ${target.username}` });
        setSearchQuery('');
        setSearchResults([]);
        loadAll();
    }

    async function handleRespondRequest(friendshipId, accept) {
        const { error } = await respondFriendRequest(friendshipId, accept);
        if (error) {
            sileo.error({ title: 'No se pudo procesar la solicitud', description: error.message });
            return;
        }
        sileo.success({ title: accept ? 'Ahora son amigos' : 'Solicitud rechazada' });
        loadAll();
    }

    async function handleRemoveFriendship(friendshipId) {
        const { error } = await removeFriendship(friendshipId);
        if (error) {
            sileo.error({ title: 'No se pudo eliminar', description: error.message });
            return;
        }
        loadAll();
    }

    function openShareModal(friend) {
        setSelectedRoutineId(null);
        setShareModalFor(friend);
    }

    async function openProfileView(targetId) {
        setViewingProfile({ loading: true, data: null });
        const { data, error } = await getProfileView(targetId);
        if (error || !data) {
            sileo.error({ title: 'No se pudo cargar el perfil' });
            setViewingProfile(null);
            return;
        }
        setViewingProfile({ loading: false, data });
    }
    function closeProfileView() {
        setViewingProfile(null);
    }

    async function confirmSendRoutine() {
        const routine = routines.find(r => r.id === selectedRoutineId);
        if (!routine || !shareModalFor) return;
        setSendingShare(true);
        const { error } = await sendRoutineShare(userId, shareModalFor.id, routine);
        setSendingShare(false);
        if (error) {
            sileo.error({ title: 'No se pudo enviar la rutina', description: error.message });
            return;
        }
        sileo.success({ title: `Rutina enviada a ${shareModalFor.username}` });
        setShareModalFor(null);
        loadAll();
    }

    async function handleRespondShare(share, accept) {
        const { error } = await respondRoutineShare(share.id, accept);
        if (error) {
            sileo.error({ title: 'No se pudo procesar', description: error.message });
            return;
        }
        if (accept) {
            onImportRoutine(share.routine_data);
        }
        loadAll();
    }

    const iniciales = (p) => (p?.nombre?.[0] || p?.username?.[0] || '?').toUpperCase();

    if (loading) {
        return (
            <div className="page-cont top">
                <h1>Mensajes</h1>
                <div className="mensajes-tabs" style={{ marginTop: 16, gap: 8 }}>
                    <div className="skeleton skeleton-tab-full" />
                    <div className="skeleton skeleton-tab-full" />
                    <div className="skeleton skeleton-tab-full" />
                </div>
                <div className="skeleton skeleton-line" style={{ width: "100%", height: 30, margin: '18px 0 10px' }} />
                {Array.from({ length: 4 }).map((_, i) => (
                    <div className="chat-row" key={i} style={{ cursor: 'default' }}>
                        <div className="skeleton skeleton-avatar-chat" />
                        <div style={{ flex: 1 }}>
                            <div className="skeleton skeleton-line" style={{ width: '30%', height: 13, marginBottom: 7 }} />
                            <div className="skeleton skeleton-line" style={{ width: '35%', height: 11 }} />
                        </div>

                        <div className="skeleton skeleton-line" style={{ width: 30, height: 30, marginBottom: 7, borderRadius: 8 }} />
                        <div className="skeleton skeleton-line" style={{ width: 30, height: 30, marginBottom: 7, borderRadius: 8 }} />

                    </div>
                ))
                }
            </div >
        );
    }

    return (
        <div className="page-cont top">
            <h1>Mensajes</h1>

            <div className="mensajes-tabs" style={{ marginTop: 16 }}>
                <button className={`mensajes-tab${tab === 'amigos' ? ' activo' : ''}`} onClick={() => setTab('amigos')}>
                    Amigos
                </button>
                <button className={`mensajes-tab${tab === 'solicitudes' ? ' activo' : ''}`} onClick={() => setTab('solicitudes')}>
                    Solicitudes
                    {incomingRequests.length > 0 && <span className="mensajes-badge">{incomingRequests.length}</span>}
                </button>
                <button
                    className={`mensajes-tab${tab === 'compartidas' ? ' activo' : ''}`}
                    onClick={() => { setTab('compartidas'); setActiveThreadId(null); }}
                >
                    Rutinas
                    {incomingShares.length > 0 && <span className="mensajes-badge">{incomingShares.length}</span>}
                </button>
            </div>

            {tab === 'amigos' && (
                <>
                    <div className="hist-search-row">
                        <div className="hist-search-input">
                            <input
                                type="text"
                                placeholder="Buscar por usuario..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {searchQuery.trim().length >= 2 && (
                        <>
                            <h3 className="mensajes-seccion-titulo">Resultados</h3>
                            {searching && <div className="header-sub">Buscando...</div>}
                            {!searching && searchResults.length === 0 && (
                                <div className="mensajes-empty">
                                    <SearchIcon size={20} style={{ marginBottom: 6 }} />
                                    <div>No encontramos ese usuario.</div>
                                </div>
                            )}
                            {searchResults.map(u => {
                                const status = friendshipStatusWith(u.id);
                                return (
                                    <div className="mensajes-row" key={u.id}>
                                        <div
                                            className="mensajes-row-clickable"
                                            onClick={() => onOpenProfile(u.id)}
                                        >
                                            <div className="mensajes-avatar">{iniciales(u)}</div>
                                            <div className="mensajes-row-info">
                                                <div className="mensajes-row-nombre">{u.nombre || u.username}</div>
                                                <div className="mensajes-row-username">@{u.username}</div>
                                            </div>
                                        </div>
                                        <div className="mensajes-row-actions">
                                            {status === 'accepted' && <span className="header-sub">Ya son amigos</span>}
                                            {status === 'sent' && <span className="header-sub">Pendiente</span>}
                                            {status === 'received' && <span className="header-sub">Te escribió a vos</span>}
                                            {!status && (
                                                <button className="btn" onClick={() => onOpenProfile(u.id)}>
                                                    <ChevronRight size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    <h3 className="mensajes-seccion-titulo">Tus amigos</h3>
                    {friends.length === 0 && (
                        <div className="mensajes-empty">
                            <div>Todavía no tenés amigos agregados. Buscalos arriba.</div>
                        </div>
                    )}
                    {friends.map(f => (
                        <div className="mensajes-row" key={f.friendshipId}>
                            <div
                                className="mensajes-row-clickable"
                                onClick={() => onOpenProfile(f.id)}
                            >
                                <div className="mensajes-avatar">{iniciales(f)}</div>
                                <div className="mensajes-row-info">
                                    <div className="mensajes-row-nombre">{f.nombre || f.username}</div>
                                    <div className="mensajes-row-username">@{f.username}</div>
                                </div>
                            </div>
                            <div className="mensajes-row-actions">
                                <button
                                    className="btn primario"
                                    onClick={() => { setTab('compartidas'); setActiveThreadId(f.id); }}
                                    title="Enviar rutina"
                                >
                                    <MensajesIconFill size={16} />
                                </button>
                                <button className="btn eliminar msj" onClick={() => handleRemoveFriendship(f.friendshipId)} title="Eliminar amigo">
                                    <TrashIcon size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {tab === 'solicitudes' && (
                <>
                    <h3 className="mensajes-seccion-titulo">Recibidas</h3>
                    {incomingRequests.length === 0 && (
                        <div className="mensajes-empty">
                            <div>No tenés solicitudes pendientes.</div>
                        </div>
                    )}
                    {incomingRequests.map(r => (
                        <div className="mensajes-row" key={r.friendshipId}>
                            <div className="mensajes-avatar">{iniciales(r)}</div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{r.nombre || r.username}</div>
                                <div className="mensajes-row-username">@{r.username}</div>
                            </div>
                            <div className="mensajes-row-actions">
                                <button className="btn primario" onClick={() => handleRespondRequest(r.friendshipId, true)}>
                                    <Check size={16} />
                                </button>
                                <button className="btn eliminar msj" onClick={() => handleRespondRequest(r.friendshipId, false)}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <h3 className="mensajes-seccion-titulo">Enviadas</h3>
                    {outgoingRequests.length === 0 && (
                        <div className="mensajes-empty">
                            <div>No enviaste solicitudes pendientes.</div>
                        </div>
                    )}
                    {outgoingRequests.map(r => (
                        <div className="mensajes-row" key={r.friendshipId}>
                            <div className="mensajes-avatar">{iniciales(r)}</div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{r.nombre || r.username}</div>
                                <div className="mensajes-row-username">@{r.username}</div>
                            </div>
                            <div className="mensajes-row-actions">
                                <span className="header-sub" style={{ marginRight: 2 }}>Pendiente</span>
                                <button className="btn eliminar msj" onClick={() => handleRemoveFriendship(r.friendshipId)} title="Cancelar">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ---------- RUTINAS: bandeja de chats ---------- */}
            <div className='chat-cont'>
                {tab === 'compartidas' && (
                    activeConversation ? (
                        <div className="rutina-chat">
                            <div className="rutina-chat-header">
                                <button className="mini-btn" onClick={() => setActiveThreadId(null)} aria-label="Volver">
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="mensajes-avatar">{iniciales(activeConversation)}</div>
                                <div className="mensajes-row-info">
                                    <div className="mensajes-row-nombre">{activeConversation.nombre || activeConversation.username}</div>
                                    <div className="mensajes-row-username">@{activeConversation.username}</div>
                                </div>
                            </div>

                            <div className="rutina-chat-messages">
                                {activeConversation.msgs.length === 0 ? (
                                    <div className="mensajes-empty">
                                        <Dumbbell size={20} style={{ marginBottom: 6 }} />
                                        <div>Todavía no compartieron rutinas. Mandale la primera.</div>
                                    </div>
                                ) : activeConversation.msgs.map(s => {
                                    const isMine = s.sender_id === userId;
                                    const exCount = s.routine_data?.exercises?.length ?? 0;
                                    return (
                                        <div className={`rutina-bubble-row ${isMine ? 'out' : 'in'}`} key={s.id}>
                                            <div className="rutina-bubble-col">
                                                <div className="rutina-bubble">
                                                    <div className="rutina-bubble-top">
                                                        <Dumbbell size={14} /> {s.routine_name}
                                                    </div>
                                                    <div className="rutina-bubble-sub">{exCount} ejercicios</div>

                                                    {isMine && (
                                                        <div className="rutina-bubble-sub" style={{ marginTop: 6 }}>
                                                            {s.status === 'pending' && 'Pendiente'}
                                                            {s.status === 'accepted' && 'Aceptada ✓'}
                                                            {s.status === 'rejected' && 'Rechazada'}
                                                        </div>
                                                    )}

                                                    {!isMine && s.status === 'pending' && (
                                                        <div className="rutina-bubble-actions">
                                                            <button
                                                                className="btns primario"
                                                                style={{ width: 'auto', padding: '0 12px', borderRadius: 999, fontSize: '.75rem', fontWeight: 700, gap: 6 }}
                                                                onClick={() => handleRespondShare(s, true)}
                                                            >
                                                                <Check size={14} /> Agregar
                                                            </button>
                                                            <button
                                                                className="btn eliminar msj"
                                                                onClick={() => handleRespondShare(s, false)}
                                                                aria-label="Descartar"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {!isMine && s.status !== 'pending' && (
                                                        <div className="rutina-bubble-sub" style={{ marginTop: 6 }}>
                                                            {s.status === 'accepted' ? 'Agregada a tus rutinas ✓' : 'Descartada'}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="rutina-bubble-time">{formatTime(s.created_at)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="rutina-chat-composer" onClick={() => openShareModal(activeConversation)}>
                                <SendIcon size={15} />
                                <span>Compartir una rutina...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {conversations.length === 0 && (
                                <div className="mensajes-empty">
                                    <Dumbbell size={20} style={{ marginBottom: 6 }} />
                                    <div>Agregá amigos para poder compartirles rutinas.</div>
                                </div>
                            )}
                            {conversations.map(c => (
                                <div className="mensajes-row" key={c.id} >
                                    <div className="mensajes-avatar">{iniciales(c)}</div>
                                    <div className="mensajes-row-info">
                                        <div className="chat-row-top">
                                            <span className="mensajes-row-nombre">{c.nombre || c.username}</span>
                                            {c.last && <span className="chat-row-time">{formatTime(c.last.created_at)}</span>}
                                        </div>
                                        <div className="chat-row-preview">
                                            {c.last
                                                ? `${c.last.sender_id === userId ? 'Vos: ' : ''}${c.last.routine_name}`
                                                : 'Compartile tu primera rutina'}
                                        </div>
                                    </div>
                                    {c.unread > 0 && <span className="mensajes-badge">{c.unread}</span>}

                                    <button className='btn' onClick={() => setActiveThreadId(c.id)}><ChevronRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </>
                    )
                )}
            </div>

            {/* ---------- MODAL: elegir rutina para enviar ---------- */}
            {shareModalFor && (
                <div className="modal-overlay" onClick={() => setShareModalFor(null)}>
                    <div className="modal-cont" onClick={e => e.stopPropagation()}>
                        <h3>Enviar rutina a {shareModalFor.nombre || shareModalFor.username}</h3>
                        <p className="header-sub" style={{ marginBottom: 16 }}>Elegí qué rutina querés compartir.</p>

                        {routines.length === 0 && <div className="mensajes-empty">No tenés rutinas creadas todavía.</div>}
                        {routines.map(r => (
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
                            <button className="btns agregar login-btn" onClick={() => setShareModalFor(null)} disabled={sendingShare}>
                                Cancelar
                            </button>
                            <button
                                className="btns primario"
                                onClick={confirmSendRoutine}
                                disabled={!selectedRoutineId || sendingShare}
                            >
                                {sendingShare ? <Loader2 size={16} className="login-spin" /> : <SendIcon size={16} />}
                                {sendingShare ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingProfile && (
                <div className="modal-overlay" onClick={closeProfileView}>
                    <div className="modal-cont" onClick={e => e.stopPropagation()}>
                        {viewingProfile.loading && (
                            <div className="header-sub" style={{ padding: '20px 0', textAlign: 'center' }}>
                                <Loader2 size={18} className="login-spin" /> Cargando perfil...
                            </div>
                        )}

                        {!viewingProfile.loading && viewingProfile.data && (
                            <>
                                <div className="perfil-header" style={{ paddingBottom: 14 }}>


                                    <div className="perfil-avatar">
                                        {(viewingProfile.data.nombre?.[0] || viewingProfile.data.username?.[0] || '?').toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="perfil-nombre">{viewingProfile.data.nombre || viewingProfile.data.username}</h2>
                                        <span className="perfil-email">@{viewingProfile.data.username}</span>
                                    </div>

                                </div>

                                {viewingProfile.data.can_view_stats ? (
                                    <PerfilStats data={viewingProfile.data} />
                                ) : (
                                    <div className="mensajes-empty">
                                        <Lock size={18} style={{ marginBottom: 6 }} />
                                        <div>Este perfil es privado.</div>
                                        <div>Hazte amigo para ver sus stats.</div>
                                    </div>
                                )}


                                <button className="mini-btn" style={{ marginTop: 16, width: 'auto' }} onClick={closeProfileView}>
                                    Cerrar
                                </button>

                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}