import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
  ) {}

  findAll() {
    return this.devices.find({ order: { id_dispositivo: 'ASC' } });
  }

  async create(createDeviceDto: CreateDeviceDto) {
    const codigo_inventario = createDeviceDto.codigo_inventario.trim().toUpperCase();
    const existingDevice = await this.devices.findOneBy({ codigo_inventario });

    if (existingDevice) {
      throw new ConflictException('El código de inventario ya existe');
    }

    const device = this.devices.create({
      ...createDeviceDto,
      codigo_inventario,
      marca: createDeviceDto.marca?.trim() || null,
      modelo: createDeviceDto.modelo?.trim() || null,
      ubicacion: createDeviceDto.ubicacion.trim(),
    });

    return this.devices.save(device);
  }
}
