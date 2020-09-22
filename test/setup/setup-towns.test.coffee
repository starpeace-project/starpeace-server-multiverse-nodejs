assert = require('assert')


SetupTowns = require('../../src/setup/setup-towns')

town = {
  name: "Croma"
  sealId: "MKO"
  mapX: 500
  mapY: 500
}

describe('SetupTowns', () ->
  describe('#planBuilding()', () ->
    it('should plan building layout at same position', () ->
      assert.deepEqual(new SetupTowns(0).planBuilding(0, { tileWidth: 3, tileHeight: 3 }, 0, { tileWidth: 2, tileHeight: 2 }), [0, -3])
      assert.deepEqual(new SetupTowns(1).planBuilding(0, { tileWidth: 3, tileHeight: 3 }, 0, { tileWidth: 2, tileHeight: 2 }), [-3, 0])

      assert.deepEqual(new SetupTowns(0).planBuilding(1, { tileWidth: 3, tileHeight: 3 }, 1, { tileWidth: 2, tileHeight: 2 }), [0, -3])
      assert.deepEqual(new SetupTowns(1).planBuilding(1, { tileWidth: 3, tileHeight: 3 }, 1, { tileWidth: 2, tileHeight: 2 }), [2, 0])

      assert.deepEqual(new SetupTowns(0).planBuilding(2, { tileWidth: 3, tileHeight: 3 }, 2, { tileWidth: 2, tileHeight: 2 }), [0, 2])
      assert.deepEqual(new SetupTowns(1).planBuilding(2, { tileWidth: 3, tileHeight: 3 }, 2, { tileWidth: 2, tileHeight: 2 }), [2, 0])

      assert.deepEqual(new SetupTowns(0).planBuilding(3, { tileWidth: 3, tileHeight: 3 }, 3, { tileWidth: 2, tileHeight: 2 }), [0, 2])
      assert.deepEqual(new SetupTowns(1).planBuilding(3, { tileWidth: 3, tileHeight: 3 }, 3, { tileWidth: 2, tileHeight: 2 }), [-3, 0])
    )

    it('should plan building layout at different x and same y position', () ->
      assert.deepEqual(new SetupTowns(0).planBuilding(0, { tileWidth: 3, tileHeight: 3 }, 1, { tileWidth: 2, tileHeight: 2 }), [3, 0])
      assert.deepEqual(new SetupTowns(0).planBuilding(1, { tileWidth: 3, tileHeight: 3 }, 0, { tileWidth: 2, tileHeight: 2 }), [-4, 0])

      assert.deepEqual(new SetupTowns(0).planBuilding(3, { tileWidth: 3, tileHeight: 3 }, 2, { tileWidth: 2, tileHeight: 2 }), [3, 0])
      assert.deepEqual(new SetupTowns(0).planBuilding(2, { tileWidth: 3, tileHeight: 3 }, 3, { tileWidth: 2, tileHeight: 2 }), [-4, 0])
    )

    it('should plan building layout at same x and different y position', () ->
      assert.deepEqual(new SetupTowns(0).planBuilding(0, { tileWidth: 3, tileHeight: 3 }, 3, { tileWidth: 2, tileHeight: 2 }), [0, 3])
      assert.deepEqual(new SetupTowns(0).planBuilding(3, { tileWidth: 3, tileHeight: 3 }, 0, { tileWidth: 2, tileHeight: 2 }), [0, -4])

      assert.deepEqual(new SetupTowns(0).planBuilding(1, { tileWidth: 3, tileHeight: 3 }, 2, { tileWidth: 2, tileHeight: 2 }), [0, 3])
      assert.deepEqual(new SetupTowns(0).planBuilding(2, { tileWidth: 3, tileHeight: 3 }, 1, { tileWidth: 2, tileHeight: 2 }), [0, -4])
    )

    it('should plan building layout at different x and different y position', () ->
      assert.deepEqual(new SetupTowns(0).planBuilding(0, { tileWidth: 3, tileHeight: 3 }, 2, { tileWidth: 2, tileHeight: 2 }), [3, 3])
      assert.deepEqual(new SetupTowns(0).planBuilding(2, { tileWidth: 3, tileHeight: 3 }, 0, { tileWidth: 2, tileHeight: 2 }), [-4, -4])
    )
  )
)
