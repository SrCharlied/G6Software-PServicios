import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CategoriaSelector from './CategoriaSelector';

const CATEGORIAS = [
  { id: 1, nombre: 'Albanileria' },
  { id: 2, nombre: 'Electricidad' },
  { id: 3, nombre: 'Plomeria' },
  { id: 4, nombre: 'Pintura' },
];

function Harness({ inicial = [], onChange = () => {} }) {
  const [ids, setIds] = useState(inicial);
  return (
    <CategoriaSelector
      categorias={CATEGORIAS}
      value={ids}
      onChange={(nuevo) => { setIds(nuevo); onChange(nuevo); }}
    />
  );
}

describe('CategoriaSelector', () => {
  it('bloquea una cuarta categoria y la libera al quitar una', () => {
    const onChange = jest.fn();
    const screen = render(<Harness onChange={onChange} />);

    ['Albanileria', 'Electricidad', 'Plomeria'].forEach((n) => fireEvent.press(screen.getByLabelText(`Categoría ${n}`)));
    expect(screen.getByText(/3\/3 seleccionadas/)).toBeTruthy();

    const cuarta = screen.getByLabelText('Categoría Pintura');
    expect(cuarta.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(cuarta);
    expect(onChange).toHaveBeenLastCalledWith(['1', '2', '3']);

    fireEvent.press(screen.getByLabelText('Categoría Electricidad'));
    expect(screen.getByLabelText('Categoría Pintura').props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByLabelText('Categoría Pintura'));
    expect(onChange).toHaveBeenLastCalledWith(['1', '3', '4']);
  });

  it('permite elegir la principal de forma explicita', () => {
    const onChange = jest.fn();
    const screen = render(<Harness inicial={['1', '3']} onChange={onChange} />);

    expect(screen.getByLabelText('Principal: Albanileria').props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByLabelText('Principal: Plomeria'));
    expect(onChange).toHaveBeenLastCalledWith(['3', '1']);
    expect(screen.getByLabelText('Principal: Plomeria').props.accessibilityState.selected).toBe(true);
  });

  it('con una sola categoria no muestra selector de principal', () => {
    const screen = render(<Harness inicial={['2']} />);
    expect(screen.queryByText('Categoría principal')).toBeNull();
    expect(screen.getByText('Principal')).toBeTruthy();
  });
});
