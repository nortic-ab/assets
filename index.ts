import type { FormatEnum, ResizeOptions } from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const assets = path.resolve(__dirname, 'assets')
const generated = path.resolve(__dirname, 'generated')

const assetsMap: Record<string, Array<{ src: string, outputFormat: keyof FormatEnum, sizes: ResizeOptions[] }>> = {
  logotypes: [
    { src: path.join(assets, 'logotypes/logo-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-circle-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-circle-black-inverted.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-circle-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-circle-blue-inverted.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-express-hor-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-express-hor-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-express-hor-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-express-ver-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-express-ver-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-express-ver-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-n-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-n-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-n-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-hor-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-hor-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-hor-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-large-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-large-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-large-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-ver-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-ver-blue.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-slogan-ver-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/logo-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/facebook-logo.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/instagram-logo-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/instagram-logo-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/linkedin-logo.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/linkedin-logo-black.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
    { src: path.join(assets, 'logotypes/linkedin-logo-white.svg'), outputFormat: 'png', sizes: [{ width: 300 }, { width: 600 }] },
  ],
}

Object.entries(assetsMap).forEach(([assetName, assetData]) => {
  assetData.forEach(async ({ src, outputFormat, sizes }) => {
    sizes.forEach(async (size) => {
      const outputPath = path.join(generated, assetName, `${path.basename(src)}_${[size.width, size.height].join('-').replace(/-$/, '')}.${outputFormat}`)
      await sharp(src).resize(size).toFormat(outputFormat).toFile(outputPath)
    })
  })
})
