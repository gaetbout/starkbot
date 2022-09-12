import { createLogger, transports, format } from "winston";

export const logger = createLogger({
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ timestamp, level, message, metadata }) => {
                    return `[${timestamp}] ${level}: ${message}. ${(Object.keys(metadata).length === 0) ? '' : JSON.stringify(metadata)}`;
                })
            ),
        }),
    ],
    format: format.combine(format.metadata(), format.timestamp()),
});