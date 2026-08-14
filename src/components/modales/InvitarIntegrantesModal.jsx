import React, { useState, useEffect } from 'react';
import { Users, Mail, Link as LinkIcon, ClipboardCopy, Check, X as XIcon } from 'lucide-react';
import { sileo } from 'sileo';
import { fetchFriendships, getPublicProfiles } from '../../lib/social';
import { inviteFriendToSharedRoutine, inviteByEmail, createInviteLink } from '../../lib/sharedRoutines';
import "./backupModal.css";
import { CopyIcon } from '../../icons/icons';

export default function InvitarIntegrantesModal({
    sharedRoutineId, userId, onClose, onInvited,
    mode = 'invite',              // 'invite' (real) | 'select' (pre-creación)
    selectedIds,                  // Set<string> — amigos elegidos, modo select
    onToggleSelect,               // (friendId) => void
    selectedEmails,               // ★ NUEVO: string[] — mails elegidos, modo select
    onAddEmail,                   // ★ NUEVO: (email) => void
    onRemoveEmail,                // ★ NUEVO: (email) => void
}) {
    const isSelectMode = mode === 'select';
    const [tab, setTab] = useState('amigos');
    const [friends, setFriends] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [invitedIds, setInvitedIds] = useState(new Set());
    const [email, setEmail] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [linkUrl, setLinkUrl] = useState(null);
    const [generatingLink, setGeneratingLink] = useState(false);

    useEffect(() => {
        (async () => {
            const { data: fData } = await fetchFriendships(userId);
            const accepted = (fData || []).filter(f => f.status === 'accepted');
            const friendIds = accepted.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id);
            if (friendIds.length === 0) { setLoadingFriends(false); return; }
            const { data: profData } = await getPublicProfiles(friendIds);
            setFriends(profData || []);
            setLoadingFriends(false);
        })();
    }, [userId]);

    const iniciales = (p) => (p?.nombre?.[0] || p?.username?.[0] || '?').toUpperCase();
    const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    async function handleInviteFriend(friendId) {
        if (isSelectMode) {
            onToggleSelect?.(friendId);
            return;
        }
        const { error } = await inviteFriendToSharedRoutine(sharedRoutineId, friendId, userId);
        if (error) { sileo.error({ title: 'No se pudo invitar' }); return; }
        setInvitedIds(prev => new Set(prev).add(friendId));
        sileo.success({ title: 'Invitación enviada' });
        onInvited?.();
    }

    async function handleInviteEmail() {
        const trimmed = email.trim();
        if (!trimmed || !emailValido(trimmed)) {
            sileo.error({ title: 'Poné un mail válido' });
            return;
        }

        if (isSelectMode) {
            if (selectedEmails?.includes(trimmed)) {
                sileo.error({ title: 'Ese mail ya está en la lista' });
                return;
            }
            onAddEmail?.(trimmed);
            setEmail('');
            return;
        }

        setSendingEmail(true);
        const { error } = await inviteByEmail(sharedRoutineId, trimmed, userId);
        setSendingEmail(false);
        if (error) { sileo.error({ title: 'No se pudo invitar', description: error.message }); return; }
        sileo.success({ title: 'Invitación enviada' });
        setEmail('');
        onInvited?.();
    }

    async function handleGenerateLink() {
        setGeneratingLink(true);
        const { url, error } = await createInviteLink(sharedRoutineId, userId);
        setGeneratingLink(false);
        if (error) { sileo.error({ title: 'No se pudo generar el link' }); return; }
        setLinkUrl(url);
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(linkUrl);
            sileo.success({ title: 'Link copiado' });
        } catch { sileo.error({ title: 'No se pudo copiar' }); }
    }

    return (
        <div className="modal-overlay fixed flex justifyContentCenter" onClick={onClose}>
            <div className="action-sheet" onClick={e => e.stopPropagation()}>
                <div className="action-sheet-card">
                    <h3 className="action-sheet-title">Invitar integrantes</h3>
                    <p className="action-sheet-desc">
                        {isSelectMode
                            ? 'Elegí a quién invitar apenas se cree la rutina. El link de invitación estará disponible después.'
                            : 'Elegí cómo querés invitar gente a esta rutina compartida.'}
                    </p>

                    <div className="pills" style={{ padding: '0 20px 10px' }}>
                        <button type="button" className={`pill ${tab === 'amigos' ? 'activo' : ''}`} style={{ width: 'auto', padding: '0 12px' }} onClick={() => setTab('amigos')}>
                            Amigos
                        </button>
                        <button type="button" className={`pill ${tab === 'email' ? 'activo' : ''}`} style={{ width: 'auto', padding: '0 12px' }} onClick={() => setTab('email')}>
                            Mail
                        </button>
                        <button
                            type="button"
                            className={`pill ${tab === 'link' ? 'activo' : ''}`}
                            style={{ width: 'auto', padding: '0 12px', opacity: isSelectMode ? 0.5 : 1 }}
                            onClick={() => setTab('link')}
                        >
                            Link
                        </button>
                    </div>

                    <div className="action-sheet-divider" />

                    {tab === 'amigos' && (
                        <div className="padding6" style={{ maxHeight: 260, overflowY: 'auto' }}>
                            {loadingFriends ? (
                                <div className="sub fontSize7" style={{ padding: 14 }}>Cargando amigos...</div>
                            ) : friends.length === 0 ? (
                                <div className="sub fontSize7" style={{ padding: 14 }}>No tenés amigos agregados todavía.</div>
                            ) : (
                                friends.map(f => {
                                    const checked = isSelectMode ? selectedIds?.has(f.id) : invitedIds.has(f.id);
                                    return (
                                        <div key={f.id} className="flex gap10 justifyContentSpaceBet borderRadiusCards padding9 transicion item">
                                            <div className="flex gap10" style={{ alignItems: 'center' }}>
                                                <div className="pop-icon borderRadiusCards flex" style={{ width: 32, height: 32 }}>
                                                    {iniciales(f)}
                                                </div>
                                                <span>{f.nombre || f.username}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-circle small"
                                                style={{
                                                    fontSize:9
                                                }}
                                                disabled={!isSelectMode && invitedIds.has(f.id)}
                                                onClick={() => handleInviteFriend(f.id)}
                                            >
                                                {checked ? <Check size={14} /> : (isSelectMode ? 'Elegir' : 'Invitar')}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {tab === 'email' && (
                        <div className="action-sheet-field-block">
                            <div className="modal-search action-sheet-field">
                                <input
                                    type="email"
                                    placeholder="mail@ejemplo.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleInviteEmail(); }}
                                    autoComplete="off"
                                />
                            </div>
                            <button className="add-exercise-btn" disabled={!email.trim() || sendingEmail} onClick={handleInviteEmail}>
                                {isSelectMode ? 'Agregar a la lista' : (sendingEmail ? 'Enviando...' : 'Invitar por mail')}
                            </button>

                            {isSelectMode && selectedEmails?.length > 0 && (
                                <div className="padding6" style={{ marginTop: 6 }}>
                                    {selectedEmails.map(em => (
                                        <div key={em} className="flex gap10 justifyContentSpaceBet borderRadiusCards padding9 item">
                                            <span className="fontSize7">{em}</span>
                                            <button type="button" className="btn-circle small" title="Quitar" onClick={() => onRemoveEmail?.(em)}>
                                                <XIcon size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'link' && (
                        isSelectMode ? (
                            <div className="action-sheet-field-block">
                                <div className="sub fontSize7" style={{ padding: 14 }}>
                                    El link de invitación se genera una vez creada la rutina. Guardá la rutina y volvé a entrar a "Invitar integrantes" para generarlo.
                                </div>
                            </div>
                        ) : (
                            <div className="action-sheet-field-block">
                                {!linkUrl ? (
                                    <button className="add-exercise-btn" disabled={generatingLink} onClick={handleGenerateLink}>
                                        {generatingLink ? 'Generando...' : 'Generar link de invitación'}
                                    </button>
                                ) : (
                                    <div className="modal-search action-sheet-field">
                                        <input readOnly value={linkUrl} />
                                        <button className="mini-btn" type="button" title="Copiar" onClick={copyLink}>
                                            <CopyIcon size={14} strokeWidth={2.25} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>

                <button className="action-sheet-sucess" onClick={onClose}>
                    {isSelectMode ? 'Listo' : 'Cerrar'}
                </button>
            </div>
        </div>
    );
}