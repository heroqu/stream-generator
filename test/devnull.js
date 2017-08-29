'use strict'

const { Writable } = require('stream')
const setImmediate = (1, eval)('this').setImmediate
  || function (fn) { setTimeout(fn, 0) }

module.exports = DevNull

/**
* Writable stream a-la /dev/null
*/
function DevNull () {
  const devnull = new Writable()

  devnull._write = function (chunk, encoding, cb) {
    setImmediate(cb)
  }

  return devnull
}
