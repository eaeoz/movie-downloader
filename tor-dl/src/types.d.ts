declare module 'cli-progress' {
  interface ProgressBarOptions {
    format?: string;
    barCompleteChar?: string;
    barIncompleteChar?: string;
    hideCursor?: boolean;
    fps?: number;
    etaAsynchronous?: boolean;
    etaBuffer?: number;
    stream?: any;
    terminateOnComplete?: boolean;
  }

  interface ProgressBar {
    start(total: number, startValue: number, payload?: any): void;
    update(current: number, payload?: any): void;
    stop(): void;
    increment(delta?: number): void;
  }

  function create(options?: ProgressBarOptions, preset?: any): ProgressBar;

  export = { create };
}

declare module 'webtorrent' {
  interface TorrentOptions {
    path?: string;
    auto?: boolean;
    maxWebConns?: number;
  }

  interface Torrent {
    ready: boolean;
    length: number;
    downloaded: number;
    name: string;
    files: any[];
    on(event: 'ready' | 'download' | 'done' | 'error', callback: (...args: any[]) => void): void;
  }

  interface Client {
    add(torrentId: string | Buffer, opts?: TorrentOptions): Torrent;
    destroy(callback?: () => void): void;
  }

  function (): Client;

  export = WebTorrent;
}

declare module 'ora' {
  interface Ora {
    start(text?: string): Ora;
    stop(): Ora;
    succeed(text?: string): Ora;
    fail(text?: string): Ora;
    warn(text?: string): Ora;
    info(text?: string): Ora;
    text: string;
  }

  interface OraOptions {
    text?: string;
    color?: string;
  }

  function ora(options?: OraOptions): Ora;

  export = ora;
}

declare module 'chalk' {
  const chalk: {
    red: (s: string) => string;
    green: (s: string) => string;
    blue: (s: string) => string;
    yellow: (s: string) => string;
    cyan: (s: string) => string;
    white: (s: string) => string;
    gray: (s: string) => string;
    bold: (s: string) => string;
  };

  export = chalk;
}