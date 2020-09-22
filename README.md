
# starpeace-server-multiverse-nodejs

[![GitHub release](https://img.shields.io/github/release/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/releases/)
[![Build Status](https://travis-ci.org/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://travis-ci.org/starpeace-project/starpeace-server-multiverse-nodejs)
[![GitHub license](https://img.shields.io/github/license/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/issues)
[![GitHub stars](https://img.shields.io/github/stars/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/stargazers)
[![Discord](https://img.shields.io/discord/449310464321650703.svg?logo=discord)](https://discord.gg/TF9Bmsj)
![Twitter Follow](https://img.shields.io/twitter/follow/starpeace_io.svg?style=social&label=Follow)

Backend server for [STARPEACE](https://www.starpeace.io), including API interface, simple persistence platform, and simulation engine, written in javascript and using NodeJS.

## Official Documentation

Documentation for client gameplay can be found on the [STARPEACE documentation website](https://docs.starpeace.io).

## Roadmap

Active development and gameplay roadmap can be [found in RELEASE.md](./RELEASE.md), historical changelog can be [found in RELEASE-archive.md](./RELEASE-archive.md), and a rough plan for anticipated next steps can be [found in ROADMAP.md](./ROADMAP.md).

Current release notes are also [available in client](https://client.starpeace.io/release) at https://client.starpeace.io/release

## Security Vulnerabilities

If you discover a security vulnerability within the STARPEACE website, please send an e-mail to security@starpeace.io or open a [GitHub issue](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/issues). All security vulnerabilities will be promptly addressed.

## Contributing

All contributions welcome: development, game design, translations, or play-testing; please let us know if you'd like to get involved! Please [join Discord chatroom](https://discord.gg/TF9Bmsj) to learn more.

## Build and Deployment

Server can rebuilt locally by retrieving repository and invoking ```grunt build```. Packaged binaries can be compiled for current OS by running ```grunt package```.

Once compiled or binary created, multiverse and planets must be initialized with configuration setup, by invoking ```node ./dist/setup.js```. After configuring planet, server can be started with ```node ./dist/index.js```

## License

starpeace-server-multiverse-nodejs is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
