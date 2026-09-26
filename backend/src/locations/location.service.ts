import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device } from '../inventory/device.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { Ubicacion } from './ubicacion.entity.js';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Ubicacion) private readonly locations: Repository<Ubicacion>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
  ) {}

  findAll() {
    return this.locations.find({ order: { nombre: 'ASC' } });
  }

  async create(createLocationDto: CreateLocationDto) {
    const nombre = createLocationDto.nombre.trim();
    const existing = await this.locations.findOneBy({ nombre });

    if (existing) {
      throw new ConflictException('La ubicación ya existe');
    }

    return this.locations.save(this.locations.create({ nombre }));
  }

  async rename(id: number, updateLocationDto: UpdateLocationDto) {
    return this.locations.manager.transaction(async (manager) => {
      const locations = manager.getRepository(Ubicacion);
      const location = await locations.findOneBy({ id_ubicacion: id });

      if (!location) {
        throw new NotFoundException('La ubicación no existe');
      }

      const nombre = updateLocationDto.nombre?.trim();

      if (!nombre || nombre === location.nombre) {
        return location;
      }

      const duplicate = await locations.findOneBy({ nombre });

      if (duplicate) {
        throw new ConflictException('La ubicación ya existe');
      }

      await manager.getRepository(Device).update({ ubicacion: location.nombre }, { ubicacion: nombre });
      await manager.getRepository(Ticket).update({ ubicacion: location.nombre }, { ubicacion: nombre });

      location.nombre = nombre;

      return locations.save(location);
    });
  }

  async remove(id: number) {
    const location = await this.locations.findOneBy({ id_ubicacion: id });

    if (!location) {
      throw new NotFoundException('La ubicación no existe');
    }

    const deviceCount = await this.devices.count({ where: { ubicacion: location.nombre } });

    if (deviceCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la ubicación: ${deviceCount} dispositivo(s) siguen asignados a ella`,
      );
    }

    await this.locations.delete({ id_ubicacion: id });
  }
}
