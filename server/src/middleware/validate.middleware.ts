import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ApiError } from "../utils/apiError";

interface Schemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

// Server-side validation of body/query/params. Frontend validation is for
// UX only; this is what actually protects the API. Parsed (and coerced,
// e.g. string->number/date) values are written back onto req so downstream
// code always sees well-typed data.
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as any;
      if (schemas.params) req.params = schemas.params.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.validation("Invalid request data.", err.flatten()));
      }
      next(err);
    }
  };
}
