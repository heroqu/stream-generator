# stream-generator

Make a readable stream out of any byte generator. An easy way to wrap a random, pseudo-random or just any number generator into a stream of bytes.

## Setup

```
npm install stream-generator
```

## Usage

### TL;DR

```javascript
const StreamGenerator = require('stream-generator')
const byteStream = StreamGenerator(someByteGenerator)
byteStream.pipe(process.stdout)
```

### Explanation and working examples

As already said *Stream-generator* can turn a byte generator into a readable stream.

But what exactly is *byte generator*?

A hard coded and simplistic byte generator can look like this:

```javascript
function *simplisticByteGenerator() {
  // spits out bytes, which correspond to ascii chars:
  // 'M','a','r','s','h','a','l'
  yield 77
  yield 97
  yield 114
  yield 115
  yield 104
  yield 97
  yield 108
}
```

It should basically yield integers in the range of 0-255, which can be considered bytes. It doesn't have to be a *generator function* in ES6 terms, it can be any function that returns an iterator on bytes. But generator functions are just a very natural fit: each call they return a brand new iterator in the same exact initial state, so they are natural *iterator factories* of sorts. We therefore can use such byte generator as constructor parameter for building a **reproducible** stream.

Let's do it:

```javascript
const StreamGenerator = require('stream-generator')
const byteStream = StreamGenerator(simplisticByteGenerator)
byteStream.pipe(process.stdout)   // output> Marshal
```

Same code as at the top of the page, but now it works, as we got a real byte generator. And because we have chosen a very particular set of bytes we see a nice output. In general that is not always the case as some byte values would be shown as garbage or not be shown at all in regular terminal window.

## Deterministic streams

The stream is deterministic (i.e. each instance produces the same exact sequence of data) if underlying byte generator is deterministic. This leads us to a vast range of pseudo-random number generators available to choose from, but not all of them are deterministic and one has to keep that in mind when selecting.

### Wrapping pseudo random number generators

OK, we have to feed stream generator with bytes. But many random and pseudo-random number modules can easily produce integers (or array of integers) but not bytes out of the box. Yes, I know, there is neither **Integer**, nor **Byte** type in javascript, we do only have **Number** type for everything. But what we are talking about here is values, not types.

Let's say we have a random number generator that produces integer values in the range of 0...(2^32-1) while we would like it to produce integer values in the range 0...255 which can be interpreted as bytes. The following simple technique can be used to achieve that:

```javascript
// first we need some module with genuine deterministic pseudo-random
// integer generator, e.g. like this one
const { Random } = require('@offirmo/random')

// we then wrap it into a form of ES6 'generator function'
function *IntegerGenerator() {
  const seed = 123 // hard coded seed for simplicity
  const mt = Random.engines.mt19937()
  mt.seed(seed)
  while (true){
    yield mt()
  }
}

// wrap it further with this helper function:
function ByteGenerator (integerGenerator) {
  return function * () {
    for (let int of integerGenerator()) {
      // Extract each of the 4 bytes of the integer
      // and yield them one after another
      yield int & 0xff
      yield (int >> 8) & 0xff
      yield (int >> 16) & 0xff
      yield (int >> 24) & 0xff
    }
  }
}

// Put it all together:
const byteGen = ByteGenerator(IntegerGenerator)
const byteStream = StreamGenerator(byteGen)
```

Please keep in mind that the stream we've just created is endless, so the following example would never stop unless is explicitly terminated:

```javascript
// don't run it as it will gradually eat all the disk space and
// you will have to terminate the process with
// `kill -9 < proc_id >` or whatever (depends on OS)
byteStream.pipe(fs.createWriteStream('./some_file.txt'))
```

## Big files generation

One interesting way of using such a deterministic stream is the ability to **reproducibly** create files of specified size and same exact content on the fly, which can be helpful when testing big files uploads etc.

Let's create one:  

```javascript
// we would need a way to cut the stream after certain
// number of bytes, e.g. with this module
const StreamLimiter = require('stream-limiter')
const limiter = StreamLimiter(10*1024*1024)
// means: cut the stream exactly after 10Mb has passed through

// prepare destination file stream
const fs = require('fs')
const path = require('path')
const filepath = path.resolve(__dirname, 'a_sample.txt')
const dest = fs.createWriteStream(filepath)

// take byteStream from previous long listing and pipe it
byteStream.pipe(limiter).pipe(dest)

dest.on('finish', function(){
  console.log(fs.statSync(filepath).size) // output> 10485760
})
```

### Fixed length streams: other way around

In the previous example we've cut the stream during piping, means afterwards. We can do it another way by cutting the sequence of bytes at the byte generation stage (i.e. before streaming) with this generator limiter function:

```javascript
function LimitedGenerator (generator, size) {
  let count = 0
  return function * () {
    for (let value of generator()) {
      if (++count > size) return
      yield value
    }
  }
}
```

And here is full listing for big file generation with this approach:

```javascript
// reproducibly create big file with
// pseudorandom bytes and specified size
const StreamGenerator = require('stream-generator')
const { Random } = require('@offirmo/random')

function IntegerGenerator (seed) {
  return function * () {
    const mt = Random.engines.mt19937()
    mt.seed(seed)
    while (true) {
      yield mt()
    }
  }
}

function ByteGenerator (integerGenerator) {
  return function * () {
    for (let int of integerGenerator()) {
      yield int & 0xff
      yield (int >> 8) & 0xff
      yield (int >> 16) & 0xff
      yield (int >> 24) & 0xff
    }
  }
}

function LimitedGenerator (generator, size) {
  let count = 0
  return function * () {
    for (let value of generator()) {
      if (++count > size) return
      yield value
    }
  }
}

const fs = require('fs')
const path = require('path')
const filepath = path.resolve(__dirname, 'a_sample.txt')
const dest = fs.createWriteStream(filepath)

const SEED = 123
const intGen = IntegerGenerator(SEED)
const byteGen = ByteGenerator(intGen)

const sizeInBytes = 10 * 1024 * 1024
const byteGenLtd = LimitedGenerator(byteGen, sizeInBytes)

const byteStreamLtd = StreamGenerator(byteGenLtd)

byteStreamLtd.pipe(dest)

dest.on('finish', function () {
  console.log(fs.statSync(filepath).size)
})
```

## Dependencies

None.
