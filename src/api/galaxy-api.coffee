_ = require('lodash')
passport = require('passport')
jwt = require('jsonwebtoken')

FIFTEEN_MINUTES = 900000
TWO_WEEKS = 1209600000
TYCOON_VISA_NAME = 'starpeace.visa'


module.exports = class GalaxyApi
  constructor: (@galaxyManager, @companyManager, @corporationManager, @tycoonManager) ->

  getMetadata: () -> (req, res, next) =>
    response = {
      id: @galaxyManager.metadata.id
      name: @galaxyManager.metadata.name
      visitorEnabled: @galaxyManager.metadata.visitorEnabled
      tycoonEnabled: @galaxyManager.metadata.tycoonEnabled
      tycoonCreationEnabled: @galaxyManager.metadata.tycoonCreationEnabled
      tycoonAuthentication: @galaxyManager.metadata.tycoonAuthentication
      planets: []
    }

    try
      for planet in @galaxyManager.metadata.planets
        corporations = await @corporationManager.forPlanet(planet.id)
        onlineVisas = await @tycoonManager.onlineVisas(planet.id)

        response.planets.push({
          id: planet.id
          name: planet.name
          enabled: planet.enabled
          planetType: planet.planetType
          planetWidth: planet.planetWidth
          planetHeight: planet.planetHeight
          mapId: planet.mapId
          population: 0
          investmentValue: 0
          corporationCount: corporations.length
          onlineCount: onlineVisas.length
        })

      if req.isAuthenticated()
        corporations = []
        for corporation in (await @corporationManager.forTycoon(req.user.id))
          companies = await Promise.all(_.map(Array.from(corporation.companyIds), (companyId) => @companyManager.forId(companyId)))
          corporations.push corporation.toJsonApi(companies)

        response.tycoon = {
          id: req.user.id
          username: req.user.username
          name: req.user.name
          corporations: corporations
        }

      res.json(response)
    catch err
      console.log err
      res.status(500).json(err)


  loginUser: (req, res, next, user, issueRefreshToken) ->
    req.logIn(user, { session: false }, (err) =>
      return next(err) if err

      try
        corporations = []
        for corporation in (await @corporationManager.forTycoon(user.id))
          companies = await Promise.all(_.map(Array.from(corporation.companyIds), (companyId) => @companyManager.forId(companyId)))
          corporations.push corporation.toJsonApi(companies)

        accessToken = jwt.sign({ id: user.id }, @galaxyManager.getSecret(), { expiresIn: 3600 })
        return res.json({ id: user.id, username: user.username, name: user.name, accessToken: accessToken, corporations }) unless issueRefreshToken

        token = await @tycoonManager.issueToken(user)
        res.json({ id: user.id, username: user.username, name: user.name, accessToken: accessToken, refreshToken: token, corporations })

      catch err
        console.log err
        res.status(500).json(err)
    )

  create: () -> (req, res, next) =>
    return res.status(400) unless req.body.username?.length || req.body.password?.length
    passport.authenticate('register', { session: false }, (error, user, info) =>
      return res.status(500).json(error) if error
      return res.status(401).json({message: info.message}) unless user
      @loginUser(req, res, next, user, req.body.rememberMe)
    )(req, res, next)

  login: () -> (req, res, next) =>
    if req.body.refreshToken?
      @tycoonManager.loginToken(req.body.refreshToken)
        .then (user) =>
          @loginUser(req, res, next, user, true)
        .catch (err) ->
          console.log err
          res.status(500).json(err)

    else
      passport.authenticate('login', { session: false }, (error, user, info) =>
        return res.status(500).json(error) if error
        return res.status(401).json({message: info.message}) unless user
        @loginUser(req, res, next, user, req.body.rememberMe)
      )(req, res, next)

  logout: () -> (req, res, next) =>
    vid = req.header('VisaId')
    (if vid? then @tycoonManager.destroyVisa(vid) else Promise.resolve(true))
      .then () ->
        req.logout()
        res.status(200).json({})
      .catch (err) ->
        console.log err
        res.status(500).json(err || {})
