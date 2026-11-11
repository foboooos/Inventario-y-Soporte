import type { jsPDF } from 'jspdf'
import type { TicketBitacora } from '../types/ticket'
import {
  formatTicketLogDate,
  ticketLogDeviceLabels,
  ticketLogSolutionSteps,
  ticketLogStatusLabels,
} from './ticketLog'

type RGB = readonly [number, number, number]
type StatusBadge = { text: string; ink: RGB; tint: RGB }
type Field = { label: string; value?: string; badge?: StatusBadge }

const PAGE_MARGIN = 16
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2
const COLLEGE_LOGO_SIZE = 16

const FOOTER_RULE_Y = PAGE_HEIGHT - PAGE_MARGIN - 5
const FOOTER_TEXT_Y = FOOTER_RULE_Y + 6
const SIGNATURE_LINE_Y = FOOTER_RULE_Y - 18
const SIGNATURE_NAME_Y = SIGNATURE_LINE_Y - 3
const SIGNATURE_LABEL_Y = SIGNATURE_LINE_Y + 6
const BOTTOM_LIMIT = SIGNATURE_NAME_Y - 10

/* Mismos tokens que tokens.css / inventory.css. */
const INK: RGB = [12, 12, 9]
const MUTED: RGB = [95, 95, 89]
const HAIRLINE: RGB = [231, 231, 226]
const BORDER: RGB = [201, 201, 194]
const SUCCESS: RGB = [22, 101, 52]
const SUCCESS_TINT: RGB = [220, 252, 231]
const WARNING: RGB = [120, 53, 15]
const WARNING_TINT: RGB = [254, 243, 199]
const DANGER: RGB = [185, 28, 28]
const DANGER_TINT: RGB = [254, 226, 226]

/* El título del campo manda: negrita y un punto por encima del texto escrito. */
const TITLE_SIZE = 14
const NAME_SIZE = 11
const LABEL_SIZE = 10
const BODY_SIZE = 9.5
const LABEL_LINE_HEIGHT = 4.2
const BODY_LINE_HEIGHT = 4.8

/* Ritmo vertical del documento: rótulos en mayúsculas, valores en caja normal y
   hairlines que separan los bloques. Cada regla cae SECTION_RULE_SPACE bajo la
   última línea y deja SECTION_RULE_TO_LABEL hasta el rótulo siguiente. */
const SECTION_RULE_SPACE = 7
const SECTION_RULE_TO_LABEL = 8.8
const SECTION_LABEL_TO_VALUE = 5.5

function setText(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2])
}

function setFill(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2])
}

function setDraw(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2])
}

function drawRule(doc: jsPDF, x: number, y: number, width: number) {
  setDraw(doc, HAIRLINE)
  doc.setLineWidth(0.2)
  doc.line(x, y, x + width, y)
}

function drawFooter(doc: jsPDF) {
  drawRule(doc, PAGE_MARGIN, FOOTER_RULE_Y, CONTENT_WIDTH)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setText(doc, MUTED)
  doc.text('Departamento de Informática, Colegio Leonardo da Vinci', PAGE_MARGIN, FOOTER_TEXT_Y)
}

/* Fila de cierre: nombre sobre la línea a la izquierda, espacio para la firma a la derecha. */
function drawSignatureRow(doc: jsPDF, tecnicoNombre: string) {
  const gap = 16
  const lineWidth = (CONTENT_WIDTH - gap) / 2
  const rightX = PAGE_MARGIN + lineWidth + gap

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(NAME_SIZE)
  setText(doc, INK)
  const name = tecnicoNombre || '—'
  doc.text(name, PAGE_MARGIN + (lineWidth - doc.getTextWidth(name)) / 2, SIGNATURE_NAME_Y)

  setDraw(doc, BORDER)
  doc.setLineWidth(0.3)
  doc.line(PAGE_MARGIN, SIGNATURE_LINE_Y, PAGE_MARGIN + lineWidth, SIGNATURE_LINE_Y)
  doc.line(rightX, SIGNATURE_LINE_Y, rightX + lineWidth, SIGNATURE_LINE_Y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(LABEL_SIZE)
  setText(doc, MUTED)
  const leftLabel = 'TÉCNICO RESPONSABLE'
  const rightLabel = 'FIRMA DEL TÉCNICO'
  doc.text(leftLabel, PAGE_MARGIN + (lineWidth - doc.getTextWidth(leftLabel)) / 2, SIGNATURE_LABEL_Y)
  doc.text(rightLabel, rightX + (lineWidth - doc.getTextWidth(rightLabel)) / 2, SIGNATURE_LABEL_Y)
}

/* Respeta los saltos de línea del texto libre, igual que white-space: pre-line. */
function wrapText(doc: jsPDF, text: string, width: number): string[] {
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      lines.push('')
      continue
    }
    lines.push(...(doc.splitTextToSize(trimmed, width) as string[]))
  }

  return lines.length > 0 ? lines : ['—']
}

