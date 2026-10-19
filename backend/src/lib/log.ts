// Tiny tagged console logger. ponytail: console for now — swap for a structured
// logger (pino/OpenTelemetry) when we add real observability tooling. Each line
// is `[scope] message {json-context}`, greppable in Render's logs.
//
// Only pass non-secret context: never the Razorpay secret or a full signature.
type Ctx = Record<string, unknown>;

export function logger(scope: string) {
  const line = (level: 'info' | 'warn' | 'error', msg: string, ctx?: Ctx): void => {
    const out = `[${scope}] ${msg}${ctx ? ' ' + JSON.stringify(ctx) : ''}`;
    if (level === 'error') console.error(out);
    else if (level === 'warn') console.warn(out);
    else console.log(out);
  };
  return {
    info: (msg: string, ctx?: Ctx) => line('info', msg, ctx),
    warn: (msg: string, ctx?: Ctx) => line('warn', msg, ctx),
    error: (msg: string, ctx?: Ctx) => line('error', msg, ctx),
  };
}
