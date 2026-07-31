import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BicepsFlexed,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Ruler,
  Scale,
  User,
  UserPlus,
  Zap,
} from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { ensureUserProfile } from '../lib/profile';
import './login.css';

export const GENEROS = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decirlo' },
];

export const OBJETIVOS = [
  { value: 'ganar_musculo', label: 'Ganar músculo', icon: Dumbbell },
  { value: 'perder_grasa', label: 'Perder grasa', icon: Flame },
  { value: 'mantener', label: 'Mantenerme', icon: Scale },
  { value: 'mejorar_fuerza', label: 'Mejorar fuerza', icon: BicepsFlexed },
];

export const DIAS = [1, 2, 3, 4, 5, 6, 7];

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

export default function Login({ onRegisteringChange } = {}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [step, setStep] = useState(1); // solo aplica en 'register': 1, 2, 3

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [profile, setProfile] = useState(emptyProfile);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  function resetAll() {
    setStep(1);
    setPassword('');
    setPasswordConfirm('');
    setProfile(emptyProfile);
    setPendingUserId(null);
    setNeedsEmailConfirm(false);
    setError('');
    setMessage('');
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    resetAll();
    onRegisteringChange?.(false);
  }

  function updateProfile(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  // ---------- LOGIN ----------
  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim() || !password) {
      setError('Completá email y contraseña.');
      return;
    }
    if (!supabase) {
      setError('Supabase no está configurado.');
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setLoading(false);
      onRegisteringChange?.(false);
      setError(authError.message);
      return;
    }

    const { error: profileError } = await ensureUserProfile(data.user);
    setLoading(false);

    if (profileError) {
      setError('Ingresaste, pero no se pudo validar tu perfil: ' + profileError.message);
    }
  }

  // ---------- REGISTRO: paso 1 ----------
  async function handleStep1Submit(event) {
    event.preventDefault();
    setError('');

    if (!profile.nombre.trim() || !email.trim() || !password) {
      setError('Completá nombre, email y contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!supabase) {
      setError('Supabase no está configurado.');
      return;
    }

    onRegisteringChange?.(true);
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: profile.nombre.trim() } },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      onRegisteringChange?.(false);
      setError('La cuenta se creo en Auth, pero Supabase todavia pide validar email. Apaga "Confirm email" en Authentication > Providers > Email para usar registro sin validacion.');
      return;
    }

    const { error: profileError } = await ensureUserProfile(data.user, profile);
    setLoading(false);

    if (profileError) {
      onRegisteringChange?.(false);
      setError('Cuenta creada, pero no se pudo crear el perfil: ' + profileError.message);
      return;
    }

    setPendingUserId(data.user?.id ?? null);
    setNeedsEmailConfirm(false);
    setStep(2);
  }

  // ---------- REGISTRO: paso 2 ----------
  function handleSkipProfile() {
    if (needsEmailConfirm) {
      setMessage('Cuenta creada. Revisá tu email para confirmarla y poder ingresar.');
      setMode('login');
      setStep(1);
    }
    onRegisteringChange?.(false);
  }

  function handleWantsProfile() {
    setError('');
    setStep(3);
  }

  // ---------- REGISTRO: paso 3 ----------
  async function handleProfileSubmit(event) {
    event.preventDefault();
    setError('');

    const {
      nombre, apellido, fechaNacimiento, genero, alturaCm, pesoKg, objetivo, diasEntrenamiento,
    } = profile;

    if (!nombre.trim()) {
      setError('El nombre no puede quedar vacío.');
      return;
    }
    if (!pendingUserId) {
      setError('No se encontró la cuenta. Volvé a intentar el registro.');
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user || { id: pendingUserId, email: email.trim(), user_metadata: { nombre } };
    const { error: dbError } = await ensureUserProfile(user, {
      nombre,
      apellido,
      fechaNacimiento,
      genero,
      alturaCm,
      pesoKg,
      objetivo,
      diasEntrenamiento,
    });
    setLoading(false);

    if (dbError) {
      if (needsEmailConfirm) {
        setMessage('Cuenta creada. Confirmá tu email para guardar el perfil e ingresar.');
        setMode('login');
        setStep(1);
        onRegisteringChange?.(false);
        return;
      }
      setError('No se pudo guardar el perfil: ' + dbError.message);
      return;
    }

    if (needsEmailConfirm) {
      setMessage('¡Todo listo! Revisá tu email para confirmar la cuenta.');
      setMode('login');
      setStep(1);
    }
    onRegisteringChange?.(false);
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

  const totalSteps = 3;
  const stepLabels = ['Cuenta', 'Perfil', 'Datos'];

  return (
    <main className="login-page">
      <section className={`login-shell${isRegister ? ' login-shell--wide' : ''}`}>
        <div className="login-brand">

          <h1>
            {!isRegister && 'Ingresar'}
            {isRegister && step === 1 && 'Crear cuenta'}
            {isRegister && step === 2 && '¿Completamos tu perfil?'}
            {isRegister && step === 3 && 'Contanos de vos'}
          </h1>

          <div className="home-logo">
            Train<span className="home-logo-acento">Up</span>
          </div>
        </div>

        <div className="login-tabs" role="tablist" aria-label="Modo de acceso">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            onClick={() => switchMode('register')}
          >
            Registro
          </button>
        </div>

        {isRegister && (
          <div className="login-progress" aria-label={`Serie ${step} de ${totalSteps}`}>
            <div className="login-progress-track">
              {stepLabels.map((label, i) => {
                const n = i + 1;
                const state = n < step ? 'done' : n === step ? 'active' : 'upcoming';
                return (
                  <div className={`login-progress-seg login-progress-seg--${state}`} key={label}>
                    <span className="login-progress-dot">{state === 'done' ? <Check size={12} /> : n}</span>
                    <span className="login-progress-label">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-message">{message}</p>}

        {/* ---------- LOGIN ---------- */}
        {!isRegister && (
          <form className="login-form" onSubmit={handleLogin}>
            <label className="login-field">
              <span>Email</span>
              <div className="login-input">
                <Mail size={18} />
                <input
                  autoComplete="email"
                  inputMode="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@gmail.com"
                  type="email"
                  value={email}
                />
              </div>
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <div className="login-input">
                <Lock size={18} />
                <input
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
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

            <button className="btns acento" disabled={loading} type="submit">
              {loading ? <Loader2 size={18} className="login-spin" /> : ""}
              {loading ? 'Validando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* ---------- REGISTRO PASO 1 ---------- */}
        {isRegister && step === 1 && (
          <form className="login-form" onSubmit={handleStep1Submit}>
            <label className="login-field">
              <span>Nombre</span>
              <div className="login-input">
                <User size={18} />
                <input
                  autoComplete="given-name"
                  onChange={(e) => updateProfile('nombre', e.target.value)}
                  placeholder="Tu nombre"
                  type="text"
                  value={profile.nombre}
                />
              </div>
            </label>

            <label className="login-field">
              <span>Email</span>
              <div className="login-input">
                <Mail size={18} />
                <input
                  autoComplete="email"
                  inputMode="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  type="email"
                  value={email}
                />
              </div>
            </label>

            <label className="login-field">
              <span>Contraseña</span>
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

            <button className="btns acento login" disabled={loading} type="submit">
              {loading ? 'Creando cuenta...' : 'Continuar'}
              {!loading && <ChevronRight size={16} />}
            </button>
          </form>
        )}

        {/* ---------- REGISTRO PASO 2 ---------- */}
        {isRegister && step === 2 && (
          <div className="login-form">
            <p className="header-sub">
              Podés cargar tu altura, peso y objetivo ahora, o hacerlo más tarde desde Ajustes.
              Te va a servir para personalizar tus rutinas.
            </p>
            <div className="login-choice-cards">
              <button type="button" className="login-choice-card" onClick={handleWantsProfile}>
                <div className='card-cont-login'>
                  <h3 className="login-choice-title">Completar perfil</h3>
                </div>
                <span className="header-sub">2 minutos, te lo recordamos si lo dejás a medias</span>
              </button>
              <button type="button" className="login-choice-card login-choice-card--muted" onClick={handleSkipProfile}>
                <h3 className="login-choice-title">Más tarde</h3>
                <span className="header-sub">Vas directo al inicio</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------- REGISTRO PASO 3 ---------- */}
        {isRegister && step === 3 && (
          <form className="login-form" onSubmit={handleProfileSubmit}>
            <div className="login-field-row">
              <label className="login-field">
                <span>Nombre</span>
                <div className="login-input step3">
                  <User size={18} />
                  <input
                    onChange={(e) => updateProfile('nombre', e.target.value)}
                    type="text"
                    value={profile.nombre}
                  />
                </div>
              </label>
              <label className="login-field">
                <span>Apellido</span>
                <div className="login-input step3">
                  <User size={18} />
                  <input
                    onChange={(e) => updateProfile('apellido', e.target.value)}
                    placeholder="Opcional"
                    type="text"
                    value={profile.apellido}
                  />
                </div>
              </label>
            </div>

            <div className="login-field-row">
              <label className="login-field">
                <span>Fecha de nacimiento</span>
                <div className="login-input step3">
                  <input
                    onChange={(e) => updateProfile('fechaNacimiento', e.target.value)}
                    type="date"
                    value={profile.fechaNacimiento}
                  />
                </div>
              </label>
              <label className="login-field">
                <span>Género</span>
                <div className="login-input login-input--select step3">
                  <select
                    onChange={(e) => updateProfile('genero', e.target.value)}
                    value={profile.genero}
                  >
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
                    onChange={(e) => updateProfile('alturaCm', e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="175"
                    type="text"
                    value={profile.alturaCm}
                  />
                </div>
              </label>
              <label className="login-field">
                <span>Peso (kg)</span>
                <div className="login-input step3">
                  <Scale size={18} />
                  <input
                    inputMode="decimal"
                    onChange={(e) => updateProfile('pesoKg', e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="70"
                    type="text"
                    value={profile.pesoKg}
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
                    onClick={() => updateProfile('objetivo', value)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="login-field" >
              <span>¿Cuántos días por semana entrenás?</span>
              <div className="dias-selector">
                {DIAS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`dia-chip${Number(profile.diasEntrenamiento) === n ? ' activo' : ''}`}
                    onClick={() => updateProfile('diasEntrenamiento', String(n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="login-step-actions">
              <button type="button" className="btns agregar login-btn" onClick={() => setStep(2)}>
                <ChevronLeft size={16} />
                Atrás
              </button>
              <button className="btns primario" disabled={loading} type="submit">
                {loading ? <Loader2 size={18} className="login-spin" /> : <Check size={18} />}
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
