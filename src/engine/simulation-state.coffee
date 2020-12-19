

module.exports = class SimulationState
  constructor: () ->
    @planetTime = null


  season: () ->
    return 'winter' if @planetTime.month == 12 || @planetTime.month == 1 || @planetTime.month == 2
    return 'spring' if @planetTime.month == 3 || @planetTime.month == 4 || @planetTime.month == 5
    return 'summer' if @planetTime.month == 6 || @planetTime.month == 7 || @planetTime.month == 8
    return 'fall' if @planetTime.month == 9 || @planetTime.month == 10 || @planetTime.month == 11
    'summer'
