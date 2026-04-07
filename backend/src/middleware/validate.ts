import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error: any) {
    return res.status(400).json({ error: error.errors });
  }
};
