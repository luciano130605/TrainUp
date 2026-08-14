import { supabase } from './supabaseClient';

export async function fetchMySharedRoutines(userId) {
    if (!supabase || !userId) return { data: [], error: null };

    const { data: memberships, error: mErr } = await supabase
        .from('shared_routine_members')
        .select('shared_routine_id')
        .eq('user_id', userId);
    if (mErr) return { data: [], error: mErr };

    const ids = memberships.map(m => m.shared_routine_id);
    if (ids.length === 0) return { data: [], error: null };

    const [{ data: routines, error: rErr }, { data: exercises, error: eErr }, { data: members, error: memErr }] =
        await Promise.all([
            supabase.from('shared_routines').select('*').in('id', ids),
            supabase.from('shared_routine_exercises').select('*').in('shared_routine_id', ids).order('order_index'),
            supabase.from('shared_routine_members').select('*').in('shared_routine_id', ids),
        ]);
    if (rErr || eErr || memErr) return { data: [], error: rErr || eErr || memErr };

    const { data: mySets, error: sErr } = await supabase
        .from('shared_routine_sets')
        .select('*')
        .eq('user_id', userId)
        .in('shared_routine_id', ids);
    if (sErr) return { data: [], error: sErr };

    const setsByExercise = Object.fromEntries(mySets.map(s => [s.exercise_id, s.sets]));

    const result = routines.map(r => ({
        id: r.id,
        name: r.name,
        days: r.days || [],
        createdBy: r.created_by,
        members: members.filter(m => m.shared_routine_id === r.id).map(m => m.user_id),
        exercises: exercises
            .filter(e => e.shared_routine_id === r.id)
            .map(e => ({
                id: e.id,
                name: e.name,
                muscle: e.muscle,
                rest: e.rest,
                equipment: e.equipment,
                addedBy: e.added_by,
                sets: setsByExercise[e.id] || [],
            })),
    }));

    return { data: result, error: null };
}

export async function createSharedRoutine(userId, name, days = []) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    console.log('userId param:', userId, typeof userId);
    console.log('auth.uid() real:', user?.id, '| authErr:', authErr);
    const { data, error } = await supabase
        .from('shared_routines')
        .insert({ name, days, created_by: userId })
        .select()
        .single();
    if (error) return { data: null, error };

    const { error: mErr } = await supabase
        .from('shared_routine_members')
        .insert({ shared_routine_id: data.id, user_id: userId });

    return { data, error: mErr };
}

export async function inviteToSharedRoutine(sharedRoutineId, friendUserId) {
    return supabase
        .from('shared_routine_members')
        .insert({ shared_routine_id: sharedRoutineId, user_id: friendUserId });
}

export async function addSharedExercise(sharedRoutineId, userId, exercise, orderIndex) {
    return supabase.from('shared_routine_exercises').insert({
        shared_routine_id: sharedRoutineId,
        name: exercise.name,
        muscle: exercise.muscle || null,
        equipment: exercise.equipment || null,
        rest: exercise.rest || null,
        order_index: orderIndex,
        added_by: userId,
    }).select().single();
}

export async function updateSharedExerciseMeta(exerciseId, patch) {
    // patch: { muscle, rest, order_index, name, equipment }
    return supabase.from('shared_routine_exercises').update(patch).eq('id', exerciseId);
}

// series/peso/reps: siempre por usuario, nunca toca a los demás
export async function upsertMySets(sharedRoutineId, userId, exerciseId, sets) {
    return supabase.from('shared_routine_sets').upsert({
        shared_routine_id: sharedRoutineId,
        user_id: userId,
        exercise_id: exerciseId,
        sets,
        updated_at: new Date().toISOString(),
    });
}

// ---- flujo de borrado con confirmación ----
export async function requestExerciseRemoval(sharedRoutineId, exerciseId, requestedBy) {
    return supabase.from('shared_routine_removal_requests').insert({
        shared_routine_id: sharedRoutineId,
        exercise_id: exerciseId,
        requested_by: requestedBy,
    }).select().single();
}

