import { createChatApp } from './chat-ui';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  createChatApp(root);
}
