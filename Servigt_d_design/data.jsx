// Shared mock data + tiny helpers for ServiGT.
// All Spanish (es-GT). Quetzal prices, Guatemalan zones.

const SGT_CATEGORIES = [
  { id: 'plomeria',   name: 'Plomería',          icon: 'Wrench',         color: '#1a73e8', count: 142 },
  { id: 'electricidad', name: 'Electricidad',    icon: 'Zap',            color: '#f59e0b', count: 118 },
  { id: 'limpieza',   name: 'Limpieza',          icon: 'Sparkles',       color: '#16a34a', count: 203 },
  { id: 'jardineria', name: 'Jardinería',        icon: 'Trees',          color: '#15803d', count: 67  },
  { id: 'ninera',     name: 'Niñera',            icon: 'Baby',           color: '#db2777', count: 89  },
  { id: 'tecnico',    name: 'Técnico en PC',     icon: 'Laptop',         color: '#7c3aed', count: 54  },
  { id: 'albanileria',name: 'Albañilería',       icon: 'Hammer',         color: '#dc2626', count: 76  },
  { id: 'otros',      name: 'Otros servicios',   icon: 'MoreHorizontal', color: '#667085', count: 48  },
];

const SGT_ZONES = [
  'Zona 1','Zona 4','Zona 9','Zona 10','Zona 11','Zona 13','Zona 14','Zona 15','Zona 16',
  'Mixco','Villa Nueva','Villa Canales','San Miguel Petapa','Antigua Guatemala',
  'San Lucas Sacatepéquez','Carretera a El Salvador','Santa Catarina Pinula',
];

// Stable Unsplash portrait IDs (faces). Used as avatars.
const SGT_FACES = [
  'photo-1507003211169-0a1dd7228f2d', // hombre
  'photo-1494790108377-be9c29b29330', // mujer
  'photo-1500648767791-00dcc994a43e', // hombre
  'photo-1438761681033-6461ffad8d80', // mujer
  'photo-1472099645785-5658abf4ff4e', // hombre
  'photo-1544005313-94ddf0286df2',    // mujer
  'photo-1519085360753-af0119f7cbe7', // hombre
  'photo-1573496359142-b8d87734a5a2', // mujer
  'photo-1463453091185-61582044d556', // hombre
  'photo-1545996124-0501ebae84d0',    // mujer
  'photo-1492562080023-ab3db95bfbce', // hombre
  'photo-1534528741775-53994a69daeb', // mujer
];

const sgtFace = (i, w = 200) =>
  `https://images.unsplash.com/${SGT_FACES[i % SGT_FACES.length]}?w=${w}&h=${w}&fit=crop&crop=faces`;

// Work / gallery photos by category (stable Unsplash IDs).
const SGT_WORK_PHOTOS = {
  plomeria:    ['photo-1585704032915-c3400ca199e7','photo-1542013936693-884638332954','photo-1607472586893-edb57bdc0e39'],
  electricidad:['photo-1565608438257-fac3c27beb36','photo-1621905251189-08b45d6a269e','photo-1473341304170-971dccb5ac1e'],
  limpieza:    ['photo-1581578731548-c64695cc6952','photo-1527515637462-cff94eecc1ac','photo-1584622650111-993a426fbf0a'],
  jardineria:  ['photo-1416879595882-3373a0480b5b','photo-1558904541-efa843a96f01','photo-1523348837708-15d4a09cfac2'],
  ninera:      ['photo-1503454537195-1dcabb73ffb9','photo-1587616211892-f743fcca64f9','photo-1607582544095-2c3d5c40d0fb'],
  tecnico:     ['photo-1550009158-9ebf69173e03','photo-1547082299-de196ea013d6','photo-1518770660439-4636190af475'],
  albanileria: ['photo-1503387762-592deb58ef4e','photo-1504307651254-35680f356dfd','photo-1581094794329-c8112a89af12'],
  otros:       ['photo-1581578731548-c64695cc6952','photo-1521791136064-7986c2920216','photo-1454165804606-c3d57bc86b40'],
};
const sgtWork = (cat, i, w = 600) => {
  const list = SGT_WORK_PHOTOS[cat] || SGT_WORK_PHOTOS.otros;
  return `https://images.unsplash.com/${list[i % list.length]}?w=${w}&q=70&auto=format&fit=crop`;
};

