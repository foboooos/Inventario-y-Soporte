import { DataSource } from 'typeorm';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { DeviceType } from '../inventory/device-type.enum.js';
import { Device } from '../inventory/device.entity.js';
import { buildCourseNames } from '../locations/course-names.js';
import { ensure } from './seed-utils.js';

type SeedDevice = {
  codigo_inventario: string;
  tipo: DeviceType;
  marca: string;
  modelo: string;
  ubicacion: string;
  estado: DeviceStatus;
};

const PC_MODELOS = [
  { marca: 'Dell', modelo: 'OptiPlex 7010' },
  { marca: 'Lenovo', modelo: 'ThinkCentre M70q' },
  { marca: 'HP', modelo: 'ProDesk 400 G7' },
  { marca: 'Acer', modelo: 'Veriton X' },
];

const PROYECTORES = [
  { marca: 'Epson', modelo: 'PowerLite X49' },
  { marca: 'BenQ', modelo: 'MX560' },
  { marca: 'ViewSonic', modelo: 'PA503S' },
];

const IMPRESORAS = [
  { marca: 'HP', modelo: 'LaserJet Pro M404' },
  { marca: 'Epson', modelo: 'EcoTank L3250' },
  { marca: 'Brother', modelo: 'HL-L2350DW' },
];

const EQUIPOS_RED = [
  { marca: 'Ubiquiti', modelo: 'UniFi AP AC Pro' },
  { marca: 'TP-Link', modelo: 'TL-SG108' },
  { marca: 'Cisco', modelo: 'Catalyst 1000' },
];

const OFICINAS = ['Dirección', 'Secretaría', 'Administración', 'Sala de Profesores', 'Biblioteca CRA', 'Sala PIE'];

function pad(numero: number): string {
  return String(numero).padStart(2, '0');
}

function courseCode(nombre: string): string {
  return nombre.replace('°', '').replace('Básico', 'B').replace('Medio', 'M').replace(/\s+/g, '');
}

function buildDevices(): SeedDevice[] {
  const devices: SeedDevice[] = [];

  for (let i = 1; i <= 24; i += 1) {
    const modelo = PC_MODELOS[(i - 1) % PC_MODELOS.length];
    devices.push({
      codigo_inventario: `PC-LAB-${pad(i)}`,
      tipo: DeviceType.PC,
      ...modelo,
      ubicacion: 'Laboratorio de Computación',
      estado: i === 24 ? DeviceStatus.BAJA_TECNICA : DeviceStatus.ACTIVO,
    });
  }

  for (let i = 1; i <= 6; i += 1) {
    const modelo = PC_MODELOS[(i - 1) % PC_MODELOS.length];
    devices.push({
      codigo_inventario: `PC-CIE-${pad(i)}`,
      tipo: DeviceType.PC,
      ...modelo,
      ubicacion: 'Laboratorio de Ciencias',
      estado: i === 6 ? DeviceStatus.BAJA_TECNICA : DeviceStatus.ACTIVO,
    });
  }

  OFICINAS.forEach((ubicacion, index) => {
    const modelo = PC_MODELOS[index % PC_MODELOS.length];
    devices.push({
      codigo_inventario: `PC-ADM-${pad(index + 1)}`,
      tipo: DeviceType.PC,
      ...modelo,
      ubicacion,
      estado: index === OFICINAS.length - 1 ? DeviceStatus.INACTIVO : DeviceStatus.ACTIVO,
    });
  });

  buildCourseNames().forEach((curso, index) => {
    const modelo = PROYECTORES[index % PROYECTORES.length];
    devices.push({
      codigo_inventario: `PRY-${courseCode(curso)}`,
      tipo: DeviceType.PROYECTOR,
      ...modelo,
      ubicacion: curso,
      estado: DeviceStatus.ACTIVO,
    });
  });

  devices.push({
    codigo_inventario: 'PRY-LAB',
    tipo: DeviceType.PROYECTOR,
    ...PROYECTORES[0],
    ubicacion: 'Laboratorio de Computación',
    estado: DeviceStatus.ACTIVO,
  });
  devices.push({
    codigo_inventario: 'PRY-CIE',
    tipo: DeviceType.PROYECTOR,
    ...PROYECTORES[1],
    ubicacion: 'Laboratorio de Ciencias',
    estado: DeviceStatus.INACTIVO,
  });

  const impresoras = [
    { codigo: 'IMP-ADM-01', ubicacion: 'Administración' },
    { codigo: 'IMP-SEC-01', ubicacion: 'Secretaría' },
    { codigo: 'IMP-BIB-01', ubicacion: 'Biblioteca CRA' },
    { codigo: 'IMP-PRO-01', ubicacion: 'Sala de Profesores' },
  ];

  impresoras.forEach((item, index) => {
    devices.push({
      codigo_inventario: item.codigo,
      tipo: DeviceType.IMPRESORA,
      ...IMPRESORAS[index % IMPRESORAS.length],
      ubicacion: item.ubicacion,
      estado: DeviceStatus.ACTIVO,
    });
  });

  const red = [
    { codigo: 'SW-LAB-01', ubicacion: 'Laboratorio de Computación', modelo: EQUIPOS_RED[1] },
    { codigo: 'SW-ADM-01', ubicacion: 'Administración', modelo: EQUIPOS_RED[1] },
    { codigo: 'AP-BIB-01', ubicacion: 'Biblioteca CRA', modelo: EQUIPOS_RED[0] },
    { codigo: 'AP-PAT-01', ubicacion: 'Patio Cubierto', modelo: EQUIPOS_RED[0] },
    { codigo: 'AP-PAS-01', ubicacion: 'Patio Cubierto', modelo: EQUIPOS_RED[0] },
    { codigo: 'RT-CORE-01', ubicacion: 'Administración', modelo: EQUIPOS_RED[2] },
  ];

  red.forEach((item) => {
    devices.push({
      codigo_inventario: item.codigo,
      tipo: DeviceType.RED,
      ...item.modelo,
      ubicacion: item.ubicacion,
      estado: DeviceStatus.ACTIVO,
    });
  });

  return devices;
}

export async function seedDevices(dataSource: DataSource): Promise<number> {
  const devices = dataSource.getRepository(Device);
  const list = buildDevices();
  let created = 0;

  for (const device of list) {
    const result = await ensure(devices, { codigo_inventario: device.codigo_inventario }, device);
    if (result.created) created += 1;
  }

  console.log(`Dispositivos: ${created} creados (${list.length} en el catálogo)`);

  return created;
}
