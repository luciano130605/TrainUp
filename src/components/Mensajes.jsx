import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    UserPlus, Search, Check, X, Send, Users, Inbox, Loader2, Trash2, Dumbbell,
} from 'lucide-react';
import { sileo } from 'sileo';
import { supabase } from '../lib/supabaseClient';
import {
    searchUsers, getPublicProfiles, fetchFriendships, sendFriendRequest,
    respondFriendRequest, removeFriendship, fetchSharedRoutines, sendRoutineShare,
    respondRoutineShare, subscribeSocial,
} from '../lib/social';
import './mensajes.css';
import "./login.css"
import RutinasIconFill from "../icons/rutinasFIll"
import MensajesIconFill from "../icons/msjFill"

export default function Mensajes({ authSession, routines, onImportRoutine }) {
    const userId = authSession?.user?.id;

    const [tab, setTab] = useState('amigos'); // amigos | solicitudes | compartidas
    const [loading, setLoading] = useState(true);

    const [friendships, setFriendships] = useState([]);
    const [shares, setShares] = useState([]);
    const [profiles, setProfiles] = useState({}); // id -> { username, nombre }

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const [shareModalFor, setShareModalFor] = useState(null); // { id, username, nombre } del amigo
    const [selectedRoutineId, setSelectedRoutineId] = useState(null);
    const [sendingShare, setSendingShare] = useState(false);

    const seenPendingRef = useRef(null); // para no togglear toasts en la primera carga

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

        // toast si aparecieron cosas nuevas para revisar
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

    // ---------- listas derivadas ----------
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

    const friendshipStatusWith = useCallback((otherId) => {
        const f = friendships.find(fr => fr.requester_id === otherId || fr.addressee_id === otherId);
        if (!f) return null;
        if (f.status === 'accepted') return 'accepted';
        if (f.status === 'pending') return f.requester_id === userId ? 'sent' : 'received';
        return null;
    }, [friendships, userId]);

    const badgeCount = incomingRequests.length + incomingShares.length;

    // ---------- acciones ----------
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
                <div className="header-sub" style={{ marginTop: 20 }}>
                    <Loader2 size={18} className="login-spin" /> Cargando...
                </div>
            </div>
        );
    }

    const UsuarioAdd = ({ size = 15, color = "currentColor" }) => {
        return (<svg width={size} height={size} viewBox={`0 0 24 24`} fill={color} xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_3111_32727)">
                <path d="M11.9999 15C6.98991 15 2.90991 18.36 2.90991 22.5C2.90991 22.78 3.12991 23 3.40991 23H20.5899C20.8699 23 21.0899 22.78 21.0899 22.5C21.0899 18.36 17.0099 15 11.9999 15Z" fill="currentColor" />
                <path d="M15.71 3.66C14.81 2.64 13.47 2 12 2C10.6 2 9.32 2.57 8.41 3.51C7.54 4.41 7 5.65 7 7C7 7.94 7.26 8.82 7.73 9.57C7.98 10 8.3 10.39 8.68 10.71C9.55 11.51 10.71 12 12 12C13.83 12 15.41 11.02 16.28 9.57C16.54 9.14 16.74 8.66 16.85 8.16C16.95 7.79 17 7.4 17 7C17 5.72 16.51 4.55 15.71 3.66ZM13.87 7.92H12.94V8.89C12.94 9.41 12.52 9.83 12 9.83C11.48 9.83 11.06 9.41 11.06 8.89V7.92H10.13C9.61 7.92 9.19 7.5 9.19 6.98C9.19 6.46 9.61 6.04 10.13 6.04H11.06V5.15C11.06 4.63 11.48 4.21 12 4.21C12.52 4.21 12.94 4.63 12.94 5.15V6.04H13.87C14.39 6.04 14.81 6.46 14.81 6.98C14.81 7.5 14.39 7.92 13.87 7.92Z" fill="currentColor" />
            </g>
            <defs>
                <clipPath id="clip0_3111_32727">
                    <rect width="24" height="24" fill="white" />
                </clipPath>
            </defs>
        </svg>);
    };

    const Amigos = ({ size = 15, color = "currentColor" }) => {
        return (<svg width={size} height={size} viewBox={`0 0 24 24`} fill={color} xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_3111_32731)">
                <path d="M12 2C9.38 2 7.25 4.13 7.25 6.75C7.25 9.32 9.26 11.4 11.88 11.49C11.96 11.48 12.04 11.48 12.1 11.49C12.12 11.49 12.13 11.49 12.15 11.49C12.16 11.49 12.16 11.49 12.17 11.49C14.73 11.4 16.74 9.32 16.75 6.75C16.75 4.13 14.62 2 12 2Z" fill="currentColor" />
                <path d="M17.08 14.1596C14.29 12.2996 9.73996 12.2996 6.92996 14.1596C5.65996 14.9996 4.95996 16.1496 4.95996 17.3796C4.95996 18.6096 5.65996 19.7496 6.91996 20.5896C8.31996 21.5296 10.16 21.9996 12 21.9996C13.84 21.9996 15.68 21.5296 17.08 20.5896C18.34 19.7396 19.04 18.5996 19.04 17.3596C19.03 16.1396 18.34 14.9896 17.08 14.1596ZM14.33 16.5596L11.81 19.0796C11.69 19.1996 11.53 19.2596 11.37 19.2596C11.21 19.2596 11.05 19.1896 10.93 19.0796L9.66996 17.8196C9.42996 17.5796 9.42996 17.1796 9.66996 16.9396C9.90996 16.6996 10.31 16.6996 10.55 16.9396L11.37 17.7596L13.45 15.6796C13.69 15.4396 14.09 15.4396 14.33 15.6796C14.58 15.9196 14.58 16.3196 14.33 16.5596Z" fill="currentColor" />
            </g>
            <defs>
                <clipPath id="clip0_3111_32731">
                    <rect width="24" height="24" fill="white" />
                </clipPath>
            </defs>
        </svg>);
    };

    return (
        <div className="page-cont top">
            <h1>Mensajes</h1>

            <div className="mensajes-tabs" style={{ marginTop: 16 }}>
                <button className={`mensajes-tab${tab === 'amigos' ? ' activo' : ''}`} onClick={() => setTab('amigos')}>
                    <Amigos /> Amigos
                </button>
                <button className={`mensajes-tab${tab === 'solicitudes' ? ' activo' : ''}`} onClick={() => setTab('solicitudes')}>
                    <UsuarioAdd /> Solicitudes
                    {incomingRequests.length > 0 && <span className="mensajes-badge">{incomingRequests.length}</span>}
                </button>
                <button className={`mensajes-tab${tab === 'compartidas' ? ' activo' : ''}`} onClick={() => setTab('compartidas')}>
                    <RutinasIconFill size={15} /> Rutinas
                    {incomingShares.length > 0 && <span className="mensajes-badge">{incomingShares.length}</span>}
                </button>
            </div>

            {/* ---------- AMIGOS ---------- */}
            {tab === 'amigos' && (
                <>
                    <div className="mensajes-search">
                        <div className="login-input">
                            <Search size={18} />
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
                                <div className="mensajes-empty">No encontramos ese usuario.</div>
                            )}
                            {searchResults.map(u => {
                                const status = friendshipStatusWith(u.id);
                                return (
                                    <div className="mensajes-row" key={u.id}>
                                        <div className="mensajes-avatar">{iniciales(u)}</div>
                                        <div className="mensajes-row-info">
                                            <div className="mensajes-row-nombre">{u.nombre || u.username}</div>
                                            <div className="mensajes-row-username">@{u.username}</div>
                                        </div>
                                        <div className="mensajes-row-actions">
                                            {status === 'accepted' && <span className="header-sub">Ya son amigos</span>}
                                            {status === 'sent' && <span className="header-sub">Pendiente</span>}
                                            {status === 'received' && <span className="header-sub">Te escribió a vos</span>}
                                            {!status && (
                                                <button className="btn acento" onClick={() => handleSendRequest(u)}>
                                                    <UserPlus size={16} />
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
                        <div className="mensajes-empty">Todavía no tenés amigos agregados. Buscalos arriba.</div>
                    )}
                    {friends.map(f => (
                        <div className="mensajes-row" key={f.friendshipId}>
                            <div className="mensajes-avatar">{iniciales(f)}</div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{f.nombre || f.username}</div>
                                <div className="mensajes-row-username">@{f.username}</div>
                            </div>
                            <div className="mensajes-row-actions">
                                <button className="btns primario" style={{ padding: '8px 12px' }} onClick={() => openShareModal(f)} title="Enviar rutina">
                                    <MensajesIconFill size={16} />
                                </button>
                                <button className="btns eliminar" style={{ padding: '8px 12px' }} onClick={() => handleRemoveFriendship(f.friendshipId)} title="Eliminar amigo">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ---------- SOLICITUDES ---------- */}
            {tab === 'solicitudes' && (
                <>
                    <h3 className="mensajes-seccion-titulo">Recibidas</h3>
                    {incomingRequests.length === 0 && <div className="mensajes-empty">No tenés solicitudes pendientes.</div>}
                    {incomingRequests.map(r => (
                        <div className="mensajes-row" key={r.friendshipId}>
                            <div className="mensajes-avatar">{iniciales(r)}</div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{r.nombre || r.username}</div>
                                <div className="mensajes-row-username">@{r.username}</div>
                            </div>
                            <div className="mensajes-row-actions">
                                <button className="btns primario" style={{ padding: '8px 12px' }} onClick={() => handleRespondRequest(r.friendshipId, true)}>
                                    <Check size={16} />
                                </button>
                                <button className="btns eliminar" style={{ padding: '8px 12px' }} onClick={() => handleRespondRequest(r.friendshipId, false)}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <h3 className="mensajes-seccion-titulo">Enviadas</h3>
                    {outgoingRequests.length === 0 && <div className="mensajes-empty">No enviaste solicitudes pendientes.</div>}
                    {outgoingRequests.map(r => (
                        <div className="mensajes-row" key={r.friendshipId}>
                            <div className="mensajes-avatar">{iniciales(r)}</div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{r.nombre || r.username}</div>
                                <div className="mensajes-row-username">@{r.username}</div>
                            </div>
                            <div className="mensajes-row-actions">
                                <span className="header-sub" style={{ marginRight: 6 }}>Pendiente</span>
                                <button className="btns eliminar" style={{ padding: '8px 12px' }} onClick={() => handleRemoveFriendship(r.friendshipId)} title="Cancelar">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ---------- RUTINAS COMPARTIDAS ---------- */}
            {tab === 'compartidas' && (
                <>
                    <h3 className="mensajes-seccion-titulo">Recibidas</h3>
                    {incomingShares.length === 0 && <div className="mensajes-empty">No tenés rutinas por revisar.</div>}
                    {incomingShares.map(s => (
                        <div className="mensajes-row" key={s.id}>
                            <div className="mensajes-avatar"><Dumbbell size={18} /></div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{s.routine_name}</div>
                                <div className="mensajes-row-username">de @{s.from?.username || '...'}</div>
                            </div>
                            <div className="mensajes-row-actions">
                                <button className="btns primario" style={{ padding: '8px 12px' }} onClick={() => handleRespondShare(s, true)} title="Agregar a mis rutinas">
                                    <Check size={16} />
                                </button>
                                <button className="btns eliminar" style={{ padding: '8px 12px' }} onClick={() => handleRespondShare(s, false)} title="Descartar">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <h3 className="mensajes-seccion-titulo">Enviadas</h3>
                    {sentShares.length === 0 && <div className="mensajes-empty">No enviaste rutinas todavía.</div>}
                    {sentShares.map(s => (
                        <div className="mensajes-row" key={s.id}>
                            <div className="mensajes-avatar"><Dumbbell size={18} /></div>
                            <div className="mensajes-row-info">
                                <div className="mensajes-row-nombre">{s.routine_name}</div>
                                <div className="mensajes-row-username">
                                    a @{s.to?.username || '...'} ·{' '}
                                    {s.status === 'pending' ? 'pendiente' : s.status === 'accepted' ? 'aceptada' : 'rechazada'}
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}

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
                                {sendingShare ? <Loader2 size={16} className="login-spin" /> : <Send size={16} />}
                                {sendingShare ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}