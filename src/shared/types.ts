export type Role = 'super_admin' | 'hr' | 'manajer' | 'pic';
export type DivisionType = 'teknis' | 'non_teknis';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  division: string | null;
  divisionType: DivisionType | null;
}
