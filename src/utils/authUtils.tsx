import { SUPER_ADMINS } from '../config/superAdmins'

export function isSuperAdmin(email: string | null): boolean {
  return email ? SUPER_ADMINS.includes(email) : false
}