function drawStatusPill(doc: jsPDF, badge: StatusBadge, x: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)

  const dot = 1.2
  const padX = 2.5
  const width = doc.getTextWidth(badge.text) + padX * 2 + dot + 1.2
  const height = 6

  setFill(doc, badge.tint)
  doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F')

  setFill(doc, badge.ink)
  doc.circle(x + padX + dot / 2, y + height / 2, dot / 2, 'F')

  setText(doc, badge.ink)
  doc.text(badge.text, x + padX + dot + 1.2, y + height / 2 + 1.15)
}

/* Bloque de campos: rótulos y valores en columnas, delimitado por dos hairlines.
   Sin caja ni fondo, igual que el resto del documento. */
function drawFields(doc: jsPDF, fields: Field[], x: number, y: number, width: number) {
  const colWidth = width / fields.length
  const textWidth = colWidth - 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(LABEL_SIZE)
  const labelLines = fields.map((field) => doc.splitTextToSize(field.label.toUpperCase(), textWidth) as string[])
  const labelBlock = Math.max(...labelLines.map((lines) => lines.length)) * LABEL_LINE_HEIGHT

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(BODY_SIZE)
  const wrapped = fields.map((field) => (field.badge ? [] : wrapText(doc, field.value ?? '—', textWidth)))
  const valueLines = Math.max(1, ...wrapped.map((lines) => lines.length))

  const labelFirstBase = y + SECTION_RULE_TO_LABEL
  const valueBase = labelFirstBase + (labelBlock - LABEL_LINE_HEIGHT) + SECTION_LABEL_TO_VALUE
  const bottom = valueBase + (valueLines - 1) * BODY_LINE_HEIGHT + SECTION_RULE_SPACE

  drawRule(doc, x, y, width)
  drawRule(doc, x, bottom, width)

  fields.forEach((field, index) => {
    const textX = x + index * colWidth

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(LABEL_SIZE)
    setText(doc, MUTED)
    labelLines[index].forEach((line, lineIndex) => {
      doc.text(line, textX, labelFirstBase + lineIndex * LABEL_LINE_HEIGHT)
    })

    if (field.badge) {
      drawStatusPill(doc, field.badge, textX, valueBase - 4.2)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(BODY_SIZE)
      setText(doc, INK)
      wrapped[index].forEach((line, lineIndex) => {
        if (line) doc.text(line, textX, valueBase + lineIndex * BODY_LINE_HEIGHT)
      })
    }
  })

  return bottom
}

