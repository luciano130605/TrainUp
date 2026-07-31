import { supabase } from './supabaseClient';

// ---------- mapeo fila supabase -> objeto que ya usa la app ----------
function rowToRoutine(r) {
    return {
        id: r.id,
        name: r.name,
        exercises: r.exercises || [],
        days: r.days || [],
        reminderTime: r.reminder_time || '',
    };
}
function rowToHistory(h) {
    return {
        id: h.id,
        routineId: h.routine_id,
        routineName: h.routine_name,
        date: Number(h.date),
        durationSec: h.duration_sec,
        exercises: h.exercises || [],
        totalVolume: Number(h.total_volume) || 0,
        totalSets: h.total_sets || 0,
    };
}
function rowToExercise(e) {
    return { id: e.id, name: e.name, muscle: e.muscle || '' };
}

// ---------- mapeo objeto app -> fila supabase ----------
function toRoutineRow(userId, r) {
    return {
        id: r.id,
        user_id: userId,
        name: r.name,
        exercises: r.exercises || [],
        days: r.days || [],
        reminder_time: r.reminderTime || null,
        updated_at: new Date().toISOString(),
    };
}
function toHistoryRow(userId, h) {
    return {
        id: h.id,
        user_id: userId,
        routine_id: h.routineId || null,
        routine_name: h.routineName,
        date: h.date,
        duration_sec: h.durationSec,
        exercises: h.exercises || [],
        total_volume: h.totalVolume || 0,
        total_sets: h.totalSets || 0,
    };
}
function toExerciseRow(userId, e) {
    return { id: e.id, user_id: userId, name: e.name, muscle: e.muscle || '' };
}

// ---------- carga inicial ----------
export async function fetchUserData(userId) {
    if (!supabase || !userId) return null;

    const [routinesRes, historyRes, exercisesRes, settingsRes] = await Promise.all([
        supabase.from('routines').select('*').eq('user_id', userId),
        supabase.from('history').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('custom_exercises').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const s = settingsRes.data;

    return {
        routines: (routinesRes.data || []).map(rowToRoutine),
        history: (historyRes.data || []).map(rowToHistory),
        customExercises: (exercisesRes.data || []).map(rowToExercise),
        settings: s ? {
            restDefault: s.rest_default,
            reminderEnabled: s.reminder_enabled,
            reminderTime: s.reminder_time,
            modoOscuro: s.modo_oscuro,
            acento: s.acento,
            toasterPosition: s.toaster_position,
            swipeGestures: s.swipe_gestures,
            swipeLeftAction: s.swipe_left_action,
            swipeRightAction: s.swipe_right_action,
        } : null,
    };
}

// ---------- sync incremental (upsert + delete de lo que ya no está) ----------
export async function syncRoutines(userId, routines, prevIds) {
    if (!supabase || !userId) return prevIds;
    const rows = routines.map(r => toRoutineRow(userId, r));
    if (rows.length) {
        const { error } = await supabase.from('routines').upsert(rows);
        if (error) console.error('syncRoutines upsert:', error);
    }
    const currentIds = new Set(routines.map(r => r.id));
    const toDelete = [...prevIds].filter(id => !currentIds.has(id));
    if (toDelete.length) {
        const { error } = await supabase.from('routines').delete().eq('user_id', userId).in('id', toDelete);
        if (error) console.error('syncRoutines delete:', error);
    }
    return currentIds;
}

export async function syncHistory(userId, history, prevIds) {
    if (!supabase || !userId) return prevIds;
    const rows = history.map(h => toHistoryRow(userId, h));
    if (rows.length) {
        const { error } = await supabase.from('history').upsert(rows);
        if (error) console.error('syncHistory upsert:', error);
    }
    const currentIds = new Set(history.map(h => h.id));
    const toDelete = [...prevIds].filter(id => !currentIds.has(id));
    if (toDelete.length) {
        const { error } = await supabase.from('history').delete().eq('user_id', userId).in('id', toDelete);
        if (error) console.error('syncHistory delete:', error);
    }
    return currentIds;
}

export async function syncCustomExercises(userId, customExercises, prevIds) {
    if (!supabase || !userId) return prevIds;
    const rows = customExercises.map(e => toExerciseRow(userId, e));
    if (rows.length) {
        const { error } = await supabase.from('custom_exercises').upsert(rows);
        if (error) console.error('syncCustomExercises upsert:', error);
    }
    const currentIds = new Set(customExercises.map(e => e.id));
    const toDelete = [...prevIds].filter(id => !currentIds.has(id));
    if (toDelete.length) {
        const { error } = await supabase.from('custom_exercises').delete().eq('user_id', userId).in('id', toDelete);
        if (error) console.error('syncCustomExercises delete:', error);
    }
    return currentIds;
}

export async function syncSettings(userId, settings) {
    if (!supabase || !userId) return;
    const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        rest_default: settings.restDefault,
        reminder_enabled: settings.reminderEnabled,
        reminder_time: settings.reminderTime,
        modo_oscuro: settings.modoOscuro,
        acento: settings.acento,
        toaster_position: settings.toasterPosition,
        swipe_gestures: settings.swipeGestures,
        swipe_left_action: settings.swipeLeftAction,
        swipe_right_action: settings.swipeRightAction,
        updated_at: new Date().toISOString(),
    });
    if (error) console.error('syncSettings:', error);
}

