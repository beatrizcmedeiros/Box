import { describe, expect, it } from 'vitest'
import { normalizarTexto } from './texto.ts'

describe('normalizarTexto', () => {
  it.each([
    ['Push Prés ', 'push pres'],
    ['  AGACHAMENTO   Frontal', 'agachamento frontal'],
    ['Clean & Jerk', 'clean & jerk'],
    ['João', 'joao'],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizarTexto(entrada)).toBe(esperado)
  })
})
