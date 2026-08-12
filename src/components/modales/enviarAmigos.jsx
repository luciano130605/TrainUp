import React, { useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';

function iniciales(friend) {
    const base = friend?.nombre || friend?.username || '';
    return base
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('');
}

export default function EnviarAmigosModal({
    routines = [],
    friends = [],
    loadingFriends,
    selectedFriendId,
    onSelectFriend,
    sending,
    sendProgress,
    onClose,
    onConfirm,
}) {
    const selectedFriend = friends.find(f => f.id === selectedFriendId);


    useEffect(() => {
        const bodyOverflow = document.body.style.overflow;
        const htmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = bodyOverflow;
            document.documentElement.style.overflow = htmlOverflow;
        };
    }, []);

    return (
        <div className="modal-overlay fixed flex justifyContentCenter" onClick={() => !sending && onClose()}>
            <div className="action-sheet" onClick={e => e.stopPropagation()}>
                <div className="action-sheet-card">
                    <h3 className="action-sheet-title">Enviar todas tus rutinas</h3>
                    <p className="action-sheet-desc">
                        Se van a enviar {routines.length} rutina{routines.length !== 1 ? 's' : ''}. Elegí a qué amigo.
                    </p>

                    <div className="action-sheet-divider" />

                    <div style={{ maxHeight: 260, overflowY: 'auto', padding: '10px 16px' }}>
                        {loadingFriends && (
                            <div className="modal-empty">
                                <Loader2 size={16} className="spin" /> Cargando amigos...
                            </div>
                        )}

                        {!loadingFriends && friends.length === 0 && (
                            <div className="modal-empty">
                                <div>Todavía no tenés amigos agregados.</div>
                                <div className="sub" style={{ marginTop: 5 }}>
                                    Andá a Mensajes para agregar a alguien primero.
                                </div>
                            </div>
                        )}

                        {!loadingFriends && friends.length > 0 && (
                            <div className="friend-list">
                                {friends.map(f => (
                                    <div
                                        key={f.id}
                                        className={`friend-row${selectedFriendId === f.id ? ' selected' : ''}`}
                                        onClick={() => !sending && onSelectFriend(f.id)}
                                    >
                                        <span className="flex gap10" style={{ alignItems: 'center' }}>
                                            <span className="friend-avatar">{iniciales(f)}</span>
                                            {f.nombre || f.username}
                                        </span>
                                        {selectedFriendId === f.id && <Check size={16} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="action-sheet-divider" />
                    <button
                        className="action-sheet-btn"
                        style={{ fontWeight: 700 }}
                        onClick={onConfirm}
                        disabled={!selectedFriendId || sending}
                    >
                        {sending
                            ? `Enviando ${sendProgress} de ${routines.length}...`
                            : selectedFriend
                                ? `Enviar a ${selectedFriend.nombre || selectedFriend.username}`
                                : 'Enviar todas'}
                    </button>
                </div>

                <button className="action-sheet-cancel" disabled={sending} onClick={onClose}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}