// router.back() lanza "GO_BACK was not handled by any navigator" cuando la
// pantalla se abrió sin historial previo (recarga en caliente, deep link,
// reanudar la app en esa ruta...). Este helper comprueba router.canGoBack()
// antes y, si no hay a dónde volver, navega al fallback indicado en su lugar.
import { router, type Href } from 'expo-router';

export function volverSeguro(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
