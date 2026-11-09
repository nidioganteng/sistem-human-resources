import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterEmployees } from '../src/features/karyawan/directory.ts';

test('directory combines search, employment, activity and division filters without exposing unrelated fields', () => {
  const employees = [
    { id: 1, fullName: 'Ayu Putri', position: 'Arsitek', division: 'Desain', employmentStatus: 'PKWT', status: 'active' },
    { id: 2, fullName: 'Budi', position: 'Arsitek', division: 'Desain', employmentStatus: 'PKWTT', status: 'inactive' },
    { id: 3, fullName: 'Citra', position: 'Teknisi', division: null, employmentStatus: 'FREELANCE', status: 'onboarding', nik: '1234567890123456' },
  ];
  assert.deepEqual(filterEmployees(employees, { search: '  ARSITEK ', employment: 'PKWT', status: 'active', division: 'Desain' }).map(e => e.id), [1]);
  assert.deepEqual(filterEmployees(employees, { search: 'citra', employment: 'all', status: 'all', division: '' }).map(e => e.id), [3]);
  assert.deepEqual(filterEmployees(employees, { search: '', employment: 'all', status: 'inactive', division: '' }).map(e => e.id), [2]);
  assert.deepEqual(filterEmployees(employees, { search: '1234567890123456', employment: 'all', status: 'all', division: '' }), []);
  assert.equal(filterEmployees(employees, { search: '', employment: 'all', status: 'all', division: '' }).length, 3);
  assert.deepEqual(employees.map(e => e.id), [1, 2, 3]);
});
