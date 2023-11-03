import winston from 'winston';
import 'winston-daily-rotate-file';

const VERSION = process.env.VERSION ?? "0.1.0";

export default class Logger {

  static banner (logger: winston.Logger) {
    let versionText = VERSION;
    while (versionText.length < 86) versionText = ` ${versionText} `;
    if (versionText.length < 87) versionText = ` ${versionText}`;

    logger.info("###########################################################################################");
    logger.info("##                                                                                       ##");
    logger.info("##  ███████╗████████╗ █████╗ ██████╗  ███╗███╗ ██████╗ ███████╗ █████╗  ██████╗███████╗  ##");
    logger.info("##  ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗ ███║███║ ██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝  ##");
    logger.info("##  ███████╗   ██║   ███████║██████╔╝ ╚══╝╚██║ ██████╔╝█████╗  ███████║██║     █████╗    ##");
    logger.info("##  ╚════██║   ██║   ██╔══██║██╔══██╗ ████╗╚█║ ██╔═══╝ ██╔══╝  ██╔══██║██║     ██╔══╝    ##");
    logger.info("##  ███████║   ██║   ██║  ██║██║  ██║ █████╗╚╝ ██║     ███████╗██║  ██║╚██████╗███████╗  ##");
    logger.info("##  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝   ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝  ##");
    logger.info("##                                                                                       ##");
    logger.info("###########################################################################################");
    logger.info(`##${versionText}##`);
    logger.info("###########################################################################################");
    logger.info("##                                                                                       ##");
    logger.info("##          please report all security vulnerabilities to security@starpeace.io          ##");
    logger.info("##                                                                                       ##");
    logger.info("## interested in contributing? any and all help is gladly welcome! please join STARPEACE ##");
    logger.info("## Discord chatroom or visit starpeace-project Github organization for more information! ##");
    logger.info("##                                                                                       ##");
    logger.info("###########################################################################################");
  }

  static createProcessLoggerManager (): winston.Logger {
    return winston.createLogger({
      transports: [new winston.transports.DailyRotateFile({
        level: 'info',
        filename: 'logs/process-manager-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d',
        handleRejections: true,
        handleExceptions: true
      }), new winston.transports.Console({
        handleRejections: true,
        handleExceptions: true
      })],
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.label({ label: "Process Manager" }),
        winston.format.printf(({ level, message, label, timestamp }) => `${timestamp} [${label}][${level}]: ${message}`)
      ),
      exitOnError: false
    });
  }

  static createProcessLoggerModelServer (): winston.Logger {
    return winston.createLogger({
      transports: [new winston.transports.DailyRotateFile({
        level: 'info',
        filename: 'logs/process-model-server-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d',
        handleRejections: true,
        handleExceptions: true
      }), new winston.transports.Console({
        handleRejections: true,
        handleExceptions: true
      })],
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.label({ label: "Model Server" }),
        winston.format.printf(({ level, message, label, timestamp }) => `${timestamp} [${label}][${level}]: ${message}`)
      ),
      exitOnError: false
    });
  }

  static createProcessLoggerSimulation (): winston.Logger {
    return winston.createLogger({
      transports: [new winston.transports.DailyRotateFile({
        level: 'info',
        filename: 'logs/process-simulation-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d',
        handleRejections: true,
        handleExceptions: true
      }), new winston.transports.Console({
        handleRejections: true,
        handleExceptions: true
      })],
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.label({ label: "Simulation" }),
        winston.format.printf(({ level, message, label, timestamp }) => `${timestamp} [${label}][${level}]: ${message}`)
      ),
      exitOnError: false
    });
  }

  static createSimulationLogger (): winston.Logger {
    return winston.createLogger({
      transports: [new winston.transports.DailyRotateFile({
        level: 'info',
        filename: 'logs/simulation-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d'
      })],
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
      )
    });
  }
}
