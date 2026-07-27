import type Anthropic from '@anthropic-ai/sdk';

// Egy tool teljesen önállóan hordozza a saját erőforrásait (DB-kapcsolat stb.) —
// azt, hogy melyik pool-t vagy más függőséget használ, a konkrét agent köti be
// az execute closure-ébe, amikor összeállítja a saját tool-listáját. Ez teszi
// lehetővé, hogy egy agenten belül (pl. ingest-agent) különböző tool-ok
// különböző jogosultságú kapcsolatot használjanak ugyanabban a körben.
export interface ToolDefinition {
  tool: Anthropic.Tool;
  execute: (rawInput: unknown) => Promise<unknown>;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}
