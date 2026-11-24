export type UserRole = 'student' | 'teacher' | 'coordinator';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  classes: Array<{ id: string; name: string; schoolYear: number }>;
  subjects: Array<{ id: string; name: string; classId: string; className: string }>;
};

export type AuthRequestUser = {
  id: string;
  email: string;
  role: UserRole;
};

import type { Request } from 'express';

export type AuthenticatedRequest = Request & { user?: AuthRequestUser };
