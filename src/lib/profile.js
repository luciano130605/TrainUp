import { supabase } from './supabaseClient';

function toNumberOrNull(value) {
  return value ? Number(value) : null;
}

export function buildProfilePayload(user, profile = {}) {
  const metadataName = user?.user_metadata?.nombre || user?.user_metadata?.name || '';
  const emailName = user?.email?.split('@')[0] || '';

  return {
    id: user.id,
    nombre: profile.nombre?.trim() || metadataName || emailName || 'Usuario',
    apellido: profile.apellido?.trim() || null,
    fecha_nacimiento: profile.fechaNacimiento || null,
    genero: profile.genero || null,
    altura_cm: toNumberOrNull(profile.alturaCm),
    peso_kg: toNumberOrNull(profile.pesoKg),
    objetivo: profile.objetivo || null,
    dias_entrenamiento: toNumberOrNull(profile.diasEntrenamiento),
  };
}

export async function ensureUserProfile(user, profile = {}) {
  if (!supabase || !user?.id) return { error: null };

  const hasProfileData = Object.values(profile).some((value) => Boolean(value));

  return supabase
    .from('profiles')
    .upsert(buildProfilePayload(user, profile), {
      onConflict: 'id',
      ignoreDuplicates: !hasProfileData,
    });
}
