import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { sileo, Toaster } from "sileo";
import TabBar from './components/tabbars/tabBar';
import RutinaPage from './components/rutinas/rutinaPage';
import RutinaDetalle from './components/rutinas/rutinaDetalle';
import RutinaCrear from './components/rutinas/rutinaCrear';
import RutinaCurso from './components/rutinas/RutinaCurso';
import HistorialPage from './components/historial/historialPage';
import HistorialDetalle from './components/historial/HistorialDetalle';
import { scheduleReminderPush, cancelReminderPush } from './utils/push';
import BackupModal from './components/modales/BackupModal';
import { encodeBackup, decodeBackup, downloadJSON, readJSONFile } from './utils/backup';
import HomePage from "./components/home/Homepage"
import MiPerfil from './components/mensajes/Miperfil';
import Login from './components/login/Login';
import { supabase } from './lib/supabaseClient';
import { ensureUserProfile } from './lib/profile';
import {
  fetchMySharedRoutines,
  createSharedRoutine,
  addSharedExercise,
  inviteByEmail,
  upsertMySets,
  fetchPendingInvites,
  respondInvite,
  requestRoutineDeletion,
  fetchPendingRoutineDeletions,
  voteRoutineDeletion,
  inviteFriendToSharedRoutine,
  requestExerciseRemoval,
  getMembersProfiles,
  deleteSharedRoutineDirect,
  requestRoutineEdit,
  fetchPendingRoutineEdits,
  voteRoutineEdit,
  startLiveSession,
  endLiveSession,
} from './lib/sharedRoutines';
import {
  fetchUserData,
  migrateLocalDataIfNeeded,
  syncRoutines,
  syncHistory,
  syncCustomExercises,
  syncSettings,
} from './lib/db';
import { EXERCISES_DB } from './data/exercises';
import { uid } from './utils/id';
import { playBeep } from './utils/audio';
import { encodeRoutine, decodeRoutine } from './utils/share'; // NUEVO
import "./App.css"
import "../index.css"
import Ajustes from './components/ajustes/ajustes';
import ProximamentePage from './components/proximamente';
import Perfil from './components/perfil/perfil';
import { openDescansoToast } from './components/modales/descansoToastModal';
import openTiempoDescansoToast, { resetDescansoState, DescansoBarraFija } from './components/tabbars/TiempoDescansoToast';
import MiniSesionBar from "./components/tabbars/MiniSesionBar";
import PageSkeleton from './components/PageSkeleton';
import { ClipboardCopy, Copy, LogOut, Pencil, Share2, Trash2 } from 'lucide-react';
import { flushSync } from 'react-dom';
import OnboardingTour from './components/Onboarding/Onboardingtour';
import Mensajes from './components/mensajes/Mensajes';
import ResetPassword from './components/login/ResetPassword';
import PerfilPublico from './components/mensajes/perfilPublico';
import Logo from '../public/logo';
import { heartbeat } from './lib/social';