export async function fetchPendingRemovals(sharedRoutineIds, userId) {
    const { data, error } = await supabase
        .from('shared_routine_removal_requests')
        .select('*, shared_routine_removal_votes(*)')
        .in('shared_routine_id', sharedRoutineIds)
        .eq('status', 'pending');
    if (error) return { data: [], error };
    // filtra las que este usuario todavía no votó
    const pendingForMe = data.filter(rr =>
        rr.requested_by !== userId &&
        !rr.shared_routine_removal_votes.some(v => v.user_id === userId)
    );
    return { data: pendingForMe, error: null };
}

export async function voteRemoval(removalRequestId, userId, vote /* 'approve' | 'reject' */) {
    const { error: vErr } = await supabase
        .from('shared_routine_removal_votes')
        .insert({ removal_request_id: removalRequestId, user_id: userId, vote });
    if (vErr) return { error: vErr };

    // dispara la resolución server-side
    const { error: rpcErr } = await supabase.rpc('resolve_removal_request', { req_id: removalRequestId });
    return { error: rpcErr };
}

// ---- invitaciones ----

export async function inviteFriendToSharedRoutine(sharedRoutineId, invitedUserId, invitedBy) {
    return supabase.from('shared_routine_invites').insert({
        shared_routine_id: sharedRoutineId,
        invited_user_id: invitedUserId,
        invited_by: invitedBy,
    }).select().single();
}

export async function inviteByEmail(sharedRoutineId, email, invitedBy) {
    // buscamos si ese email ya tiene perfil (ajustá 'profiles' al nombre real de tu tabla)
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    return supabase.from('shared_routine_invites').insert({
        shared_routine_id: sharedRoutineId,
        invited_user_id: profile?.id || null,
        invited_email: email,
        invited_by: invitedBy,
    }).select().single();
}

export async function createInviteLink(sharedRoutineId, invitedBy) {
    const token = crypto.randomUUID();
    const { error } = await supabase.from('shared_routine_invites').insert({
        shared_routine_id: sharedRoutineId,
        invited_by: invitedBy,
        token,
    });
    if (error) return { url: null, error };
    return { url: `${window.location.origin}/invite/${token}`, error: null };
}

