import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SessionProvider, useSession } from './SessionContext';
import {
  clearSession,
  getMe,
  getMiProveedor,
  loadStoredSession,
  logout,
  saveSession,
  setUnauthorizedHandler,
} from '../services/api';

jest.mock('../services/api', () => ({
  clearSession: jest.fn(),
  getMe: jest.fn(),
  getMiProveedor: jest.fn(),
  loadStoredSession: jest.fn(),
  logout: jest.fn(),
  saveSession: jest.fn(),
  setUnauthorizedHandler: jest.fn(() => jest.fn()),
}));

function Probe({ onSession }) {
  const session = useSession();
  useEffect(() => {
    onSession(session);
  }, [onSession, session]);
  return null;
}

const latestSession = (spy) => spy.mock.calls[spy.mock.calls.length - 1][0];

const renderProvider = async (onSession) => {
  await act(async () => {
    TestRenderer.create(
      <SessionProvider>
        <Probe onSession={onSession} />
      </SessionProvider>
    );
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('SessionContext restore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logout.mockResolvedValue();
  });

  it('restaura con /me e ignora un rol local manipulado', async () => {
    loadStoredSession.mockReturnValue({
      token: 'token-real',
      user: { id: 1, name: 'Local', role: 'proveedor' },
    });
    getMe.mockResolvedValue({
      user: { id: 1, name: 'Backend', role: 'cliente' },
    });
    const onSession = jest.fn();

    await renderProvider(onSession);

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(getMiProveedor).not.toHaveBeenCalled();
    expect(saveSession).toHaveBeenCalledWith('token-real', { id: 1, name: 'Backend', role: 'cliente' });
    expect(latestSession(onSession).user).toEqual({ id: 1, name: 'Backend', role: 'cliente' });
  });

  it('consulta /providers/me solo despues de confirmar rol proveedor desde /me', async () => {
    const backendUser = { id: 2, name: 'Proveedor', role: 'proveedor' };
    const proveedor = { id: 9, user_id: 2, nombre: 'Proveedor real' };
    loadStoredSession.mockReturnValue({ token: 'token-real', user: { id: 2, role: 'cliente' } });
    getMe.mockResolvedValue({ user: backendUser });
    getMiProveedor.mockResolvedValue({ proveedor });
    const onSession = jest.fn();

    await renderProvider(onSession);

    expect(getMiProveedor).toHaveBeenCalledTimes(1);
    expect(latestSession(onSession).user).toEqual(backendUser);
    expect(latestSession(onSession).providerProfile).toEqual(proveedor);
  });

  it('limpia sesion local si /me rechaza la revalidacion', async () => {
    loadStoredSession.mockReturnValue({ token: 'token-vencido', user: { id: 1, role: 'cliente' } });
    getMe.mockRejectedValue(Object.assign(new Error('No autenticado'), { status: 401 }));
    const onSession = jest.fn();

    await renderProvider(onSession);

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(latestSession(onSession).user).toBeNull();
    expect(latestSession(onSession).providerProfile).toBeNull();
  });
});
