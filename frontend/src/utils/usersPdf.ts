import type { jsPDF } from 'jspdf'
import type { User } from '../types/user'

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
  DOCENTE: 'Docente',
}

const COLUMNS = [
  { label: 'RUT', width: 30 },
  { label: 'Nombre', width: 55 },
  { label: 'Email', width: 70 },
  { label: 'Rol', width: 27 },
]

const PAGE_MARGIN = 14
const TABLE_WIDTH = COLUMNS.reduce((total, column) => total + column.width, 0)
const ROW_HEIGHT = 7
const ROW_FONT_SIZE = 8.5

type SaveFilePickerOptions = {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

type WritableFile = {
  write: (data: Blob) => Promise<void>
  close: () => Promise<void>
}

type SaveFileHandle = {
  createWritable: () => Promise<WritableFile>
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<SaveFileHandle>
}

function formatToday() {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

function fitText(doc: jsPDF, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value

  let text = value
  while (text.length > 1 && doc.getTextWidth(`${text}…`) > maxWidth) {
    text = text.slice(0, -1)
  }
  return `${text}…`
}

function drawEmail(doc: jsPDF, email: string, x: number, y: number, maxWidth: number) {
  const atIndex = email.indexOf('@')

  if (atIndex < 0 || doc.getTextWidth(email) > maxWidth) {
    doc.text(fitText(doc, email, maxWidth), x, y)
    return
  }

  const local = `${email.slice(0, atIndex)}@`
  const domain = email.slice(atIndex + 1)
  const localWidth = doc.getTextWidth(local)

  doc.text(local, x, y)

  doc.setFontSize(0.1)
  const separatorWidth = doc.getTextWidth(' ')
  doc.text(' ', x + localWidth, y)
  doc.setFontSize(ROW_FONT_SIZE)

  doc.text(domain, x + localWidth + separatorWidth, y)
}

function buildUsersPdf(doc: jsPDF, users: User[]) {
  const bottom = doc.internal.pageSize.getHeight() - 16
  let y = 20

  function drawTableHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(ROW_FONT_SIZE)
    doc.setTextColor(110, 110, 104)

    let x = PAGE_MARGIN
    for (const column of COLUMNS) {
      doc.text(column.label.toUpperCase(), x, y)
      x += column.width
    }

    doc.setDrawColor(210, 210, 205)
    doc.line(PAGE_MARGIN, y + 2, PAGE_MARGIN + TABLE_WIDTH, y + 2)
    y += ROW_HEIGHT

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 18)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(12, 12, 9)
  doc.text('LISTADO DE USUARIOS', PAGE_MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 85)
  doc.text(`Total de usuarios: ${users.length}`, PAGE_MARGIN, y)
  doc.text(`Fecha: ${formatToday()}`, PAGE_MARGIN + 80, y)
  y += 8

  drawTableHeader()

  for (const user of users) {
    if (y > bottom) {
      doc.addPage()
      y = 20
      drawTableHeader()
    }

    const values = [user.rut, user.nombre, user.email, roleLabels[user.rol] ?? user.rol]
    let x = PAGE_MARGIN

    values.forEach((value, index) => {
      const column = COLUMNS[index]

      if (index === 2) {
        drawEmail(doc, String(value), x, y, column.width - 2)
      } else {
        doc.text(fitText(doc, String(value), column.width - 2), x, y)
      }

      x += column.width
    })

    doc.setDrawColor(232, 232, 228)
    doc.line(PAGE_MARGIN, y + 2, PAGE_MARGIN + TABLE_WIDTH, y + 2)
    y += ROW_HEIGHT
  }

  return doc
}

export async function downloadUsersPdf(users: User[]) {
  const { jsPDF } = await import('jspdf')
  const doc = buildUsersPdf(new jsPDF({ unit: 'mm', format: 'a4' }), users)
  const blob = doc.output('blob')
  const picker = (window as PickerWindow).showSaveFilePicker

  if (picker) {
    try {
      const handle = await picker({
        suggestedName: 'usuarios.pdf',
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (exception) {
      if (exception instanceof DOMException && exception.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'usuarios.pdf'
  link.click()
  URL.revokeObjectURL(url)
}
