import { fireEvent, render, screen } from '@testing-library/react-native';
import DocumentosPanel from './DocumentosPanel';

const documentoBase = {
  id: 5,
  tipo_documento: 'dpi',
  nombre_archivo: 'dpi-frontal.pdf',
  estado_validacion: 'pendiente',
};

describe('DocumentosPanel', () => {
  it('muestra un boton de descarga por cada documento y lo delega al padre', () => {
    const onDescargar = jest.fn();

    render(
      <DocumentosPanel
        documentos={[documentoBase]}
        loading={false}
        subiendo={false}
        onUpload={jest.fn()}
        onDescargar={onDescargar}
      />
    );

    fireEvent.press(screen.getByText('Descargar'));

    expect(onDescargar).toHaveBeenCalledWith(documentoBase);
  });

  it('no revienta ni ofrece descarga cuando no se pasa onDescargar', () => {
    render(
      <DocumentosPanel
        documentos={[documentoBase]}
        loading={false}
        subiendo={false}
        onUpload={jest.fn()}
      />
    );

    expect(screen.queryByText('Descargar')).toBeNull();
  });

  it('no muestra boton de descarga mientras carga la lista', () => {
    render(
      <DocumentosPanel
        documentos={[]}
        loading={true}
        subiendo={false}
        onUpload={jest.fn()}
        onDescargar={jest.fn()}
      />
    );

    expect(screen.queryByText('Descargar')).toBeNull();
  });
});
