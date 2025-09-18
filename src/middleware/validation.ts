import { Request, Response, NextFunction } from 'express';
import { ObjectSchema, StringSchema } from 'joi';
import { ValidationError } from '../types';
import { validateRequest } from '../utils/validation';

export const validateBody = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = validateRequest(schema, req.body);
      next();
    } catch (error) {
      next(new ValidationError(error instanceof Error ? error.message : 'Validation failed'));
    }
  };
};

export const validateParams = (schema: StringSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.params.id, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        throw new ValidationError(`Validation failed: ${JSON.stringify(errorDetails)}`);
      }

      req.params.id = value;
      next();
    } catch (error) {
      next(new ValidationError(error instanceof Error ? error.message : 'Parameter validation failed'));
    }
  };
};

export const validateQuery = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = validateRequest(schema, req.query);
      next();
    } catch (error) {
      next(new ValidationError(error instanceof Error ? error.message : 'Query validation failed'));
    }
  };
};
