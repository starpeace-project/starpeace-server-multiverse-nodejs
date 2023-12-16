
# starpeace-server-multiverse-nodejs

[![GitHub release](https://img.shields.io/github/release/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/releases/)
[![GitHub license](https://img.shields.io/github/license/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/issues)
[![GitHub stars](https://img.shields.io/github/stars/starpeace-project/starpeace-server-multiverse-nodejs.svg)](https://github.com/starpeace-project/starpeace-server-multiverse-nodejs/stargazers)
[![Discord](https://img.shields.io/discord/449310464321650703.svg?logo=discord)](https://discord.gg/TF9Bmsj)

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

## Build and Development

Local development can be accomplished in a few commands. The following build-time dependencies must be installed:

* [Node.js](https://nodejs.org/en/) javascript runtime and [npm](https://www.npmjs.com/get-npm) package manager

Retrieve copy of repository and navigate to root:

```
$ git clone https://github.com/starpeace-project/starpeace-server-multiverse-nodejs.git
$ cd starpeace-server-multiverse-nodejs
```

Install starpeace-server-multiverse-nodejs dependencies:

```
$ npm install
```

Build repository with npm command defined in package.json:

```
$ npm run build
```

Once compiled or binary created, multiverse and planets must be initialized with configuration setup, by invoking:

```
$ node ./dist/app/setup.js
```

Once configured, server can be started with:

```
$ node ./dist/app/server.js
```

## Deployment

### SSL

https://github.com/therootcompany/greenlock-express.js

### Process Manager

https://github.com/Unitech/pm2

## License

starpeace-server-multiverse-nodejs is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