const SGT_PROVIDERS = [
  { id: 'p1', name: 'Carlos Méndez',     cat: 'plomeria',     zone: 'Zona 10',          rating: 4.9, reviews: 128, priceFrom: 150, exp: 8,  verified: true,  available: true,  bio: 'Plomero certificado con experiencia en residencial y comercial. Trabajos garantizados.', services: [{ name: 'Reparación de fugas', price: 150 },{ name: 'Instalación de grifería', price: 220 },{ name: 'Destape de cañerías', price: 280 },{ name: 'Cambio de tubería', price: 450 }] },
  { id: 'p2', name: 'María Fernanda López', cat: 'limpieza',  zone: 'Mixco',            rating: 4.8, reviews: 214, priceFrom: 120, exp: 5,  verified: true,  available: true,  bio: 'Limpieza profunda de casas y oficinas. Productos ecológicos disponibles.', services: [{ name: 'Limpieza general (4h)', price: 250 },{ name: 'Limpieza profunda', price: 480 },{ name: 'Limpieza post-obra', price: 650 }] },
  { id: 'p3', name: 'Luis Alberto Ramírez', cat: 'electricidad', zone: 'Zona 14',       rating: 4.7, reviews: 96,  priceFrom: 200, exp: 12, verified: true,  available: false, bio: 'Electricista industrial y residencial. Diagnóstico sin costo.', services: [{ name: 'Diagnóstico eléctrico', price: 0 },{ name: 'Instalación de tomacorriente', price: 180 },{ name: 'Cambio de tablero', price: 850 }] },
  { id: 'p4', name: 'Ana Lucía Estrada',  cat: 'ninera',       zone: 'Antigua Guatemala', rating: 5.0, reviews: 47,  priceFrom: 80,  exp: 6,  verified: true,  available: true,  bio: 'Niñera con formación en pedagogía. Disponible fines de semana.', services: [{ name: 'Cuidado por hora', price: 80 },{ name: 'Día completo', price: 450 }] },
  { id: 'p5', name: 'Diego Morales',      cat: 'tecnico',      zone: 'Zona 11',         rating: 4.6, reviews: 73,  priceFrom: 175, exp: 4,  verified: false, available: true,  bio: 'Reparación de PCs y laptops. Recuperación de datos.', services: [{ name: 'Mantenimiento básico', price: 175 },{ name: 'Formateo + instalación', price: 320 },{ name: 'Recuperación de datos', price: 600 }] },
  { id: 'p6', name: 'Sofía Hernández',    cat: 'jardineria',   zone: 'Carretera a El Salvador', rating: 4.9, reviews: 58, priceFrom: 200, exp: 7, verified: true, available: true,  bio: 'Diseño y mantenimiento de jardines. Podas y riego automatizado.', services: [{ name: 'Mantenimiento mensual', price: 600 },{ name: 'Diseño de jardín', price: 2500 }] },
  { id: 'p7', name: 'Roberto Castillo',   cat: 'albanileria',  zone: 'Villa Nueva',     rating: 4.5, reviews: 89,  priceFrom: 350, exp: 15, verified: true,  available: false, bio: 'Albañil maestro. Remodelaciones, ampliaciones y acabados finos.', services: [{ name: 'Reparación de muros', price: 350 },{ name: 'Remodelación de baño', price: 6500 }] },
  { id: 'p8', name: 'Patricia Gómez',     cat: 'limpieza',     zone: 'Zona 15',         rating: 4.8, reviews: 142, priceFrom: 130, exp: 9,  verified: true,  available: true,  bio: 'Equipo de limpieza profesional para residencias.', services: [{ name: 'Limpieza por hora', price: 130 }] },
];

// Index providers by id for easy lookup
const SGT_PROVIDERS_BY_ID = Object.fromEntries(SGT_PROVIDERS.map((p, i) => [p.id, { ...p, faceIdx: i }]));

const SGT_REVIEWS = [
  { provider: 'p1', author: 'Jorge M.',  rating: 5, date: 'Hace 3 días',   text: 'Excelente trabajo, llegó puntual y dejó todo limpio. Muy recomendado.', faceIdx: 0 },
  { provider: 'p1', author: 'Luisa P.',  rating: 5, date: 'Hace 1 semana', text: 'Resolvió la fuga en 30 minutos. Precio justo.', faceIdx: 1 },
  { provider: 'p1', author: 'Andrés C.', rating: 4, date: 'Hace 2 semanas', text: 'Buen trabajo aunque llegó 15 min tarde.', faceIdx: 2 },
  { provider: 'p2', author: 'Karla R.',  rating: 5, date: 'Hace 5 días',   text: 'Dejó la casa impecable. Volveré a contratarla.', faceIdx: 3 },
];

const SGT_REQUESTS = [
  { id: 'r1', service: 'Reparación de fuga en cocina',   provider: 'p1', date: '04 May, 2026 · 14:00', status: 'pendiente',     amount: 220, address: 'Zona 10, 6a Av' },
  { id: 'r2', service: 'Limpieza profunda mensual',      provider: 'p2', date: '02 May, 2026 · 09:00', status: 'aceptado',      amount: 480, address: 'Mixco, Col. Las Brisas' },
  { id: 'r7', service: 'Destape de cañería principal',   provider: 'p1', date: 'Hoy · 15:30',          status: 'en_camino',     amount: 350, address: 'Zona 15, Vista Hermosa' },
  { id: 'r3', service: 'Instalación de tomacorrientes',  provider: 'p3', date: '28 Abr, 2026 · 10:30', status: 'en_progreso',   amount: 540, address: 'Zona 14, Edificio Tikal' },
  { id: 'r8', service: 'Pintura de sala y comedor',      provider: 'p6', date: 'Ayer · 08:00',         status: 'por_confirmar', amount: 1250, address: 'Zona 16, Cayalá' },
  { id: 'r4', service: 'Cuidado de niño 8h',             provider: 'p4', date: '20 Abr, 2026 · 08:00', status: 'completado',    amount: 450, address: 'Antigua, 5a Calle Oriente' },
  { id: 'r5', service: 'Mantenimiento de jardín',        provider: 'p6', date: '15 Abr, 2026 · 07:00', status: 'completado',    amount: 600, address: 'Km 14.5 Carr. a El Salvador' },
  { id: 'r9', service: 'Reparación de refrigeradora',    provider: 'p5', date: '12 Abr, 2026 · 11:00', status: 'rechazado',     amount: 400, address: 'Zona 7, Col. Landívar' },
  { id: 'r6', service: 'Formateo de laptop',             provider: 'p5', date: '10 Abr, 2026 · 16:00', status: 'cancelado',     amount: 320, address: 'Zona 11, Col. Mariscal' },
];

