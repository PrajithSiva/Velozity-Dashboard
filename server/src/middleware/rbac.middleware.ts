import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { ApiError } from "../utils/apiError";

// Coarse-grained "is this role even allowed to hit this endpoint" gate.
// Resource-level checks (does this PM own THIS project, is this task
// assigned to THIS developer) happen separately, inside the services, as
// part of the query itself — see services/*.ts. This middleware alone is
// never sufficient for isolation.
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthenticated());
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
