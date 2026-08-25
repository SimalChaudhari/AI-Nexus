import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role?: string;
      typ?: string;
      username?: string;
      firstname?: string;
      lastname?: string;
    };
  }
}

