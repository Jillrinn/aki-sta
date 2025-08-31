// テスト実行時のconsole出力を抑制
const originalConsole = global.console;

// テスト環境でのみconsoleをモック
if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // 他のメソッドは元のまま保持
    trace: originalConsole.trace,
    dir: originalConsole.dir,
    dirxml: originalConsole.dirxml,
    group: originalConsole.group,
    groupCollapsed: originalConsole.groupCollapsed,
    groupEnd: originalConsole.groupEnd,
    clear: originalConsole.clear,
    count: originalConsole.count,
    countReset: originalConsole.countReset,
    assert: originalConsole.assert,
    profile: originalConsole.profile,
    profileEnd: originalConsole.profileEnd,
    table: originalConsole.table,
    time: originalConsole.time,
    timeEnd: originalConsole.timeEnd,
    timeLog: originalConsole.timeLog,
    timeStamp: originalConsole.timeStamp
  };
}

// dotenvのログを抑制
process.env.DOTENV_QUIET = 'true';