// ── Estados ────────────────────────────────────────────────────────
// Un solo mapa, claves namespaced para que `aceptada` de servicio y de cotización
// no colisionen. Tratamiento visual: servicio y pedido = chip RELLENO (dot sólido);
// cotización = chip de CONTORNO (dot hueco) — mismo hue, objeto distinto.
// Cada entrada trae su par oscuro en `d`. Todos ≥4.5:1 (validado en "Paleta v2").
const SGT_STATUS = {
  // Servicio — claves del esquema de la base de datos (8 estados, masculino)
  pendiente:     { label: 'Pendiente',     bg: '#fdf2e3', fg: '#8a4708', dot: '#f59e0b', d: { bg: 'rgba(245,158,11,.18)', fg: '#f2c879', dot: '#f59e0b' } },
  aceptado:      { label: 'Aceptado',      bg: '#e6effa', fg: '#1b5499', dot: '#4589d4', d: { bg: 'rgba(69,137,212,.18)', fg: '#a8cbec', dot: '#4589d4' } },
  en_camino:     { label: 'En camino',     bg: '#e0f2f4', fg: '#0f5c63', dot: '#0e7490', d: { bg: 'rgba(14,116,144,.24)',  fg: '#8ed3dd', dot: '#22a5b8' } },
  en_progreso:   { label: 'En progreso',   bg: '#dbe8f7', fg: '#123c6f', dot: '#1b5499', d: { bg: 'rgba(27,84,153,.30)',  fg: '#bcd6f0', dot: '#5b9be0' } },
  por_confirmar: { label: 'Por confirmar', bg: '#eeeaf9', fg: '#4c3a8f', dot: '#7c5cd6', d: { bg: 'rgba(124,92,214,.24)', fg: '#c3b2f2', dot: '#9b7ef0' } },
  completado:    { label: 'Completado',    bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)',  fg: '#8fdba9', dot: '#22c55e' } },
  cancelado:     { label: 'Cancelado',     bg: '#fbe9ed', fg: '#9f1239', dot: '#be123c', d: { bg: 'rgba(190,18,60,.20)',  fg: '#f5a3b6', dot: '#e11d48' } },
  rechazado:     { label: 'Rechazado',     bg: '#f4eced', fg: '#7a3b4a', dot: '#a15563', d: { bg: 'rgba(161,85,99,.24)',  fg: '#e7b3bd', dot: '#c9788a' } },

  // Pedido (marketplace de demanda) — relleno
  pedido_abierto:    { label: 'Abierto',    bg: '#e6effa', fg: '#1b5499', dot: '#4589d4', d: { bg: 'rgba(69,137,212,.18)', fg: '#a8cbec', dot: '#4589d4' } },
  pedido_adjudicado: { label: 'Adjudicado', bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)',  fg: '#8fdba9', dot: '#22c55e' } },
  pedido_cerrado:    { label: 'Cerrado',    bg: '#ecebe7', fg: '#4a5262', dot: '#667085', d: { bg: 'rgba(246,244,238,.08)', fg: '#b9bfc9', dot: '#9aa3af' } },
  pedido_expirado:   { label: 'Expirado',   bg: '#fbe9ed', fg: '#9f1239', dot: '#be123c', d: { bg: 'rgba(190,18,60,.20)',  fg: '#f5a3b6', dot: '#e11d48' } },

  // Cotización — contorno + dot hueco
  cot_enviada:   { label: 'Enviada',   outline: true, bg: 'var(--sgt-card-bg,#f6f4ee)', fg: '#1b5499', dot: '#b3cfe8', d: { bg: 'transparent', fg: '#a8cbec', dot: 'rgba(69,137,212,.45)' } },
  cot_aceptada:  { label: 'Aceptada',  outline: true, bg: 'var(--sgt-card-bg,#f6f4ee)', fg: '#14683a', dot: '#a7dcbb', d: { bg: 'transparent', fg: '#8fdba9', dot: 'rgba(34,197,94,.45)' } },
  cot_rechazada: { label: 'Rechazada', outline: true, bg: 'var(--sgt-card-bg,#f6f4ee)', fg: '#9f1239', dot: '#f0c3ce', d: { bg: 'transparent', fg: '#f5a3b6', dot: 'rgba(225,29,72,.45)' } },
  cot_retirada:  { label: 'Retirada',  outline: true, bg: 'var(--sgt-card-bg,#f6f4ee)', fg: '#5c6577', dot: '#dcd9d2', d: { bg: 'transparent', fg: '#b9bfc9', dot: 'rgba(246,244,238,.22)' } },

  // Urgencia
  urg_baja:  { label: 'Baja',  bg: '#ecebe7', fg: '#4a5262', dot: '#9aa3af', d: { bg: 'rgba(246,244,238,.08)', fg: '#b9bfc9', dot: '#9aa3af' } },
  urg_media: { label: 'Media', bg: '#fdf2e3', fg: '#8a4708', dot: '#f59e0b', d: { bg: 'rgba(245,158,11,.18)', fg: '#f2c879', dot: '#f59e0b' } },
  urg_alta:  { label: 'Alta',  bg: '#fbe9ed', fg: '#9f1239', dot: '#be123c', d: { bg: 'rgba(190,18,60,.20)', fg: '#f5a3b6', dot: '#e11d48' } },

  // Etiquetas comparativas (sin punto) — mismo sistema, par oscuro validado
  tag_barata:  { label: 'Más económica',   nodot: true, bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)',  fg: '#8fdba9', dot: '#22c55e' } },
  tag_baja:    { label: 'La más baja',     nodot: true, bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)',  fg: '#8fdba9', dot: '#22c55e' } },
  tag_precio:  { label: 'Mejor precio',    nodot: true, bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)',  fg: '#8fdba9', dot: '#22c55e' } },
  tag_mejor:   { label: 'Mejor calificado', nodot: true, bg: '#e6effa', fg: '#1b5499', dot: '#4589d4', d: { bg: 'rgba(69,137,212,.18)', fg: '#a8cbec', dot: '#4589d4' } },
  tag_popular: { label: 'Más elegido',     nodot: true, bg: '#e6effa', fg: '#1b5499', dot: '#4589d4', d: { bg: 'rgba(69,137,212,.18)', fg: '#a8cbec', dot: '#4589d4' } },

  // Movimiento de créditos (contable) — familia propia: un gasto NO es un límite alcanzado
  tx_gasto:   { label: 'Gasto',   bg: '#fbe9ed', fg: '#9f1239', dot: '#be123c', d: { bg: 'rgba(190,18,60,.20)', fg: '#f5a3b6', dot: '#e11d48' } },
  tx_recarga: { label: 'Recarga', bg: '#e6effa', fg: '#1b5499', dot: '#4589d4', d: { bg: 'rgba(69,137,212,.18)', fg: '#a8cbec', dot: '#4589d4' } },
  tx_bono:    { label: 'Bono',    bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)', fg: '#8fdba9', dot: '#22c55e' } },

  // Compra de créditos (transacción simulada) — familia propia: una compra NO es un servicio
  compra_pendiente:  { label: 'Pendiente',  bg: '#fdf2e3', fg: '#8a4708', dot: '#f59e0b', d: { bg: 'rgba(245,158,11,.18)', fg: '#f2c879', dot: '#f59e0b' } },
  compra_completada: { label: 'Completada', bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)',  fg: '#8fdba9', dot: '#22c55e' } },
  compra_fallida:    { label: 'Fallida',    bg: '#fbe9ed', fg: '#9f1239', dot: '#be123c', d: { bg: 'rgba(190,18,60,.20)',  fg: '#f5a3b6', dot: '#e11d48' } },
  compra_cancelada:  { label: 'Cancelada',  bg: '#ecebe7', fg: '#4a5262', dot: '#667085', d: { bg: 'rgba(246,244,238,.08)', fg: '#b9bfc9', dot: '#9aa3af' } },

  // Premium — hue dorado propio, distinto de "verificado" (azul) y de urgencia (ámbar)
  prem_activo:  { label: 'Premium activo',  bg: '#fbf1dc', fg: '#8a5a08', dot: '#c2810b', d: { bg: 'rgba(194,129,11,.22)',  fg: '#f0cd8c', dot: '#e0a83a' } },
  prem_vencido: { label: 'Premium vencido', bg: '#ecebe7', fg: '#4a5262', dot: '#667085', d: { bg: 'rgba(246,244,238,.08)', fg: '#b9bfc9', dot: '#9aa3af' } },
  prem_nunca:   { label: 'Sin Premium',     bg: '#ecebe7', fg: '#5c6577', dot: '#9aa3af', d: { bg: 'rgba(246,244,238,.06)', fg: '#98a1b0', dot: '#6f7887' } },

  // Crédito / slot de cotización
  slot_gratis:    { label: 'Gratis',           bg: '#e3f5e9', fg: '#14683a', dot: '#16a34a', d: { bg: 'rgba(22,163,74,.18)', fg: '#8fdba9', dot: '#22c55e' } },
  slot_pagada:    { label: 'Cuesta 1 crédito', bg: '#fdf2e3', fg: '#8a4708', dot: '#f59e0b', d: { bg: 'rgba(245,158,11,.18)', fg: '#f2c879', dot: '#f59e0b' } },
  slot_sin_saldo: { label: 'Sin saldo',        bg: '#fbe9ed', fg: '#9f1239', dot: '#be123c', d: { bg: 'rgba(190,18,60,.20)', fg: '#f5a3b6', dot: '#e11d48' } },
  slot_limite:    { label: 'Límite alcanzado', bg: '#ecebe7', fg: '#4a5262', dot: '#667085', d: { bg: 'rgba(246,244,238,.08)', fg: '#b9bfc9', dot: '#9aa3af' } },
};

