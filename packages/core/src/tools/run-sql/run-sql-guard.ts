const FORBIDDEN_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'truncate',
  'create',
  'grant',
  'revoke',
  'copy',
  'call',
  'execute',
  'merge',
  'vacuum',
  'reindex',
  'listen',
  'notify',
  'set',
  'reset',
  'begin',
  'commit',
  'rollback',
  'lock',
  'refresh',
  'do',
] as const;

// A read-only DB-kapcsolat (boardgame_ro role) az elsődleges védelem — ez itt
// a második védelmi vonal, hogy a rossz/rosszindulatú query már a tool szintjén
// eldőljön, ne csak a DB jogosultságon bukjon el.
export function assertReadOnlySelect(query: string): string {
  const trimmed = query.trim().replace(/;\s*$/, '');

  if (trimmed.length === 0) {
    throw new Error('A query nem lehet üres.');
  }

  if (trimmed.includes(';')) {
    throw new Error('Csak egyetlen SQL utasítás engedélyezett.');
  }

  if (!/^(select|with)\b/i.test(trimmed)) {
    throw new Error('Csak SELECT (vagy WITH ... SELECT) lekérdezés engedélyezett.');
  }

  const forbiddenKeyword = FORBIDDEN_KEYWORDS.find((keyword) => new RegExp(`\\b${keyword}\\b`, 'i').test(trimmed));
  if (forbiddenKeyword) {
    throw new Error(`Tiltott kulcsszó a lekérdezésben: ${forbiddenKeyword}.`);
  }

  return trimmed;
}