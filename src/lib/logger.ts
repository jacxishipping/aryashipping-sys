export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any[];
  timestamp: string;
}

class Logger {
  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();

    // In production, we output structured JSON
    if (process.env.NODE_ENV === 'production') {
      const entry: LogEntry = {
        level,
        message,
        data: args.length > 0 ? args : undefined,
        timestamp,
      };
      // Use console methods corresponding to levels, but output JSON string
      // Note: console.debug might be hidden in some prod environments, so we map it to log or info if needed.
      // But usually stdout/stderr are captured.
      (console as any)[level](JSON.stringify(entry));
    } else {
      // In development, we use a more readable format
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      (console as any)[level](prefix, message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger();
