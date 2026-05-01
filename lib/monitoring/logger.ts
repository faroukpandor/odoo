/**
 * Production Logger
 * Logs events to console and can be extended to send to monitoring services
 * Free tier: Console logs (can integrate with Sentry, LogRocket, etc)
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date(entry.timestamp).toISOString(),
    })
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    }

    const formatted = this.formatLog(entry)

    if (this.isDevelopment) {
      console.log(formatted)
    } else {
      // In production, send to monitoring service
      // Example: await fetch('/api/logs', { method: 'POST', body: formatted })
      console.log(formatted)
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, { ...context, error: error?.message })
  }

  critical(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.CRITICAL, message, { ...context, error: error?.message })
  }
}

export const logger = new Logger()
