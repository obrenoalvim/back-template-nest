import * as Joi from 'joi';

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  APP_URL: string;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASSWORD: Joi.string().optional().allow(''),
  SMTP_FROM: Joi.string().optional().allow(''),
}).unknown(true); // allow POSTGRES_* (docker-compose-only vars) and other host env vars through

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envValidationSchema.validate(config, { abortEarly: false });
  if (result.error) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.value as EnvConfig;
}
