import winston, { format } from "winston";

const colors = {
  error: "red",
  warn: "yellow",
  info: "blue",
  verbose: "white",
  debug: "white",
};

// Add custom colors to Winston
winston.addColors(colors);

export const logger = winston.createLogger({
  level: "verbose", // Set the minimum logging level
  format: format.combine(
    format.colorize({ all: true }), // Apply custom colors
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Add timestamp to log messages
    format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} ${level}: ${message}`;
      // Print stack trace if error is passed
      if (meta && meta[Symbol.for("splat")]) {
        for (const arg of meta[Symbol.for("splat")]) {
          if (arg instanceof Error) {
            msg += `\n${arg.stack}`;
          }
        }
      }
      return msg;
    })
  ),
  transports: [
    new winston.transports.Console(), // Output logs to the console
  ],
});
