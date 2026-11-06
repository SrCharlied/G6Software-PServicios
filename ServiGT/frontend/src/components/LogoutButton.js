import { useRef, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import ConfirmActionModal from './ConfirmActionModal';

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
    <ConfirmActionModal visible={visible} processing={busy} onConfirm={confirm} onCancel={() => { if (!lock.current) setVisible(false); }}
      title="Cerrar sesion" message="Tu sesion se cerrara en este dispositivo. ¿Deseas continuar?"
      confirmLabel="Cerrar sesion" confirmKind="danger" error={error} />
  </>;
}
