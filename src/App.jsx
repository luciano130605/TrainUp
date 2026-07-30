import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sileo, Toaster } from "sileo";
import TabBar from './components/tabBar';
import RutinaPage from './components/rutinaPage';
import RutinaDetalle from './components/rutinaDetalle';
import RutinaCrear from './components/rutinaCrear';
import RutinaCurso from './components/RutinaCurso';
import HistorialPage from './components/historialPage';
import HistorialDetalle from './components/HistorialDetalle';
import { scheduleReminderPush, cancelReminderPush } from './utils/push';
import BackupModal from './components/BackupModal';
import { encodeBackup, decodeBackup, downloadJSON, readJSONFile } from './utils/backup';
import HomePage from "./components/Homepage"

import { EXERCISES_DB } from './data/exercises';
import { uid } from './utils/id';
import { playBeep } from './utils/audio';
import { encodeRoutine, decodeRoutine } from './utils/share'; // NUEVO
import "./App.css"
import "../index.css"
import Ajustes from './components/ajustes';
import ProximamentePage from './components/proximamente';
import { openDescansoToast } from './components/descansoToastModal';
import openTiempoDescansoToast, { resetDescansoState } from './components/TiempoDescansoToast';
import MiniSesionBar from './components/MiniSesionBar';
import PageSkeleton from './components/PageSkeleton';
import { Copy, Pencil, Share2, Trash2 } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [routines, setRoutines] = useState([]);
  const [history, setHistory] = useState([]);
  const [customExercises, setCustomExercises] = useState([]);
  const [restDefault, setRestDefault] = useState(90);
  const [loaded, setLoaded] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [autoOpenResumen, setAutoOpenResumen] = useState(false);
  const [backupModal, setBackupModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);

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

  const allExercises = [...EXERCISES_DB, ...customExercises];
  const findExercise = (id) => allExercises.find(e => e.id === id);

  // 1. Nuevos estados (junto a restDefault)
  const [modoOscuro, setModoOscuro] = useState(true);
  const [acento, setAcento] = useState('acento-verde');
  const [toasterPosition, setToasterPosition] = useState('bottom');
  const [swipeGestures, setSwipeGestures] = useState(true);
  const [swipeLeftAction, setSwipeLeftAction] = useState('delete');
  const [swipeRightAction, setSwipeRightAction] = useState('edit');

  const ACENTOS_IDS = ['acento-verde', 'acento-celeste', 'acento-naranja', 'acento-violeta'];

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

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get('gym_swipe_left', false); if (r && r.value) setSwipeLeftAction(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_swipe_right', false); if (r && r.value) setSwipeRightAction(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_swipe_gestures', false); if (r && r.value !== undefined) setSwipeGestures(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_reminder_enabled', false); if (r && r.value !== undefined) setReminderEnabled(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_reminder_time', false); if (r && r.value) setReminderTime(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_reminder_push_id', false); if (r && r.value) setReminderPushId(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_routines', false); if (r && r.value) setRoutines(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_history', false); if (r && r.value) setHistory(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_modo_oscuro', false); if (r && r.value) setModoOscuro(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_acento', false); if (r && r.value) setAcento(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_toaster_position', false); if (r && r.value) setToasterPosition(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_custom_exercises', false); if (r && r.value) setCustomExercises(JSON.parse(r.value)); } catch (e) { }
      try { const r = await window.storage.get('gym_rest_default', false); if (r && r.value) setRestDefault(JSON.parse(r.value)); } catch (e) { }
      setLoaded(true);
    })();
  }, []);

  // ---------- persist (debounced) ----------
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try { await window.storage.set('gym_swipe_left', JSON.stringify(swipeLeftAction), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_swipe_right', JSON.stringify(swipeRightAction), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_swipe_gestures', JSON.stringify(swipeGestures), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_reminder_time', JSON.stringify(reminderTime), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_reminder_push_id', JSON.stringify(reminderPushId), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_routines', JSON.stringify(routines), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_history', JSON.stringify(history), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_custom_exercises', JSON.stringify(customExercises), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_rest_default', JSON.stringify(restDefault), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_modo_oscuro', JSON.stringify(modoOscuro), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_acento', JSON.stringify(acento), false); } catch (e) { console.error(e); }
      try { await window.storage.set('gym_toaster_position', JSON.stringify(toasterPosition), false); } catch (e) { console.error(e); }
    }, 350);
  }, [routines, history, customExercises, restDefault, loaded, reminderTime, reminderEnabled, reminderPushId, modoOscuro, acento, toasterPosition]);

  const showToast = useCallback((msg, type = 'success') => {
    sileo[type]({
      title: msg,
      duration: 3000,
      ...(type === 'error' && {
        description: 'Inténtalo de nuevo.',
      }),
    });
  }, []);




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
    if (screen === 'routineDetail' && !routines.find(x => x.id === activeRoutineId)) {
      setScreen('routines');
    }
  }, [screen, routines, activeRoutineId]);

  useEffect(() => {
    if (screen === 'historyDetail' && !history.find(x => x.id === activeHistoryId)) {
      setScreen('history');
    }
  }, [screen, history, activeHistoryId]);


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

  // ---------- routine editor (rutina completa) ----------
  function openEditor(routineId) {
    if (routineId) {
      const r = routines.find(x => x.id === routineId);
      setEditorDraft({
        ...JSON.parse(JSON.stringify(r)),
        mode: 'full',
        days: r.days || [],
      });
    } else {
      setEditorDraft({ id: null, name: '', exercises: [], mode: 'full', days: [], reminderTime: '' });
    }
    setKebabOpen(false);
    setScreen('routineEditor');
  }
  // ---------- routine editor (un solo ejercicio, dentro de una sesión en curso) ----------
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
    const { mode, ...toSave } = d; // days y reminderTime quedan DENTRO de toSave, se guardan con la rutina
    if (toSave.id) {
      setRoutines(rs => rs.map(r => r.id === toSave.id ? toSave : r));
    } else {
      toSave.id = uid();
      setRoutines(rs => [...rs, toSave]);
    }
    setActiveRoutineId(toSave.id);
    setEditorDraft(null);
    showToast('Rutina guardada');
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
      downloadJSON({ type: 'routines_backup', version: 1, exportedAt: Date.now(), routines }, `rutinas-backup-${Date.now()}.json`);
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



  // ---------- session ----------
  function startSession(routineId) {
    const r = routines.find(x => x.id === routineId);
    if (!r) return;

    if (session) {
      if (session.routineId === routineId) {
        setScreen('session'); // ya está en curso esta misma rutina -> la reabrimos
        return;
      }
      showToast('Ya tenés una rutina en curso. Finalizala o cancelala antes de empezar otra.', 'error');
      return;
    }

    setSession({
      routineId: r.id,
      routineName: r.name,
      startedAt: Date.now(),
      paused: false,
      pausedAt: null,
      pausedMs: 0,
      exercises: r.exercises.map(ex => ({
        id: uid(), name: ex.name, muscle: ex.muscle, gif: ex.gif, rest: ex.rest || '',
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
      if (s.paused) {
        const pausedDuration = Date.now() - s.pausedAt;
        return { ...s, paused: false, pausedAt: null, pausedMs: (s.pausedMs || 0) + pausedDuration };
      }
      return { ...s, paused: true, pausedAt: Date.now() };
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

    setRestTimer(null);
    setSession(null);
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
          setScreen('routines');
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
      const arr = [...d.exercises];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
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

  const activeRoutine = routines.find(x => x.id === activeRoutineId) || null;
  const activeHistoryEntry = history.find(x => x.id === activeHistoryId) || null;
  const showTabs = screen === 'home' || screen === 'routines' || screen === 'history' || screen === 'proximamente';

  return (
    <Toaster
      theme={modoOscuro ? 'light' : 'dark'}
      position={toasterPosition === 'top' ? 'top-center' : 'bottom-center'}
    >
      <div>

        {screen === 'home' && (
          <HomePage
            routines={routines}
            history={history}
            session={session}
            onStartSession={startSession}
            onSelectRoutine={(id) => { setActiveRoutineId(id); setScreen('routineDetail'); setKebabOpen(false); }}
            onNewRoutine={() => openEditor(null)}
            onNavigate={(s) => setScreen(s)}
            onSelectHistoryEntry={(id) => { setActiveHistoryId(id); setScreen('historyDetail'); }}
          />
        )}

        {screen === 'routines' && (
          <RutinaPage
            routines={routines}
            onNewRoutine={() => openEditor(null)}
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
            onToggleKebab={() => setKebabOpen(k => !k)}
            onBack={() => { setScreen('routines'); setKebabOpen(false); }}
            onEdit={() => openEditor(activeRoutine.id)}
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
          />
        )}

        {screen === 'routineEditor' && (
          <RutinaCrear
            draft={editorDraft}
            mode={editorDraft?.mode || 'full'}
            onChangeName={updateDraftName}
            onChangeDays={updateDraftDays}
            onChangeReminderTime={updateDraftReminderTime}
            onMoveExercise={moveExercise}
            onReorderExercise={reorderExercise}
            onRemoveExercise={removeExercise}
            onAddSet={addSet}
            onDuplicateLastSet={duplicateLastSet}
            onRemoveSet={removeSet}
            onUpdateSetField={updateSetField}
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

        {screen === 'historyDetail' && activeHistoryEntry && (
          <HistorialDetalle
            entry={activeHistoryEntry}
            onBack={() => setScreen('history')}
            onDelete={() => deleteHistoryEntry(activeHistoryEntry.id)}
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
