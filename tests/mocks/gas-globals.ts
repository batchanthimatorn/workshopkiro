// In-memory mocks of Google Apps Script globals (Ref: design/testing-strategy.md Mock Strategy)
/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = unknown[];

interface Store {
  sheets: Map<string, Row[]>;
  props: Map<string, string>;
  cache: Map<string, string>;
  triggers: any[];
  urlFetchImpl: (url: string, params?: any) => any;
}

let store: Store;

export function getStore(): Store {
  return store;
}

export function installGasMocks(opts: { props?: Record<string, string> } = {}): Store {
  store = {
    sheets: new Map(),
    props: new Map(Object.entries(opts.props ?? {})),
    cache: new Map(),
    triggers: [],
    urlFetchImpl: () => {
      throw new Error('UrlFetchApp.fetch not mocked — use setUrlFetch()');
    },
  };
  let uuidN = 0;
  const g = globalThis as any;

  g.Utilities = {
    getUuid: () => `uuid-${++uuidN}`,
    sleep: (_ms: number) => undefined,
    computeDigest: (_algo: string, s: string) => Array.from(String(s)).map((c) => c.charCodeAt(0) % 256),
    DigestAlgorithm: { MD5: 'MD5' },
    base64Encode: (s: string) => Buffer.from(String(s)).toString('base64'),
  };

  g.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k: string) => (store.props.has(k) ? store.props.get(k)! : null),
      setProperty: (k: string, v: string) => store.props.set(k, v),
    }),
  };

  const makeCache = () => ({
    get: (k: string) => (store.cache.has(k) ? store.cache.get(k)! : null),
    put: (k: string, v: string, _ttl?: number) => store.cache.set(k, v),
    remove: (k: string) => store.cache.delete(k),
  });
  g.CacheService = { getScriptCache: makeCache, getUserCache: makeCache };

  g.LockService = {
    getScriptLock: () => ({ waitLock: (_t: number) => undefined, releaseLock: () => undefined }),
  };

  g.Session = { getActiveUser: () => ({ getEmail: () => 'tester@example.com' }) };

  function makeSheet(name: string) {
    const rows = () => {
      if (!store.sheets.has(name)) store.sheets.set(name, []);
      return store.sheets.get(name)!;
    };
    return {
      getName: () => name,
      appendRow: (r: Row) => rows().push([...r]),
      getLastRow: () => rows().length,
      getRange: (r: number, c: number, nr: number, nc: number) => ({
        getValues: () => {
          const out: Row[] = [];
          for (let i = 0; i < nr; i++) {
            const row = rows()[r - 1 + i] ?? [];
            out.push(row.slice(c - 1, c - 1 + nc));
          }
          return out;
        },
        setValues: (vals: Row[]) => {
          for (let i = 0; i < vals.length; i++) rows()[r - 1 + i] = [...vals[i]];
        },
      }),
      deleteRow: (n: number) => rows().splice(n - 1, 1),
      appendParagraph: (_t: string) => undefined,
    };
  }

  g.SpreadsheetApp = {
    openById: (_id: string) => ({
      getSheetByName: (name: string) => (store.sheets.has(name) ? makeSheet(name) : null),
      insertSheet: (name: string) => {
        store.sheets.set(name, []);
        return makeSheet(name);
      },
      getSheets: () => [makeSheet([...store.sheets.keys()][0] ?? 'Sheet1')],
    }),
  };

  g.ScriptApp = {
    getProjectTriggers: () => store.triggers,
    newTrigger: (_fn: string) => {
      const builder: any = {
        timeBased: () => builder,
        everyHours: () => builder,
        everyDays: () => builder,
        atHour: () => builder,
        create: () => {
          const t = { getUniqueId: () => `trigger-${store.triggers.length + 1}` };
          store.triggers.push(t);
          return t;
        },
      };
      return builder;
    },
    deleteTrigger: (t: any) => {
      const i = store.triggers.indexOf(t);
      if (i >= 0) store.triggers.splice(i, 1);
    },
  };

  g.UrlFetchApp = { fetch: (url: string, params?: any) => store.urlFetchImpl(url, params) };
  g.MailApp = { sendEmail: (_to: string, _s: string, _b: string) => undefined };
  g.GmailApp = {
    getMessageById: (_id: string) => ({
      getPlainBody: () => 'mock message body',
      createDraftReply: (_b: string) => ({ getId: () => 'draft-1' }),
    }),
    setCurrentMessageAccessToken: (_t: string) => undefined,
  };
  g.DocumentApp = {
    getActiveDocument: () => null,
    openById: (_id: string) => ({
      getBody: () => ({ appendParagraph: (_t: string) => undefined, getText: () => '' }),
    }),
  };

  return store;
}

export function setUrlFetch(impl: (url: string, params?: any) => any): void {
  store.urlFetchImpl = impl;
}

export function seedSheet(name: string, rows: Row[]): void {
  store.sheets.set(name, rows.map((r) => [...r]));
}

export function getSheetRows(name: string): Row[] {
  return store.sheets.get(name) ?? [];
}

export function makeHttpResponse(code: number, text: string) {
  return { getResponseCode: () => code, getContentText: () => text };
}
