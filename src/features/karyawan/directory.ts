import type { Employee } from './types';

export interface DirectoryFilters {
  search: string;
  employment: Employee['employmentStatus'] | 'all';
  status: Employee['status'] | 'all';
  division: string;
}

export function filterEmployees<T extends Pick<Employee, 'id' | 'fullName' | 'position' | 'division' | 'employmentStatus' | 'status'>>(
  employees: T[], filters: DirectoryFilters,
): T[] {
  const query = filters.search.trim().toLocaleLowerCase('id-ID');
  return employees.filter(employee =>
    (filters.employment === 'all' || employee.employmentStatus === filters.employment) &&
    (filters.status === 'all' || employee.status === filters.status) &&
    (!filters.division || employee.division === filters.division) &&
    (!query || [employee.fullName, employee.position, employee.division ?? ''].some(value => value.toLocaleLowerCase('id-ID').includes(query))),
  );
}