// Resolutor: <StatusChip kind="pedido" status="abierto" />
const SGT_STATUS_NS = { servicio: '', pedido: 'pedido_', cotizacion: 'cot_', urgencia: 'urg_', credito: 'slot_', transaccion: 'tx_', etiqueta: 'tag_', compra: 'compra_', premium: 'prem_' };
// Orden canónico del ciclo de vida de un servicio (para filtros y timelines).
const SGT_SERVICIO_ESTADOS = ['pendiente', 'aceptado', 'en_camino', 'en_progreso', 'por_confirmar', 'completado', 'cancelado', 'rechazado'];

// Fallback VISIBLE: un estado desconocido no se disfraza de "Pendiente" — sale
// gris, con borde punteado y el string crudo, para que salte a la vista.
const sgtStatusFallback = (status) => ({
  label: String(status ?? '—'), unknown: true,
  bg: 'var(--sgt-input-bg, #ecebe7)', fg: 'var(--sgt-text-sub, #4a5262)', dot: 'var(--sgt-faint, #9aa3af)',
});
const sgtStatus = (status, kind = 'servicio') =>
  SGT_STATUS[(SGT_STATUS_NS[kind] ?? '') + status] || SGT_STATUS[status] || sgtStatusFallback(status);

const SGT_NOTIFS = [
  { id: 'n1', group: 'hoy',      type: 'request', title: 'Nueva solicitud de servicio',  body: 'Carlos M. te envió una solicitud de plomería en Zona 10', time: 'Hace 12 min', unread: true,  icon: 'Bell' },
  { id: 'n2', group: 'hoy',      type: 'message', title: 'Mensaje nuevo',                 body: 'María Fernanda: "Hola, ¿podemos confirmar la hora?"',          time: 'Hace 1 h',  unread: true,  icon: 'MessageCircle' },
  { id: 'n3', group: 'hoy',      type: 'review',  title: 'Nueva reseña 5 ★',             body: 'Jorge M. dejó una reseña en tu perfil',                        time: 'Hace 3 h',  unread: false, icon: 'Star' },
  { id: 'n4', group: 'semana',   type: 'payment', title: 'Pago recibido',                 body: 'Recibiste Q480 por el servicio del 02 de mayo',                time: 'Lun 14:22', unread: false, icon: 'CreditCard' },
  { id: 'n5', group: 'semana',   type: 'request', title: 'Solicitud completada',          body: 'La solicitud #r3 fue marcada como completada',                 time: 'Mar 09:15', unread: false, icon: 'CheckCircle2' },
  { id: 'n6', group: 'anteriores', type: 'system', title: 'Tu perfil fue verificado',     body: 'Felicidades, ahora apareces como Verificado',                  time: '14 Abr',    unread: false, icon: 'ShieldCheck' },
  { id: 'n7', group: 'anteriores', type: 'message', title: 'Mensaje nuevo',                body: 'Diego M.: "Adjunto la cotización"',                            time: '08 Abr',    unread: false, icon: 'MessageCircle' },
];

