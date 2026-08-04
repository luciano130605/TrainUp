import { supabase } from './supabaseClient';

export async function searchUsers(query) {
    if (!supabase || !query || query.trim().length < 2) return { data: [], error: null };
    return supabase.rpc('search_users', { p_query: query.trim() });
}

export async function getPublicProfiles(ids) {
    if (!supabase || !ids || ids.length === 0) return { data: [], error: null };
    return supabase.rpc('get_profile_public', { p_ids: ids });
}

export async function fetchFriendships(userId) {
    if (!supabase) return { data: [], error: null };
    return supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
}

export async function sendFriendRequest(userId, addresseeId) {
    // Buscamos si ya existe una fila entre estos dos usuarios (en cualquier dirección)
    const { data: existing, error: findError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(
            `and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),` +
            `and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`
        )
        .maybeSingle();

    if (findError) return { data: null, error: findError };

    if (existing) {
        // Ya existe una fila (rejected, removed, etc) -> la reactivamos
        // como si el userId actual fuera el nuevo requester.
        return supabase
            .from('friendships')
            .update({
                requester_id: userId,
                addressee_id: addresseeId,
                status: 'pending',
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
    }

    // No existe -> insert normal
    return supabase.from('friendships').insert({
        requester_id: userId,
        addressee_id: addresseeId,
        status: 'pending',
    });
}
export async function respondFriendRequest(friendshipId, accept) {
    return supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);
}

export async function removeFriendship(friendshipId) {
    return supabase.from('friendships').delete().eq('id', friendshipId);
}

export async function fetchSharedRoutines(userId) {
    if (!supabase) return { data: [], error: null };
    return supabase
        .from('shared_routines')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
}

export async function sendRoutineShare(senderId, receiverId, routine) {
    return supabase.from('shared_routines').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        routine_name: routine.name,
        routine_data: routine,
        status: 'pending',
    });
}

export async function respondRoutineShare(shareId, accept) {
    return supabase
        .from('shared_routines')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', shareId);
}

export function subscribeSocial(userId, onChange) {
    if (!supabase || !userId) return () => { };
    const channel = supabase
        .channel(`social-updates-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_routines' }, onChange)
        .subscribe();
    return () => supabase.removeChannel(channel);
}

export async function getProfileView(targetId) {
    if (!supabase || !targetId) return { data: null, error: null };
    const { data, error } = await supabase.rpc('get_profile_view', { p_target_id: targetId });
    return { data: Array.isArray(data) ? data[0] || null : data, error };
}

export async function setProfilePublic(userId, isPublic) {
    if (!supabase || !userId) return { error: null };
    return supabase
        .from('profiles')
        .update({ is_public: isPublic, updated_at: new Date().toISOString() })
        .eq('id', userId);
}

export async function setPrivacySettings(userId, fields) {
    return supabase.from('profiles').update(fields).eq('id', userId);
}
