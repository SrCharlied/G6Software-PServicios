import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { T } from '../theme';

// Stripe.js se carga siempre desde js.stripe.com (requisito PCI): nunca se
// empaqueta ni se aloja en este proyecto. La rama /dahlia/ expone
// initCheckoutFormSdk, que es la API del formulario embebido (ui_mode 'form').
const STRIPE_JS_URL = 'https://js.stripe.com/dahlia/stripe.js';
const CONTENEDOR_ID = 'stripe-checkout-form';

// Apariencia configurada en Checkout Studio.
const APPEARANCE = {
  theme: 'stripe',
  labels: 'auto',
  inputs: 'spaced',
  variables: {
    borderRadius: '4px',
    colorBackground: '#ffffff',
    colorDanger: '#df1b41',
    colorPrimary: '#0570de',
    colorSuccess: '#00c853',
    colorText: '#30313d',
    fontFamily: 'default',
    fontSizeBase: '16px',
    spacingUnit: '4px',
  },
};

let cargaStripe = null;

const cargarStripeJs = () => {
  if (typeof window !== 'undefined' && window.Stripe) return Promise.resolve(window.Stripe);
  if (cargaStripe) return cargaStripe;

  cargaStripe = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error('Stripe.js no se inicializo.')));
    script.onerror = () => {
      // Permite reintentar si la red falla.
      cargaStripe = null;
      script.remove();
      reject(new Error('No se pudo cargar Stripe.js.'));
    };
    document.head.appendChild(script);
  });

  return cargaStripe;
};

/**
 * Formulario de pago embebido de Stripe (solo web).
 *
 * @param {string} clientSecret client_secret de la Checkout Session (del backend)
 * @param {string} publishableKey clave publicable (pk_...), segura para el navegador
 * @param {(mensaje: string) => void} onError fallo al cargar o confirmar
 *
 * Al confirmar, Stripe redirige al return_url de la sesion. La compra NO se da
 * por pagada aqui: el saldo solo cambia cuando el backend lo concilia.
 */
export default function StripeCheckoutForm({ clientSecret, publishableKey, onError }) {
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState('');
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let activo = true;
    let formulario = null;

    const reportar = (mensaje) => {
      if (!activo) return;
      setFallo(mensaje);
      setCargando(false);
      onErrorRef.current?.(mensaje);
    };

    (async () => {
      try {
        const Stripe = await cargarStripeJs();
        if (!activo) return;

        const stripe = Stripe(publishableKey);
        const checkout = stripe.initCheckoutFormSdk({ clientSecret, appearance: APPEARANCE });
        formulario = checkout.createForm({ layout: 'expanded' });
        formulario.mount(`#${CONTENEDOR_ID}`);

        const resultado = await checkout.loadActions();
        if (!activo) return;

        if (resultado.type !== 'success') {
          // Se expone el motivo que devuelve Stripe: sin el, un fallo de
          // configuracion (sesion, version de API) es indistinguible de uno de red.
          console.error('Stripe loadActions fallo:', resultado);
          reportar(resultado.error?.message || 'No se pudo preparar el formulario de pago.');
          return;
        }

        setCargando(false);
        formulario.on('confirm', async (event) => {
          try {
            await resultado.actions.confirm({ formConfirmEvent: event });
          } catch (error) {
            reportar(error?.message || 'No se pudo confirmar el pago.');
          }
        });
      } catch (error) {
        reportar(error?.message || 'No se pudo cargar el formulario de pago.');
      }
    })();

    return () => {
      activo = false;
      try {
        formulario?.unmount?.();
      } catch (_) {
        // El iframe ya pudo haberse retirado junto con el modal.
      }
    };
  }, [clientSecret, publishableKey]);

  return (
    <View>
      {cargando ? <ActivityIndicator color={T.blue} style={{ marginVertical: T.s3 }} /> : null}
      {fallo ? <Text style={{ color: T.danger, marginBottom: T.s2 }}>{fallo}</Text> : null}
      <div id={CONTENEDOR_ID} />
    </View>
  );
}
