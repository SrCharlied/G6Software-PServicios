const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d\s\-().]{7,20}$/;

// bcrypt (el hasher del backend) trunca en silencio cualquier byte extra
// arriba de 72, asi que el backend rechaza contrasenas mas largas. Se
// calcula el tamano en bytes UTF-8 sin TextEncoder porque Hermes (RN) no
// siempre lo trae.
const utf8ByteLength = (str) => {
  let bytes = 0;
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
};

export const validateEmail = (v) => EMAIL_RE.test((v || '').trim());

export const validatePhone = (v) => PHONE_RE.test((v || '').trim());

export const validatePassword = (v) => {
  const value = v || '';
  return value.length >= 6 && utf8ByteLength(value) <= 72;
};

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
