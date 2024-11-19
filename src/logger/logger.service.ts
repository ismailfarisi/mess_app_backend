import { Injectable, ConsoleLogger } from '@nestjs/common';

@Injectable()
export class LoggerService extends ConsoleLogger {
  constructor() {
    super();
    // Set log levels you want to see
    this.setLogLevels(['error', 'warn', 'log', 'debug', 'verbose']);
  }

  error(message: string, stack?: string, context?: string) {
    // Add timestamp to the message
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [ERROR] ${context ? `[${context}] ` : ''}${message}`;

    // Log in red color
    super.error('\x1b[31m%s\x1b[0m', formattedMessage);
    if (stack) {
      // Log stack trace in grey color
      super.error('\x1b[90m%s\x1b[0m', stack);
    }
  }

  warn(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [WARN] ${context ? `[${context}] ` : ''}${message}`;

    // Log in yellow color
    super.warn('\x1b[33m%s\x1b[0m', formattedMessage);
  }

  log(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [INFO] ${context ? `[${context}] ` : ''}${message}`;

    // Log in blue color
    super.log('\x1b[34m%s\x1b[0m', formattedMessage);
  }

  debug(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [DEBUG] ${context ? `[${context}] ` : ''}${message}`;

    // Log in cyan color
    super.debug('\x1b[36m%s\x1b[0m', formattedMessage);
  }

  verbose(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [VERBOSE] ${context ? `[${context}] ` : ''}${message}`;

    // Log in magenta color
    super.verbose('\x1b[35m%s\x1b[0m', formattedMessage);
  }
}
