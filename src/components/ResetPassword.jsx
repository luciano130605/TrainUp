import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import './login.css';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [linkInvalid, setLinkInvalid] = useState(false);

    // Supabase manda el link con un token en el hash (#access_token=...&type=recovery)
    // El propio cliente de supabase-js lo detecta automáticamente y crea una sesión temporal.
    // Solo tenemos que esperar a que dispare el evento.
    useEffect(() => {
        if (!supabase) return;

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setSessionReady(true);
            }
        });

        // Fallback: si ya había sesión de recovery cuando montó el componente
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) setSessionReady(true);
        });

        // Si después de un momento no hay sesión ni evento, el link es inválido/expirado
        const timeout = setTimeout(() => {
            setSessionReady((ready) => {
                if (!ready) setLinkInvalid(true);
                return ready;
            });
        }, 4000);

        return () => {
            listener.subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (updateError) {
            setError(updateError.message);
            return;
        }

        setDone(true);
        // Cerramos la sesión de recovery para que tenga que loguearse de nuevo con la nueva contraseña
        await supabase.auth.signOut();
    }

    if (!supabaseConfigured) {
        return (
            <div className="login-page">
                <div className="login-shell login-shell--error">
                    <h1>Conexión fallida</h1>
                    <p>Faltan las variables de entorno de Supabase (.env).</p>
                </div>
            </div>
        );
    }

    if (linkInvalid) {
        return (
            <main className="login-page">
                <section className="login-shell">
                    <div className="login-brand">
                        <h1>Link inválido</h1>
                        <div className="home-logo">Train<span className="home-logo-acento">Up</span></div>
                    </div>
                    <p className="login-error">
                        Este link ya expiró o no es válido. Volvé a pedir uno desde la pantalla de login.
                    </p>
                    <a className="btns acento" href="/">Volver al login</a>
                </section>
            </main>
        );
    }

    if (done) {
        return (
            <main className="login-page">
                <section className="login-shell">
                    <div className="login-brand">
                        <h1>¡Listo!</h1>
                        <div className="home-logo">Train<span className="home-logo-acento">Up</span></div>
                    </div>
                    <p className="login-message">
                        Tu contraseña se actualizó correctamente. Ya podés iniciar sesión.
                    </p>
                    <a className="btns acento" href="/">Ir a iniciar sesión</a>
                </section>
            </main>
        );
    }

    return (
        <main className="login-page">
            <section className="login-shell">
                <div className="login-brand">
                    <h1>Nueva contraseña</h1>
                    <div className="home-logo">Train<span className="home-logo-acento">Up</span></div>
                </div>

                {error && <p className="login-error">{error}</p>}

                {!sessionReady ? (
                    <p className="header-sub">Validando el link...</p>
                ) : (
                    <form className="login-form" onSubmit={handleSubmit}>
                        <label className="login-field">
                            <span>Nueva contraseña</span>
                            <div className="login-input">
                                <Lock size={18} />
                                <input
                                    autoComplete="new-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                />
                                <button
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="login-icon-button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    type="button"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </label>

                        <label className="login-field">
                            <span>Repetir contraseña</span>
                            <div className="login-input">
                                <Lock size={18} />
                                <input
                                    autoComplete="new-password"
                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                    placeholder="Repetí tu contraseña"
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordConfirm}
                                />
                            </div>
                        </label>

                        <button className="btns acento" disabled={loading} type="submit">
                            {loading ? <Loader2 size={18} className="login-spin" /> : <Check size={18} />}
                            {loading ? 'Guardando...' : 'Actualizar contraseña'}
                        </button>
                    </form>
                )}
            </section>
        </main>
    );
}