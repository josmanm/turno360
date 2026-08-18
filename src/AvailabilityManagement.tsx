import { useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { addDays, isAutomaticRest } from './availability'
import type { ScheduleState, Unavailability } from './types'

type Props = { schedule: ScheduleState; setSchedule: Dispatch<SetStateAction<ScheduleState>> }
const blankForm = { workerId: '', type: 'vacaciones' as Unavailability['type'], startDate: '', endDate: '', reason: '' }
const typeLabels = { vacaciones: 'Vacaciones', permiso: 'Permiso', descanso: 'Descanso' } as const

function AvailabilityManagement({ schedule, setSchedule }: Props) {
  const [form, setForm] = useState(blankForm)
  const [search, setSearch] = useState('')
  const records = schedule.unavailability.filter((item) => item.type !== 'descanso')
  const filteredRecords = records.filter((item) => {
    const worker = schedule.workers.find((person) => person.id === item.workerId)
    return worker?.name.toLowerCase().includes(search.toLowerCase())
  })

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.workerId || !form.startDate) return
    const endDate = form.type === 'vacaciones' ? addDays(form.startDate, 14) : (form.endDate || form.startDate)
    if (endDate < form.startDate) return
    const item: Unavailability = { id: crypto.randomUUID(), workerId: form.workerId, type: form.type, startDate: form.startDate, endDate, reason: form.reason.trim() || undefined }
    setSchedule((current) => ({ ...current, unavailability: [...current.unavailability, item] }))
    setForm(blankForm)
  }

  function removeRecord(id: string) {
    if (!window.confirm('¿Eliminar esta ausencia? La persona volverá a estar disponible en esas fechas.')) return
    setSchedule((current) => ({ ...current, unavailability: current.unavailability.filter((item) => item.id !== id) }))
  }

  return <section className="availability-layout">
    <div className="availability-main">
      <div className="operations-heading"><div><h2>Fechas no disponibles</h2><p>Vacaciones y permisos que bloquean asignaciones.</p></div><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona" /></label></div>
      {filteredRecords.length === 0 ? <div className="management-empty"><div className="empty-user">◷</div><h3>No hay ausencias registradas</h3><p>Agrega vacaciones o permisos desde el formulario.</p></div> : <div className="availability-list">{filteredRecords.map((item) => { const worker = schedule.workers.find((person) => person.id === item.workerId); const conflicts = schedule.assignments.filter((assignment) => assignment.workerId === item.workerId && assignment.date >= item.startDate && assignment.date <= item.endDate); return <article className={`availability-row ${conflicts.length ? 'has-conflict' : ''}`} key={item.id}><div className={`availability-icon ${item.type}`}>{item.type === 'vacaciones' ? '⌁' : '◷'}</div><div className="availability-info"><strong>{worker?.name ?? 'Persona eliminada'}</strong><span>{typeLabels[item.type]}{item.reason ? ` · ${item.reason}` : ''}</span>{conflicts.length > 0 && <em>⚠ {conflicts.length} asignación{conflicts.length === 1 ? '' : 'es'} afectada{conflicts.length === 1 ? '' : 's'}</em>}</div><div className="availability-dates"><strong>{item.startDate}</strong><span>hasta</span><strong>{item.endDate}</strong></div><button className="delete-action" type="button" onClick={() => removeRecord(item.id)}>Eliminar</button></article> })}</div>}
    </div>
    <form className="worker-form" onSubmit={saveRecord}><div className="form-heading"><div className="form-icon">◷</div><div><h2>Registrar ausencia</h2><p>Bloquea una o varias fechas.</p></div></div>
      <label>Persona<select required value={form.workerId} onChange={(event) => setForm({ ...form, workerId: event.target.value })}><option value="">Selecciona una persona</option>{schedule.workers.filter((worker) => worker.active).map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
      <label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Unavailability['type'] })}><option value="vacaciones">Vacaciones · 15 días</option><option value="permiso">Permiso</option></select></label>
      <label>Fecha de inicio<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
      {form.type === 'permiso' && <label>Fecha final<input required min={form.startDate} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>}
      <label>Motivo (opcional)<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Ej. Cita médica" /></label>
      {form.type === 'vacaciones' && <div className="form-help">Las vacaciones se registrarán automáticamente por 15 días consecutivos.</div>}
      <button className="primary-button" type="submit">Registrar ausencia</button>
    </form>
    <div className="rest-card"><div className="rest-card-heading"><div className="rest-symbol">◌</div><div><h2>Descansos automáticos</h2><p>El ciclo se calcula desde la fecha de ingreso.</p></div></div><div className="rest-rule"><strong>Semana de trabajo</strong><span>Fin de semana activo</span></div><div className="rest-rule resting"><strong>Semana siguiente</strong><span>Fin de semana de descanso</span></div><div className="rest-workers">{schedule.workers.filter((worker) => worker.active).slice(0, 5).map((worker) => <div key={worker.id}><span className={`worker-avatar ${worker.role === 'jefe' ? 'role-blue' : worker.role === 'supervisor' ? 'role-yellow' : 'role-orange'}`}>{worker.name.slice(0, 1).toUpperCase()}</span><strong>{worker.name}</strong><small>{isAutomaticRest(worker.startDate, '2026-08-29') ? 'Descansa este fin de semana' : 'Trabaja este fin de semana'}</small></div>)}{schedule.workers.length === 0 && <p className="form-help">Registra trabajadores para ver su ciclo.</p>}</div></div>
  </section>
}

export default AvailabilityManagement
