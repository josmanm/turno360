import { useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import { initialSchedule } from './store'
import type { ScheduleState } from './types'

type Props = { schedule: ScheduleState; setSchedule: Dispatch<SetStateAction<ScheduleState>> }

function isSchedule(value: unknown): value is Partial<ScheduleState> {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (!Array.isArray(data.workers) || !Array.isArray(data.activities) || !Array.isArray(data.assignments)) return false
  const workers = data.workers as Array<Record<string, unknown>>
  const activities = data.activities as Array<Record<string, unknown>>
  const assignments = data.assignments as Array<Record<string, unknown>>
  return workers.every((worker) => typeof worker.id === 'string' && typeof worker.name === 'string' && ['jefe', 'supervisor', 'operativo'].includes(String(worker.role)) && typeof worker.startDate === 'string')
    && activities.every((activity) => typeof activity.id === 'string' && typeof activity.name === 'string' && Number(activity.durationHours) > 0 && Number(activity.minimumWorkers) > 0)
    && assignments.every((assignment) => typeof assignment.id === 'string' && typeof assignment.workerId === 'string' && typeof assignment.activityId === 'string' && typeof assignment.date === 'string')
}

function DataManagement({ schedule, setSchedule }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  function downloadJson() {
    const payload = { app: 'Turno360', version: 1, exportedAt: new Date().toISOString(), data: schedule }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `turno360-respaldo-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setError(false)
    setMessage('Respaldo JSON descargado correctamente.')
  }

  function readJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { data?: unknown }
        const imported = isSchedule(parsed.data) ? parsed.data : isSchedule(parsed) ? parsed : null
        if (!imported) throw new Error('Formato inválido')
        setSchedule({ ...initialSchedule, ...imported, shifts: imported.shifts ?? initialSchedule.shifts, unavailability: imported.unavailability ?? [] })
        setError(false)
        setMessage('Respaldo importado. La planificación fue actualizada.')
      } catch {
        setError(true)
        setMessage('No se pudo importar el archivo. Selecciona un respaldo JSON de Turno360.')
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function resetData() {
    if (!window.confirm('Se eliminarán todos los trabajadores, actividades, ausencias y asignaciones. ¿Deseas continuar?')) return
    setSchedule(initialSchedule)
    setError(false)
    setMessage('Los datos fueron restablecidos.')
  }

  return <section className="data-card"><div className="data-card-heading"><div><h2>Respaldo de información</h2><p>Guarda o restaura la planificación en formato JSON.</p></div><span className="storage-status"><span className="status-dot" /> LocalStorage</span></div><div className="data-actions"><button className="secondary-button" type="button" onClick={downloadJson}>⇩ Exportar JSON</button><button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>⇧ Importar JSON</button><input ref={inputRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={readJson} /><button className="danger-outline" type="button" onClick={resetData}>Restablecer datos</button></div>{message && <p className={`data-message ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>{message}</p>}</section>
}

export default DataManagement
