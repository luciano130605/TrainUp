import React, { useState, useEffect, useMemo } from 'react';
import {
    User, LogOut, Trash2, Save, Ruler, Scale, Bell, Loader2, Check,
    ChevronRight, Dumbbell, Flame, Calendar, Activity, Repeat,
    AlertTriangle, X, Globe, Lock,
} from 'lucide-react';
import { sileo } from 'sileo';
import { supabase } from '../../lib/supabaseClient';
import { GENEROS, OBJETIVOS, DIAS, normalizeUsername } from '../login/Login';
import './perfil.css';
import { getBlockedUsers, setPrivacySettings, unblockUser } from '../../lib/social';
import UserIcon from '../../icons/user';
import UserFillIcon from '../../icons/userFill';
import { GlobalIcon, Lockicon, LogOutIcon, NotificationIcon, TrashIcon, UnlockIcon } from '../../icons/icons';

const emptyProfile = {
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    genero: '',
    alturaCm: '',
    pesoKg: '',
    objetivo: '',
    diasEntrenamiento: '',
    mostrarNombre: true,
    mostrarRutinas: true,
    mostrarActividad: true,
    mostrarStats: true,
};

const CONFIRM_WORD = 'ELIMINAR';

function calcularRacha(history) {
    if (!history || history.length === 0) return 0;
    const dias = new Set(
        history.map((h) => new Date(h.date).toISOString().slice(0, 10))
    );
    let racha = 0;
    let cursor = new Date();
    if (!dias.has(cursor.toISOString().slice(0, 10))) {
        cursor.setDate(cursor.getDate() - 1);
    }
    while (dias.has(cursor.toISOString().slice(0, 10))) {
        racha++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return racha;
}

export default function Perfil({
    authSession,
    routines,
    history,
    onSignOut,
    reminderEnabled,
    onToggleReminder,
    reminderTime,
    onChangeReminderTime,
}) {
    const [profile, setProfile] = useState(emptyProfile);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const [usernameStatus, setUsernameStatus] = useState(null)
    const [originalUsername, setOriginalUsername] = useState('')

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [confirmInput, setConfirmInput] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const email = authSession?.user?.email || '';
    const userId = authSession?.user?.id;

    const iniciales = useMemo(() => {
        const n = profile.nombre?.trim()?.[0] || email?.[0] || '?';
        return n.toUpperCase();
    }, [profile.nombre, email]);

    const racha = useMemo(() => calcularRacha(history), [history]);


    const [blocked, setBlocked] = useState([]);

    useEffect(() => {
        if (!userId) return;
        getBlockedUsers().then(({ data }) => setBlocked(data || []));
    }, [userId]);




    useEffect(() => {
        if (!supabase || !userId) return;
        (async () => {
            setLoadingProfile(true);
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!fetchError && data) {
                setProfile({
                    nombre: data.nombre || '',
                    apellido: data.apellido || '',
                    username: data.username || '',
                    mostrarActividad: data.mostrar_actividad ?? true,
                    fechaNacimiento: data.fecha_nacimiento || '',
                    genero: data.genero || '',
                    alturaCm: data.altura_cm != null ? String(data.altura_cm) : '',
                    pesoKg: data.peso_kg != null ? String(data.peso_kg) : '',
                    objetivo: data.objetivo || '',
                    diasEntrenamiento: data.dias_entrenamiento != null ? String(data.dias_entrenamiento) : '',
                    mostrarNombre: data.mostrar_nombre ?? true,
                    mostrarRutinas: data.mostrar_rutinas ?? true,
                    mostrarStats: data.mostrar_stats ?? true,
                });
                setOriginalUsername(data.username || '');
            }
            setLoadingProfile(false);
        })();
    }, [userId]);

    async function handleTogglePrivacy(field, dbField) {
        const next = !profile[field];
        setProfile(p => ({ ...p, [field]: next }));
        const { error } = await setPrivacySettings(userId, { [dbField]: next });
        console.log('ERROR COMPLETO:', error);
        if (error) {
            setProfile(p => ({ ...p, [field]: !next }));
            sileo.error({ title: 'No se pudo actualizar la privacidad' });
            return;
        }
        sileo.success({ title: next ? 'Ahora es visible' : 'Ahora es privado' });
    }

    function updateField(field, value) {
        setProfile((p) => ({ ...p, [field]: value }));
        setSaved(false);
    }

    async function checkUsernameAvailability() {
        const u = profile.username.trim();
        if (!u || u === originalUsername) { setUsernameStatus(null); return; }
        if (u.length < 3) { setUsernameStatus('invalid'); return; }
        setUsernameStatus('checking');
        const { data, error: rpcError } = await supabase.rpc('username_available', { p_username: u });
        if (rpcError) { setUsernameStatus(null); return; }
        setUsernameStatus(data ? 'available' : 'taken');
    }


    async function handleUnblock(id) {
        const { error } = await unblockUser(id);
        if (error) { sileo.error({ title: 'No se pudo desbloquear' }); return; }
        setBlocked(b => b.filter(u => u.id !== id));
        sileo.success({ title: 'Usuario desbloqueado' });
    }

    async function handleSave(event) {
        event.preventDefault();
        setError('');

        if (!profile.nombre.trim()) {
            setError('El nombre no puede quedar vacío.');
            return;
        }
        const trimmedUsername = profile.username.trim();
        if (!trimmedUsername) {
            setError('El usuario no puede quedar vacío.');
            return;
        }
        if (trimmedUsername.length < 3) {
            setError('El usuario debe tener al menos 3 caracteres.');
            return;
        }
        if (!userId || !supabase) {
            setError('No se pudo identificar la cuenta.');
            return;
        }

        setSaving(true);

        if (trimmedUsername !== originalUsername) {
            const { data: available, error: availError } = await supabase.rpc('username_available', {
                p_username: trimmedUsername,
            });
            if (availError) {
                setSaving(false);
                setError('No se pudo validar el usuario, probá de nuevo.');
                return;
            }
            if (!available) {
                setSaving(false);
                setUsernameStatus('taken');
                setError('Ese nombre de usuario ya está en uso.');
                return;
            }
        }
        const { error: dbError } = await supabase
            .from('profiles')
            .update({
                nombre: profile.nombre.trim(),
                apellido: profile.apellido.trim() || null,
                mostrar_nombre: profile.mostrarNombre,
                mostrar_rutinas: profile.mostrarRutinas,
                mostrar_stats: profile.mostrarStats,
                username: trimmedUsername,
                fecha_nacimiento: profile.fechaNacimiento || null,
                genero: profile.genero || null,
                altura_cm: profile.alturaCm ? Number(profile.alturaCm) : null,
                peso_kg: profile.pesoKg ? Number(profile.pesoKg) : null,
                objetivo: profile.objetivo || null,
                dias_entrenamiento: profile.diasEntrenamiento ? Number(profile.diasEntrenamiento) : null,
            })
            .eq('id', userId);
        setSaving(false);

        if (dbError) {
            const dup = /duplicate key|unique/i.test(dbError.message || '');
            setError(dup ? 'Ese nombre de usuario ya está en uso.' : 'No se pudo guardar: ' + dbError.message);
            return;
        }
        setOriginalUsername(trimmedUsername);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    function openDeleteModal() {
        setConfirmInput('');
        setDeleteError('');
        setDeleteModalOpen(true);
    }

    function closeDeleteModal() {
        if (deleting) return; // no cerrar a mitad de un borrado en curso
        setDeleteModalOpen(false);
        setConfirmInput('');
        setDeleteError('');
    }

    async function confirmDeleteAccount() {
        if (confirmInput.trim().toUpperCase() !== CONFIRM_WORD) return;
        if (!supabase) return;

        setDeleting(true);
        setDeleteError('');

        const { error: rpcError } = await supabase.rpc('delete_current_user');

        if (rpcError) {
            setDeleting(false);
            setDeleteError('No se pudo eliminar la cuenta: ' + rpcError.message);
            return;
        }

        await supabase.auth.signOut();
        setDeleting(false);
        setDeleteModalOpen(false);

    }

    if (loadingProfile) {
        return (
            <div className="perfil-page">
                <div className="perfil-header">
                    <div className="skeleton skeleton-avatar" />
                    <div style={{ flex: 1 }}>
                        <div className="skeleton skeleton-line" style={{ width: '55%', height: 20, marginBottom: 8 }} />
                        <div className="skeleton skeleton-line" style={{ width: '35%', height: 12 }} />
                    </div>
                </div>

                <div className="perfil skeleton-form">
                    <div className="skeleton skeleton-line" style={{ width: 140, height: 18, marginBottom: 16 }} />

                    <div className="login-field-row">
                        <div className="skeleton skeleton-input" />
                        <div className="skeleton skeleton-input" />
                    </div>
                    <div className="login-field-row">
                        <div className="skeleton skeleton-input" />
                    </div>
                    <div className="login-field-row">
                        <div className="skeleton skeleton-input" />
                        <div className="skeleton skeleton-input" />
                    </div>
                    <div className="login-field-row">
                        <div className="skeleton skeleton-input" />
                        <div className="skeleton skeleton-input" />
                    </div>

                    <div className="skeleton skeleton-line" style={{ width: '40%', height: 14, margin: '18px 0 10px' }} />
                    <div className="login-field-row">
                        <div className="skeleton skeleton-card-obj" />
                        <div className="skeleton skeleton-card-obj" />
                    </div>
                    <div className="login-field-row">
                        <div className="skeleton skeleton-card-obj" />
                        <div className="skeleton skeleton-card-obj" />
                    </div>


                    <div className="skeleton skeleton-line" style={{ width: '60%', height: 14, margin: '18px 0 10px' }} />
                    <div className="dias-selector">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton skeleton-chip" />
                        ))}
                    </div>

                    <div className="skeleton skeleton-btn" style={{ marginTop: 20 }} />
                </div>

                <div className="skeleton skeleton-line" style={{ width: 160, height: 18, margin: '20px 0 14px' }} />
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row-2" />

                <div className="skeleton skeleton-line" style={{ width: 100, height: 18, margin: '20px 0 14px' }} />
                <div className="skeleton skeleton-btn" style={{ marginBottom: 10 }} />
                <div className="skeleton skeleton-btn" />
            </div>
        );
    }

    const confirmMatches = confirmInput.trim().toUpperCase() === CONFIRM_WORD;

    return (
        <div className="perfil-page">
            <div className="header">
                <div>
                    <h2 className="'page-title">{profile.nombre || 'Sin nombre'}</h2>
                    <span className="sub">{email}</span>
                </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <form className="login-form perfil" onSubmit={handleSave}>
                <div className="section-label acento-color">Datos personales</div>

                <div className="login-field-row">
                    <label className="login-field">
                        <span>Nombre</span>
                        <span className="border-bottom" />
                        <span className="border-top" />
                        <div className="login-input step3">
                            <input type="text" value={profile.nombre} onChange={(e) => updateField('nombre', e.target.value)} />
                        </div>
                    </label>
                    <label className="login-field">
                        <span>Apellido</span>
                        <div className="login-input step3">
                            <input type="text" value={profile.apellido} onChange={(e) => updateField('apellido', e.target.value)} placeholder="Opcional" />
                        </div>
                    </label>
                </div>
                <div className="cont-todo">
                    <label className="login-field">
                        <span>Usuario</span>
                        <div className="login-input step3">
                            <input
                                type="text"
                                value={profile.username}
                                onChange={(e) => updateField('username', normalizeUsername(e.target.value))}
                                onBlur={checkUsernameAvailability}
                                placeholder="tu usuario"
                            />
                        </div>

                        {usernameStatus === 'checking' && <span className="header-sub">Verificando disponibilidad...</span>}
                        {usernameStatus === 'available' && <span className="header-sub" style={{ color: 'var(--acento)' }}>Usuario disponible</span>}
                        {usernameStatus === 'taken' && <span className="header-sub" style={{ color: 'var(--rojo)' }}>Ese usuario ya está en uso</span>}
                        {usernameStatus === 'invalid' && <span className="header-sub" style={{ color: 'var(--rojo)' }}>Mínimo 3 caracteres</span>}
                    </label>
                </div>

                <div className="login-field-row">
                    <label className="login-field">
                        <span>Fecha de nacimiento</span>
                        <div className="login-input step3 nacimiento">
                            <input type="date" value={profile.fechaNacimiento} onChange={(e) => updateField('fechaNacimiento', e.target.value)} />
                        </div>
                    </label>
                    <label className="login-field">
                        <span>Género</span>
                        <div className="login-input login-input--select step3">
                            <select value={profile.genero} onChange={(e) => updateField('genero', e.target.value)}>
                                <option value="">Seleccioná...</option>
                                {GENEROS.map((g) => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                            </select>
                        </div>
                    </label>
                </div>

                <div className="login-field-row">
                    <label className="login-field">
                        <span>Altura (cm)</span>
                        <div className="login-input step3">
                            <input
                                inputMode="decimal"
                                type="text"
                                value={profile.alturaCm}
                                onChange={(e) => updateField('alturaCm', e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                        </div>
                    </label>
                    <label className="login-field">
                        <span>Peso (kg)</span>
                        <div className="login-input step3">
                            <input
                                inputMode="decimal"
                                type="text"
                                value={profile.pesoKg}
                                onChange={(e) => updateField('pesoKg', e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                        </div>
                    </label>
                </div>

                <div className="login-field">
                    <div className='section-label acento-color'>Objetivo</div>
                    <div className="login-objetivo-grid">
                        {OBJETIVOS.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                className={`login-objetivo-card${profile.objetivo === value ? ' active' : ''}`}
                                onClick={() => updateField('objetivo', value)}
                            >
                                <Icon size={18} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="login-field">
                    <div className='section-label acento-color'>¿Cuántos días por semana entrenás?</div>
                    <div className="dias-selector">
                        {DIAS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={`pill${Number(profile.diasEntrenamiento) === n ? ' activo' : ''}`}
                                onClick={() => updateField('diasEntrenamiento', String(n))}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="add-exercise-btn" disabled={saving} type="submit"
                    style={{
                        marginBottom: 10,
                        width:"90%"
                    }}
                >
                    {saving ? <Loader2 size={18} className="login-spin" /> : saved ? <Check size={18} /> : ""}
                    {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                </button>
            </form>

            <div className='login-form perfil'>
                <div className="section-label acento-color">Privacidad</div>
                <p className="sub" style={{ marginBottom: 10 }}>
                    Tu usuario (@{profile.username}) siempre es visible para que te puedan buscar.
                </p>

                {[

                    { key: 'mostrarRutinas', db: 'mostrar_rutinas', label: 'Mis rutinas' },
                    { key: 'mostrarStats', db: 'mostrar_stats', label: 'Mis stats y racha' },
                    { key: 'mostrarActividad', db: 'mostrar_actividad', label: 'En línea / última vez' },
                ].map(({ key, db, label }) => (
                    <div className="perfil-row" key={key}>
                        <div className="perfil-row-label">
                            {profile[key] ? <GlobalIcon size={16} /> : <Lockicon size={16} />}
                            <span>{label}</span>
                        </div>
                        <button
                            className={`mini-btn noti ${profile[key] ? 'activa' : ''}`}
                            role="switch"
                            aria-checked={profile[key]}
                            type="button"
                            onClick={() => handleTogglePrivacy(key, db)}
                        >
                            {profile[key] ? 'Visible' : 'Privado'}
                        </button>
                    </div>
                ))}
            </div>
            <div className='login-form perfil'>

                <div className="section-label acento-color">Notificaciones</div>
                <div className="perfil-row">
                    <div className="perfil-row-label">
                        <NotificationIcon size={16} />
                        <span>Recordatorio diario</span>
                    </div>
                    <button className={`mini-btn noti ${reminderEnabled ? 'activa' : ''}`} role="switch" aria-checked={reminderEnabled} onClick={onToggleReminder}>
                        {reminderEnabled ? 'Activado' : 'Desactivado'}
                    </button>
                </div>
                <input
                    type="time"
                    className={`input-time-ajustes ${!reminderEnabled ? 'disabled' : ''}`}
                    value={reminderTime}
                    onChange={(e) => onChangeReminderTime(e.target.value)}
                    disabled={!reminderEnabled}
                />
            </div>

            <div className='login-form perfil'>

                <div className="section-label acento-color">Bloqueados</div>
                {blocked.length === 0 ? (
                    <p className="sub" style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>                                <UnlockIcon size={18} />
                    </p>
                ) : (
                    <div className="perfil-bloqueados-scroll">
                        {blocked.map(u => (
                            <div className="perfil-row" key={u.id}>
                                <div className="perfil-row-label">
                                    <span>{u.nombre || u.username}</span>
                                </div>
                                <button className="btn-circle" data-tooltip={
                                    "Desbloquear"
                                } onClick={() => handleUnblock(u.id)}>
                                    <UnlockIcon size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className='login-form perfil'
                style={{
                    marginBottom: 50,
                    paddingBottom: 10
                }}>

                <div className="section-label acento-color">Cuenta</div>
                <div style={{
                    display: "flex",
                    gap: 20,
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <button className="perfil-cuenta-btn" onClick={onSignOut} type="button"
                        style={{
                            width: "90%"
                        }}>
                        <span>Cerrar sesion</span>
                        <LogOutIcon size={18} />
                    </button>
                    <button className="perfil-cuenta-btn eliminar" onClick={openDeleteModal} type="button"
                        style={{
                            width: "90%"

                        }}>
                        <span>Eliminar</span>
                        <TrashIcon size={18} />
                    </button>
                </div>

            </div>
            {deleteModalOpen && (
                <div className="modal-overlay fixed flex justifyContentCenter" onClick={closeDeleteModal}>
                    <div className="action-sheet" onClick={(e) => e.stopPropagation()}>

                        <div className="action-sheet-card">
                            <h3 className="action-sheet-title">¿Eliminar tu cuenta?</h3>

                            <p className="action-sheet-desc">
                                Esta acción es permanente. Se borran tus rutinas,
                                tu historial y tus datos de perfil, y no se puede deshacer.
                            </p>

                            <div className="action-sheet-field-block">
                                <label className="login-field">
                                    <span>
                                        Escribí <b>{CONFIRM_WORD}</b> para confirmar
                                    </span>
                                    <div className="login-input">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={confirmInput}
                                            disabled={deleting}
                                            onChange={(e) => setConfirmInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && confirmMatches && !deleting) {
                                                    confirmDeleteAccount();
                                                }
                                            }}
                                            placeholder={CONFIRM_WORD}
                                        />
                                    </div>
                                </label>

                                {deleteError && (
                                    <span className="sub" style={{ color: 'var(--rojo)' }}>
                                        {deleteError}
                                    </span>
                                )}

                                <button
                                    className="btn-login action-sheet-danger"
                                    type="button"
                                    onClick={confirmDeleteAccount}
                                    disabled={!confirmMatches || deleting}
                                >
                                    {deleting ? (
                                        <Loader2 size={17} className="login-spin" />
                                    ) : (
                                        <TrashIcon size={17} />
                                    )}
                                    {deleting ? "Eliminando..." : "Eliminar cuenta"}
                                </button>
                            </div>
                        </div>

                        <button
                            className="action-sheet-cancel"
                            type="button"
                            onClick={closeDeleteModal}
                            disabled={deleting}
                        >
                            Cancelar
                        </button>

                    </div>
                </div>
            )}
        </div>
    );
}