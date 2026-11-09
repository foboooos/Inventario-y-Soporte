import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsOrder, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { DeviceStatus } from './device-status.enum.js';
import { Device } from './device.entity.js';
import { COURSE_LOCATION_SIGLA, formatDeviceCode } from './device-code.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(Ubicacion) private readonly locations: Repository<Ubicacion>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
  ) {}

  async findAll(query: QueryInventoryDto) {
    const term = query.search?.trim();

    const conditions: FindOptionsWhere<Device>[] = [];

    if (term) {
      const pattern = `%${term}%`;
      const base = query.estado ? { estado: query.estado } : {};

      conditions.push({ ...base, codigo_inventario: ILike(pattern) });
      conditions.push({ ...base, marca: ILike(pattern) });
      conditions.push({ ...base, modelo: ILike(pattern) });
      conditions.push({ ...base, ubicacion: ILike(pattern) });
    }

    const where: FindOptionsWhere<Device> | FindOptionsWhere<Device>[] = conditions.length > 0
      ? conditions
      : (query.estado ? { estado: query.estado } : {});

    const dir = query.sortDir === 'desc' ? 'DESC' : 'ASC';
    const order: FindOptionsOrder<Device> =
      query.sortBy === 'location' ? { ubicacion: dir, id_dispositivo: 'ASC' }
        : query.sortBy === 'status' ? { estado: dir, id_dispositivo: 'ASC' }
          : { codigo_inventario: dir, id_dispositivo: 'ASC' };

    const [data, total] = await this.devices.findAndCount({
      where,
      order,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.max(1, Math.ceil(total / query.limit)),
      summary: await this.buildSummary(term),
    };
  }

  private async buildSummary(term?: string) {
    const summaryQuery = this.devices
      .createQueryBuilder('device')
      .select('device.estado', 'estado')
      .addSelect('COUNT(*)', 'count')
      .groupBy('device.estado');

    if (term) {
      summaryQuery.where(
        '(device.codigo_inventario ILIKE :pattern OR device.marca ILIKE :pattern OR device.modelo ILIKE :pattern OR device.ubicacion ILIKE :pattern)',
        { pattern: `%${term}%` },
      );
    }

    const rows = await summaryQuery.getRawMany<{ estado: DeviceStatus; count: string }>();
    const summary = { total: 0, activo: 0, inactivo: 0, baja_tecnica: 0 };

    for (const row of rows) {
      const count = Number(row.count);
      summary.total += count;

      if (row.estado === DeviceStatus.ACTIVO) summary.activo = count;
      else if (row.estado === DeviceStatus.INACTIVO) summary.inactivo = count;
      else if (row.estado === DeviceStatus.BAJA_TECNICA) summary.baja_tecnica = count;
    }

    return summary;
  }

  findOptions() {
    return this.devices.find({
      select: {
        id_dispositivo: true,
        codigo_inventario: true,
        tipo: true,
        marca: true,
        modelo: true,
        ubicacion: true,
      },
      order: { codigo_inventario: 'ASC' },
    });
  }

  async nextCode(tipo: CreateDeviceDto['tipo'], ubicacion: string) {
    const location = await this.locations.findOneBy({ nombre: ubicacion.trim() });

    if (!location) {
      throw new NotFoundException('La ubicación no existe');
    }

    const isCourse = location.padre_id !== null;
    const sigla = isCourse ? COURSE_LOCATION_SIGLA : location.sigla;

    if (!sigla) {
      throw new BadRequestException('La ubicación no tiene sigla configurada');
    }

    return this.findNextCode(location, tipo, sigla, this.devices, this.locations);
  }

  private async findNextCode(
    location: Ubicacion,
    tipo: CreateDeviceDto['tipo'],
    sigla: string,
    devices: Repository<Device>,
    locations: Repository<Ubicacion>,
  ) {
    const locationNames = location.padre_id !== null
      ? (await locations.find()).filter((item) => item.padre_id !== null).map((item) => item.nombre)
      : [location.nombre];
    const group = await devices.find({
      select: { codigo_inventario: true },
      where: { tipo, ubicacion: In(locationNames) },
    });
    const used = new Set(group.map((device) => device.codigo_inventario));
    let numero = group.length + 1;

    while (used.has(formatDeviceCode(tipo, sigla, numero))) numero += 1;

    if (numero > 9999) {
      throw new BadRequestException('Se agotó la numeración para esta ubicación');
    }

    return formatDeviceCode(tipo, sigla, numero);
  }

  private async nextCodeForUpdate(
    manager: EntityManager,
    tipo: CreateDeviceDto['tipo'],
    ubicacion: string,
  ) {
    const locations = manager.getRepository(Ubicacion);
    const location = await locations.findOneBy({ nombre: ubicacion.trim() });

    if (!location) {
      throw new NotFoundException('La ubicación no existe');
    }

    const sigla = location.padre_id !== null ? COURSE_LOCATION_SIGLA : location.sigla;
    if (!sigla) throw new BadRequestException('La ubicación no tiene sigla configurada');

    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1), 0)', [`inventario:${tipo}:${sigla}`]);
    return this.findNextCode(location, tipo, sigla, manager.getRepository(Device), locations);
  }

  async create(createDeviceDto: CreateDeviceDto) {
    const ubicacion = createDeviceDto.ubicacion.trim();
    return this.devices.manager.transaction(async (manager) => {
      const devices = manager.getRepository(Device);
      const codigo_inventario = await this.nextCodeForUpdate(manager, createDeviceDto.tipo, ubicacion);
      const existingDevice = await devices.findOneBy({ codigo_inventario });

      if (existingDevice) {
        throw new ConflictException('El código de inventario ya existe');
      }

      const device = devices.create({
        ...createDeviceDto,
        codigo_inventario,
        marca: createDeviceDto.marca?.trim() || null,
        modelo: createDeviceDto.modelo?.trim() || null,
        ubicacion,
      });

      return devices.save(device);
    });
  }

  async update(id: number, updateDeviceDto: UpdateDeviceDto) {
    return this.devices.manager.transaction(async (manager) => {
      const devices = manager.getRepository(Device);
      const device = await devices.findOneBy({ id_dispositivo: id });

      if (!device) {
        throw new NotFoundException('Dispositivo no encontrado');
      }

      const nextTipo = updateDeviceDto.tipo ?? device.tipo;
      let nextUbicacion = device.ubicacion;

      if (updateDeviceDto.ubicacion !== undefined) {
        nextUbicacion = updateDeviceDto.ubicacion.trim();
        const location = await manager.getRepository(Ubicacion).findOneBy({ nombre: nextUbicacion });

        if (!location) {
          throw new NotFoundException('La ubicación no existe');
        }
      }

      if (nextTipo !== device.tipo || nextUbicacion !== device.ubicacion) {
        device.codigo_inventario = await this.nextCodeForUpdate(manager, nextTipo, nextUbicacion);
      }

      device.tipo = nextTipo;
      device.ubicacion = nextUbicacion;
      if (updateDeviceDto.marca !== undefined) device.marca = updateDeviceDto.marca.trim() || null;
      if (updateDeviceDto.modelo !== undefined) device.modelo = updateDeviceDto.modelo.trim() || null;
      if (updateDeviceDto.estado !== undefined) device.estado = updateDeviceDto.estado;

      return devices.save(device);
    });
  }

  async remove(id: number) {
    const device = await this.devices.findOneBy({ id_dispositivo: id });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    await this.devices.manager.transaction(async (manager) => {
      await manager.getRepository(Ticket).update({ id_dispositivo: id }, { id_dispositivo: null });
      await manager.getRepository(Device).delete({ id_dispositivo: id });
    });
  }
}