// ---------- migración one-time de window.storage -> Supabase ----------
export async function migrateLocalDataIfNeeded(userId) {
    if (!supabase || !userId) return;

    const flagKey = `gym_migrated_${userId}`;
    try {
        const already = await window.storage.get(flagKey, false);
        if (already?.value) return;
    } catch (e) { /* nunca migró, seguimos */ }

    // Si ya hay rutinas en supabase para este user, no pisamos nada: solo marcamos.
    const { data: existing } = await supabase.from('routines').select('id').eq('user_id', userId).limit(1);
    if (existing && existing.length > 0) {
        try { await window.storage.set(flagKey, JSON.stringify(true), false); } catch (e) { }
        return;
    }

    let localRoutines = [];
    let localHistory = [];
    let localExercises = [];

    try { const r = await window.storage.get('gym_routines', false); if (r?.value) localRoutines = JSON.parse(r.value); } catch (e) { }
    try { const r = await window.storage.get('gym_history', false); if (r?.value) localHistory = JSON.parse(r.value); } catch (e) { }
    try { const r = await window.storage.get('gym_custom_exercises', false); if (r?.value) localExercises = JSON.parse(r.value); } catch (e) { }

    const readOrDefault = async (key, fallback) => {
        try {
            const r = await window.storage.get(key, false);
            return r?.value !== undefined ? JSON.parse(r.value) : fallback;
        } catch (e) { return fallback; }
    };

    const localSettings = {
        restDefault: await readOrDefault('gym_rest_default', 90),
        reminderEnabled: await readOrDefault('gym_reminder_enabled', true),
        reminderTime: await readOrDefault('gym_reminder_time', '10:00'),
        modoOscuro: await readOrDefault('gym_modo_oscuro', true),
        acento: await readOrDefault('gym_acento', 'acento-verde'),
        toasterPosition: await readOrDefault('gym_toaster_position', 'bottom'),
        swipeGestures: await readOrDefault('gym_swipe_gestures', true),
        swipeLeftAction: await readOrDefault('gym_swipe_left', 'delete'),
        swipeRightAction: await readOrDefault('gym_swipe_right', 'edit'),
    };

    if (localRoutines.length) {
        const { error } = await supabase.from('routines').upsert(localRoutines.map(r => toRoutineRow(userId, r)));
        if (error) console.error('migrate routines:', error);
    }
    if (localHistory.length) {
        const { error } = await supabase.from('history').upsert(localHistory.map(h => toHistoryRow(userId, h)));
        if (error) console.error('migrate history:', error);
    }
    if (localExercises.length) {
        const { error } = await supabase.from('custom_exercises').upsert(localExercises.map(e => toExerciseRow(userId, e)));
        if (error) console.error('migrate custom_exercises:', error);
    }
    await syncSettings(userId, localSettings);

    try { await window.storage.set(flagKey, JSON.stringify(true), false); } catch (e) { }
}