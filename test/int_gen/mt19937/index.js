const { Random } = require('@offirmo/random')

// we hard code the seed, as it doesn't matter in this
// particular example
const SEED = 1234567

function *IntegerGenerator() {
  const mt = Random.engines.mt19937()
  mt.seed(SEED)
  while (true){
    yield mt()
  }
}

module.exports = IntegerGenerator
