export const SAFETY_STATES = new Set(['aceptado', 'en_camino', 'en_progreso', 'por_confirmar']);
export const canOpenSafety = (estado) => SAFETY_STATES.has(estado);
// Fuentes oficiales verificadas el 2026-10-12; la ayuda no depende de la API.
export const EMERGENCY_RESOURCES = [
  { label: 'Bomberos Voluntarios · 122', phone: '122', source: 'https://bomberosvoluntarios.org.gt/services/fires' },
  { label: 'Policia Nacional Civil · 110', phone: '110', source: 'https://pnc.gob.gt/' },
];
