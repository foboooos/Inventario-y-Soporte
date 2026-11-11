import { DataSource } from 'typeorm';
import { Device } from '../inventory/device.entity.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { DeviceType } from '../inventory/device-type.enum.js';
import { formatDeviceCode } from '../inventory/device-code.js';
import { ensure } from './seed-utils.js';

const DEVICE_COUNT = 37;
const LOCATION = 'Lab. Computación 2';
const LOCATION_SIGLA = 'LC2';

export async function seedDevices(dataSource: DataSource): Promise<number> {
  const devices = dataSource.getRepository(Device);
  const location = await dataSource.getRepository(Ubicacion).findOneBy({ nombre: LOCATION });
  if (!location) throw new Error(`No existe la ubicación requerida para el inventario: ${LOCATION}`);

  let created = 0;

  for (let number = 1; number <= DEVICE_COUNT; number += 1) {
    const codigo_inventario = formatDeviceCode(DeviceType.PC, LOCATION_SIGLA, number);
    const result = await ensure(
      devices,
      { codigo_inventario },
      {
        codigo_inventario,
        tipo: DeviceType.PC,
        marca: 'HP',
        modelo: '255 G10',
        id_ubicacion: location.id_ubicacion,
        estado: DeviceStatus.ACTIVO,
      },
    );

    if (result.created) created += 1;
  }

  console.log(`Dispositivos: ${created} creados (${DEVICE_COUNT} en el padrón)`);

  return created;
}
