import { guardarArchivo } from './descargas';

describe('guardarArchivo', () => {
  const originales = {};

  beforeEach(() => {
    originales.document = global.document;
    originales.createObjectURL = global.URL.createObjectURL;
    originales.revokeObjectURL = global.URL.revokeObjectURL;
  });

  afterEach(() => {
    global.document = originales.document;
    global.URL.createObjectURL = originales.createObjectURL;
    global.URL.revokeObjectURL = originales.revokeObjectURL;
  });

  it('en web crea un enlace temporal con el nombre dado y lo dispara', () => {
    const enlace = { click: jest.fn() };
    global.document = {
      createElement: jest.fn(() => enlace),
      body: { appendChild: jest.fn(), removeChild: jest.fn() },
    };
    global.URL.createObjectURL = jest.fn(() => 'blob:fake');
    global.URL.revokeObjectURL = jest.fn();

    const blob = { size: 3 };
    const resultado = guardarArchivo(blob, 'evidencia-1-1.png', { plataforma: 'web' });

    expect(resultado).toBe(true);
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(enlace.href).toBe('blob:fake');
    expect(enlace.download).toBe('evidencia-1-1.png');
    expect(enlace.click).toHaveBeenCalledTimes(1);
    expect(global.document.body.removeChild).toHaveBeenCalledWith(enlace);
  });

  it('fuera de web no simula una descarga y devuelve false', () => {
    global.document = { createElement: jest.fn() };

    expect(guardarArchivo({}, 'x.png', { plataforma: 'ios' })).toBe(false);
    expect(global.document.createElement).not.toHaveBeenCalled();
  });
});
