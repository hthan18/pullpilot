import dotenv from 'dotenv';

dotenv.config();

type NodeEnvironment = 'development' | 'test' | 'production';

function requireValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function requireUrl(name: string): string {
  const value = requireValue(name);
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}

function readNodeEnvironment(): NodeEnvironment {
  const value = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(value)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }
  return value as NodeEnvironment;
}

const nodeEnvironment = readNodeEnvironment();
const jwtSecret = requireValue('JWT_SECRET');

if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters');
}

const tokenEncryptionKey = process.env.TOKEN_ENCRYPTION_KEY?.trim();
if (nodeEnvironment === 'production' && !tokenEncryptionKey) {
  throw new Error('TOKEN_ENCRYPTION_KEY is required in production');
}

export const env = {
  nodeEnvironment,
  isProduction: nodeEnvironment === 'production',
  port: Number(process.env.PORT || 5000),
  clientUrl: requireUrl('CLIENT_URL'),
  serverUrl: requireUrl('SERVER_URL'),
  databaseUrl: requireValue('DATABASE_URL'),
  githubClientId: requireValue('GITHUB_CLIENT_ID'),
  githubClientSecret: requireValue('GITHUB_CLIENT_SECRET'),
  openaiApiKey: process.env.OPENAI_API_KEY?.trim(),
  openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini',
  jwtSecret,
  tokenEncryptionKey,
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}
