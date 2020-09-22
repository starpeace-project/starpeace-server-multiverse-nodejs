passport = require('passport')
localStrategy = require('passport-local').Strategy
JWTstrategy = require('passport-jwt').Strategy
ExtractJWT = require('passport-jwt').ExtractJwt


module.exports = (galaxyManager, tycoonManager) ->

  passport.use(
    'register',
    new localStrategy(
      {
        usernameField: 'username'
        passwordField: 'password'
      },
      (username, password, done) ->
        tycoonManager.create(username, password)
          .then (user) -> done(null, user)
          .catch (err) -> done(err)
    )
  )

  passport.use(
    'login',
    new localStrategy(
      {
        usernameField: 'username'
        passwordField: 'password'
      },
      (username, password, done) ->
        tycoonManager.forUsernamePassword(username, password)
          .then (tycoon) ->
            if tycoon?
              done(null, tycoon)
            else
              done(null, false, { message: 'SIGNIN' })
          .catch (err) -> done(err)
    )
  )

  passport.use(
    'jwt',
    new JWTstrategy(
      {
        jwtFromRequest: ExtractJWT.fromAuthHeaderWithScheme('JWT')
        secretOrKey: galaxyManager.getSecret()
      },
      (payload, done) ->
        return done(null, false) if new Date(payload.exp * 1000) < new Date()
        tycoonManager.forId(payload.id)
         .then (tycoon) ->
           if tycoon?
             done(null, tycoon)
           else
             done(null, false, { message: 'NOT_FOUND' })
         .catch (err) -> done(err)
    )
  )