const SGT_CHATS = [
  { id: 'c1', with: 'p1', last: 'Perfecto, llego en 20 min', time: '14:32', unread: 2,  status: 'aceptado' },
  { id: 'c2', with: 'p2', last: 'Adjunto fotos de la casa',   time: '11:08', unread: 0,  status: 'pendiente' },
  { id: 'c3', with: 'p4', last: 'Gracias por confirmar',      time: 'Ayer',  unread: 0,  status: 'completado' },
  { id: 'c4', with: 'p6', last: 'Llevo el equipo de poda',    time: 'Lun',   unread: 1,  status: 'en_progreso' },
  { id: 'c5', with: 'p5', last: 'OK, lo veo mañana',          time: '28 Abr', unread: 0, status: 'aceptado' },
];

const SGT_MESSAGES = {
  c1: [
    { from: 'them', text: 'Hola, recibí tu solicitud de fuga en cocina', time: '14:18', read: true },
    { from: 'me',   text: '¡Hola Carlos! ¿Podrías venir hoy en la tarde?', time: '14:20', read: true },
    { from: 'them', text: 'Sí, tengo disponible a las 14:30', time: '14:22', read: true },
    { from: 'me',   text: 'Perfecto, te dejo la dirección', time: '14:25', read: true },
    { from: 'me',   text: 'Zona 10, 6a Av 12-34', time: '14:25', read: true },
    { from: 'them', text: 'Recibido. Llevo herramienta para soldar también', time: '14:28', read: true },
    { from: 'them', text: 'Perfecto, llego en 20 min', time: '14:32', read: false },
  ],
  c2: [
    { from: 'them', text: 'Hola, ¿qué tipo de limpieza necesitas?', time: '10:45', read: true },
    { from: 'me',   text: 'Limpieza profunda, casa de 3 ambientes', time: '10:50', read: true },
    { from: 'them', text: 'Adjunto fotos de la casa',                 time: '11:08', read: false },
  ],
};

// Dashboard time series
const SGT_INCOME_6M = [
  { month: 'Nov', value: 4200 },
  { month: 'Dic', value: 5800 },
  { month: 'Ene', value: 5100 },
  { month: 'Feb', value: 6400 },
  { month: 'Mar', value: 7200 },
  { month: 'Abr', value: 8650 },
];

const SGT_REQ_BY_MONTH = [
  { month: 'Nov', value: 142 },
  { month: 'Dic', value: 198 },
  { month: 'Ene', value: 175 },
  { month: 'Feb', value: 234 },
  { month: 'Mar', value: 289 },
  { month: 'Abr', value: 327 },
];

