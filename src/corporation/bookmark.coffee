
module.exports = class Bookmark
  constructor: () ->

  toJson: () ->
    {
      id: @id
      corporationId: @corporationId
      type: @type
      parentId: @parentId
      order: @order
      name: @name
      mapX: @mapX
      mapY: @mapY
      buildingId: @buildingId
    }

  @fromJson: (json) ->
    bookmark = new Bookmark()
    bookmark.id = json.id
    bookmark.corporationId = json.corporationId
    bookmark.type = json.type
    bookmark.parentId = json.parentId
    bookmark.order = json.order
    bookmark.name = json.name
    bookmark.mapX = json.mapX
    bookmark.mapY = json.mapY
    bookmark.buildingId = json.buildingId
    bookmark
