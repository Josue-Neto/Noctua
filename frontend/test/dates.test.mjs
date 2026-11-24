import assert from 'node:assert/strict'
import test from 'node:test'
import { dateParts, schoolInstant } from '../src/lib/dates.ts'
test('converte prazo escolar de São Paulo sem usar fuso do navegador',()=>{
 assert.equal(schoolInstant('2026-11-19','23:59','America/Sao_Paulo'),'2026-11-20T02:59:00.000Z')
 assert.deepEqual(dateParts('2026-11-20T02:59:00.000Z','America/Sao_Paulo'),{dueDate:'2026-11-19',time:'23:59'})
})
test('respeita fuso configurado e virada do dia',()=>{
 assert.equal(schoolInstant('2026-12-01','00:15','Asia/Tokyo'),'2026-11-30T15:15:00.000Z')
 assert.deepEqual(dateParts('2026-11-30T15:15:00.000Z','Asia/Tokyo'),{dueDate:'2026-12-01',time:'00:15'})
 assert.equal(schoolInstant('2026-12-01','00:01','America/Sao_Paulo'),'2026-12-01T03:01:00.000Z')
})
test('rejeita horário inexistente em transição de horário de verão',()=>{
 assert.throws(()=>schoolInstant('2026-03-08','02:30','America/New_York'))
})
