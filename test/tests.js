'use strict'

const { assert } = require('chai')
const fs = require('fs')
const path = require('path')

const StreamGenerator = require('../')

const IntegerGenerator = require('./int_gen')
const ByteGenerator = require('./byte-gen')

const byteGen = ByteGenerator(IntegerGenerator)

const filepath = path.resolve(__dirname, 'out.txt')

const StreamLimiter = require('stream-limiter')
const HashThrough = require('hash-through')
const crypto = require('crypto')

const DevNull = require('./devnull')
const eventPromise = require('./event-promise')

const stream = require('stream')

describe('Stream Generator', function () {
  before(function (done) {
    deleteFile(done)
  })

  afterEach(function (done) {
    deleteFile(done)
  })

  function deleteFile (done) {
    if (fs.existsSync(filepath)) {
      fs.unlink(filepath)
    }
    done()
  }

  it('should work', function (done) {
    // main stream media that produces
    // a deterministic noise in a form of bytes
    const source = StreamGenerator(byteGen)

    // limit otherwise endless bytes noise with a reasonable number
    const maxBytes = 1945
    const limiter = StreamLimiter(maxBytes)

    // will write it all here
    const output = fs.createWriteStream(filepath)

    source.pipe(limiter).pipe(output)

    output.on('finish', () => {
      fs.stat(filepath, (err, stats) => {
        assert.isNull(err, 'err on file write')
        assert.equal(stats.size, maxBytes, 'length of file is not correct')
        done()
      })
    })
  })

  it('should reproduce the same sequence each time', function () {
    async function getDigest (maxBytes) {
      const source = StreamGenerator(byteGen)
      const limiter = StreamLimiter(maxBytes)
      const createHash = () => crypto.createHash('ripemd160')
      const ht = HashThrough(createHash)
      const devnull = DevNull()

      source.pipe(limiter).pipe(ht).pipe(devnull)

      let result = await eventPromise(ht, 'finish')

      return ht.digest('hex')
    }

    const maxBytes = 100000

    // create two streams of the same length and based on
    // the same byte Generator and see if they produce the same
    // byte sequences
    return Promise.all([
      getDigest(maxBytes),
      getDigest(maxBytes)
    ])
    .then(([digest1, digest2]) => {
      assert.equal(digest1, digest2, 'bytes sequences are different')
    })
  })
})
