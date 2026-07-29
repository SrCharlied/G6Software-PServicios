// Pruebas unitarias de componente con @testing-library/react-native.
// Renderizan el componente en memoria (sin dispositivo ni navegador) y
// verifican que muestre el contenido esperado.

import { render } from '@testing-library/react-native';
import ServiGTLogo, { ClaspIcon, PillLogo } from './ServiGTLogo';

describe('<ClaspIcon />', () => {
  it('renderiza la marca con la letra "S"', () => {
    const { getByText } = render(<ClaspIcon />);
    expect(getByText('S')).toBeTruthy();
  });
});

describe('<ServiGTLogo />', () => {
  it('muestra el nombre de marca "GT" y el icono "S"', () => {
    const { getByText } = render(<ServiGTLogo />);
    expect(getByText('GT')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
  });

  it('se renderiza sin errores en layout apilado y modo claro', () => {
    const { toJSON } = render(<ServiGTLogo mode="light" layout="stacked" />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('<PillLogo />', () => {
  it('renderiza el wordmark "GT" dentro de la pastilla', () => {
    const { getByText } = render(<PillLogo mode="dark" />);
    expect(getByText('GT')).toBeTruthy();
  });
});
