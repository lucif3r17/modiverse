#!/usr/bin/env node
// remove-bg.js
// Usage: node scripts/remove-bg.js input.png output.png [fuzz]
// fuzz in percent (0-100) — how close to white a pixel must be to be removed.

const Jimp = require('jimp')
const [,, input, output, fuzzArg] = process.argv
if (!input || !output) {
  console.error('Usage: node scripts/remove-bg.js input.png output.png [fuzzPercent]')
  process.exit(2)
}
const fuzz = Math.max(0, Math.min(100, Number(fuzzArg) || 10))
const threshold = Math.round(255 * (fuzz / 100))

Jimp.read(input)
  .then(image => {
    image.rgba(true)
    const { data, width, height } = image.bitmap
    // iterate pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2
        const r = data[idx]
        const g = data[idx+1]
        const b = data[idx+2]
        // if pixel is within threshold of white (i.e. r,g,b >= 255 - threshold)
        if (r >= 255 - threshold && g >= 255 - threshold && b >= 255 - threshold) {
          // make transparent
          data[idx+3] = 0
        }
      }
    }
    return image.writeAsync(output)
  })
  .then(() => console.log('Wrote', output))
  .catch(err => {
    console.error('Error processing image:', err.message)
    process.exit(1)
  })
