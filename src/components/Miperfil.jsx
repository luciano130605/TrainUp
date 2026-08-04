import React, { useState, useEffect } from 'react';
import {
    Check, X, Loader2, Dumbbell, Flame, Users,
    ChevronLeft, Pencil, Share2,
} from 'lucide-react';
import { sileo } from 'sileo';
import {
    getProfileView, updateProfileCustomization,
    getProfileVolumeByMonth,
} from '../lib/social';
import PerfilStats from './PerfilStats';
import './perfil.css';
import './mensajes.css';
import { AirDrop, Edit, Lockicon, UsersIcon } from '../icons/icons';
import RutinaIcon from '../icons/rutinas';

const MESES_LARGO = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatFechaIngreso(fecha) {
    if (!fecha) return null;
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return null;
    return `${MESES_LARGO[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatMesCorto(mesStr) {
    const d = new Date(mesStr);
    if (isNaN(d.getTime())) return '';
    return MESES_CORTO[d.getUTCMonth()];
}

function ProgresoChart({ data }) {
    if (!data || data.length < 2) {
        return (
            <div className="mensajes-empty">
                Todavía no hay suficientes entrenamientos registrados para mostrar el progreso.
            </div>
        );
    }

    const width = 300;
    const height = 110;
    const padding = 10;
    const volumenes = data.map(d => Number(d.volumen) || 0);
    const max = Math.max(...volumenes, 1);
    const min = Math.min(...volumenes, 0);
    const range = (max - min) || 1;
    const stepX = (width - padding * 2) / (data.length - 1);

    const points = data.map((d, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((Number(d.volumen) - min) / range) * (height - padding * 2);
        return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    return (
        <div className="perfil-progreso-chart">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="perfil-progreso-svg">
                <path d={pathD} fill="none" stroke="var(--acento)" strokeWidth="2" />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--acento)" />
                ))}
            </svg>
            <div className="perfil-progreso-labels">
                {data.map((d, i) => (
                    <span key={i}>{formatMesCorto(d.mes)}</span>
                ))}
            </div>
        </div>
    );
}

export default function MiPerfil({ userId, onBack }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [volumeData, setVolumeData] = useState([]);
    const [activeTab, setActiveTab] = useState('stats');

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(null);

    async function load() {
        setLoading(true);
        const { data: d, error } = await getProfileView(userId);
        if (error || !d) {
            sileo.error({ title: 'No se pudo cargar tu perfil' });
            setLoading(false);
            return;
        }
        const { data: volume } = await getProfileVolumeByMonth(userId);
        setData(d);
        setVolumeData(volume || []);
        setLoading(false);
    }

    useEffect(() => { load(); }, [userId]);

    function openEdit() {
        setForm({
            banner_color: data.banner_color || '#4f7cff',
            avatar_color: data.avatar_color || '#4f7cff',
            mostrar_nombre: !!data.mostrar_nombre,
            mostrar_rutinas: !!data.mostrar_rutinas,
            mostrar_stats: !!data.mostrar_stats,
            is_public: !!data.is_public,
        });
        setEditOpen(true);
    }

    async function saveEdit() {
        setSaving(true);
        const { error } = await updateProfileCustomization(userId, form);
        setSaving(false);
        if (error) { sileo.error({ title: 'No se pudo guardar' }); return; }
        sileo.success({ title: 'Perfil actualizado' });
        setEditOpen(false);
        load();
    }

    async function handleShareProfile() {
        const profileUrl = `${window.location.origin}/perfil/${userId}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Perfil de ${nombreVisible}`,
                    text: 'Mirá mi perfil',
                    url: profileUrl,
                });
            } else {
                await navigator.clipboard.writeText(profileUrl);
                sileo.success({ title: 'Link copiado' });
            }
        } catch (error) {
            if (error?.name !== 'AbortError') {
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
                    <div className="skeleton skeleton-line" style={{ width: 140, height: 22 }} />
                    <div className="skeleton skeleton-line" style={{ width: 90, height: 12, marginTop: 6 }} />
                    <div className="skeleton skeleton-line" style={{ width: 110, height: 12, marginTop: 6 }} />
                </div>
                <div className="perfil-cta-row" s>
                    <div className="skeleton skeleton-line" style={{ width: 70, height: 20, marginTop: 6 }} />
                    <div className="skeleton skeleton-line" style={{ width: 70, height: 20, marginTop: 6 }} />
                    <div className="skeleton skeleton-line" style={{ width: 70, height: 20, marginTop: 6 }} />
                </div>
                <div className="perfil-cta-row">
                    <div className="skeleton skeleton-pill" style={{ flex: 1 }} />
                    <div className="skeleton skeleton-pill" style={{ flex: 1 }} />
                </div>
                <div className="perfil-tabbar">
                    <div className="skeleton skeleton-tab" />
                    <div className="skeleton skeleton-tab" />
                </div>
                <div className="skeleton skeleton-row" style={{ width: "90%", height:120, left:20 }} />
            </div>
        );
    }

    if (!data) return null;

    const iniciales = (data.nombre?.[0] || data.username?.[0] || '?').toUpperCase();
    const nombreVisible = data.nombre || data.username;
    const fechaIngreso = formatFechaIngreso(data.created_at);

    return (
        <div className="page-cont top">
            <div className="perfil-topbar">
                <button className="btn" onClick={onBack}>
                    <ChevronLeft size={16} />
                </button>
            </div>

            <div
                className="perfil-banner"
                style={data.banner_color ? { background: `linear-gradient(135deg, ${data.banner_color}, ${data.banner_color}99 85%)` } : undefined}
            >
                <div
                    className="perfil-avatar-lg"
                    style={data.avatar_color ? { background: data.avatar_color } : undefined}
                >
                    {iniciales}
                </div>
            </div>

            <div className="perfil-info">
                <div className="perfil-nombre-row">
                    <h2 className="perfil-nombre">{nombreVisible}</h2>
                </div>
                <span className="perfil-email">@{data.username}</span>
                {fechaIngreso && (
                    <span className="perfil-fecha-ingreso">Se unió en {fechaIngreso}</span>
                )}
            </div>

            <div className="perfil-resumen-row">
                <div className="perfil-resumen-item">
                    <Flame size={15} />
                    <span className="perfil-resumen-valor">{data.racha ?? 0}</span>
                    <span className="perfil-resumen-label">racha</span>
                </div>
                <div className="perfil-resumen-item">
                    <RutinaIcon size={15} />
                    <span className="perfil-resumen-valor">{data.total_sesiones ?? 0}</span>
                    <span className="perfil-resumen-label">entrenos</span>
                </div>
                <div className="perfil-resumen-item">
                    <UsersIcon size={15} />
                    <span className="perfil-resumen-valor">{data.total_amigos ?? 0}</span>
                    <span className="perfil-resumen-label">amigos</span>
                </div>
            </div>

            <div className="perfil-cta-row">
                <button className="btns agregar" style={{ flex: 1 }} onClick={openEdit}>
                    <Edit size={15} /> Editar
                </button>
                <button className="btns agregar" style={{ flex: 1 }} onClick={handleShareProfile}>
                    <AirDrop size={15} /> Compartir
                </button>
            </div>

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
                <>
                    <PerfilStats data={data} />
                    <div className="perfil-seccion-titulo">Progreso de volumen</div>
                    <ProgresoChart data={volumeData} />
                </>
            )}

            {activeTab === 'rutinas' && (
                (data.routines || []).length === 0 ? (
                    <div className="mensajes-empty">No tenés rutinas cargadas.</div>
                ) : data.routines.map(r => (
                    <div className="mensajes-row" key={r.id} style={{ marginTop: 10 }}>
                        <div className="mensajes-avatar"><Dumbbell size={18} /></div>
                        <div className="mensajes-row-info">
                            <div className="mensajes-row-nombre">{r.name}</div>
                            <div className="mensajes-row-username">{r.exerciseCount} ejercicios</div>
                        </div>
                    </div>
                ))
            )}

            {editOpen && form && (
                <div className="modal-overlay" onClick={() => !saving && setEditOpen(false)}>
                    <div className="modal-cont" onClick={e => e.stopPropagation()}>
                        <h3>Editar perfil</h3>
                        <p className="header-sub" style={{ marginBottom: 16 }}>
                            Personalizá cómo te ven los demás.
                        </p>

                        <div className="perfil-color-row">
                            <label className="perfil-color-field">
                                <span>Color de banner</span>
                                <input
                                    type="color"
                                    value={form.banner_color}
                                    onChange={e => setForm(f => ({ ...f, banner_color: e.target.value }))}
                                />
                            </label>
                            <label className="perfil-color-field">
                                <span>Color de avatar</span>
                                <input
                                    type="color"
                                    value={form.avatar_color}
                                    onChange={e => setForm(f => ({ ...f, avatar_color: e.target.value }))}
                                />
                            </label>
                        </div>


                        <div className="login-step-actions" style={{ marginTop: 18 }}>
                            <button className="btns agregar login-btn" onClick={() => setEditOpen(false)} disabled={saving}>
                                Cancelar
                            </button>
                            <button className="btns primario" onClick={saveEdit} disabled={saving}>
                                {saving ? <Loader2 size={16} className="login-spin" /> : ""}
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}