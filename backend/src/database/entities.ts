import { AsignaturaNivel } from '../academics/asignatura-nivel.entity.js';
import { Asignatura } from '../academics/asignatura.entity.js';
import { NivelEducativo } from '../academics/nivel-educativo.entity.js';
import { Device } from '../inventory/device.entity.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { SoftwareAsignatura } from '../software/software-asignatura.entity.js';
import { SoftwareEducativo } from '../software/software-educativo.entity.js';
import { TicketSequence } from '../tickets/ticket-sequence.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { User } from '../users/user.entity.js';

export const entities = [
  User,
  Device,
  Ubicacion,
  Ticket,
  TicketSequence,
  NivelEducativo,
  Asignatura,
  AsignaturaNivel,
  SoftwareEducativo,
  SoftwareAsignatura,
];
