// Fotos de perfil predefinidas, empaquetadas en assets/images/profile/.
// Metro no permite listar una carpeta en tiempo de ejecución (los require()
// de imágenes tienen que ser rutas literales), así que cada imagen nueva
// que se añada a esa carpeta hay que registrarla aquí a mano para que
// aparezca en el selector de avatar.
export interface AvatarPerfil {
  id: string;
  nombre: string;
  fuente: number;
}

export const AVATARES_PERFIL: AvatarPerfil[] = [
  { id: 'informatica', nombre: 'Informática', fuente: require('@/assets/images/profile/Informatica.png') },
  { id: 'padel', nombre: 'Pádel', fuente: require('@/assets/images/profile/Padel.png') },
  { id: 'boxeo', nombre: 'Boxeo', fuente: require('@/assets/images/profile/boxeo.png') },
  { id: 'casa_ballen', nombre: 'Casa Ballena', fuente: require('@/assets/images/profile/casa_ballen.png') },
  { id: 'medico', nombre: 'Médico', fuente: require('@/assets/images/profile/medico.png') },
  { id: 'profe', nombre: 'Profe', fuente: require('@/assets/images/profile/profe.png') },
  { id: 'psicologa', nombre: 'Psicóloga', fuente: require('@/assets/images/profile/psicologa.png') },
];
