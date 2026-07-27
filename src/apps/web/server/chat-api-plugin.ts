import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { queryAgent } from '../../../agents/query-agent/query-agent';
import { parseAskRequestBody } from './ask-request';

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function handleAskRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let question: string;
  let history: ReturnType<typeof parseAskRequestBody>['history'];
  try {
    ({ question, history } = parseAskRequestBody(await readRequestBody(req)));
  } catch {
    sendJson(res, 400, { error: 'Érvénytelen kérés: a "question" mező kötelező, nem lehet üres.' });
    return;
  }

  // Innentől a válasz szövegként, streamelve megy ki — a státuszkód/fejléc már
  // nem változtatható, ezért egy futásidejű hibát (pl. LLM/DB hiba) csak a
  // szöveg-folyamba tudunk beleírni, nem tudunk 500-as státuszra váltani.
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    await queryAgent(question, {
      history,
      onTextDelta: (delta: string) => {
        res.write(delta);
      },
    });
  } catch (error) {
    res.write(`\n\n[Hiba: ${error instanceof Error ? error.message : 'Váratlan hiba történt.'}]`);
  }

  res.end();
}

// A queryAgent (Anthropic API-kulcs, DB-kapcsolat) csak a Vite dev-szerver Node
// folyamatában fut — a böngészőbe soha nem kerül titok, a kliens csak ezt a
// /api/ask végpontot hívja fetch-csel, és a törzset streamelve olvassa.
export function chatApiPlugin(): Plugin {
  return {
    name: 'boardgame-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/ask', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        void handleAskRequest(req, res);
      });
    },
  };
}
