VERSION = require('../../package.json')?.version || "0.1.0"

module.exports = class Logger
  constructor: () ->

  @banner: () ->
    versionText = VERSION
    versionText = " #{versionText} " while versionText.length < 86
    versionText = " #{versionText}" if versionText.length < 87

    console.log "###########################################################################################\n" +
        "##                                                                                       ##\n" +
        "##  ███████╗████████╗ █████╗ ██████╗  ███╗███╗ ██████╗ ███████╗ █████╗  ██████╗███████╗  ##\n" +
        "##  ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗ ███║███║ ██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝  ##\n" +
        "##  ███████╗   ██║   ███████║██████╔╝ ╚══╝╚██║ ██████╔╝█████╗  ███████║██║     █████╗    ##\n" +
        "##  ╚════██║   ██║   ██╔══██║██╔══██╗ ████╗╚█║ ██╔═══╝ ██╔══╝  ██╔══██║██║     ██╔══╝    ##\n" +
        "##  ███████║   ██║   ██║  ██║██║  ██║ █████╗╚╝ ██║     ███████╗██║  ██║╚██████╗███████╗  ##\n" +
        "##  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝   ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝  ##\n" +
        "##                                                                                       ##\n" +
        "###########################################################################################\n" +
        "###{versionText}##\n" +
        "###########################################################################################\n" +
        "##                                                                                       ##\n" +
        "##          please report all security vulnerabilities to security@starpeace.io          ##\n" +
        "##                                                                                       ##\n" +
        "## interested in contributing? any and all help is gladly welcome! please join STARPEACE ##\n" +
        "## Discord chatroom or visit starpeace-project Github organization for more information! ##\n" +
        "##                                                                                       ##\n" +
        "###########################################################################################\n"
