export const logger = {
    info: (...args: any[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(...args);
        }
    },

    warn: (...args: any[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(...args);
        }
    },

    error: (message: string, error?: any) => {
        if (process.env.NODE_ENV === 'production') {
            // In production, log only the message or sanitised error
            // Avoid logging full response objects which might contain PII
            console.error(message);
        } else {
            // In development, log everything for debugging
            console.error(message, error);
        }
    },

    debug: (...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(...args);
        }
    },
};
