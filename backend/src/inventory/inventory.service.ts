import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { DeviceStatus } from './device-status.enum.js';
import { Device } from './device.entity.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
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
