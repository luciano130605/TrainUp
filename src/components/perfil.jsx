import React, { useState, useEffect, useMemo } from 'react';
import {
    User,
    LogOut,
    Trash2,
    Save,
    Ruler,
    Scale,
    Bell,
    Loader2,
    Check,
    ChevronRight,
    Dumbbell,
    Flame,
    Calendar,
    Activity,
    Repeat,
    AlertTriangle,
    X,
} from 'lucide-react';
import { sileo } from 'sileo';
import { supabase } from '../lib/supabaseClient';
import { GENEROS, OBJETIVOS, DIAS } from './Login';
import './perfil.css';

const emptyProfile = {
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    genero: '',
    alturaCm: '',
    pesoKg: '',
    objetivo: '',
    diasEntrenamiento: '',
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
                    fechaNacimiento: data.fecha_nacimiento || '',
                    genero: data.genero || '',
                    alturaCm: data.altura_cm != null ? String(data.altura_cm) : '',
                    pesoKg: data.peso_kg != null ? String(data.peso_kg) : '',
                    objetivo: data.objetivo || '',
                    diasEntrenamiento: data.dias_entrenamiento != null ? String(data.dias_entrenamiento) : '',
                });
            }
            setLoadingProfile(false);
        })();
    }, [userId]);

    function updateField(field, value) {
        setProfile((p) => ({ ...p, [field]: value }));
        setSaved(false);
    }

    async function handleSave(event) {
        event.preventDefault();
        setError('');

        if (!profile.nombre.trim()) {
            setError('El nombre no puede quedar vacío.');
            return;
        }
        if (!userId || !supabase) {
            setError('No se pudo identificar la cuenta.');
            return;
        }

        setSaving(true);
        const { error: dbError } = await supabase.from('profiles').upsert({
            id: userId,
            nombre: profile.nombre.trim(),
            apellido: profile.apellido.trim() || null,
            fecha_nacimiento: profile.fechaNacimiento || null,
            genero: profile.genero || null,
            altura_cm: profile.alturaCm ? Number(profile.alturaCm) : null,
            peso_kg: profile.pesoKg ? Number(profile.pesoKg) : null,
            objetivo: profile.objetivo || null,
            dias_entrenamiento: profile.diasEntrenamiento ? Number(profile.diasEntrenamiento) : null,
        });
        setSaving(false);

        if (dbError) {
            setError('No se pudo guardar: ' + dbError.message);
            return;
        }
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
        // authSession pasa a null en App.jsx por el listener de onAuthStateChange,
        // lo que redirige solo a la pantalla de Login.
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
            <div className="perfil-header">
                <div className="perfil-avatar">{iniciales}</div>
                <div>
                    <h2 className="perfil-nombre">{profile.nombre || 'Sin nombre'}</h2>
                    <span className="perfil-email">{email}</span>
                </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <form className="login-form perfil" onSubmit={handleSave}>
                <h3 className="perfil-seccion-titulo">Datos personales</h3>

                <div className="login-field-row">
                    <label className="login-field">
                        <span>Nombre</span>
                        <div className="login-input step3">
                            <User size={18} />
                            <input type="text" value={profile.nombre} onChange={(e) => updateField('nombre', e.target.value)} />
                        </div>
                    </label>
                    <label className="login-field">
                        <span>Apellido</span>
                        <div className="login-input step3">
                            <User size={18} />
                            <input type="text" value={profile.apellido} onChange={(e) => updateField('apellido', e.target.value)} placeholder="Opcional" />
                        </div>
                    </label>
                </div>

                <div className="login-field-row">
                    <label className="login-field">
                        <span>Fecha de nacimiento</span>
                        <div className="login-input step3">
                            <Calendar size={18} />
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
                            <Ruler size={18} />
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
                            <Scale size={18} />
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
                    <span>Objetivo</span>
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
                    <span>¿Cuántos días por semana entrenás?</span>
                    <div className="dias-selector">
                        {DIAS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={`dia-chip${Number(profile.diasEntrenamiento) === n ? ' activo' : ''}`}
                                onClick={() => updateField('diasEntrenamiento', String(n))}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btns primario" disabled={saving} type="submit">
                    {saving ? <Loader2 size={18} className="login-spin" /> : saved ? <Check size={18} /> : ""}
                    {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                </button>
            </form>

            <h3 className="perfil-seccion-titulo">Notificaciones</h3>
            <div className="perfil-row">
                <div className="perfil-row-label">
                    <Bell size={16} />
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

            <h3 className="perfil-seccion-titulo">Cuenta</h3>
            <button className="btns agregar perfil-cuenta-btn" onClick={onSignOut} type="button">
                <LogOut size={18} />
                Cerrar sesión
            </button>
            <button className="btns eliminar perfil-cuenta-btn" onClick={openDeleteModal} type="button">
                <Trash2 size={18} />
                Eliminar cuenta
            </button>

            {deleteModalOpen && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal-cont modal-cont--danger" onClick={(e) => e.stopPropagation()}>

                        <div className='modal-icons-cont'>


                            <div className="modal-danger-icon">
                                <AlertTriangle size={20} />
                            </div>

                            <button
                                className="mini-btn"
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                aria-label="Cerrar"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <h3>¿Eliminar tu cuenta?</h3>
                        <p className="header-sub" style={{ marginBottom: 16 }}>
                            Esta acción es permanente. Se borran tus rutinas, tu historial y tus datos de perfil, y no se puede deshacer.
                        </p>

                        <label className="login-field">
                            <span>Escribí <b>{CONFIRM_WORD}</b> para confirmar</span>
                            <div className="input-eliminar">
                                <input
                                    type="text"
                                    autoFocus
                                    value={confirmInput}
                                    disabled={deleting}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && confirmMatches && !deleting) {
                                            confirmDeleteAccount();
                                        }
                                    }}
                                    placeholder={CONFIRM_WORD}
                                />
                            </div>
                        </label>

                        {deleteError && <p className="login-error">{deleteError}</p>}

                        <div className="btn-cont-modal">
                            <button
                                className="btns agregar m"
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btns eliminar m btn-login"
                                type="button"
                                onClick={confirmDeleteAccount}
                                disabled={!confirmMatches || deleting}
                            >
                                {deleting ? <Loader2 size={16} className="login-spin" /> : <Trash2 size={16} />}
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}