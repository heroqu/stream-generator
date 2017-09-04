'use strict'

const { Readable } = require('stream')

module.exports = StreamGenerator

function StreamGenerator (byteGenerator, opts) {
  opts = Object.assign({}, opts)

  const highWaterMark = opts.highWaterMark || 16384

  if (typeof byteGenerator !== 'function') {
    throw new TypeError('byteGenerator should be a function')
  }
  const byteIterator = byteGenerator()

  // construct the stream object
  const s = new Readable(opts)

  s._read = function (size) {
    let bufLength = Math.min((size || Infinity), highWaterMark)
    let buf

    while (true) {
      // 1. Make a buffer to store bytes before pushing to the bus
      buf = Buffer.allocUnsafe(bufLength)  // a faster way to make a buffer

      // 2. Produce
      for (let i = 0; i < bufLength; i++) {
        let { value, done } = byteIterator.next()

        if (done) {
          // the underlying bytes iterator has been extict
          // push the final chunk of bytes...
          s.push(buf.slice(0, i))
          // ...and quit
          s.push(null)
          return
        }

        buf[i] = value
      }

      // 3. Push
      //  the buffer is all full now, push it into the bus
      if (!s.push(buf)) {
        // The backpressure is detected.
        // Enough producing and pushing for now.
        return
      }
    }
  }

  return s
}
