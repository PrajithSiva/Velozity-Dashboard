import { Role } from "@prisma/client";

// Augments Express's Request with the identity attached by auth.middleware.
// This is the ONLY place downstream code should read the caller's identity
// from — never req.body.userId / req.body.role / req.query.role.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}
export {};
