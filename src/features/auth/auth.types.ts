export type Role = 'EMPLOYEE' | 'ADMIN'

export interface AuthSession {
  token: string
  name: string
  role: Role
  passwordChanged: boolean
}
