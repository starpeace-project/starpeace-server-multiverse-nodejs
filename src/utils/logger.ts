import winston from "winston";

const VERSION = require('../../../package.json')?.version || "0.1.0";

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
}
