/**
* function that returns a Bytes generator
* based on any intergers generator supplied
*/
function ByteGenerator (integerGenerator) {
  return function * () {
    for (let int of integerGenerator()) {
      // yield 4 bytes for each of the integers
      yield int & 0xff
      yield (int >> 8) & 0xff
      yield (int >> 16) & 0xff
      yield (int >> 24) & 0xff
    }
  }
}

module.exports = ByteGenerator
