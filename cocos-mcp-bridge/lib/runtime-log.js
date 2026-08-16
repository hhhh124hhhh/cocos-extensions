'use strict';

class RuntimeLog {
  constructor(limit = 200) {
    this.limit = Math.max(10, Number(limit) || 200);
    this.entries = [];
  }

  add(level, message, details) {
    this.entries.unshift({
      level: String(level || 'info'),
      message: String(message || ''),
      details: details === undefined ? null : details,
      timestamp: new Date().toISOString(),
    });

    if (this.entries.length > this.limit) {
      this.entries.length = this.limit;
    }
  }

  list(limit = 50) {
    return this.entries.slice(0, Math.max(1, Number(limit) || 50));
  }

  clear() {
    const count = this.entries.length;
    this.entries.length = 0;
    return count;
  }

  summary(limit = 50) {
    const items = this.list(limit);
    if (!items.length) {
      return 'No MCP runtime logs recorded yet.';
    }

    return items
      .map((entry) => `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`)
      .join('\n');
  }
}

module.exports = {
  RuntimeLog,
};
