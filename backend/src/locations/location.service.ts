import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device } from '../inventory/device.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { buildCourseNames } from './course-names.js';
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
    return this.locations.find({ order: { id_ubicacion: 'ASC' } });
  }

  async create(createLocationDto: CreateLocationDto) {
    const nombre = createLocationDto.nombre.trim();
    const existing = await this.locations.findOneBy({ nombre });

    if (existing) {
      throw new ConflictException('La ubicación ya existe');
    }

    let padreId: number | null = null;

    if (createLocationDto.padre_id !== undefined) {
      const padre = await this.locations.findOneBy({ id_ubicacion: createLocationDto.padre_id });

      if (!padre) {
        throw new NotFoundException('La ubicación padre no existe');
      }

      if (padre.padre_id !== null) {
        throw new ConflictException('Solo se permiten dos niveles de anidación');
      }

      padreId = padre.id_ubicacion;
    }

    return this.locations.save(this.locations.create({ nombre, padre_id: padreId }));
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

  async generateCourses(padreId: number) {
    const padre = await this.locations.findOneBy({ id_ubicacion: padreId });

    if (!padre) {
      throw new NotFoundException('La ubicación padre no existe');
    }

    if (padre.padre_id !== null) {
      throw new ConflictException('Solo se permiten dos niveles de anidación');
    }

    const usedNames = new Set((await this.locations.find()).map((location) => location.nombre));
    const missing = buildCourseNames().filter((nombre) => !usedNames.has(nombre));

    if (missing.length > 0) {
      await this.locations.save(missing.map((nombre) => this.locations.create({ nombre, padre_id: padreId })));
    }

    return this.locations.find({ where: { padre_id: padreId }, order: { id_ubicacion: 'ASC' } });
  }

  async remove(id: number) {
    const location = await this.locations.findOneBy({ id_ubicacion: id });

    if (!location) {
      throw new NotFoundException('La ubicación no existe');
    }

    const childrenCount = await this.locations.count({ where: { padre_id: id } });

    if (childrenCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la ubicación: tiene ${childrenCount} sub-ubicación(es)`,
      );
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
