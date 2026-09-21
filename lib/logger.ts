type Level = 'info' | 'warn' | 'error';

/**
 * Structured JSON to stdout, mirroring the pino convention used by the WA gateway
 * (`{ svc, level, msg, ...ctx }`) so both services can be read by one log pipeline.
 */
export function log(level: Level, msg: string, ctx: Record<string, unknown> = {}) {
  const line = JSON.stringify({ svc: 'web-nuha', level, msg, ts: new Date().toISOString(), ...ctx });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
