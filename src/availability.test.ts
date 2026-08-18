import { describe, expect, it } from 'vitest'
import { addDays, isAutomaticRest } from './availability'

describe('reglas de disponibilidad', () => {
  it('calcula vacaciones consecutivas sin alterar la fecha original', () => {
    expect(addDays('2026-08-17', 14)).toBe('2026-08-31')
    expect(addDays('2026-08-17', 0)).toBe('2026-08-17')
  })

  it('descansa el segundo fin de semana del ciclo', () => {
    expect(isAutomaticRest('2026-08-17', '2026-08-22')).toBe(false)
    expect(isAutomaticRest('2026-08-17', '2026-08-29')).toBe(true)
    expect(isAutomaticRest('2026-08-17', '2026-08-28')).toBe(false)
  })

  it('no marca días entre semana como descanso automático', () => {
    expect(isAutomaticRest('2026-08-17', '2026-08-24')).toBe(false)
  })
})
