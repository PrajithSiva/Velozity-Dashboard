import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const idParamSchema = z.object({
  id: z.string().min(1),
});
