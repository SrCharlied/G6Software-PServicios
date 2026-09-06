const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d\s\-().]{7,20}$/;

export const validateEmail = (v) => EMAIL_RE.test((v || '').trim());

export const validatePhone = (v) => PHONE_RE.test((v || '').trim());

// Espejo de las reglas del backend (task 3.1): minimo 10 caracteres con
// letras y numeros, tope de 72 bytes porque bcrypt trunca ahi. Esto es solo
// para dar retroalimentacion inmediata en el formulario; la validacion que
// manda es la del backend, que corre igual si alguien llama al API directo.
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 72;

export const validatePassword = (v) => {
  const valor = v || '';
  if (valor.length < PASSWORD_MIN || valor.length > PASSWORD_MAX) return false;
  return /\p{L}/u.test(valor) && /\d/.test(valor);
};

export const passwordRequisitos =
  `Minimo ${PASSWORD_MIN} caracteres (maximo ${PASSWORD_MAX}), con letras y numeros.`;

export const validateRequired = (v) => (v || '').toString().trim().length > 0;

export const validateNumeric = (v) => {
  if (v === '' || v == null) return true;
  return !isNaN(parseFloat(v)) && isFinite(v) && parseFloat(v) >= 0;
};

export const validateDate = (v) => {
  if (!v) return true;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d > new Date();
};
