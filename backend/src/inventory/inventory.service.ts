import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
  ) {}

  findAll() {
    return this.devices.find({ order: { id_dispositivo: 'ASC' } });
  }

  findOptions() {
    return this.devices.find({
      select: {
        id_dispositivo: true,
        codigo_inventario: true,
        ubicacion: true,
      },
      order: { codigo_inventario: 'ASC' },
    });
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

  async update(id: number, updateDeviceDto: UpdateDeviceDto) {
    const device = await this.devices.findOneBy({ id_dispositivo: id });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    if (updateDeviceDto.codigo_inventario) {
      const codigo_inventario = updateDeviceDto.codigo_inventario.trim().toUpperCase();
      const duplicate = await this.devices.findOneBy({ codigo_inventario });

      if (duplicate && duplicate.id_dispositivo !== id) {
        throw new ConflictException('El código de inventario ya existe');
      }

      device.codigo_inventario = codigo_inventario;
    }

    if (updateDeviceDto.tipo !== undefined) device.tipo = updateDeviceDto.tipo;
    if (updateDeviceDto.marca !== undefined) device.marca = updateDeviceDto.marca.trim() || null;
    if (updateDeviceDto.modelo !== undefined) device.modelo = updateDeviceDto.modelo.trim() || null;
    if (updateDeviceDto.ubicacion !== undefined) device.ubicacion = updateDeviceDto.ubicacion.trim();
    if (updateDeviceDto.estado !== undefined) device.estado = updateDeviceDto.estado;

    return this.devices.save(device);
  }
}
