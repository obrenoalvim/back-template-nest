export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}
