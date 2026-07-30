export function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const seg = totalSeconds % 60;

  if (hs > 0) {
    return `${hs}h ${String(min).padStart(2, '0')}m ${String(seg).padStart(2, '0')}s`;
  }
  if (min > 0) {
    return `${min}m ${String(seg).padStart(2, '0')}s`;
  }
  return `${seg}s`;
}

// Para mostrar duraciones acumuladas (ej: horas semanales) de forma más compacta
export function formatHoursShort(totalSeconds) {
  const hs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);

  if (hs > 0) {
    return `${hs}h ${min}m`;
  }
  return `${min}m`;
}