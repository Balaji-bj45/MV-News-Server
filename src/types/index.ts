export interface JwtPayload {
  id: string;
  role: 'admin' | 'editor';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
