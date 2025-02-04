import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Log Level Schema
const LogLevelSchema = z.enum([
  'DEBUG', 
  'INFO', 
  'WARN', 
  'ERROR', 
  'CRITICAL'
]);

// Log Entry Schema
const LogEntrySchema = z.object({
  timestamp: z.date(),
  level: LogLevelSchema,
  message: z.string(),
  context: z.record(z.string(), z.any()).optional(),
  metadata: z.object({
    serviceName: z.string().default('WellConnectPro'),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    traceId: z.string().optional()
  })
});

type LogEntry = z.infer<typeof LogEntrySchema>;
type LogLevel = z.infer<typeof LogLevelSchema>;

class LoggingSystem {
  private static instance: LoggingSystem;
  private logDirectory: string;
  private currentLogFile: string | null = null;

  private constructor() {
    this.logDirectory = path.join(process.cwd(), 'logs');
    this.ensureLogDirectoryExists();
  }

  public static getInstance(): LoggingSystem {
    if (!LoggingSystem.instance) {
      LoggingSystem.instance = new LoggingSystem();
    }
    return LoggingSystem.instance;
  }

  private ensureLogDirectoryExists(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private getCurrentLogFile(): string {
    const today = format(new Date(), 'yyyy-MM-dd');
    const logFileName = `${today}.log`;
    return path.join(this.logDirectory, logFileName);
  }

  private writeLogToFile(logEntry: LogEntry): void {
    const logFile = this.getCurrentLogFile();
    const logMessage = this.formatLogEntry(logEntry);
    
    fs.appendFile(logFile, logMessage + '\n', (err) => {
      if (err) {
        console.error('Failed to write to log file', err);
      }
    });
  }

  private formatLogEntry(logEntry: LogEntry): string {
    const contextString = logEntry.context 
      ? ` | Context: ${JSON.stringify(logEntry.context)}` 
      : '';
    
    return `[${logEntry.timestamp.toISOString()}] ${logEntry.level}: ${logEntry.message}${contextString}`;
  }

  private log(
    level: LogLevel, 
    message: string, 
    context?: Record<string, any>
  ): void {
    const logEntry: LogEntry = LogEntrySchema.parse({
      timestamp: new Date(),
      level,
      message,
      context,
      metadata: {
        serviceName: 'WellConnectPro',
        environment: process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development',
        traceId: context?.traceId
      }
    });

    // Console output
    this.consoleOutput(logEntry);

    // File logging
    this.writeLogToFile(logEntry);
  }

  private consoleOutput(logEntry: LogEntry): void {
    const consoleMethod = {
      'DEBUG': console.debug,
      'INFO': console.info,
      'WARN': console.warn,
      'ERROR': console.error,
      'CRITICAL': console.error
    }[logEntry.level];

    consoleMethod(this.formatLogEntry(logEntry));
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.log('DEBUG', message, context);
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log('INFO', message, context);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log('WARN', message, context);
  }

  public error(message: string, context?: Record<string, any>): void {
    this.log('ERROR', message, context);
  }

  public critical(message: string, context?: Record<string, any>): void {
    this.log('CRITICAL', message, context);
  }

  // Retrieve logs with optional filtering
  public getLogs(options: {
    level?: LogLevel, 
    startDate?: Date, 
    endDate?: Date
  } = {}): LogEntry[] {
    const logFiles = fs.readdirSync(this.logDirectory)
      .filter(file => file.endsWith('.log'));

    const filteredLogs: LogEntry[] = [];

    logFiles.forEach(file => {
      const filePath = path.join(this.logDirectory, file);
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      
      fileContents.split('\n').forEach(line => {
        try {
          const parsedEntry = this.parseLogLine(line);
          
          if (this.matchesFilter(parsedEntry, options)) {
            filteredLogs.push(parsedEntry);
          }
        } catch (error) {
          // Silently ignore parsing errors
        }
      });
    });

    return filteredLogs;
  }

  private parseLogLine(line: string): LogEntry {
    // Implement robust log line parsing
    // This is a simplified version and might need more sophisticated parsing
    const matches = line.match(/\[(.*?)\] (DEBUG|INFO|WARN|ERROR|CRITICAL): (.*)/);
    
    if (!matches) {
      throw new Error('Invalid log line');
    }

    return LogEntrySchema.parse({
      timestamp: new Date(matches[1]),
      level: matches[2] as LogLevel,
      message: matches[3]
    });
  }

  private matchesFilter(
    entry: LogEntry, 
    options: {
      level?: LogLevel, 
      startDate?: Date, 
      endDate?: Date
    }
  ): boolean {
    const levelMatch = !options.level || entry.level === options.level;
    const startDateMatch = !options.startDate || entry.timestamp >= options.startDate;
    const endDateMatch = !options.endDate || entry.timestamp <= options.endDate;

    return levelMatch && startDateMatch && endDateMatch;
  }
}

export const logger = LoggingSystem.getInstance();