const SGT_REQ_BY_CAT = [
  { name: 'Limpieza',     value: 32, color: '#16a34a' },
  { name: 'Plomería',     value: 22, color: '#1a73e8' },
  { name: 'Electricidad', value: 18, color: '#f59e0b' },
  { name: 'Jardinería',   value: 11, color: '#15803d' },
  { name: 'Niñera',       value: 9,  color: '#db2777' },
  { name: 'Otros',        value: 8,  color: '#667085' },
];

const SGT_PENDING_VERIF = [
  { id: 'pv1', name: 'Esteban Rodríguez', cat: 'electricidad', zone: 'Zona 9',  applied: '02 May', faceIdx: 4 },
  { id: 'pv2', name: 'Wendy Castañeda',  cat: 'limpieza',     zone: 'Mixco',   applied: '02 May', faceIdx: 5 },
  { id: 'pv3', name: 'José Pérez',        cat: 'albanileria',  zone: 'Villa Nueva', applied: '01 May', faceIdx: 6 },
  { id: 'pv4', name: 'Carmen Velásquez', cat: 'ninera',       zone: 'Zona 14', applied: '30 Abr', faceIdx: 7 },
];

const SGT_ZONE_HEAT = [
  { zone: 'Zona 10', value: 287 },
  { zone: 'Zona 14', value: 234 },
  { zone: 'Mixco',   value: 198 },
  { zone: 'Zona 15', value: 176 },
  { zone: 'Villa Nueva', value: 152 },
  { zone: 'Zona 11', value: 128 },
  { zone: 'Antigua', value: 94 },
  { zone: 'Zona 4',  value: 67 },
];

// ── Marketplace de demanda ─────────────────────────────────────────
const SGT_DEPTOS = ['Guatemala', 'Sacatepéquez', 'Escuintla', 'Quetzaltenango', 'Chimaltenango'];

// Pedidos publicados por clientes. `expiresIn` = horas restantes (7 d = 168 h).
const SGT_PEDIDOS = [
  { id: 'pd1', title: 'Fuga en tubería del baño principal', cat: 'plomeria', desc: 'Hay una fuga constante bajo el lavamanos del baño principal. Ya cerré la llave de paso pero necesito que lo revisen hoy o mañana. La tubería parece de PVC y tiene humedad en la pared.', zone: 'Zona 10', depto: 'Guatemala', address: '6a Avenida 12-34, Zona 10', urgency: 'alta', status: 'abierto', publishedAt: 'Hace 2 h', expiresIn: 166, reach: 18, client: 'Ana Sofía R.', clientFace: 3 },
  { id: 'pd2', title: 'Limpieza profunda de apartamento 2 habitaciones', cat: 'limpieza', desc: 'Apartamento de 85 m², 2 habitaciones y 2 baños. Se necesita limpieza profunda incluyendo ventanas y horno. Entrego el 20 de mayo.', zone: 'Mixco', depto: 'Guatemala', address: 'Col. Las Brisas, Mixco', urgency: 'media', status: 'abierto', publishedAt: 'Ayer', expiresIn: 142, reach: 24, client: 'Ana Sofía R.', clientFace: 3 },
  { id: 'pd3', title: 'Instalación de 6 lámparas LED empotradas', cat: 'electricidad', desc: 'Sala de 5x4 m. Ya tengo las lámparas y el cableado llega al techo. Falta el corte del cielo falso y la conexión.', zone: 'Zona 14', depto: 'Guatemala', address: 'Edificio Tikal, Zona 14', urgency: 'baja', status: 'adjudicado', publishedAt: 'Hace 4 d', expiresIn: 96, reach: 15, client: 'Ana Sofía R.', clientFace: 3, awarded: 'ct7', serviceId: 'r3' },
  { id: 'pd4', title: 'Poda de 3 árboles y retiro de ramas', cat: 'jardineria', desc: 'Tres jacarandas de unos 6 m. Se necesita poda y llevarse las ramas.', zone: 'Carretera a El Salvador', depto: 'Guatemala', address: 'Km 14.5', urgency: 'media', status: 'abierto', publishedAt: 'Hace 3 d', expiresIn: 92, reach: 9, client: 'Marco T.', clientFace: 10 },
  { id: 'pd5', title: 'Reparación de muro con humedad', cat: 'albanileria', desc: 'Muro exterior de 4 m con humedad y pintura descarapelada. Requiere impermeabilizado.', zone: 'Villa Nueva', depto: 'Guatemala', address: 'Col. El Frutal', urgency: 'baja', status: 'cerrado', publishedAt: 'Hace 9 d', expiresIn: 0, reach: 12, client: 'Ana Sofía R.', clientFace: 3 },
  { id: 'pd6', title: 'Niñera para dos niños, sábado 8 h', cat: 'ninera', desc: 'Niños de 4 y 7 años. Sábado de 9:00 a 17:00 en casa. Preferible con referencias.', zone: 'Antigua Guatemala', depto: 'Sacatepéquez', address: '5a Calle Oriente', urgency: 'media', status: 'expirado', publishedAt: 'Hace 8 d', expiresIn: 0, reach: 7, client: 'Ana Sofía R.', clientFace: 3 },
  { id: 'pd7', title: 'Laptop no enciende — diagnóstico', cat: 'tecnico', desc: 'HP Pavilion, no da señal de video. Ya probé con otro cargador.', zone: 'Zona 11', depto: 'Guatemala', address: 'Col. Mariscal', urgency: 'alta', status: 'abierto', publishedAt: 'Hace 5 h', expiresIn: 163, reach: 11, client: 'Lucía V.', clientFace: 7 },
];

