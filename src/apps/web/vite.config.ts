import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'vite';
import { chatApiPlugin } from './server/chat-api-plugin';

config({ path: resolve(__dirname, '../../../.env') });

export default defineConfig({
  root: __dirname,
  plugins: [chatApiPlugin()],
});
