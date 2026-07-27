import type { ConversationTurn } from '../../../agents/agent-loop/tool-definition';
import { askQuestion } from './chat-client';
import { renderMarkdown } from './render-markdown';
import { createTypewriter } from './typewriter';

type MessageRole = 'user' | 'assistant' | 'error';

const TYPING_INDICATOR_HTML = '<span class="typing-dot" aria-label="válasz érkezik…"></span>';

export function createChatApp(root: HTMLElement): void {
  root.innerHTML = `
    <div class="chat">
      <h1>Boardgame asszisztens</h1>
      <div class="messages" id="messages"></div>
      <form id="ask-form">
        <input id="question" type="text" placeholder="Kérdezz egy társasjátékról…" autocomplete="off" required />
        <button id="send-button" type="submit">Küldés</button>
      </form>
    </div>
  `;

  const messages = root.querySelector<HTMLDivElement>('#messages');
  const form = root.querySelector<HTMLFormElement>('#ask-form');
  const input = root.querySelector<HTMLInputElement>('#question');
  const sendButton = root.querySelector<HTMLButtonElement>('#send-button');

  if (!messages || !form || !input || !sendButton) {
    throw new Error('A chat UI nem tudott felépülni.');
  }

  // A beszélgetés eddigi kérdés/válasz párjai — ezt küldjük el minden új
  // kérdéssel, hogy az agentnek meglegyen a korábbi kontextus.
  const history: ConversationTurn[] = [];

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) {
      return;
    }

    appendMessage(messages, 'user', question);
    input.value = '';
    input.disabled = true;
    sendButton.disabled = true;

    const { bubble, textEl } = appendMessage(messages, 'assistant', '');
    textEl.innerHTML = TYPING_INDICATOR_HTML;

    // A hálózati chunkok döcögősen érkeznek — a typewriter egyenletes ütemben
    // "gépeli ki" a szöveget, a markdownt pedig minden frissítéskor újra
    // renderelt HTML-ként jelenítjük meg (nem nyers szövegként).
    const typewriter = createTypewriter((revealed) => {
      textEl.innerHTML = renderMarkdown(revealed);
      messages.scrollTop = messages.scrollHeight;
    });

    askQuestion(question, history, (chunk) => {
      typewriter.push(chunk);
    })
      .then((answer) => {
        typewriter.finish();
        history.push({ role: 'user', content: question }, { role: 'assistant', content: answer });
      })
      .catch((error: unknown) => {
        typewriter.finish();
        bubble.classList.remove('message--assistant');
        bubble.classList.add('message--error');
        textEl.textContent = error instanceof Error ? error.message : 'Váratlan hiba történt.';
      })
      .finally(() => {
        input.disabled = false;
        sendButton.disabled = false;
        input.focus();
      });
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(
  container: HTMLElement,
  role: MessageRole,
  text: string,
): { bubble: HTMLElement; textEl: HTMLElement } {
  const bubble = document.createElement('div');
  bubble.className = `message message--${role}`;

  const textEl = document.createElement('div');
  textEl.className = 'message__text';
  textEl.textContent = text;

  const timeEl = document.createElement('div');
  timeEl.className = 'message__time';
  timeEl.textContent = formatTime(new Date());

  bubble.append(textEl, timeEl);
  container.append(bubble);
  container.scrollTop = container.scrollHeight;

  return { bubble, textEl };
}