// Cotizaciones. `credit` = 0 (gratis, slots 1-3) | 1 (pagada, slots 4-6). `slot` = orden de llegada.
const SGT_COTIZACIONES = [
  { id: 'ct1', pedido: 'pd1', provider: 'p1', amount: 285, message: 'Puedo llegar hoy a las 15:00. Incluye cambio de sifón, sellado y revisión de la pared con humedad. Garantía de 3 meses.', status: 'enviada', sentAt: 'Hace 1 h', slot: 1, credit: 0 },
  { id: 'ct2', pedido: 'pd1', provider: 'p7', amount: 240, message: 'Reviso y reparo la fuga. Si hay que picar pared, el resane va aparte (Q120).', status: 'enviada', sentAt: 'Hace 55 min', slot: 2, credit: 0 },
  { id: 'ct3', pedido: 'pd1', provider: 'p3', amount: 350, message: 'Trabajo completo con materiales incluidos y factura. Disponible mañana temprano.', status: 'enviada', sentAt: 'Hace 40 min', slot: 3, credit: 0 },
  { id: 'ct4', pedido: 'pd1', provider: 'p5', amount: 200, message: 'Puedo pasar hoy mismo. Precio de mano de obra, materiales los pone el cliente.', status: 'enviada', sentAt: 'Hace 20 min', slot: 4, credit: 1 },
  { id: 'ct5', pedido: 'pd2', provider: 'p2', amount: 520, message: 'Equipo de 2 personas, 6 horas. Productos ecológicos incluidos.', status: 'enviada', sentAt: 'Ayer', slot: 1, credit: 0 },
  { id: 'ct6', pedido: 'pd2', provider: 'p8', amount: 450, message: 'Limpieza profunda completa. Ventanas y horno incluidos.', status: 'enviada', sentAt: 'Hace 20 h', slot: 2, credit: 0 },
  { id: 'ct7', pedido: 'pd3', provider: 'p3', amount: 780, message: 'Corte de cielo falso, instalación y conexión de las 6 lámparas. Un día de trabajo.', status: 'aceptada', sentAt: 'Hace 4 d', slot: 1, credit: 0 },
  { id: 'ct8', pedido: 'pd3', provider: 'p1', amount: 900, message: 'Instalación con canalización nueva y dimmer.', status: 'rechazada', sentAt: 'Hace 4 d', slot: 2, credit: 0 },
  { id: 'ct9', pedido: 'pd3', provider: 'p5', amount: 690, message: 'Puedo hacerlo el fin de semana.', status: 'rechazada', sentAt: 'Hace 3 d', slot: 3, credit: 0 },
  { id: 'ct10', pedido: 'pd4', provider: 'p6', amount: 850, message: 'Poda de las 3 jacarandas y retiro de ramas incluido en el precio.', status: 'enviada', sentAt: 'Hace 2 d', slot: 1, credit: 0 },
  { id: 'ct11', pedido: 'pd7', provider: 'p5', amount: 175, message: 'Diagnóstico Q175, se abona al costo de la reparación si acepta el presupuesto.', status: 'enviada', sentAt: 'Hace 3 h', slot: 1, credit: 0 },
  { id: 'ct12', pedido: 'pd5', provider: 'p7', amount: 1400, message: 'Impermeabilizado con membrana y resane completo.', status: 'retirada', sentAt: 'Hace 8 d', slot: 1, credit: 0 },
];

const SGT_MAX_COTIZACIONES = 6;
const SGT_COT_GRATIS = 3;

// Saldo de créditos por proveedor
const SGT_CREDITS = { p1: 12, p2: 4, p3: 0, p4: 7, p5: 2, p6: 21, p7: 1, p8: 9 };

const SGT_CREDIT_TX = [
  { id: 'tx1', provider: 'p5', type: 'gasto',   amount: -1,  reason: 'Cotización en pedido #pd1 (slot 4)', date: '04 May · 14:22' },
  { id: 'tx2', provider: 'p1', type: 'recarga', amount: 20,  reason: 'Pago por transferencia · Boleta 88213', date: '03 May · 09:10', by: 'admin' },
  { id: 'tx3', provider: 'p3', type: 'gasto',   amount: -1,  reason: 'Cotización en pedido #pd2 (slot 5)', date: '02 May · 17:40' },
  { id: 'tx4', provider: 'p6', type: 'bono',    amount: 10,  reason: 'Bono por 20 servicios completados', date: '01 May · 08:00', by: 'sistema' },
  { id: 'tx5', provider: 'p2', type: 'recarga', amount: 15,  reason: 'Pago en efectivo en oficina', date: '30 Abr · 11:25', by: 'admin' },
  { id: 'tx6', provider: 'p7', type: 'gasto',   amount: -1,  reason: 'Cotización en pedido #pd5 (slot 6)', date: '28 Abr · 16:05' },
  { id: 'tx7', provider: 'p8', type: 'bono',    amount: 5,   reason: 'Bono de bienvenida', date: '25 Abr · 10:00', by: 'sistema' },
];