export async function acceptInviteByToken(token, userId) {
    const { data: invite, error } = await supabase
        .from('shared_routine_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();
    if (error || !invite) return { error: error || new Error('Invitación no encontrada') };

    await supabase.from('shared_routine_members').insert({
        shared_routine_id: invite.shared_routine_id, user_id: userId,
    });
    return supabase.from('shared_routine_invites').update({ status: 'accepted', invited_user_id: userId }).eq('id', invite.id);
}
export async function fetchPendingInvites(userId, userEmail) {
    let query = supabase
        .from('shared_routine_invites')
        .select('*, shared_routines(name)')
        .eq('status', 'pending');

    if (userEmail) {
        query = query.or(`invited_user_id.eq.${userId},invited_email.eq.${userEmail}`);
    } else {
        query = query.eq('invited_user_id', userId);
    }

    const { data, error } = await query;
    if (error) return { data: [], error };
    return {
        data: data.map(i => ({
            id: i.id,
            sharedRoutineId: i.shared_routine_id,
            routineName: i.shared_routines?.name || 'Rutina',
            invitedBy: i.invited_by,
        })),
        error: null,
    };
}

export async function respondInvite(inviteId, userId, accept) {
    if (!accept) {
        return supabase.from('shared_routine_invites').update({ status: 'rejected' }).eq('id', inviteId);
    }
    const { data: invite, error } = await supabase
        .from('shared_routine_invites').select('shared_routine_id').eq('id', inviteId).single();
    if (error) return { error };

    const { error: mErr } = await supabase.from('shared_routine_members')
        .insert({ shared_routine_id: invite.shared_routine_id, user_id: userId });
    if (mErr) return { error: mErr };

    return supabase.from('shared_routine_invites')
        .update({ status: 'accepted', invited_user_id: userId }) // ★ backfill: liga la invitación al usuario que aceptó
        .eq('id', inviteId);
}

// ---- borrar la rutina compartida entera (con confirmación de todos) ----

export async function requestRoutineDeletion(sharedRoutineId, requestedBy) {
    return supabase.from('shared_routine_delete_requests').insert({
        shared_routine_id: sharedRoutineId, requested_by: requestedBy,
    }).select().single();
}

export async function fetchPendingRoutineDeletions(sharedRoutineIds, userId) {
    const { data, error } = await supabase
        .from('shared_routine_delete_requests')
        .select('*, shared_routine_delete_votes(*), shared_routines(name)')
        .in('shared_routine_id', sharedRoutineIds)
        .eq('status', 'pending');
    if (error) return { data: [], error };
    const pendingForMe = data.filter(dr =>
        dr.requested_by !== userId &&
        !dr.shared_routine_delete_votes.some(v => v.user_id === userId)
    );
    return {
        data: pendingForMe.map(dr => ({
            id: dr.id,
            sharedRoutineId: dr.shared_routine_id,
            routineName: dr.shared_routines?.name || 'Rutina',
        })),
        error: null,
    };
}

export async function voteRoutineDeletion(deleteRequestId, userId, vote) {
    const { error: vErr } = await supabase
        .from('shared_routine_delete_votes')
        .insert({ delete_request_id: deleteRequestId, user_id: userId, vote });
    if (vErr) return { error: vErr };
    return supabase.rpc('resolve_routine_delete_request', { req_id: deleteRequestId });
}

// ---- traer perfiles de los integrantes (para mostrar nombres en Detalle) ----
export async function getMembersProfiles(memberIds) {
    if (!memberIds.length) return { data: [], error: null };
    return supabase.from('profiles').select('id, nombre, username').in('id', memberIds);
}


// ---- borrado directo, sin pedir confirmación a nadie (solo cuando el único integrante es el creador) ----
export async function deleteSharedRoutineDirect(sharedRoutineId) {
    return supabase.from('shared_routines').delete().eq('id', sharedRoutineId);
}

export async function requestRoutineEdit(sharedRoutineId, requestedBy, proposed) {
    // proposed: { name, days, exercises: [{name, muscle, rest, equipment}, ...] }
    const exercisesWithOrder = proposed.exercises.map((ex, i) => ({
        name: ex.name,
        muscle: ex.muscle || null,
        equipment: ex.equipment || null,
        rest: ex.rest || null,
        order_index: i,
    }));

    return supabase.from('shared_routine_edit_requests').insert({
        shared_routine_id: sharedRoutineId,
        requested_by: requestedBy,
        proposed_name: proposed.name,
        proposed_days: proposed.days || [],
        proposed_exercises: exercisesWithOrder,
    }).select().single();
}

export async function fetchPendingRoutineEdits(sharedRoutineIds, userId) {
    if (!sharedRoutineIds.length) return { data: [], error: null };
    const { data, error } = await supabase
        .from('shared_routine_edit_requests')
        .select('*, shared_routine_edit_votes(*), shared_routines(name)')
        .in('shared_routine_id', sharedRoutineIds)
        .eq('status', 'pending');
    if (error) return { data: [], error };
    const pendingForMe = data.filter(er =>
        er.requested_by !== userId &&
        !er.shared_routine_edit_votes.some(v => v.user_id === userId)
    );
    return {
        data: pendingForMe.map(er => ({
            id: er.id,
            sharedRoutineId: er.shared_routine_id,
            routineName: er.shared_routines?.name || 'Rutina',
            proposedName: er.proposed_name,
            proposedExerciseCount: (er.proposed_exercises || []).length,
        })),
        error: null,
    };
}

export async function voteRoutineEdit(editRequestId, userId, vote) {
    const { error: vErr } = await supabase
        .from('shared_routine_edit_votes')
        .insert({ edit_request_id: editRequestId, user_id: userId, vote });

    // 23505 = unique_violation en Postgres -> ya había un voto tuyo para este request,
    // no es un error real, seguimos igual a intentar resolver.
    if (vErr && vErr.code !== '23505') return { error: vErr };

    return supabase.rpc('resolve_routine_edit_request', { req_id: editRequestId });
}

export async function startLiveSession(sharedRoutineId, userId) {
    return supabase.from('shared_routine_live_sessions')
        .upsert({ shared_routine_id: sharedRoutineId, started_by: userId, started_at: new Date().toISOString(), status: 'active' })
        .select().single();
}

export async function endLiveSession(sharedRoutineId) {
    return supabase.from('shared_routine_live_sessions')
        .update({ status: 'ended' })
        .eq('shared_routine_id', sharedRoutineId).eq('status', 'active');
}