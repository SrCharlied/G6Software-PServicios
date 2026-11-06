import { fireEvent, render } from '@testing-library/react-native';
import ConfirmActionModal from './ConfirmActionModal';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

describe('ConfirmActionModal', () => {
  it('cancelar no ejecuta la accion confirmada', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ConfirmActionModal
        visible
        title="Accion sensible"
        message="Confirma antes de continuar."
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    fireEvent.press(getByText('Cancelar'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('bloquea cancelar y confirmar mientras procesa para evitar doble toque', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByText, getByTestId } = render(
      <ConfirmActionModal
        visible
        title="Accion sensible"
        processing
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    fireEvent.press(getByText('Cancelar'));
    fireEvent.press(getByTestId('confirm-action-backdrop'));

    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
