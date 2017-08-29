const xoroshirojs = require('xoroshirojs128plus')

/**
* Pseudo random (and deterministic!) integer numbers generator
* based on xoroshirojs128plus implemention
*/
function *IntegerGenerator () {
  xoroshirojs.seed(123, 4567)

  // This particular implementation generates integers by pairs,
  // returning arrays of two elements [int1, int2]. We will store
  // this as a buffer array to use first of the integers immediately
  // and the second one on the next yield.
  let buffer = []
  while (true) {
    if (buffer.length === 0) {
      // we are out of integers, let's produce another pair
      buffer = xoroshirojs.next() //
    }
    yield buffer.shift()
  }
}

module.exports = IntegerGenerator
