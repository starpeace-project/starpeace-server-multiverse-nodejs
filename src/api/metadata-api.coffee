
module.exports = class MetadataApi
  constructor: (@galaxyManager) ->

  getBuildings: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    buildingMetadata = @galaxyManager.metadataBuildingForPlanet(req.params.planetId)
    return res.status(400) unless buildingMetadata?
    res.json(buildingMetadata)

  getCore: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    coreMetadata = @galaxyManager.metadataCoreForPlanet(req.params.planetId)
    return res.status(400) unless coreMetadata?
    res.json(coreMetadata.toJson())

  getInventions: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    inventionMetadata = @galaxyManager.metadataInventionForPlanet(req.params.planetId)
    return res.status(400) unless inventionMetadata?
    res.json(inventionMetadata)
