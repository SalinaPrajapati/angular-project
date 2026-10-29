import { User } from './models';

/** Accounts available on the demo sign-in page (also the users known to the mock API). */
export const DEMO_USERS: readonly User[] = [
  { id: 'u-sales-1', name: 'Sam Carter', role: 'sales' },
  { id: 'u-sales-2', name: 'Sasha Ortiz', role: 'sales' },
  { id: 'u-rev-1', name: 'Riley Chen', role: 'reviewer' },
  { id: 'u-rev-2', name: 'Rohan Patel', role: 'reviewer' },
  { id: 'u-admin-1', name: 'Ada Morgan', role: 'admin' },
];
