import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

// Our own logs
export const logger = pino({ level });

// Baileys is extremely chatty — keep it quiet unless asked
export const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' });
