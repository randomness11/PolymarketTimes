/**
 * Structured logging utility for consistent error/info messages across the app.
 * Provides context and standardized format for debugging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    module?: string;
    action?: string;
    [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Only show debug logs in development
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const moduleTag = context?.module ? `[${context.module}]` : '';
    const actionTag = context?.action ? `(${context.action})` : '';
    return `${timestamp} ${level.toUpperCase()} ${moduleTag}${actionTag} ${message}`;
}

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

export const logger = {
    debug(message: string, context?: LogContext): void {
        if (shouldLog('debug')) {
            console.debug(formatMessage('debug', message, context), context);
        }
    },

    info(message: string, context?: LogContext): void {
        if (shouldLog('info')) {
            console.info(formatMessage('info', message, context), context);
        }
    },

    warn(message: string, context?: LogContext): void {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message, context), context);
        }
    },

    error(message: string, error?: Error | unknown, context?: LogContext): void {
        if (shouldLog('error')) {
            const fullContext = {
                ...context,
                errorMessage: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            };
            console.error(formatMessage('error', message, context), fullContext);
        }
    },

    /**
     * Create a scoped logger for a specific module
     */
    scope(module: string) {
        return {
            debug: (message: string, context?: LogContext) =>
                logger.debug(message, { ...context, module }),
            info: (message: string, context?: LogContext) =>
                logger.info(message, { ...context, module }),
            warn: (message: string, context?: LogContext) =>
                logger.warn(message, { ...context, module }),
            error: (message: string, error?: Error | unknown, context?: LogContext) =>
                logger.error(message, error, { ...context, module }),
        };
    },
};

export default logger;