/* Bloque de sección: rótulo en mayúsculas y párrafo, con hairline encima. */
function drawSection(
  doc: jsPDF,
  label: string,
  text: string,
  x: number,
  y: number,
  width: number,
  withRule: boolean,
) {
  if (withRule) {
    drawRule(doc, x, y, width)
    y += SECTION_RULE_TO_LABEL
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(LABEL_SIZE)
  setText(doc, MUTED)
  doc.text(label.toUpperCase(), x, y)
  y += SECTION_LABEL_TO_VALUE

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(BODY_SIZE)
  setText(doc, INK)
  const lines = wrapText(doc, text, width)

  for (const line of lines) {
    if (y + BODY_LINE_HEIGHT > BOTTOM_LIMIT) {
      doc.addPage()
      y = PAGE_MARGIN + 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(BODY_SIZE)
      setText(doc, INK)
    }
    if (line) doc.text(line, x, y)
    y += BODY_LINE_HEIGHT
  }

  return y + (SECTION_RULE_SPACE - BODY_LINE_HEIGHT)
}

function buildTicketLogPdf(doc: jsPDF, bitacora: TicketBitacora, logoDataUrl: string) {
  const deviceLabel = bitacora.dispositivo_tipo ? ticketLogDeviceLabels[bitacora.dispositivo_tipo] : null
  const device = deviceLabel
    ? `${deviceLabel}${bitacora.codigo_inventario ? ` · ${bitacora.codigo_inventario}` : ''}`
    : '—'
  const closeDate = bitacora.fecha_resolucion ? formatTicketLogDate(bitacora.fecha_resolucion) : null
  const steps = ticketLogSolutionSteps(bitacora.solucion_aplicada)

  let y = 18

  doc.addImage(
    logoDataUrl,
    'PNG',
    PAGE_WIDTH - PAGE_MARGIN - COLLEGE_LOGO_SIZE,
    PAGE_MARGIN - COLLEGE_LOGO_SIZE / 2,
    COLLEGE_LOGO_SIZE,
    COLLEGE_LOGO_SIZE,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(TITLE_SIZE)
  setText(doc, INK)
  doc.text(`Bitácora del ticket ${bitacora.codigo_ticket}`.toUpperCase(), PAGE_MARGIN, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(BODY_SIZE)
  setText(doc, MUTED)
  doc.text(
    (closeDate ? `Cerrado el ${closeDate}` : 'Fecha de cierre no registrada').toUpperCase(),
    PAGE_MARGIN,
    y,
  )
  y += SECTION_RULE_SPACE

  let badge: StatusBadge | null = null
  if (bitacora.estado_final) {
    const text = ticketLogStatusLabels[bitacora.estado_final]
    const styles = bitacora.estado_final === 'ACTIVO'
      ? { ink: SUCCESS, tint: SUCCESS_TINT }
      : bitacora.estado_final === 'INACTIVO'
        ? { ink: WARNING, tint: WARNING_TINT }
        : { ink: DANGER, tint: DANGER_TINT }
    badge = { text, ...styles }
  }

  y = drawFields(doc, [
    { label: 'Ubicación', value: bitacora.ubicacion || '—' },
    { label: 'Dispositivo', value: device },
    badge ? { label: 'Estado final', badge } : { label: 'Estado final', value: '—' },
  ], PAGE_MARGIN, y, CONTENT_WIDTH)

  y += SECTION_RULE_TO_LABEL

  const sections = [
    { label: 'Síntoma', text: bitacora.sintoma },
    { label: 'Diagnóstico y causa raíz', text: bitacora.causa_raiz ?? '—' },
    { label: 'Solución aplicada', text: steps.length > 0 ? steps.join('\n') : '—' },
  ]

  sections.forEach((section, index) => {
    y = drawSection(doc, section.label, section.text, PAGE_MARGIN, y, CONTENT_WIDTH, index > 0)
  })

  const pages = doc.getNumberOfPages()
  doc.setPage(pages)
  drawSignatureRow(doc, bitacora.tecnico_nombre ?? '—')

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    drawFooter(doc)
  }

  return doc
}

async function loadCollegeLogo(): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}logo-colegio.svg`)
  if (!response.ok) throw new Error('No se pudo cargar el logo del colegio')

  const imageUrl = URL.createObjectURL(await response.blob())
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('No se pudo procesar el logo del colegio'))
      element.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo procesar el logo del colegio')

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export async function downloadTicketLogPdf(bitacora: TicketBitacora) {
  const { jsPDF } = await import('jspdf')
  const logoDataUrl = await loadCollegeLogo()
  const doc = buildTicketLogPdf(new jsPDF({ unit: 'mm', format: 'a4' }), bitacora, logoDataUrl)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bitacora-${bitacora.codigo_ticket}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
