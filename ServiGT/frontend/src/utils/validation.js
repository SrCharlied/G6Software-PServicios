const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d\s\-().]{7,20}$/;

export const validateEmail = (v) => EMAIL_RE.test((v || '').trim());

export const validatePhone = (v) => PHONE_RE.test((v || '').trim());

export const validatePassword = (v) => (v || '').length >= 6;

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
