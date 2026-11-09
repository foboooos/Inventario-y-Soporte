import { DataSource } from 'typeorm';
import { Device } from '../inventory/device.entity.js';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { DeviceType } from '../inventory/device-type.enum.js';
import { formatDeviceCode } from '../inventory/device-code.js';
import { ensure } from './seed-utils.js';

const DEVICE_COUNT = 37;
const LOCATION = 'Lab. Computación 2';
const LOCATION_SIGLA = 'LC2';

export async function seedDevices(dataSource: DataSource): Promise<number> {
  const devices = dataSource.getRepository(Device);
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
        ubicacion: LOCATION,
        estado: DeviceStatus.ACTIVO,
      },
    );

    if (result.created) created += 1;
  }

  console.log(`Dispositivos: ${created} creados (${DEVICE_COUNT} en el padrón)`);

  return created;
}
