import { Text } from 'react-native';
import { T } from '../theme';

// El formulario embebido de Stripe.js solo existe en web. En iOS/Android no se
// finge un pago: se informa y la compra no avanza.
export default function StripeCheckoutForm() {
  return (
    <Text style={{ color: T.muted }}>
      El pago con tarjeta esta disponible en la version web de ServiGT.
    </Text>
  );
}
