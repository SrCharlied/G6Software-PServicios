import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import LegalDocumentScreen from './LegalDocumentScreen';
import { getDocumentosLegales } from '../services/api';
jest.mock('../services/api', () => ({ getDocumentosLegales: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../components/ServiGTLogo', () => () => null);
const documents = ['terminos', 'privacidad'].map((tipo, id) => ({ id: id + 1, tipo, titulo: `Documento ${tipo}`, version: 'fixture-1', contenido: `Texto de prueba ${tipo}`, hash: 'a'.repeat(64), vigente_desde: '2026-10-26' }));
beforeEach(() => jest.clearAllMocks());
it.each(['terminos', 'privacidad'])('muestra contenido y version reales de %s', async (tipo) => {
  getDocumentosLegales.mockResolvedValue({ documentos: documents });
  const screen = render(<LegalDocumentScreen tipo={tipo} />);
  expect(await screen.findByText(`Texto de prueba ${tipo}`)).toBeTruthy();
  expect(screen.getByText('Version fixture-1')).toBeTruthy();
});
it('muestra carga y error sin inventar contenido, permite reintentar', async () => {
  let reject;
  getDocumentosLegales.mockReturnValueOnce(new Promise((resolve, fail) => { reject = fail; })).mockResolvedValue({ documentos: documents });
  const screen = render(<LegalDocumentScreen tipo="terminos" />);
  expect(screen.getByText('Cargando documento...')).toBeTruthy();
  await act(async () => reject(new Error('No hay textos aprobados')));
  expect(screen.getByText('No hay textos aprobados')).toBeTruthy();
  expect(screen.queryByText('Version fixture-1')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar'));
  await screen.findByText('Texto de prueba terminos');
});
it('no presenta un contrato incompleto como documento aprobado', async () => {
  getDocumentosLegales.mockResolvedValue({ documentos: [] });
  const screen = render(<LegalDocumentScreen tipo="terminos" />);
  await screen.findByText('El documento legal no esta disponible.');
});
