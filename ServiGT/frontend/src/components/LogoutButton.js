import { useRef, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import MaterialConfirmModal from './material/MaterialConfirmModal';

export default function LogoutButton({ onLogout, style, textStyle, label = 'Cerrar sesion' }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const confirm = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onLogout(); setVisible(false); }
    catch (err) { setError(err.message || 'No se pudo cerrar sesion.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <>
    <TouchableOpacity style={style} accessibilityRole="button" onPress={() => { setError(''); setVisible(true); }}>
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
    <MaterialConfirmModal visible={visible} procesando={busy} onConfirm={confirm} onCancel={() => { if (!lock.current) setVisible(false); }}
      texto={{ titulo: 'Cerrar sesion', mensaje: `Vas a salir de tu cuenta de ServiGT.${error ? ` ${error}` : ''}`, confirmar: 'Confirmar salida', kind: 'danger' }} />
  </>;
}
