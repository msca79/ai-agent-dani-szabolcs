const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
} as const;

const SEPARATOR = '─'.repeat(70);

function supportsColor(): boolean {
  return Boolean(process.stderr.isTTY) && !process.env['NO_COLOR'];
}

function paint(text: string, color: keyof typeof COLORS): string {
  return supportsColor() ? `${COLORS[color]}${text}${COLORS.reset}` : text;
}

// A `thinking` blokk `signature` mezője egy több száz/ezer karakteres, ember
// (és eszköz) számára értelmezhetetlen opak token — kiírva csak eltakarná a
// tényleg hasznos tartalmat, ezért mindkét naplózási módban helyette csak a
// hosszát jelezzük.
function redactSignature(key: string, value: unknown): unknown {
  if (key === 'signature' && typeof value === 'string' && value.length > 80) {
    return `[signature omitted, ${value.length} chars]`;
  }

  return value;
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, redactSignature, 2);
}

function formatHumanLine(event: string, data: Record<string, unknown>): string {
  switch (event) {
    case 'agent_start':
      return `${paint('▶ kérdés', 'cyan')} ${data['question']}`;

    case 'llm_request': {
      const tools = (data['tools'] as string[] | undefined)?.join(', ') ?? '-';
      const messages = (data['messages'] as unknown[] | undefined) ?? [];
      const header = `${paint('→ LLM kérés', 'blue')} [iter ${data['iteration']}] model=${data['model']} tools=${tools} msg#${messages.length}`;
      const system = String(data['systemPrompt'] ?? '');

      return (
        `${header}\n` +
        `${paint('system:', 'dim')}\n${paint(system, 'dim')}\n` +
        `${paint('messages:', 'dim')}\n${prettyJson(messages)}`
      );
    }

    case 'llm_response': {
      const stopReason = String(data['stopReason']);
      const color = stopReason === 'tool_use' ? 'yellow' : 'green';
      const header = `${paint('← LLM válasz', color)} [iter ${data['iteration']}] stop=${stopReason}`;

      return `${header}\n${prettyJson(data['content'])}`;
    }

    case 'tool_call':
      return `${paint('🔧 tool hívás', 'magenta')} ${data['tool']}\n${prettyJson(data['input'])}`;

    case 'tool_result':
      return `${paint('✓ tool eredmény', 'magenta')} ${data['tool']} → ${data['resultCount']} sor`;

    case 'agent_end':
      return `${paint('✔ kész', 'green')} (${data['answerLength']} karakter válasz)`;

    case 'agent_error':
      return `${paint('✖ hiba', 'red')} ${data['message']}`;

    default:
      return `${event} ${JSON.stringify(data)}`;
  }
}

// Interaktív terminálon (stderr TTY) humán-barát, színezett, szeparátorral
// elválasztott blokkok — a request/response blokk pontosan azt tartalmazza,
// ami az LLM-nek kimegy/amit visszaad, hogy a beszélgetés bővülése (üzenetek
// száma, tartalma) végig látható legyen. Nem-TTY esetén (fájlba/csővezetékbe
// irányítva) egy JSON objektum per sor (JSONL), hogy eszközzel is
// feldolgozható maradjon. A stdout így mindig tiszta marad a CLI válaszának —
// a naplózás csak a stderr-re megy.
export function logAgentEvent(event: string, data: Record<string, unknown> = {}): void {
  if (process.stderr.isTTY) {
    process.stderr.write(`${formatHumanLine(event, data)}\n${paint(SEPARATOR, 'dim')}\n`);
    return;
  }

  const line = { ts: new Date().toISOString(), event, ...data };
  process.stderr.write(`${JSON.stringify(line, redactSignature)}\n`);
}
