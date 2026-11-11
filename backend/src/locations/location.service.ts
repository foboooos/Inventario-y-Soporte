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
    const sigla = createLocationDto.sigla?.trim().toUpperCase() || null;
    const existing = await this.locations.findOneBy({ nombre });

    if (existing) {
      throw new ConflictException('La ubicación ya existe');
    }

    if (sigla) {
      const duplicateSigla = await this.locations.findOneBy({ sigla });

      if (duplicateSigla) {
        throw new ConflictException('La sigla ya está en uso');
      }
    }

    let padreId: number | null = null;
    let tipo = createLocationDto.tipo ?? 'PRINCIPAL';

    if (createLocationDto.padre_id !== undefined) {
      const padre = await this.locations.findOneBy({ id_ubicacion: createLocationDto.padre_id });

      if (!padre) {
        throw new NotFoundException('La ubicación padre no existe');
      }

      if (padre.tipo === 'TERCIARIA') {
        throw new ConflictException('Solo se permiten tres niveles de ubicaciones');
      }

      const tipoEsperado = padre.tipo === 'PRINCIPAL' ? 'SECUNDARIA' : 'TERCIARIA';
      if (createLocationDto.tipo && createLocationDto.tipo !== tipoEsperado) {
        throw new ConflictException('El tipo de ubicación no corresponde a la ubicación padre');
      }
      tipo = tipoEsperado;
      padreId = padre.id_ubicacion;
    } else if (tipo !== 'PRINCIPAL') {
      throw new ConflictException('Las ubicaciones secundarias y terciarias requieren una ubicación padre');
    }

    return this.locations.save(
      this.locations.create({
        nombre,
        sigla,
        padre_id: padreId,
        tipo,
      }),
    );
  }

  async rename(id: number, updateLocationDto: UpdateLocationDto) {
    return this.locations.manager.transaction(async (manager) => {
      const locations = manager.getRepository(Ubicacion);
      const location = await locations.findOneBy({ id_ubicacion: id });

      if (!location) {
        throw new NotFoundException('La ubicación no existe');
      }

      const nombre = updateLocationDto.nombre?.trim();

      if (nombre && nombre !== location.nombre) {
        const duplicate = await locations.findOneBy({ nombre });

        if (duplicate) {
          throw new ConflictException('La ubicación ya existe');
        }

        location.nombre = nombre;
      }

      if (updateLocationDto.sigla !== undefined) {
        const sigla = updateLocationDto.sigla.trim().toUpperCase() || null;

        if (sigla) {
          const duplicateSigla = await locations.findOneBy({ sigla });

          if (duplicateSigla && duplicateSigla.id_ubicacion !== id) {
            throw new ConflictException('La sigla ya está en uso');
          }
        }

        location.sigla = sigla;
      }

      return locations.save(location);
    });
  }

  async generateCourses(padreId: number) {
    const padre = await this.locations.findOneBy({ id_ubicacion: padreId });

    if (!padre) {
      throw new NotFoundException('La ubicación padre no existe');
    }

    if (padre.tipo !== 'PRINCIPAL') {
      throw new ConflictException('Los cursos solo se pueden generar bajo una ubicación principal');
    }

    const usedNames = new Set((await this.locations.find()).map((location) => location.nombre));
    const missing = buildCourseNames().filter((nombre) => !usedNames.has(nombre));

    if (missing.length > 0) {
      await this.locations.save(missing.map((nombre) => this.locations.create({ nombre, padre_id: padreId, tipo: 'SECUNDARIA' })));
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

    const deviceCount = await this.devices.count({ where: { id_ubicacion: location.id_ubicacion } });

    if (deviceCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la ubicación: ${deviceCount} dispositivo(s) siguen asignados a ella`,
      );
    }

    const ticketCount = await this.tickets.count({ where: { id_ubicacion: location.id_ubicacion } });

    if (ticketCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la ubicación: ${ticketCount} ticket(s) la referencian`,
      );
    }

    await this.locations.delete({ id_ubicacion: id });
  }
}
