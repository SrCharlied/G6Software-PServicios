// Pruebas unitarias de las funciones de validacion (src/utils/validation.js).
// Son funciones puras: sin React, sin red, sin estado. Ideales para probar
// muchos casos de borde de forma rapida y determinista.

import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateRequired,
  validateNumeric,
  validateDate,
} from './validation';

describe('validateEmail', () => {
  it('acepta correos con formato valido', () => {
    expect(validateEmail('juan@servigt.com')).toBe(true);
    expect(validateEmail('  ana.lopez@uvg.edu.gt  ')).toBe(true); // recorta espacios
  });

  it('rechaza correos mal formados o vacios', () => {
    expect(validateEmail('juan@sincom')).toBe(false); // TLD invalido
    expect(validateEmail('sin-arroba.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
  });
});

describe('validatePhone', () => {
  it('acepta numeros guatemaltecos con distintos formatos', () => {
    expect(validatePhone('5555-4444')).toBe(true);
    expect(validatePhone('+502 5555 4444')).toBe(true);
    expect(validatePhone('(502) 2222-3333')).toBe(true);
  });

  it('rechaza numeros demasiado cortos o con letras', () => {
    expect(validatePhone('123')).toBe(false);       // menos de 7 caracteres
    expect(validatePhone('telefono')).toBe(false);  // letras
    expect(validatePhone('')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('exige al menos 6 caracteres', () => {
    expect(validatePassword('123456')).toBe(true);
    expect(validatePassword('segura123')).toBe(true);
  });

  it('rechaza contrasenas cortas o vacias', () => {
    expect(validatePassword('123')).toBe(false);
    expect(validatePassword('')).toBe(false);
    expect(validatePassword(null)).toBe(false);
  });
});

describe('validateRequired', () => {
  it('acepta cualquier valor no vacio', () => {
    expect(validateRequired('Guatemala')).toBe(true);
    expect(validateRequired('0')).toBe(true); // cadena no vacia: valida
  });

  it('rechaza vacios y solo-espacios', () => {
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
    expect(validateRequired(null)).toBe(false);
  });
});

describe('validateNumeric', () => {
  it('acepta numeros no negativos y campos opcionales vacios', () => {
    expect(validateNumeric('150')).toBe(true);
    expect(validateNumeric('0')).toBe(true);
    expect(validateNumeric('')).toBe(true);   // opcional: vacio es valido
    expect(validateNumeric(null)).toBe(true);
  });

  it('rechaza negativos y texto no numerico', () => {
    expect(validateNumeric('-50')).toBe(false);
    expect(validateNumeric('abc')).toBe(false);
  });
});

describe('validateDate', () => {
  it('acepta fechas futuras y campos opcionales vacios', () => {
    const futuro = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(validateDate(futuro)).toBe(true);
    expect(validateDate('')).toBe(true); // opcional
  });

  it('rechaza fechas pasadas o invalidas', () => {
    const pasado = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(validateDate(pasado)).toBe(false);
    expect(validateDate('no-es-fecha')).toBe(false);
  });
});
