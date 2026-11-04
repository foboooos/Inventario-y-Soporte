import { DeviceType } from './device-type.enum.js';

const TYPE_SIGLAS: Record<DeviceType, string> = {
  [DeviceType.PC]: 'PC',
  [DeviceType.PROYECTOR]: 'PRY',
  [DeviceType.IMPRESORA]: 'IMP',
  [DeviceType.RED]: 'RED',
};

export const COURSE_LOCATION_SIGLA = 'CUR';

export function formatDeviceCode(tipo: DeviceType, ubicacionSigla: string, numero: number): string {
  return `${TYPE_SIGLAS[tipo]}-${ubicacionSigla}-${String(numero).padStart(4, '0')}`;
}