export default function App() {
  const [authSession, setAuthSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  const [partnerProgress, setPartnerProgress] = useState(null); // { name, doneSets, totalSets }
  const liveChannelRef = useRef(null);
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [history, setHistory] = useState([]);
  const [customExercises, setCustomExercises] = useState([])
  const [pendingRoutineEdits, setPendingRoutineEdits] = useState([]);;
  const [restDefault, setRestDefault] = useState(90);
  const [loaded, setLoaded] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [autoOpenResumen, setAutoOpenResumen] = useState(false);
  const [backupModal, setBackupModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  // junto a los otros estados
  const [registering, setRegistering] = useState(false);
  const [votingEditId, setVotingEditId] = useState(null);

  const [viewingProfileId, setViewingProfileId] = useState(null);
  // ★ NUEVO: rutinas en conjunto
  const [sharedRoutines, setSharedRoutines] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingRoutineDeletions, setPendingRoutineDeletions] = useState([]);
  const [activeMembersProfiles, setActiveMembersProfiles] = useState([]);
  const [activeRoutineId, setActiveRoutineId] = useState(null);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [editorDraft, setEditorDraft] = useState(null);
  const [reminderTime, setReminderTime] = useState('10:00');
  const [reminderPushId, setReminderPushId] = useState(null);
  const [session, setSession] = useState(null);
  const [kebabOpen, setKebabOpen] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerSelection, setPickerSelection] = useState(new Set());
  const [replaceIndex, setReplaceIndex] = useState(null);
  const [pickerContext, setPickerContext] = useState('editor');

  const [restTimer, setRestTimer] = useState(null);
  const restIntervalRef = useRef(null);
  const saveTimerRef = useRef(null);
  const prevRoutineIds = useRef(new Set());
  const prevHistoryIds = useRef(new Set());
  const prevExerciseIds = useRef(new Set());

  const allExercises = [...EXERCISES_DB, ...customExercises];
  const findExercise = (id) => allExercises.find(e => e.id === id);

  const [pendingSaveChoice, setPendingSaveChoice] = useState(null);

  const [modoOscuro, setModoOscuro] = useState(true);
  const [acento, setAcento] = useState('acento-rosa');
  const [toasterPosition, setToasterPosition] = useState('bottom');
  const [swipeGestures, setSwipeGestures] = useState(true);
  const [swipeLeftAction, setSwipeLeftAction] = useState('delete');
  const [swipeRightAction, setSwipeRightAction] = useState('edit');

  const ACENTOS_IDS = ['acento-verde', 'acento-celeste', 'acento-naranja', 'acento-violeta'];

  const [screen, setScreenState] = useState('home');
  const [pendingLiveInvite, setPendingLiveInvite] = useState(null);


  const setScreen = useCallback((next) => {
    const apply = () => setScreenState(next);

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(apply);
      });
    } else {
      apply();
    }
  }, []);

  const sessionRef = useRef(null);
  const lastSavedSessionRef = useRef(null);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const r = await window.storage.get('gym_onboarding_seen', false);
        setOnboardingSeen(!!r?.value);
      } catch (e) {
        setOnboardingSeen(false); // si no existe la key, no lo vio -> mostramos el tour
      }
    })();
  }, [loaded]);


  useEffect(() => {
    if (!supabase || !session?.isSharedRoutine) {
      if (liveChannelRef.current) {
        supabase?.removeChannel(liveChannelRef.current);
        liveChannelRef.current = null;
      }
      setPartnerProgress(null);
      return;
    }

    const channel = supabase.channel(`session-progress-${session.routineId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        if (payload.userId === authSession?.user?.id) return;
        setPartnerProgress(payload);
      })
      .on('broadcast', { event: 'pause' }, ({ payload }) => {
        if (payload.userId === authSession?.user?.id) return;
        setSession(s => (s ? { ...s, paused: payload.paused, pausedAt: payload.pausedAt, pausedMs: payload.pausedMs } : s));
      })
      .subscribe();

    liveChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      liveChannelRef.current = null;
      setPartnerProgress(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.isSharedRoutine, session?.routineId, authSession?.user?.id]);

  useEffect(() => {
    if (!session?.isSharedRoutine || !liveChannelRef.current) return;
    let total = 0, done = 0;
    session.exercises.forEach(ex => {
      total += ex.sets.length;
      done += ex.sets.filter(st => st.done).length;
    });
    const t = setTimeout(() => {
      liveChannelRef.current?.send({
        type: 'broadcast',
        event: 'progress',
        payload: {
          userId: authSession.user.id,
          name: authSession.user.user_metadata?.nombre || authSession.user.email,
          doneSets: done,
          totalSets: total,
        },
      });
    }, 300);
    return () => clearTimeout(t);
  }, [session?.exercises, session?.isSharedRoutine]);

  useEffect(() => {
    if (!supabase || sharedRoutines.length === 0) return;
    const ids = sharedRoutines.map(r => r.id);

    const handleChange = (payload) => {
      const row = payload.new;
      if (row.status !== 'active') return;          // ★ ignorar el UPDATE de "ended"
      if (row.started_by === authSession.user.id) return;
      if (session) return;
      const r = sharedRoutines.find(x => x.id === row.shared_routine_id);
      if (!r) return;
      setPendingLiveInvite({
        sharedRoutineId: row.shared_routine_id,
        routineName: r.name,
        startedAt: new Date(row.started_at).getTime(),
        startedBy: row.started_by,
      });
    };

    const channel = supabase.channel('live-sessions')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'shared_routine_live_sessions',
        filter: `shared_routine_id=in.(${ids.join(',')})`,
      }, handleChange)
      .on('postgres_changes', {                      // ★ NUEVO: también escuchar UPDATE
        event: 'UPDATE', schema: 'public', table: 'shared_routine_live_sessions',
        filter: `shared_routine_id=in.(${ids.join(',')})`,
      }, handleChange)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sharedRoutines, session, authSession?.user?.id]);

  async function finishOnboarding() {
    setOnboardingSeen(true);
    try { await window.storage.set('gym_onboarding_seen', 'true', false); } catch (e) { }
  }

  // ★ NUEVO
  useEffect(() => {
    const shared = sharedRoutines.find(r => r.id === activeRoutineId);
    if (!shared) { setActiveMembersProfiles([]); return; }
    getMembersProfiles(shared.members || []).then(({ data }) => {
      setActiveMembersProfiles(data || []);
    });
  }, [activeRoutineId, sharedRoutines]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const AUTOSAVE_INTERVAL_MS = 5000;

    const id = setInterval(async () => {
      const current = sessionRef.current;
      const serialized = current ? JSON.stringify(current) : null;

      // Evitamos escribir en storage si no cambió nada desde el último guardado
      if (serialized === lastSavedSessionRef.current) return;
      lastSavedSessionRef.current = serialized;

      try {
        if (serialized) {
          await window.storage.set('gym_active_session', serialized, false);
        } else {
          await window.storage.delete('gym_active_session', false);
        }
      } catch (e) {
        console.error('Error autoguardando sesión en curso:', e);
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setAuthSession(data.session);
        setAuthLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);


  function openProfileScreen(id) {
    setViewingProfileId(id);
    setScreen('perfilPublico');
  }

  useEffect(() => {
    const match = window.location.pathname.match(/^\/perfil\/([^/]+)$/);

    if (!match) return;

    const profileId = match[1];

    setViewingProfileId(profileId);
    setScreen('perfilPublico');
  }, []);


  useEffect(() => {
    if (!authSession?.user) return;

    ensureUserProfile(authSession.user).then(({ error }) => {
      if (error) console.error('Profile sync error:', error);
    });
  }, [authSession?.user?.id]);

  useEffect(() => {
    document.documentElement.classList.toggle('claro', !modoOscuro);
  }, [modoOscuro]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(e => console.error('SW error:', e));
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...ACENTOS_IDS);
    html.classList.add(acento);
  }, [acento]);

  // ---------- load desde Supabase + migración one-time ----------
  useEffect(() => {
    if (!supabase || !authSession?.user?.id) return;
    let cancelled = false;

    (async () => {
      setLoaded(false);
      const userId = authSession.user.id;

      await migrateLocalDataIfNeeded(userId);
      const data = await fetchUserData(userId);
      if (cancelled || !data) return;

      setRoutines(data.routines);
      setHistory(data.history);
      setCustomExercises(data.customExercises);
      const { data: shared } = await fetchMySharedRoutines(userId);
      if (!cancelled) setSharedRoutines(shared || []);

      const { data: invites } = await fetchPendingInvites(userId, authSession.user.email);
      if (!cancelled) setPendingInvites(invites || []);

      const sharedIds = (shared || []).map(r => r.id);
      if (sharedIds.length) {
        const { data: dels } = await fetchPendingRoutineDeletions(sharedIds, userId);
        if (!cancelled) setPendingRoutineDeletions(dels || []);
        const { data: edits } = await fetchPendingRoutineEdits(sharedIds, userId);
        if (!cancelled) setPendingRoutineEdits(edits || []);
      }
      prevRoutineIds.current = new Set(data.routines.map(r => r.id));
      prevHistoryIds.current = new Set(data.history.map(h => h.id));
      prevExerciseIds.current = new Set(data.customExercises.map(e => e.id));

      if (data.settings) {
        setRestDefault(data.settings.restDefault);
        setReminderEnabled(data.settings.reminderEnabled);
        setReminderTime(data.settings.reminderTime);
        setModoOscuro(data.settings.modoOscuro);
        setAcento(data.settings.acento);
        setToasterPosition(data.settings.toasterPosition);
        setSwipeGestures(data.settings.swipeGestures);
        setSwipeLeftAction(data.settings.swipeLeftAction);
        setSwipeRightAction(data.settings.swipeRightAction);
      }

      // el id de push notification es por dispositivo, sigue local
      try {
        const r = await window.storage.get('gym_reminder_push_id', false);
        if (r?.value) setReminderPushId(JSON.parse(r.value));
      } catch (e) { }

      if (!cancelled) setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [authSession?.user?.id]);

  // ---------- limpiar estado al cerrar sesión ----------
  useEffect(() => {
    if (authSession) return;
    setRoutines([]);
    setHistory([]);
    setCustomExercises([]);
    setSharedRoutines([]);       // ★ NUEVO
    setPendingInvites([]);       // ★ NUEVO
    setPendingRoutineDeletions([]); // ★ NUEVO
    setPendingRoutineEdits([]);
    prevRoutineIds.current = new Set();
    prevHistoryIds.current = new Set();
    prevExerciseIds.current = new Set();
    setLoaded(false);
  }, [authSession]);

  // ---------- persist (debounced) ----------
  useEffect(() => {
    if (!loaded || !authSession?.user?.id) return;
    clearTimeout(saveTimerRef.current);
    const userId = authSession.user.id;

    saveTimerRef.current = setTimeout(async () => {
      try { await window.storage.set('gym_reminder_push_id', JSON.stringify(reminderPushId), false); } catch (e) { console.error(e); }

      try { prevRoutineIds.current = await syncRoutines(userId, routines, prevRoutineIds.current); } catch (e) { console.error(e); }
      try { prevHistoryIds.current = await syncHistory(userId, history, prevHistoryIds.current); } catch (e) { console.error(e); }
      try { prevExerciseIds.current = await syncCustomExercises(userId, customExercises, prevExerciseIds.current); } catch (e) { console.error(e); }

      try {
        await syncSettings(userId, {
          restDefault, reminderEnabled, reminderTime, modoOscuro, acento,
          toasterPosition, swipeGestures, swipeLeftAction, swipeRightAction,
        });
      } catch (e) { console.error(e); }
    }, 350);
  }, [
    routines, history, customExercises, restDefault, loaded,
    reminderTime, reminderEnabled, reminderPushId, modoOscuro, acento,
    toasterPosition, swipeGestures, swipeLeftAction, swipeRightAction,
    authSession?.user?.id,
  ]);

  const showToast = useCallback((msg, type = 'success') => {
    sileo[type]({
      title: msg,
      duration: 3000,
      ...(type === 'error' && {
        description: 'Inténtalo de nuevo.',
      }),
    });
  }, []);


  useEffect(() => {
    if (!loaded) return;
    if (session) return; // ya hay una sesión activa en memoria

    (async () => {
      try {
        const r = await window.storage.get('gym_active_session', false);
        if (r?.value) {
          const recovered = JSON.parse(r.value);
          if (recovered?.exercises) {
            setSession(recovered);
            lastSavedSessionRef.current = r.value;
            setScreen('session');
            showToast('Recuperamos tu entrenamiento en curso');
          }
        }
      } catch (e) {
        // no había ninguna sesión guardada, no hacemos nada
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ---------- NUEVO: importar rutina desde link (?import=CODE) ----------

  useEffect(() => {
    if (!loaded) return;

    if (!reminderEnabled) {
      if (reminderPushId) {
        cancelReminderPush(reminderPushId);
        setReminderPushId(null);
      }
      return;
    }

    const routinesConDias = routines
      .filter(r => r.days?.length > 0)
      .map(r => ({ id: r.id, name: r.name, days: r.days }));

    if (routinesConDias.length === 0) {
      if (reminderPushId) {
        cancelReminderPush(reminderPushId);
        setReminderPushId(null);
      }
      return;
    }

    const [hh, mm] = reminderTime.split(':').map(Number);
    scheduleReminderPush({
      hour: hh,
      minute: mm,
      routines: routinesConDias,
      id: reminderPushId || undefined,
    }).then(id => {
      if (id && id !== reminderPushId) setReminderPushId(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, routines, reminderTime, reminderEnabled]);

  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const openRoutineId = params.get('openRoutine');
    if (!openRoutineId) return;

    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    if (openRoutineId === 'today') {
      setScreen('routines'); // la propia RutinaPage ya resalta "hoy toca"
      return;
    }
    const found = routines.find(r => r.id === openRoutineId);
    if (found) {
      setActiveRoutineId(found.id);
      setScreen('routineDetail');
    }
  }, [loaded, routines]);

  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('import');
    if (!code) return;

    // Limpiamos la URL enseguida para que un refresh no vuelva a importar.
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    const decoded = decodeRoutine(code);
    if (!decoded) {
      showToast('El link de rutina no es válido', 'error');
      return;
    }

    let name = decoded.name || 'Rutina importada';
    const nameExists = (n) => routines.some(r => r.name === n);
    if (nameExists(name)) {
      let candidate = `${name} (copia)`;
      let i = 2;
      while (nameExists(candidate)) {
        candidate = `${name} (copia ${i})`;
        i++;
      }
      name = candidate;
    }

    const newRoutine = {
      id: uid(),
      name,
      exercises: decoded.exercises.map(ex => ({
        id: uid(),
        name: ex.name,
        muscle: ex.muscle || '',
        rest: ex.rest || '',
        sets: (ex.sets || []).map(s => ({ id: uid(), reps: s.reps || '', weight: s.weight || '' }))
      }))
    };

    setRoutines(rs => [...rs, newRoutine]);
    setActiveRoutineId(newRoutine.id);
    setScreen('routineDetail');
    showToast(`Rutina importada: ${name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ---------- rest timer clock ----------
  useEffect(() => {
    clearInterval(restIntervalRef.current);
    if (restTimer && restTimer.running && restTimer.remaining > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestTimer(rt => {
          if (!rt) return rt;
          const next = rt.remaining - 1;
          if (next <= 0) {
            playBeep();
            return { ...rt, remaining: 0, running: false };
          }
          return { ...rt, remaining: next };
        });
      }, 1000);
    }
    return () => clearInterval(restIntervalRef.current);
  }, [restTimer && restTimer.running, restTimer && restTimer.key]);

  // ---------- guards ----------
  useEffect(() => {
    if (
      screen === 'routineDetail' &&
      !routines.find(x => x.id === activeRoutineId) &&
      !sharedRoutines.find(x => x.id === activeRoutineId)
    ) {
      setScreen('routines');
    }
  }, [screen, routines, sharedRoutines, activeRoutineId]);

  useEffect(() => {
    if (screen === 'historyDetail' && !history.find(x => x.id === activeHistoryId)) {
      setScreen('history');
    }
  }, [screen, history, activeHistoryId]);

  useEffect(() => {
    if (!supabase || !authSession?.user?.id) return;

    const send = () => heartbeat().catch(() => { });
    send();
    const id = setInterval(send, 2 * 60 * 1000); // cada 2 minutos

    return () => clearInterval(id);
  }, [authSession?.user?.id]);

  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const rCode = params.get('importRoutines');
    const hCode = params.get('importHistory');
    if (!rCode && !hCode) return;

    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    if (rCode) finishImportParse('routines', decodeBackup(rCode));
    else if (hCode) finishImportParse('history', decodeBackup(hCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function startRest(seconds) {
    openTiempoDescansoToast(seconds);
  }

  function updateSessionRest(exi, value) {
    setSession(s => {
      if (!s) return s;
      const next = JSON.parse(JSON.stringify(s));
      next.exercises[exi].rest = value;
      return next;
    });
  }

  function adjustRest(delta) {
    setRestTimer(rt => {
      if (!rt) return rt;
      const remaining = Math.max(0, rt.remaining + delta);
      const total = Math.max(rt.total, remaining);
      return { ...rt, remaining, total };
    });
  }
  function toggleRestPause() {
    setRestTimer(rt => rt ? { ...rt, running: !rt.running } : rt);
  }
  function dismissRest() {
    setRestTimer(null);
  }

  function openEditor(routineId, initialMode) { // ★ agregado initialMode
    if (routineId) {
      const r = routines.find(x => x.id === routineId);
      const baseExercises = r.tempOverride?.exercises || r.exercises;
      setEditorDraft({
        ...JSON.parse(JSON.stringify(r)),
        exercises: JSON.parse(JSON.stringify(baseExercises)),
        mode: 'full',
        days: r.days || [],
      });
    } else {
      setEditorDraft({
        id: null, name: '', exercises: [], mode: 'full', days: [], reminderTime: '',
        isShared: initialMode === 'conjunto', // ★ NUEVO
      });
    }
    setKebabOpen(false);
    setScreen('routineEditor');
  }

  // ★ NUEVO: abrir editor de una rutina compartida existente
  function openSharedEditor(sharedRoutineId) {
    const r = sharedRoutines.find(x => x.id === sharedRoutineId);
    if (!r) return;
    setEditorDraft({
      ...JSON.parse(JSON.stringify(r)),
      isShared: true,
      mode: 'full',
      days: r.days || [],
      createdBy: r.createdBy,
    });
    setScreen('routineEditor');
  }

  function addDraftInviteEmail(email) {
    setEditorDraft(d => {
      if (!d) return d;
      const emails = new Set(d.pendingInviteEmails || []);
      emails.add(email);
      return { ...d, pendingInviteEmails: [...emails] };
    });
  }

  function removeDraftInviteEmail(email) {
    setEditorDraft(d => {
      if (!d) return d;
      const emails = (d.pendingInviteEmails || []).filter(e => e !== email);
      return { ...d, pendingInviteEmails: emails };
    });
  }
  function toggleDraftInvitee(friendId) {
    setEditorDraft(d => {
      if (!d) return d;
      const ids = new Set(d.pendingInviteIds || []);
      ids.has(friendId) ? ids.delete(friendId) : ids.add(friendId);
      return { ...d, pendingInviteIds: [...ids] };
    });
  }

  // ★ NUEVO
  function changeDraftMode(newMode) {
    setEditorDraft(d => d ? { ...d, isShared: newMode === 'conjunto' } : d);
  }

  function openSessionExerciseEditor(exi) {
    if (!session) return;
    const ex = session.exercises[exi];
    setEditorDraft({
      id: session.routineId,
      name: session.routineName,
      mode: 'single',
      sessionExerciseIndex: exi,
      exercises: [JSON.parse(JSON.stringify(ex))]
    });
    setScreen('routineEditor');
  }

  function saveDraft() {
    const d = editorDraft;

    if (d.mode === 'single') {
      // ... esto queda exactamente igual, no cambia nada
      const editedEx = d.exercises[0];
      if (!editedEx.sets || editedEx.sets.length === 0) {
        sileo.error({ title: 'Añade al menos una serie.' });
        return;
      }
      setSession(s => {
        const next = JSON.parse(JSON.stringify(s));
        const oldEx = next.exercises[d.sessionExerciseIndex];
        const oldSetsById = new Map((oldEx.sets || []).map(st => [st.id, st]));
        next.exercises[d.sessionExerciseIndex] = {
          ...oldEx,
          name: editedEx.name,
          muscle: editedEx.muscle,
          rest: editedEx.rest,
          sets: editedEx.sets.map(st => {
            const prev = oldSetsById.get(st.id);
            return { id: st.id, reps: st.reps, weight: st.weight, done: prev ? prev.done : false };
          })
        };
        return next;
      });
      setEditorDraft(null);
      showToast('Ejercicio actualizado');
      setScreen('session');
      return;
    }

    if (!d.name || !d.name.trim()) {
      sileo.error({ title: 'Ponle un nombre a la rutina.' });
      return;
    }
    if (d.exercises.length === 0) {
      sileo.error({ title: 'Añade al menos un ejercicio.' });
      return;
    }
    const { mode, ...toSave } = d;

    // rutina nueva -> se guarda derecho, no aplica lo de "para siempre / solo hoy"
    if (!toSave.id) {
      // rama de rutina en conjunto NUEVA -> hay que crearla de verdad en Supabase
      if (toSave.isShared) {
        (async () => {
          const userId = authSession.user.id;
          const { data: created, error } = await createSharedRoutine(userId, toSave.name, toSave.days || []);
          if (error || !created) {
            showToast('No se pudo crear la rutina en conjunto', 'error');
            return;
          }
          for (let i = 0; i < toSave.exercises.length; i++) {
            await addSharedExercise(created.id, userId, toSave.exercises[i], i);
          }

          const inviteIds = toSave.pendingInviteIds || [];
          for (const friendId of inviteIds) {
            try {
              await inviteFriendToSharedRoutine(created.id, friendId, userId);
            } catch (e) {
              console.error('No se pudo invitar a', friendId, e);
            }
          }
          const inviteEmails = toSave.pendingInviteEmails || [];
          for (const em of inviteEmails) {
            try { await inviteByEmail(created.id, em, userId); }
            catch (e) { console.error('No se pudo invitar a', em, e); }
          }

          const { data: refreshed } = await fetchMySharedRoutines(userId);
          setSharedRoutines(refreshed || []);
          setEditorDraft(null);
          showToast(inviteIds.length > 0 ? 'Rutina creada e invitaciones enviadas' : 'Rutina en conjunto creada');
          setScreen('routines');
        })();
        return;
      }

      toSave.id = uid();
      setRoutines(rs => [...rs, toSave]);
      setActiveRoutineId(toSave.id);
      setEditorDraft(null);
      showToast('Rutina guardada');
      setScreen('routineDetail');
      return;
    }

    // rutina EXISTENTE en conjunto -> proponer el cambio en vez de guardar directo
    if (toSave.isShared) {
      (async () => {
        const userId = authSession.user.id;
        const { error } = await requestRoutineEdit(toSave.id, userId, {
          name: toSave.name,
          days: toSave.days,
          exercises: toSave.exercises,
        });
        if (error) { showToast('No se pudo proponer el cambio', 'error'); return; }
        setEditorDraft(null);
        showToast('Cambios enviados, esperando confirmación de los demás');
        setScreen('routineDetail');
      })();
      return;
    }

    // rutina individual existente -> preguntamos el alcance del cambio
    setPendingSaveChoice(toSave);
  }

  async function voteOnRoutineEdit(editRequestId, approve) {
    if (votingEditId) return; // ya hay un voto en curso, ignoramos el click extra
    setVotingEditId(editRequestId);
    try {
      const userId = authSession.user.id;
      const { error } = await voteRoutineEdit(editRequestId, userId, approve ? 'approve' : 'reject');
      if (error) { showToast('No se pudo registrar el voto', 'error'); return; }
      setPendingRoutineEdits(pe => pe.filter(e => e.id !== editRequestId));
      const { data: shared } = await fetchMySharedRoutines(userId);
      setSharedRoutines(shared || []);
      showToast(approve ? 'Aceptaste los cambios' : 'Rechazaste los cambios');
    } finally {
      setVotingEditId(null);
    }
  }

  function confirmSavePermanent() {
    const toSave = pendingSaveChoice;
    if (!toSave) return;
    setRoutines(rs => rs.map(r => r.id === toSave.id ? { ...toSave, tempOverride: null } : r));
    setActiveRoutineId(toSave.id);
    setEditorDraft(null);
    setPendingSaveChoice(null);
    showToast('Rutina guardada');
    setScreen('routineDetail');
  }

  function revertTempOverride(routineId) {
    setRoutines(rs => rs.map(r => r.id === routineId ? { ...r, tempOverride: null } : r));
    showToast('Cambios descartados, rutina como antes');
  }

  function confirmSaveTemporary() {
    const toSave = pendingSaveChoice;
    if (!toSave) return;
    setRoutines(rs => rs.map(r => r.id === toSave.id
      ? { ...r, tempOverride: { exercises: toSave.exercises } }
      : r
    ));
    setActiveRoutineId(toSave.id);
    setEditorDraft(null);
    setPendingSaveChoice(null);
    showToast('Cambios guardados solo para la próxima vez');
    setScreen('routineDetail');
  }

  function deleteRoutine(id) {
    const removed = routines.find(r => r.id === id);
    const removedIndex = routines.findIndex(r => r.id === id);

    const toastId = sileo.action({
      title: "¿Eliminar esta rutina?",
      description: removed?.name,
      duration: null,
      button: {
        title: "Eliminar",
        className: "btns eliminar sileo-danger",
        onClick: () => {
          setRoutines(rs => rs.filter(r => r.id !== id));
          sileo.dismiss(toastId);

          // Esperamos a que termine la animación de salida del toast de confirmación
          // antes de mostrar el de "Deshacer", para que no se pisen visualmente.
          setTimeout(() => {
            const undoToastId = sileo.action({
              description: removed?.name,
              duration: 5000,
              button: {
                title: 'Deshacer',
                className: 'btns agregar',
                onClick: () => {
                  setRoutines(rs => {
                    const next = [...rs];
                    const idx = Math.min(removedIndex, next.length);
                    next.splice(idx, 0, removed);
                    return next;
                  });
                  sileo.dismiss(undoToastId);
                },
              },
              styles: {
                container: "sileo-cont",
                title: "sileo-title",
                description: "sileo-description",
                button: "btns agregar sileo",
              },
            });
          }, 300);
        },
      },
      styles: {
        container: "sileo-cont-danger",
        title: "sileo-title-danger",
        description: "sileo-description",
        button: "btns eliminar sileo-danger",
      },
    });
  }
  function duplicateRoutine(id) {
    const r = routines.find(x => x.id === id);
    if (!r) return;
    const copy = JSON.parse(JSON.stringify(r));
    copy.id = uid();
    copy.name = copy.name + ' (copia)';
    copy.exercises.forEach(ex => { ex.id = uid(); ex.sets.forEach(s => s.id = uid()); });
    setRoutines(rs => [...rs, copy]);
    setKebabOpen(false);
    showToast('Rutina duplicada');
  }

  function importSharedRoutine(routineData) {
    let name = routineData.name || 'Rutina compartida';
    const nameExists = (n) => routines.some(r => r.name === n);
    if (nameExists(name)) {
      let candidate = `${name} (compartida)`;
      let i = 2;
      while (nameExists(candidate)) {
        candidate = `${name} (compartida ${i})`;
        i++;
      }
      name = candidate;
    }
    const newRoutine = {
      id: uid(),
      name,
      exercises: (routineData.exercises || []).map(ex => ({
        id: uid(),
        name: ex.name,
        muscle: ex.muscle || '',
        rest: ex.rest || '',
        sets: (ex.sets || []).map(s => ({ id: uid(), reps: s.reps || '', weight: s.weight || '' })),
      })),
    };
    setRoutines(rs => [...rs, newRoutine]);
    showToast(`Rutina agregada: ${name}`);
  }

  // ---------- NUEVO: renombrar rápido ----------
  function renameRoutineQuick(routineId, newName) {
    if (!newName || !newName.trim()) return;
    const r = routines.find(x => x.id === routineId);
    if (!r) return;
    const trimmed = newName.trim();
    if (trimmed === r.name) return;

    setRoutines(rs => rs.map(x => x.id === routineId ? { ...x, name: trimmed } : x));
    showToast('Nombre actualizado');
  }

  function getSwipeActionFor(actionId, routineId) {
    switch (actionId) {
      case 'edit': return { icon: <Pencil size={18} />, onTrigger: () => openEditor(routineId), className: 'style-neutral' };
      case 'delete': return { icon: <Trash2 size={18} />, onTrigger: () => deleteRoutine(routineId), className: 'style-danger' };
      case 'duplicate': return { icon: <Copy size={18} />, onTrigger: () => duplicateRoutine(routineId), className: 'style-neutral' };
      case 'share': return { icon: <Share2 size={18} />, onTrigger: () => shareRoutine(routineId), className: 'style-neutral' };
      case 'copyText': return { icon: <ClipboardCopy size={18} />, onTrigger: () => copyRoutineAsText(routineId), className: 'style-neutral' };
      case 'rename': return { icon: <Pencil size={18} />, onTrigger: () => renameRoutineQuickPrompt(routineId), className: 'style-neutral' };
      default: return null;
    }
  }

  // ---------- NUEVO: compartir por link ----------
  async function shareRoutine(routineId) {
    const r = routines.find(x => x.id === routineId);
    if (!r) return;
    setKebabOpen(false);
    const code = encodeRoutine(r);
    const url = `${window.location.origin}${window.location.pathname}?import=${code}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Rutina: ${r.name}`, text: `Mira mi rutina "${r.name}"`, url });
        return;
      } catch (e) {
        // el usuario canceló el share sheet o falló; probamos copiar el link igual
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado al portapapeles');
    } catch (e) {
      showToast('No se pudo compartir el link', 'error');
    }
  }

  // ---------- NUEVO: copiar rutina como texto ----------
  async function copyRoutineAsText(routineId) {
    const r = routines.find(x => x.id === routineId);
    if (!r) return;
    const lines = [r.name, ''];
    r.exercises.forEach(ex => {
      lines.push(`${ex.name}${ex.muscle ? ' (' + ex.muscle + ')' : ''}`);
      ex.sets.forEach((s, i) => {
        lines.push(`  Serie ${i + 1}: ${s.weight || 0} kg × ${s.reps || 0} reps`);
      });
      lines.push('');
    });
    const text = lines.join('\n').trim();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Rutina copiada como texto');
    } catch (e) {
      showToast('No se pudo copiar', 'error');
    }
  }


  function extractBackupCode(text, kind) {
    const paramName = kind === 'routines' ? 'importRoutines' : 'importHistory';
    try {
      const url = new URL(text);
      const fromUrl = url.searchParams.get(paramName);
      if (fromUrl) return fromUrl;
    } catch (e) { /* no era una URL completa, tratamos el texto como el código pelado */ }
    return text;
  }

  function finishImportParse(kind, parsed) {
    const list = Array.isArray(parsed?.[kind === 'routines' ? 'routines' : 'history'])
      ? parsed[kind === 'routines' ? 'routines' : 'history']
      : (Array.isArray(parsed) ? parsed : null);

    if (!list || list.length === 0) {
      showToast('No se pudo leer el contenido importado', 'error');
      return;
    }
    setBackupModal(null);
    setPendingImport({ kind, data: list });
  }

  function handleImportText(text) {
    const kind = backupModal.kind;
    const code = extractBackupCode(text, kind);
    finishImportParse(kind, decodeBackup(code));
  }




  async function handleImportFile(file) {
    const kind = backupModal.kind;
    try {
      finishImportParse(kind, await readJSONFile(file));
    } catch (e) {
      showToast('El archivo no es válido', 'error');
    }
  }

  function handleExportFile() {
    const kind = backupModal.kind;
    if (kind === 'routines') {
      downloadJSON({ type: 'routines_backup', version: 1, exportedAt: Date.now(), routines }, `TrainUp-backup-${Date.now()}.json`);
    } else {
      downloadJSON({ type: 'history_backup', version: 1, exportedAt: Date.now(), history }, `historial-backup-${Date.now()}.json`);
    }
    showToast('Archivo descargado');
    setBackupModal(null);
  }

  async function handleExportLink() {
    const kind = backupModal.kind;
    const payload = kind === 'routines'
      ? { type: 'routines_backup', version: 1, routines }
      : { type: 'history_backup', version: 1, history };
    const code = encodeBackup(payload);
    const paramName = kind === 'routines' ? 'importRoutines' : 'importHistory';
    const url = `${window.location.origin}${window.location.pathname}?${paramName}=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado al portapapeles');
    } catch (e) {
      showToast('No se pudo copiar el link', 'error');
    }
    setBackupModal(null);
  }

  function confirmImportReplace() {
    const { kind, data } = pendingImport;
    if (kind === 'routines') setRoutines(data);
    else setHistory([...data].sort((a, b) => b.date - a.date));
    setPendingImport(null);
    showToast(kind === 'routines' ? `Rutinas reemplazadas (${data.length})` : `Historial reemplazado (${data.length})`);
  }

  function confirmImportMerge() {
    const { kind, data } = pendingImport;
    if (kind === 'routines') {
      setRoutines(rs => {
        const existingIds = new Set(rs.map(r => r.id));
        const existingNames = new Set(rs.map(r => r.name));
        const added = data.map(r => {
          if (!existingIds.has(r.id)) return r;
          let name = r.name, i = 2;
          while (existingNames.has(name)) { name = `${r.name} (importada ${i})`; i++; }
          existingNames.add(name);
          return { ...r, id: uid(), name };
        });
        return [...rs, ...added];
      });
    } else {
      setHistory(h => {
        const existingIds = new Set(h.map(e => e.id));
        const added = data.filter(e => !existingIds.has(e.id));
        return [...h, ...added].sort((a, b) => b.date - a.date);
      });
    }
    setPendingImport(null);
    showToast(kind === 'routines' ? 'Rutinas agregadas' : 'Historial agregado');
  }

  function saveReminder(routineId, days) {
    setRoutines(rs => rs.map(r => r.id === routineId ? { ...r, days } : r));
    showToast('Recordatorio guardado');
  }
  function clearReminder(routineId) {
    setRoutines(rs => rs.map(r => r.id === routineId ? { ...r, days: [] } : r));
    showToast('Recordatorio eliminado', 'warning');
  }


  function startSession(routineId, opts = {}) {
    const shared = sharedRoutines.find(x => x.id === routineId);
    const r = shared || routines.find(x => x.id === routineId);
    if (!r) return;

    if (session) {
      if (session.routineId === routineId) {
        setScreen('session');
        return;
      }
      showToast('Ya tenés una rutina en curso. Finalizala o cancelala antes de empezar otra.', 'error');
      return;
    }

    if (shared) {
      setActiveRoutineId(r.id);
    }


    const exercisesSource = r.tempOverride?.exercises || r.exercises;
    const startedAt = opts.startedAt || Date.now();

    setSession({
      isSharedRoutine: !!shared,
      sharedMembers: shared?.members || [],
      routineId: r.id,
      routineName: r.name,
      startedAt,
      paused: false,
      pausedAt: null,
      pausedMs: 0,
      exercises: exercisesSource.map(ex => ({
        id: uid(), name: ex.name, muscle: ex.muscle, equipment: ex.equipment, gif: ex.gif, rest: ex.rest || '',
        notes: '',
        sets: ex.sets.map(s => ({
          id: uid(),
          reps: '',
          weight: '',
          placeholderReps: s.reps || '',
          placeholderWeight: s.weight || '',
          done: false
        }))
      }))
    });

    if (r.tempOverride) {
      setRoutines(rs => rs.map(x => x.id === r.id ? { ...x, tempOverride: null } : x));
    }

    // avisamos a los demás integrantes SOLO si somos quienes arrancan (no si nos estamos uniendo)
    if (shared && !opts.isJoining) {
      startLiveSession(shared.id, authSession.user.id).catch(() => { });
    }

    setRestTimer(null);
    setScreen('session');
  }

  function minimizeSession() {
    if (!session) return;
    setScreen('routines');
  }

  function quickFinishFromBar() {
    if (!session) return;
    setScreen('session');
    setAutoOpenResumen(true);
  }

  function toggleSessionPause() {
    setSession(s => {
      if (!s) return s;
      let next;
      if (s.paused) {
        const pausedDuration = Date.now() - s.pausedAt;
        next = { ...s, paused: false, pausedAt: null, pausedMs: (s.pausedMs || 0) + pausedDuration };
      } else {
        next = { ...s, paused: true, pausedAt: Date.now() };
      }
      if (next.isSharedRoutine && liveChannelRef.current) {
        liveChannelRef.current.send({
          type: 'broadcast',
          event: 'pause',
          payload: { userId: authSession.user.id, paused: next.paused, pausedAt: next.pausedAt, pausedMs: next.pausedMs },
        });
      }
      return next;
    });
    setRestTimer(rt => (rt && rt.running) ? { ...rt, running: false } : rt);
  }

  function toggleSet(exi, si, options = {}) {
    const ex = session.exercises[exi];
    const st = ex.sets[si];
    const willComplete = !st.done;

    setSession(s => {
      const next = JSON.parse(JSON.stringify(s));
      next.exercises[exi].sets[si].done = !next.exercises[exi].sets[si].done;
      return next;
    });

    if (willComplete) {
      const secondsToRest = ex.rest ? parseInt(ex.rest, 10) : restDefault;
      if (options.celebrate) {
        // Dejamos 5s libres para el toast de felicitación antes de abrir el de descanso
        setTimeout(() => {
          startRest(Math.max(0, secondsToRest - 5));
        }, 5000);
      } else {
        startRest(secondsToRest);
      }
    } else {
      resetDescansoState();
    }
  }

  function updateLiveField(exi, si, field, value) {
    const clean = value.replace(/[^0-9.]/g, '');
    setSession(s => {
      const next = JSON.parse(JSON.stringify(s));
      next.exercises[exi].sets[si][field] = clean;
      return next;
    });
  }

  function updateExerciseNotes(exi, value) {
    setSession(s => {
      const next = JSON.parse(JSON.stringify(s));
      next.exercises[exi].notes = value;
      return next;
    });
  }

  function addLiveSet(exi) {
    setSession(s => {
      const next = JSON.parse(JSON.stringify(s));
      const sets = next.exercises[exi].sets;
      const last = sets[sets.length - 1];
      sets.push({
        id: uid(),
        reps: '',
        weight: '',
        placeholderReps: last ? (last.reps || last.placeholderReps || '') : '',
        placeholderWeight: last ? (last.weight || last.placeholderWeight || '') : '',
        done: false
      });
      return next;
    });
  }

  function duplicateLiveSet(exi) {
    setSession(s => {
      const next = JSON.parse(JSON.stringify(s));
      const sets = next.exercises[exi].sets;
      const last = sets[sets.length - 1];
      if (last) sets.push({ id: uid(), reps: last.reps, weight: last.weight, done: false });
      return next;
    });
  }

  function finishSession({ guardarEnHistorial = true } = {}) {
    const s = session;
    const completedExercises = s.exercises
      .map(ex => ({
        name: ex.name,
        muscle: ex.muscle || '',
        notes: ex.notes || '',
        sets: ex.sets.filter(st => st.done)
      }))
      .filter(ex => ex.sets.length > 0);

    const totalVolume = completedExercises.reduce((sum, ex) => sum + ex.sets.reduce((a, st) => a + ((+st.weight || 0) * (+st.reps || 0)), 0), 0);
    const totalSets = completedExercises.reduce((a, ex) => a + ex.sets.length, 0);

    const debeGuardar = guardarEnHistorial && completedExercises.length > 0;

    if (debeGuardar) {
      const pausedMs = s.paused ? (s.pausedMs || 0) + (Date.now() - s.pausedAt) : (s.pausedMs || 0);
      setHistory(h => [{
        id: uid(), routineId: s.routineId, routineName: s.routineName, date: Date.now(),
        durationSec: Math.floor((Date.now() - s.startedAt - pausedMs) / 1000),
        exercises: completedExercises, totalVolume, totalSets
      }, ...h]);

      if (s.isSharedRoutine) {
        const userId = authSession.user.id;
        s.exercises.forEach(sEx => {
          if (!sEx.exerciseRefId) return;
          const cleanSets = sEx.sets.map(st => ({ id: st.id, weight: st.weight, reps: st.reps }));
          upsertMySets(s.routineId, userId, sEx.exerciseRefId, cleanSets).catch(() => { });
        });
      } else {
        setRoutines(rs => rs.map(r => {
          if (r.id !== s.routineId) return r;
          const rCopy = JSON.parse(JSON.stringify(r));
          s.exercises.forEach(sEx => {
            const rEx = rCopy.exercises.find(e => e.name === sEx.name);
            if (rEx) {
              sEx.sets.forEach((st, i) => {
                if (rEx.sets[i] && st.weight !== '') rEx.sets[i].weight = st.weight;
                if (rEx.sets[i] && st.reps !== '') rEx.sets[i].reps = st.reps;
              });
            }
          });
          return rCopy;
        }));
      }

      setRoutines(rs => rs.map(r => {
        if (r.id !== s.routineId) return r;
        const rCopy = JSON.parse(JSON.stringify(r));
        s.exercises.forEach(sEx => {
          const rEx = rCopy.exercises.find(e => e.name === sEx.name);
          if (rEx) {
            sEx.sets.forEach((st, i) => {
              if (rEx.sets[i] && st.weight !== '') rEx.sets[i].weight = st.weight;
              if (rEx.sets[i] && st.reps !== '') rEx.sets[i].reps = st.reps;
            });
          }
        });
        return rCopy;
      }));
    }

    if (s.isSharedRoutine) {
      endLiveSession(s.routineId).catch(() => { });
    }

    setRestTimer(null);
    setSession(null);
    lastSavedSessionRef.current = null;
    window.storage.delete('gym_active_session', false).catch(() => { });
    resetDescansoState();
    setScreen('routines');
    showToast(debeGuardar ? 'Rutina guardada' : 'Rutina descartada');
  }
  function cancelSession() {
    const toastId = sileo.action({
      title: "¿Salir sin guardar el entrenamiento?",
      description: "Vas a perder el progreso de esta sesión.",
      duration: null,
      button: {
        title: "Salir",
        className: "btns eliminar sileo-danger",
        onClick: () => {
          setRestTimer(null);
          setSession(null);
          lastSavedSessionRef.current = null;
          window.storage.delete('gym_active_session', false).catch(() => { });
          if (session?.isSharedRoutine) {
            endLiveSession(session.routineId).catch(() => { });
          }
          setScreen('routines');
          resetDescansoState();
          sileo.dismiss(toastId);
        },
      },
      styles: {
        container: "sileo-cont-danger",
        title: "sileo-title-danger",
        description: "sileo-description",
        button: "btns eliminar sileo-danger",
      },
    });
  }

  function deleteHistoryEntry(id) {
    const toastId = sileo.action({
      title: "¿Eliminar este entrenamiento?",
      description: "Podrás deshacerlo justo después de eliminar.",
      duration: null,
      button: {
        title: "Eliminar",
        className: "btns eliminar sileo-danger",
        onClick: () => {
          const removed = history.find(e => e.id === id);
          const removedIndex = history.findIndex(e => e.id === id);

          setHistory(h => h.filter(e => e.id !== id));
          if (activeHistoryId === id) setScreen('history');
          sileo.dismiss(toastId);

          // Esperamos a que termine la animación de salida del toast de confirmación
          // antes de mostrar el de "Deshacer", para que no se pisen visualmente.
          setTimeout(() => {
            const undoToastId = sileo.action({
              title: 'Entrenamiento eliminado',
              description: removed?.routineName,
              duration: 6000,
              button: {
                title: 'Deshacer',
                className: 'btns agregar',
                onClick: () => {
                  setHistory(h => {
                    const next = [...h];
                    const idx = Math.min(removedIndex, next.length);
                    next.splice(idx, 0, removed);
                    return next;
                  });
                  sileo.dismiss(undoToastId);
                },
              },
              styles: {
                container: "sileo-cont",
                title: "sileo-title",
                description: "sileo-description",
                button: "btns agregar sileo",
              },
            });
          }, 300);
        },
      },
      styles: {
        container: "sileo-cont-danger",
        title: "sileo-title-danger",
        description: "sileo-description",
        button: "btns eliminar sileo-danger",
      },
    });
  }

  // ---------- exercise picker ----------
  function openPicker(exi) {
    setPickerQuery('');
    setPickerSelection(new Set());
    setPickerContext('editor');
    setReplaceIndex(typeof exi === 'number' ? exi : null);
    setPickerOpen(true);
  }
  function openSessionPicker(exi) {
    setPickerQuery('');
    setPickerSelection(new Set());
    setPickerContext('session');
    setReplaceIndex(exi);
    setPickerOpen(true);
  }
  function togglePick(id) {
    setPickerSelection(sel => {
      if (replaceIndex !== null) {
        return sel.has(id) ? new Set() : new Set([id]);
      }
      const next = new Set(sel);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function createCustomExercise() {
    const nameRef = { current: '' };
    let toastId;

    const handleConfirm = () => {
      confirmCustomExercise(nameRef.current);
      sileo.dismiss(toastId);
    };

    toastId = sileo.action({
      title: "Nuevo ejercicio personalizado",
      duration: null,
      description: (
        <input
          type="text"
          className='input-sileo'
          autoFocus
          placeholder="Nombre del ejercicio"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { nameRef.current = e.target.value; }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') handleConfirm();
          }}
        />
      ),
      button: {
        title: "Crear",
        className: "btns agregar",
        onClick: handleConfirm,
      },
      styles: {
        container: "sileo-cont",
        title: "sileo-title",
        description: "sileo-description",
        button: "btns agregar sileo",
      },
    });
  }

  function confirmCustomExercise(name) {
    if (!name || !name.trim()) return;
    const ex = { id: uid(), name: name.trim(), muscle: 'Personalizado' };
    setCustomExercises(ce => [...ce, ex]);
    setPickerSelection(sel => replaceIndex !== null ? new Set([ex.id]) : new Set([...sel, ex.id]));
  }

  function confirmPicker(exercise) {
    if (!exercise) return;

    // El picker se abrió desde una sesión en curso (RutinaCurso) -> actualizamos session, no editorDraft.
    if (pickerContext === 'session') {
      setSession(s => {
        if (!s) return s;
        const next = JSON.parse(JSON.stringify(s));

        if (replaceIndex !== null && next.exercises[replaceIndex]) {
          const oldEx = next.exercises[replaceIndex];
          next.exercises[replaceIndex] = {
            ...oldEx,
            exerciseId: exercise.id,
            name: exercise.nombre,
            equipment: exercise.equipamiento,
            muscle: exercise.parteDelCuerpo,
            gif: exercise.gif,
          };
        } else {
          next.exercises.push({
            id: uid(),
            exerciseId: exercise.id,
            equipment: exercise.equipamiento,
            name: exercise.nombre,
            muscle: exercise.parteDelCuerpo,
            gif: exercise.gif,
            rest: '',
            sets: [{ id: uid(), reps: '', weight: '' }]
          });
        }

        return next;
      });

      setReplaceIndex(null);
      setPickerOpen(false);
      return;
    }

    // Contexto 'editor' -> actualizamos el draft de la rutina que se está editando/creando.
    const nuevoEjercicio = {
      id: uid(),
      exerciseId: exercise.id,
      name: exercise.nombre,
      muscle: exercise.parteDelCuerpo,
      equipment: exercise.equipamiento,
      gif: exercise.gif,
      rest: '',
      sets: [{ id: uid(), reps: '', weight: '' }]
    };

    setEditorDraft(d => {
      if (!d) return d;

      if (replaceIndex !== null) {
        const exercises = [...d.exercises];
        exercises[replaceIndex] = {
          ...exercises[replaceIndex],
          ...nuevoEjercicio,
          id: exercises[replaceIndex].id
        };
        return { ...d, exercises };
      }

      return { ...d, exercises: [...d.exercises, nuevoEjercicio] };
    });

    setReplaceIndex(null);
    setPickerOpen(false);
  }

  function applyPickerSelection() {
    if (pickerContext === 'session' && replaceIndex !== null) {
      const pickedId = [...pickerSelection][0];
      const ex = pickedId ? findExercise(pickedId) : null;

      if (ex) {
        setSession(s => {
          if (!s) return s;

          return {
            ...s,
            exercises: s.exercises.map((e, i) =>
              i === replaceIndex
                ? {
                  ...e,
                  name: ex.name,
                  muscle: ex.muscle
                }
                : e
            )
          };
        });
      }
    }

    else if (replaceIndex !== null) {
      const pickedId = [...pickerSelection][0];
      const ex = pickedId ? findExercise(pickedId) : null;

      if (ex) {
        setEditorDraft(d => {
          if (!d) return d;

          return {
            ...d,
            exercises: d.exercises.map((e, i) =>
              i === replaceIndex
                ? {
                  ...e,
                  exerciseId: ex.id,
                  name: ex.name,
                  muscle: ex.muscle
                }
                : e
            )
          };
        });
      }
    }

    else {
      const toAdd = [...pickerSelection]
        .map(id => {
          const ex = findExercise(id);

          return ex
            ? {
              id: uid(),
              exerciseId: ex.id,
              name: ex.name,
              muscle: ex.muscle,
              rest: '',
              sets: [
                {
                  id: uid(),
                  reps: '',
                  weight: ''
                }
              ]
            }
            : null;
        })
        .filter(Boolean);


      setEditorDraft(d => {
        if (!d) return d;

        return {
          ...d,
          exercises: [
            ...d.exercises,
            ...toAdd
          ]
        };
      });
    }

    setReplaceIndex(null);
    setPickerOpen(false);
  }



  function closePicker() {
    setReplaceIndex(null);
    setPickerOpen(false);
  }

  // ---------- editor helpers ----------
  function updateDraftName(name) { setEditorDraft(d => ({ ...d, name })); }
  function moveExercise(i, dir) {
    setEditorDraft(d => {
      const arr = [...d.exercises];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, exercises: arr };
    });
  }

  function updateDraftDays(days) {
    setEditorDraft(d => ({ ...d, days }));
  }
  function updateDraftReminderTime(time) {
    setEditorDraft(d => ({ ...d, reminderTime: time }));
  }

  function reorderExercise(fromIndex, toIndex) {
    setEditorDraft(d => {
      if (fromIndex === toIndex) return d;
      const arr = [...d.exercises];
      const [moved] = arr.splice(fromIndex, 1);
      const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
      arr.splice(insertAt, 0, moved);
      return { ...d, exercises: arr };
    });
  }

  function removeExercise(i) {
    const removed = editorDraft.exercises[i];
    setEditorDraft(d => ({ ...d, exercises: d.exercises.filter((_, idx) => idx !== i) }));

    const toastId = sileo.action({
      title: 'Ejercicio eliminado',
      duration: 4000,
      button: {
        title: 'Deshacer',
        className: 'btns agregar',
        onClick: () => {
          setEditorDraft(d => {
            if (!d) return d;
            const exercises = [...d.exercises];
            exercises.splice(i, 0, removed);
            return { ...d, exercises };
          });
          sileo.dismiss(toastId);
        },
      },
      styles: {
        container: "sileo-cont",
        title: "sileo-title",
        description: "sileo-description",
        button: "btns agregar sileo",
      },
    });
  }
  function addSet(exi) {
    setEditorDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      next.exercises[exi].sets.push({ id: uid(), reps: '', weight: '' });
      return next;
    });
  }
  function duplicateLastSet(exi) {
    setEditorDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      const sets = next.exercises[exi].sets;
      const last = sets[sets.length - 1];
      if (last) sets.push({ id: uid(), reps: last.reps, weight: last.weight });
      return next;
    });
  }
  function removeSet(exi, si) {
    const removed = editorDraft.exercises[exi].sets[si];
    setEditorDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      next.exercises[exi].sets.splice(si, 1);
      return next;
    });

    const toastId = sileo.action({
      title: 'Serie eliminada',
      duration: 4000,
      button: {
        title: 'Deshacer',
        className: 'btns agregar',
        onClick: () => {
          setEditorDraft(d => {
            if (!d) return d;
            const next = JSON.parse(JSON.stringify(d));
            next.exercises[exi].sets.splice(si, 0, removed);
            return next;
          });
          sileo.dismiss(toastId);
        },
      },
      styles: {
        container: "sileo-cont",
        title: "sileo-title",
        description: "sileo-description",
        button: "btns agregar sileo",
      },
    });
  }
  function updateSetField(exi, si, field, value) {
    const clean = value.replace(/[^0-9.]/g, '');
    setEditorDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      next.exercises[exi].sets[si][field] = clean;
      return next;
    });
  }
  function updateRest(exi, value) {
    setEditorDraft(d => {
      const exercises = d.exercises.map((e, i) => i === exi ? { ...e, rest: value } : e);
      return { ...d, exercises };
    });
  }

  // DESPUÉS
  function handleEditorCancel() {
    const d = editorDraft;

    if (d && d.mode === 'single') {
      const toastId = sileo.action({
        title: "¿Descartar los cambios?",
        description: "Se perderán los cambios de este ejercicio.",
        duration: null,
        button: {
          title: "Descartar",
          className: "btns eliminar sileo-danger",
          onClick: () => {
            setEditorDraft(null);
            setScreen('session');
            sileo.dismiss(toastId);
          },
        },
        styles: {
          container: "sileo-cont-danger",
          title: "sileo-title-danger",
          description: "sileo-description",
          button: "btns eliminar sileo-danger",
        },
      });
      return;
    }

    const toastId = sileo.action({
      title: "¿Descartar los cambios?",
      description: "Se perderán los cambios de esta rutina.",
      duration: null,
      button: {
        title: "Descartar",
        className: "btns eliminar sileo-danger",
        onClick: () => {
          setEditorDraft(null);
          setScreen(activeRoutineId ? 'routineDetail' : 'routines');
          sileo.dismiss(toastId);
        },
      },
      styles: {
        container: "sileo-cont-danger",
        title: "sileo-title-danger",
        description: "sileo-description",
        button: "btns eliminar sileo-danger",
      },
    });
  }

  async function requestSharedRoutineDelete(sharedRoutineId) {
    const userId = authSession.user.id;
    const shared = sharedRoutines.find(r => r.id === sharedRoutineId);
    const soloCreador = !shared || (shared.members || []).length <= 1;

    if (soloCreador) {
      const { error } = await deleteSharedRoutineDirect(sharedRoutineId);
      if (error) { showToast('No se pudo eliminar la rutina', 'error'); return; }
      setSharedRoutines(rs => rs.filter(r => r.id !== sharedRoutineId));
      showToast('Rutina eliminada');
      setScreen('routines');
      return;
    }

    const { error } = await requestRoutineDeletion(sharedRoutineId, userId);
    if (error) { showToast('No se pudo iniciar el borrado', 'error'); return; }
    showToast('Se les pidió confirmación a los demás integrantes');
    setScreen('routines');
  }

  // ★ NUEVO
  async function voteOnRoutineDeletion(deleteRequestId, approve) {
    const userId = authSession.user.id;
    const { error } = await voteRoutineDeletion(deleteRequestId, userId, approve ? 'approve' : 'reject');
    if (error) { showToast('No se pudo registrar el voto', 'error'); return; }
    setPendingRoutineDeletions(pd => pd.filter(d => d.id !== deleteRequestId));
    const { data: shared } = await fetchMySharedRoutines(userId);
    setSharedRoutines(shared || []); // por si se borró, desaparece sola
    showToast(approve ? 'Confirmaste el borrado' : 'Rechazaste el borrado');
  }

  // DESPUÉS
  function handleEditorDeleteRoutine() {
    const d = editorDraft;
    if (d.mode === 'single' || !d.id) return;

    const toastId = sileo.action({
      title: "¿Eliminar esta rutina?",
      description: "Podrás deshacerlo justo después de eliminar.",
      duration: null,
      button: {
        title: "Eliminar",
        className: "btns eliminar sileo-danger",
        onClick: () => {
          const routineId = d.id;
          setEditorDraft(null);
          setScreen('routines');
          sileo.dismiss(toastId);

          // Esperamos a que termine la animación de salida del toast de confirmación
          // antes de que deleteRoutine muestre el toast de "Deshacer".
          setTimeout(() => {
            deleteRoutine(routineId);
          }, 300);
        },
      },
      styles: {
        container: "sileo-cont-danger",
        title: "sileo-title-danger",
        description: "sileo-description",
        button: "btns eliminar sileo-danger",
      },
    });
  }

  function handleDetailDelete() {
    const toastId = sileo.action({
      title: "¿Eliminar esta rutina?",
      description: "Podrás deshacerlo justo después de eliminar.",
      icon: false,
      duration: null,
      button: {
        title: "Eliminar",
        className: "btns eliminar sileo",
        onClick: () => {
          const removed = routines.find(r => r.id === activeRoutineId);
          const removedIndex = routines.findIndex(r => r.id === activeRoutineId);

          setRoutines(rs => rs.filter(r => r.id !== activeRoutineId));

          setTimeout(() => {
            const undoToastId = sileo.action({
              title: `Rutina eliminada`,
              duration: 6000,
              button: {
                title: 'Deshacer',
                className: 'btns agregar',
                onClick: () => {
                  setRoutines(rs => {
                    const next = [...rs];
                    const idx = Math.min(removedIndex, next.length);
                    next.splice(idx, 0, removed);
                    return next;
                  });
                  sileo.dismiss(undoToastId);
                },
              },
              styles: {
                container: "sileo-cont",
                title: "sileo-title",
                description: "sileo-description",
                button: "btns agregar sileo",
              },
            });

            setScreen('routines');
            setKebabOpen(false);
          }, 400);
        },
      },
      styles: {
        container: "sileo-cont-danger",
        title: "sileo-title-danger",
        icon: "sileo-icon",
        description: "sileo-description",
        button: "btns eliminar sileo-danger",
      },
    });
  }

  const activeRoutine = useMemo(() => {
    const own = routines.find(x => x.id === activeRoutineId);
    if (own) return own;
    const shared = sharedRoutines.find(x => x.id === activeRoutineId);
    return shared ? { ...shared, isShared: true } : null;
  }, [routines, sharedRoutines, activeRoutineId]);
  const activeHistoryEntry = history.find(x => x.id === activeHistoryId) || null;
  const showTabs = screen === 'home' || screen === 'routines' || screen === 'history' || screen === 'proximamente' || screen === 'perfil' || screen === 'mensajes';

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setScreen('home');
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="home-logo screen">
          <Logo />
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="home-logo">
          <Logo />
        </div>
      </div>
    );
  }

  if (!authSession || registering) {
    return <Login onRegisteringChange={setRegistering} />;
  }

  return (
    <Toaster
      theme={modoOscuro ? 'light' : 'dark'}
      position={toasterPosition === 'top' ? 'top-center' : 'bottom-center'}
    >
      <div className='cont'>


        {screen === 'home' && (
          <HomePage
            routines={routines}
            history={history}
            session={session}
            onStartSession={startSession}
            authSession={authSession}
            onSelectRoutine={(id) => { setActiveRoutineId(id); setScreen('routineDetail'); setKebabOpen(false); }}
            onNewRoutine={() => openEditor(null)}
            onNavigate={(s) => setScreen(s)}
            onSelectHistoryEntry={(id) => { setActiveHistoryId(id); setScreen('historyDetail'); }}
          />
        )}
        {screen === 'mensajes' && (
          <ProximamentePage />
          // <Mensajes
          //   authSession={authSession}
          //   routines={routines}
          //   onOpenProfile={openProfileScreen}
          //   onOpenOwnProfile={() => setScreen('miPerfil')}
          //   onImportRoutine={importSharedRoutine}
          // />
        )}

        {screen === 'perfilPublico' && viewingProfileId && (
          <PerfilPublico
            userId={authSession.user.id}
            targetId={viewingProfileId}
            myRoutines={routines}
            onBack={() => setScreen('mensajes')}
            onImportRoutine={importSharedRoutine}
          />
        )}

        {screen === 'miPerfil' && (
          <MiPerfil
            userId={authSession.user.id}
            onBack={() => setScreen('mensajes')}
          />
        )}
        {screen === 'routines' && (
          <RutinaPage
            routines={routines}
            sharedRoutines={sharedRoutines}
            pendingInvites={pendingInvites}
            onNewRoutine={(m) => openEditor(null, m)}
            onSelectSharedRoutine={(id) => {
              {/* ★ NUEVO */ }
              setActiveRoutineId(id);
              setScreen('routineDetail');
              setKebabOpen(false);
            }}
            onAcceptInvite={async (inviteId) => {
              {/* ★ NUEVO */ }
              const userId = authSession.user.id;
              const { error } = await respondInvite(inviteId, userId, true);
              if (error) { showToast('No se pudo aceptar la invitación', 'error'); return; }
              const { data: shared } = await fetchMySharedRoutines(userId);
              setSharedRoutines(shared || []);
              setPendingInvites(pi => pi.filter(i => i.id !== inviteId));
              showToast('Te uniste a la rutina');
            }}
            onRejectInvite={async (inviteId) => {
              {/* ★ NUEVO */ }
              const userId = authSession.user.id;
              await respondInvite(inviteId, userId, false);
              setPendingInvites(pi => pi.filter(i => i.id !== inviteId));
            }}
            authSession={authSession}
            onSelectRoutine={(id) => { setActiveRoutineId(id); setScreen('routineDetail'); setKebabOpen(false); }}
            onExport={() => setBackupModal({ mode: 'export', kind: 'routines' })}
            onImport={() => setBackupModal({ mode: 'import', kind: 'routines' })}
            swipeGestures={swipeGestures}
            getSwipeActionFor={getSwipeActionFor}
            swipeLeftAction={swipeLeftAction}
            swipeRightAction={swipeRightAction}
          />
        )}
        {screen === 'settings' && (
          <Ajustes
            onBack={() => { setScreen('routines'); setKebabOpen(false); }}
            modoOscuro={modoOscuro}
            onToggleModo={() => setModoOscuro(v => !v)}
            acento={acento}
            reminderTime={reminderTime}
            onChangeReminderTime={setReminderTime}
            reminderEnabled={reminderEnabled}
            onToggleReminder={() => setReminderEnabled(v => !v)}
            onChangeAcento={setAcento}
            toasterPosition={toasterPosition}
            onChangeToasterPosition={setToasterPosition}
            swipeGestures={swipeGestures}
            swipeLeftAction={swipeLeftAction}
            onChangeSwipeLeftAction={setSwipeLeftAction}
            swipeRightAction={swipeRightAction}
            onChangeSwipeRightAction={setSwipeRightAction}
            onToggleSwipeGestures={() => setSwipeGestures(v => !v)}
          />
        )}

        {screen === 'routineDetail' && activeRoutine && (
          <RutinaDetalle
            routine={activeRoutine}
            kebabOpen={kebabOpen}
            authSession={authSession}
            onToggleKebab={() => setKebabOpen(k => !k)}
            onBack={() => { setScreen('routines'); setKebabOpen(false); }}
            onEdit={() => activeRoutine.isShared ? openSharedEditor(activeRoutine.id) : openEditor(activeRoutine.id)}
            membersProfiles={activeMembersProfiles}
            onRequestSharedDelete={requestSharedRoutineDelete}
            onDuplicate={() => duplicateRoutine(activeRoutine.id)}
            onDelete={handleDetailDelete}
            onStartSession={() => startSession(activeRoutine.id)}
            onRename={renameRoutineQuick}
            onShare={shareRoutine}
            onCopyText={copyRoutineAsText}
            history={history}
            reminder={{ days: activeRoutine.days || [] }}
            onSaveReminder={saveReminder}
            onClearReminder={clearReminder}
            onRevertTempOverride={revertTempOverride}
          />
        )}

        {screen === 'routineEditor' && (
          <RutinaCrear
            draft={editorDraft}
            mode={editorDraft?.mode || 'full'}
            onChangeName={updateDraftName}
            userId={authSession?.user?.id}
            onChangeMode={changeDraftMode}
            onToggleInvitee={toggleDraftInvitee}
            onAddInviteEmail={addDraftInviteEmail}
            onRemoveInviteEmail={removeDraftInviteEmail}
            onChangeDays={updateDraftDays}
            onChangeReminderTime={updateDraftReminderTime}
            onMoveExercise={moveExercise}
            onReorderExercise={reorderExercise}
            onRemoveExercise={removeExercise}
            onAddSet={addSet}
            onDuplicateLastSet={duplicateLastSet}
            onRemoveSet={removeSet}
            onUpdateSetField={updateSetField}
            onChangeMode={changeDraftMode}
            onUpdateRest={updateRest}
            onOpenPicker={openPicker}
            onSave={saveDraft}
            onCancel={handleEditorCancel}
            onDeleteRoutine={handleEditorDeleteRoutine}
            pickerOpen={pickerOpen && pickerContext === 'editor'}
            allExercises={allExercises}
            pickerQuery={pickerQuery}
            onPickerQueryChange={setPickerQuery}
            pickerSelection={pickerSelection}
            onTogglePick={togglePick}
            onCreateCustomExercise={createCustomExercise}
            onConfirmPicker={confirmPicker}
            onClosePicker={closePicker}
          />
        )}

        {screen === 'session' && (
          <RutinaCurso
            session={session}
            partnerProgress={partnerProgress}
            history={history}
            routineName={session?.routineName}
            restTimer={restTimer}
            restDefault={restDefault}
            onCancel={cancelSession}
            onMinimize={minimizeSession}
            autoOpenResumen={autoOpenResumen}
            onAutoResumenHandled={() => setAutoOpenResumen(false)}
            onToggleSet={toggleSet}
            onUpdateNotes={updateExerciseNotes}
            sharedWithNames={
              session?.isSharedRoutine
                ? activeMembersProfiles
                  .filter(m => m.id !== authSession?.user?.id)
                  .map(m => m.nombre || m.username)
                : []
            }
            onUpdateField={updateLiveField}
            onAddSet={addLiveSet}
            onDuplicateLastSet={duplicateLiveSet}
            onFinish={finishSession}
            onSetRestDefault={setRestDefault}
            onAdjustRest={adjustRest}
            onTogglePause={toggleRestPause}
            onDismissRest={dismissRest}
            onOpenPicker={openSessionPicker}
            onToggleSessionPause={toggleSessionPause}
            onEditExercise={openSessionExerciseEditor}
            onUpdateRest={updateSessionRest}
            pickerOpen={pickerOpen && pickerContext === 'session'}
            allExercises={allExercises}
            pickerQuery={pickerQuery}
            onPickerQueryChange={setPickerQuery}
            pickerSelection={pickerSelection}
            onTogglePick={togglePick}
            onCreateCustomExercise={createCustomExercise}
            onConfirmPicker={confirmPicker}
            onClosePicker={closePicker}
          />
        )}

        {screen === 'history' && (
          <HistorialPage
            history={history}
            routines={routines}
            onSelectEntry={(id) => { setActiveHistoryId(id); setScreen('historyDetail'); }}
            onDeleteEntry={deleteHistoryEntry}
            onExport={() => setBackupModal({ mode: 'export', kind: 'history' })}
            onImport={() => setBackupModal({ mode: 'import', kind: 'history' })}
          />
        )}

        {screen === 'proximamente' && (
          <ProximamentePage

          />
        )}
        {screen === 'perfil' && (
          <Perfil
            authSession={authSession}
            routines={routines}
            history={history}
            onSignOut={handleSignOut}
            reminderEnabled={reminderEnabled}
            onToggleReminder={() => setReminderEnabled(v => !v)}
            reminderTime={reminderTime}
            onChangeReminderTime={setReminderTime}
          />
        )}

        {screen === 'historyDetail' && activeHistoryEntry && (
          <HistorialDetalle
            entry={activeHistoryEntry}
            onBack={() => setScreen('history')}
            onDelete={() => deleteHistoryEntry(activeHistoryEntry.id)}
            onRepeat={(entry) => {
              const routine = routines.find(r => r.id === entry.routineId);
              if (!routine) {
                sileo.error({ title: 'La rutina original ya no existe' });
                return;
              }
              startSession(routine.id);
            }}
            history={history}
          />
        )}
        {session && screen !== 'session' && (
          <MiniSesionBar
            session={session}
            raised={showTabs}
            onExpand={() => setScreen('session')}
            onTogglePause={toggleSessionPause}
            onFinish={quickFinishFromBar}
          />
        )}
        <DescansoBarraFija compact={showTabs} />

        {showTabs && (
          <TabBar
            screen={screen}
            onNavigate={(s) => { setScreen(s); setKebabOpen(false); }}
            modoOscuro={modoOscuro}
            onToggleModo={() => setModoOscuro(v => !v)}
            acento={acento}
            onChangeAcento={setAcento}
            toasterPosition={toasterPosition}
            onChangeToasterPosition={setToasterPosition}
            reminderTime={reminderTime}
            onChangeReminderTime={setReminderTime}
            reminderEnabled={reminderEnabled}
            onToggleReminder={() => setReminderEnabled(v => !v)}
            swipeGestures={swipeGestures}
            onToggleSwipeGestures={() => setSwipeGestures(v => !v)}
            swipeLeftAction={swipeLeftAction}
            onChangeSwipeLeftAction={setSwipeLeftAction}
            swipeRightAction={swipeRightAction}
            onChangeSwipeRightAction={setSwipeRightAction}
          />
        )}

        {pendingLiveInvite && (
          <div className="modal-overlay fixed flex justifyContentCenter" onClick={() => setPendingLiveInvite(null)}>
            <div className="action-sheet" onClick={e => e.stopPropagation()}>
              <div className="action-sheet-card">
                <h3 className="action-sheet-title">
                  {pendingLiveInvite.routineName} — empezaron a entrenar
                </h3>
                <p className="action-sheet-desc">
                  Un integrante ya arrancó esta rutina en conjunto. ¿Te sumás ahora mismo?
                </p>

                <div className="action-sheet-divider" />
                <button
                  className="action-sheet-btn"
                  onClick={() => {
                    const invite = pendingLiveInvite;
                    setPendingLiveInvite(null);
                    startSession(invite.sharedRoutineId, { startedAt: invite.startedAt, isJoining: true });
                  }}
                >
                  Unirme ahora
                </button>

                <div className="action-sheet-divider" />
                <button
                  className="action-sheet-btn"
                  style={{ color: "var(--rojo)" }}
                  onClick={() => setPendingLiveInvite(null)}
                >
                  No, gracias
                </button>
              </div>
            </div>
          </div>
        )}

        {backupModal && (
          <BackupModal
            mode={backupModal.mode}
            kind={backupModal.kind}
            onClose={() => setBackupModal(null)}
            onExportFile={handleExportFile}
            onExportLink={handleExportLink}
            onImportText={handleImportText}
            onImportFile={handleImportFile}
          />
        )}

        {loaded && !onboardingSeen && (
          <OnboardingTour onFinish={finishOnboarding} />
        )}


        {pendingRoutineDeletions.length > 0 && (
          <div className="modal-overlay fixed flex justifyContentCenter">
            <div className="action-sheet">
              <div className="action-sheet-card">
                <h3 className="action-sheet-title">
                  ¿Eliminar "{pendingRoutineDeletions[0].routineName}"?
                </h3>
                <p className="action-sheet-desc">
                  Otro integrante pidió eliminar esta rutina en conjunto para todos. Si aceptás, se borra para todos los miembros.
                </p>

                <div className="action-sheet-divider" />
                <button
                  className="action-sheet-btn"
                  onClick={() => voteOnRoutineDeletion(pendingRoutineDeletions[0].id, true)}
                >
                  Aceptar borrado
                </button>

                <div className="action-sheet-divider" />
                <button
                  className="action-sheet-btn danger"
                  style={{
                    color: "var(--rojo)"
                  }}
                  onClick={() => voteOnRoutineDeletion(pendingRoutineDeletions[0].id, false)}
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingRoutineEdits.length > 0 && (
          <div className="modal-overlay fixed flex justifyContentCenter">
            <div className="action-sheet">
              <div className="action-sheet-card">
                <h3 className="action-sheet-title">
                  Cambios propuestos en "{pendingRoutineEdits[0].routineName}"
                </h3>
                <p className="action-sheet-desc">
                  Un integrante propuso cambios: nuevo nombre "{pendingRoutineEdits[0].proposedName}"
                  con {pendingRoutineEdits[0].proposedExerciseCount} ejercicio{pendingRoutineEdits[0].proposedExerciseCount !== 1 ? 's' : ''}.
                </p>

                <div className="action-sheet-divider" />
                <button className="action-sheet-btn"
                  disabled={!!votingEditId}
                  onClick={() => voteOnRoutineEdit(pendingRoutineEdits[0].id, true)}>
                  Aceptar cambios
                </button>

                <div className="action-sheet-divider" />
                <button
                  className="action-sheet-btn"
                  disabled={!!votingEditId}
                  style={{ color: "var(--rojo)" }}
                  onClick={() => voteOnRoutineEdit(pendingRoutineEdits[0].id, false)}
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        )}
        {pendingSaveChoice && (
          <div className="modal-overlay fixed flex justifyContentCenter" onClick={() => setPendingSaveChoice(null)}>
            <div className="action-sheet" onClick={e => e.stopPropagation()}>
              <div className="action-sheet-card">
                <h3 className="action-sheet-title">¿Cómo guardamos estos cambios?</h3>
                <p className="action-sheet-desc">
                  <strong>Para siempre</strong> actualiza la rutina de forma permanente.{' '}
                  <strong>Solo la próxima vez</strong> aplica estos cambios nada más para la
                  próxima sesión — después vuelve a quedar como estaba.
                </p>

                <div className="action-sheet-divider" />
                <button className="action-sheet-btn" onClick={confirmSavePermanent}>
                  Para siempre
                </button>

                <div className="action-sheet-divider" />
                <button className="action-sheet-btn" onClick={confirmSaveTemporary}>
                  Solo la próxima vez
                </button>
              </div>

              <button className="action-sheet-cancel" onClick={() => setPendingSaveChoice(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {pendingImport && (
          <div className="modal-overlay" onClick={() => setPendingImport(null)}>
            <div className="modal-cont" onClick={e => e.stopPropagation()}>
              <h3>
                {pendingImport.kind === 'routines' ? 'Importar rutinas' : 'Importar historial'}
              </h3>
              <p className="header-sub" style={{ marginBottom: 16 }}>
                Se encontraron {pendingImport.data.length} {pendingImport.kind === 'routines' ? 'rutina(s)' : 'entrenamiento(s)'}. ¿Qué querés hacer con lo que ya tenés?
              </p>
              <div className='btn-cont-modal'>
                <button className="btns eliminar m" onClick={confirmImportReplace}>Reemplazar todo</button>
                <button className="btns agregar m" onClick={confirmImportMerge}>Agregar sin duplicar</button>

              </div>

              <button className="btns agregar m" onClick={() => setPendingImport(null)}>Cancelar</button>
            </div>
          </div>
        )}

      </div>
    </Toaster >
  );
}