// ── Monetización ───────────────────────────────────────────────────
// Paquetes de créditos. Compra simulada con acreditación inmediata: no hay
// aprobación del admin en este camino. `unit` = Q por crédito (precalculado,
// para no depender del redondeo). `save` = % menos que el paquete Inicial.
const SGT_PACKS = [
  { id: 'inicial',  name: 'Inicial',      n: 8,   price: 39,  unit: 4.88, tag: null,       save: null },
  { id: 'impulso',  name: 'Impulso',      n: 30,  price: 115, unit: 3.83, tag: 'popular',  save: 21 },
  { id: 'pro',      name: 'Profesional',  n: 135, price: 459, unit: 3.40, tag: 'precio',   save: 30 },
  { id: 'negocio',  name: 'Negocio',      n: 250, price: 765, unit: 3.06, tag: null,       save: 37 },
];
const sgtPack = (id) => SGT_PACKS.find(p => p.id === id) || SGT_PACKS[1];
// Tipo de cambio referencial, solo para equivalencia aproximada.
const SGT_USD = 7.85;

// Compras auto-acreditadas. Una por estado, para diseñar los cuatro tratamientos.
const SGT_COMPRAS = [
  { id: 'cp1', provider: 'p1', pack: 'impulso', n: 30,  amount: 115, status: 'completada', date: '03 Ago · 09:41', ref: 'SGT-40182', method: 'Tarjeta guardada' },
  { id: 'cp2', provider: 'p6', pack: 'pro',     n: 135, amount: 459, status: 'completada', date: '02 Ago · 18:07', ref: 'SGT-40177', method: 'Tarjeta guardada' },
  { id: 'cp3', provider: 'p5', pack: 'inicial', n: 8,   amount: 39,  status: 'pendiente',  date: '03 Ago · 11:26', ref: 'SGT-40185', method: 'Tarjeta guardada' },
  { id: 'cp4', provider: 'p3', pack: 'impulso', n: 30,  amount: 115, status: 'fallida',    date: '02 Ago · 20:15', ref: 'SGT-40179', method: 'Tarjeta guardada', error: 'El emisor rechazó el cargo simulado.' },
  { id: 'cp5', provider: 'p7', pack: 'negocio', n: 250, amount: 765, status: 'cancelada',  date: '01 Ago · 16:52', ref: 'SGT-40171', method: 'Tarjeta guardada' },
];

// Premium: Q115/mes, 30 días de vigencia, 10 créditos por activación o renovación.
// No cambia la regla de cotizaciones (3 gratis, máximo 6) para nadie.
const SGT_PREMIUM = { price: 115, dias: 30, creditos: 10 };
const SGT_PREMIUM_STATUS = {
  p1: { estado: 'activo',  desde: '12 Jul 2026', hasta: '11 Ago 2026', diasRestantes: 8, renovaciones: 3 },
  p6: { estado: 'activo',  desde: '28 Jul 2026', hasta: '27 Ago 2026', diasRestantes: 24, renovaciones: 1 },
  p2: { estado: 'vencido', desde: '21 May 2026', hasta: '20 Jun 2026', diasRestantes: 0, renovaciones: 2 },
};
const sgtPremium = (providerId) => SGT_PREMIUM_STATUS[providerId] || { estado: 'nunca', diasRestantes: 0 };

const sgtCotsDe = (pedidoId) => SGT_COTIZACIONES.filter(c => c.pedido === pedidoId).sort((a, b) => a.slot - b.slot);
const sgtPedido = (id) => SGT_PEDIDOS.find(p => p.id === id);
// Costo de la siguiente cotización de un pedido: 0 = gratis, 1 = 1 crédito, null = límite
const sgtCostoSiguiente = (pedidoId) => {
  const n = SGT_COTIZACIONES.filter(c => c.pedido === pedidoId && c.status !== 'retirada').length;
  if (n >= SGT_MAX_COTIZACIONES) return null;
  return n < SGT_COT_GRATIS ? 0 : 1;
};

Object.assign(window, {
  SGT_CATEGORIES, SGT_ZONES, SGT_FACES, sgtFace, sgtWork, SGT_WORK_PHOTOS,
  SGT_PROVIDERS, SGT_PROVIDERS_BY_ID, SGT_REVIEWS, SGT_REQUESTS, SGT_STATUS, sgtStatus, SGT_STATUS_NS,
  SGT_DEPTOS, SGT_PEDIDOS, SGT_COTIZACIONES, SGT_CREDITS, SGT_CREDIT_TX,
  SGT_MAX_COTIZACIONES, SGT_COT_GRATIS, sgtCotsDe, sgtPedido, sgtCostoSiguiente,
  SGT_PACKS, sgtPack, SGT_USD, SGT_COMPRAS, SGT_PREMIUM, SGT_PREMIUM_STATUS, sgtPremium,
  SGT_NOTIFS, SGT_CHATS, SGT_MESSAGES,
  SGT_INCOME_6M, SGT_REQ_BY_MONTH, SGT_REQ_BY_CAT, SGT_PENDING_VERIF, SGT_ZONE_HEAT,
});
