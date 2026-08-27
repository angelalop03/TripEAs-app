// Construye la "parte" que se añade a un FormData para subir un archivo
// local (foto elegida en el picker, o un asset empaquetado ya resuelto a
// URI). En nativo (iOS/Android), React Native espera el objeto especial
// {uri, name, type} y lo convierte internamente. En web, ese objeto no
// sirve — hay que hacer fetch() de la URI local (blob:/data:) y convertir
// el resultado a un Blob real, si no el backend nunca recibe el archivo.
import { Platform } from 'react-native';

export async function archivoDesdeUri(uri: string, nombre: string, tipo: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    const respuesta = await fetch(uri);
    const blob = await respuesta.blob();
    // El Blob que devuelve fetch() trae el content-type que haya puesto el
    // servidor/navegador al servir esa URI local, que no siempre coincide
    // con el que realmente queremos enviar (a veces llega vacío). El
    // backend valida el mimetype exacto, así que lo forzamos aquí.
    return blob.type === tipo ? blob : new Blob([blob], { type: tipo });
  }
  return { uri, name: nombre, type: tipo } as unknown as Blob;
}
