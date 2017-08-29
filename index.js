'use strict'

const { Readable } = require('stream')

module.exports = StreamGenerator

function StreamGenerator (byteGenerator, opts) {
  opts = Object.assign({}, opts)

  const highWaterMark = opts.highWaterMark || 16384

  // 2. byteGenerator should be a function that returns a byte iterator
  if (typeof byteGenerator !== 'function') {
    throw new TypeError('option byteGenerator should be a function')
  }
  const byteIterator = byteGenerator()

  // construct the stream object
  const s = new Readable(opts)

  function endStream () {
    s.push(null)
  }

  let buf
  let bufLength

  s._read = function (size) {
    bufLength = Math.min((size || Infinity), highWaterMark)

    while (true) {
      // 1. Make a buffer to store bytes before pushing to the bus
      buf = Buffer.allocUnsafe(bufLength)  // a faster way to make a buffer

      // 2. produce and push
      for (let i = 0; i < bufLength; i++) {
        let { value, done } = byteIterator.next()

        if (done) {
          // the underlying bytes iterator has been extict
          // push the final chunk of bytes...
          s.push(buf.slice(0, i))
          // ...and quit
          return endStream()
        }

        buf[i] = value
      }

      // the buffer is all full now, push it into the bus
      if (!s.push(buf)) {
        // The backpressure is detected.
        // Enough producing and pushing for now.
        break
      }
    }
  }

  return s
}
