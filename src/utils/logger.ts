const VERSION = require('../../../package.json')?.version || "0.1.0";

export default class Logger {

  static banner () {
    let versionText = VERSION;
    while (versionText.length < 86) versionText = ` ${versionText} `;
    if (versionText.length < 87) versionText = ` ${versionText}`;

    console.log("###########################################################################################\n" +
        "##                                                                                       ##\n" +
        "##  ███████╗████████╗ █████╗ ██████╗  ███╗███╗ ██████╗ ███████╗ █████╗  ██████╗███████╗  ##\n" +
        "##  ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗ ███║███║ ██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝  ##\n" +
        "##  ███████╗   ██║   ███████║██████╔╝ ╚══╝╚██║ ██████╔╝█████╗  ███████║██║     █████╗    ##\n" +
        "##  ╚════██║   ██║   ██╔══██║██╔══██╗ ████╗╚█║ ██╔═══╝ ██╔══╝  ██╔══██║██║     ██╔══╝    ##\n" +
        "##  ███████║   ██║   ██║  ██║██║  ██║ █████╗╚╝ ██║     ███████╗██║  ██║╚██████╗███████╗  ##\n" +
        "##  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝   ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝  ##\n" +
        "##                                                                                       ##\n" +
        "###########################################################################################\n" +
        `##${versionText}##\n` +
        "###########################################################################################\n" +
        "##                                                                                       ##\n" +
        "##          please report all security vulnerabilities to security@starpeace.io          ##\n" +
        "##                                                                                       ##\n" +
        "## interested in contributing? any and all help is gladly welcome! please join STARPEACE ##\n" +
        "## Discord chatroom or visit starpeace-project Github organization for more information! ##\n" +
        "##                                                                                       ##\n" +
        "###########################################################################################\n");
  }
}
