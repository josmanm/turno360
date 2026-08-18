import { useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ScheduleState, Worker, WorkerRole } from './types'

type WorkerManagementProps = {
  schedule: ScheduleState
  setSchedule: Dispatch<SetStateAction<ScheduleState>>
}

const roleLabels: Record<WorkerRole, string> = {
  jefe: 'Jefe',
  supervisor: 'Supervisor',
  operativo: 'Operativo',
}

const roleColors: Record<WorkerRole, string> = {
  jefe: 'role-blue',
  supervisor: 'role-yellow',
  operativo: 'role-orange',
}

const blankForm = { name: '', role: 'operativo' as WorkerRole, startDate: '', firstWeekend: 'trabaja' as Worker['firstWeekend'] }

function WorkerManagement({ schedule, setSchedule }: WorkerManagementProps) {
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredWorkers = schedule.workers.filter((worker) =>
    worker.name.toLowerCase().includes(search.toLowerCase()),
  )

  function resetForm() {
    setForm(blankForm)
    setEditingId(null)
  }

  function saveWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.startDate) return

    if (editingId) {
      setSchedule((current) => ({
        ...current,
        workers: current.workers.map((worker) =>
          worker.id === editingId ? { ...worker, ...form, name: form.name.trim() } : worker,
        ),
      }))
    } else {
      const worker: Worker = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        role: form.role,
        startDate: form.startDate,
        active: true,
        firstWeekend: form.firstWeekend,
      }
      setSchedule((current) => ({ ...current, workers: [...current.workers, worker] }))
    }
    resetForm()
  }

  function editWorker(worker: Worker) {
    setEditingId(worker.id)
    setForm({ name: worker.name, role: worker.role, startDate: worker.startDate, firstWeekend: worker.firstWeekend ?? 'trabaja' })
  }

  function toggleWorker(id: string) {
    setSchedule((current) => ({
      ...current,
      workers: current.workers.map((worker) =>
        worker.id === id ? { ...worker, active: !worker.active } : worker,
      ),
    }))
  }

  function deleteWorker(id: string) {
    const worker = schedule.workers.find((item) => item.id === id)
    if (!window.confirm(`¿Eliminar a ${worker?.name ?? 'esta persona'}? También se quitarán sus asignaciones y ausencias.`)) return
    setSchedule((current) => ({
      ...current,
      workers: current.workers.filter((worker) => worker.id !== id),
      assignments: current.assignments.filter((assignment) => assignment.workerId !== id),
      unavailability: current.unavailability.filter((item) => item.workerId !== id),
    }))
    if (editingId === id) resetForm()
  }

  return (
    <section className="management-layout">
      <div className="management-main">
        <div className="management-toolbar">
          <div><h2>Equipo de trabajo</h2><p>{schedule.workers.length} personas registradas · {schedule.workers.filter((worker) => worker.active).length} activas</p></div>
          <label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona" /></label>
        </div>
        {filteredWorkers.length === 0 ? (
          <div className="management-empty"><div className="empty-user">◉</div><h3>{search ? 'No encontramos resultados' : 'Aún no hay personas'}</h3><p>{search ? 'Prueba con otro nombre.' : 'Registra el primer integrante de tu equipo usando el formulario.'}</p></div>
        ) : (
          <div className="worker-list">
            {filteredWorkers.map((worker) => (
              <article className={`worker-row ${worker.active ? '' : 'inactive'}`} key={worker.id}>
                <div className={`worker-avatar ${roleColors[worker.role]}`}>{worker.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                <div className="worker-info"><strong>{worker.name}</strong><span className={`role-label ${roleColors[worker.role]}`}>{roleLabels[worker.role]}</span></div>
                <div className="worker-start">Ingreso <strong>{new Intl.DateTimeFormat('es-CO').format(new Date(`${worker.startDate}T00:00:00`))}</strong></div>
                <span className={`active-label ${worker.active ? 'on' : 'off'}`}>{worker.active ? 'Activo' : 'Inactivo'}</span>
                <div className="row-actions"><button type="button" onClick={() => editWorker(worker)}>Editar</button><button type="button" onClick={() => toggleWorker(worker.id)}>{worker.active ? 'Desactivar' : 'Activar'}</button><button className="delete-action" type="button" onClick={() => deleteWorker(worker.id)}>Eliminar</button></div>
              </article>
            ))}
          </div>
        )}
      </div>

      <form className="worker-form" onSubmit={saveWorker}>
        <div className="form-heading"><div className="form-icon">＋</div><div><h2>{editingId ? 'Editar persona' : 'Nueva persona'}</h2><p>{editingId ? 'Actualiza los datos del trabajador.' : 'Agrega un integrante al equipo.'}</p></div></div>
        <label>Nombre completo<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Carlos Rodríguez" /></label>
        <label>Rol<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as WorkerRole })}><option value="jefe">Jefe</option><option value="supervisor">Supervisor</option><option value="operativo">Operativo</option></select></label>
        <label>Fecha de ingreso<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
        <label>Primer fin de semana<select value={form.firstWeekend} onChange={(event) => setForm({ ...form, firstWeekend: event.target.value as Worker['firstWeekend'] })}><option value="trabaja">Trabaja</option><option value="descansa">Descansa</option></select></label>
        <div className="form-actions"><button className="primary-button" type="submit">{editingId ? 'Guardar cambios' : 'Agregar persona'}</button>{editingId && <button className="cancel-button" type="button" onClick={resetForm}>Cancelar</button>}</div>
      </form>
    </section>
  )
}

export default WorkerManagement
