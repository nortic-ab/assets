import path from 'path';
import sharp, { FormatEnum, ResizeOptions }  from 'sharp';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assets = path.resolve(__dirname, 'assets');
const generated = path.resolve(__dirname, 'generated');

const assetsMap: Record<string, Array<{src: string, outputFormat: keyof FormatEnum, sizes: ResizeOptions[] }>> = {
    logotypes: [
        { src: path.join(assets, 'logotypes/logo-slogan-large-blue.svg' ), outputFormat: 'png', sizes: [{width: 300}] }
    ]
}

Object.entries(assetsMap).forEach(([assetName, assetData]) => {
    assetData.forEach(async ({ src, outputFormat, sizes }) => {
        sizes.forEach(async (size) => {
            const outputPath = path.join(generated, assetName, `${path.basename(src)}_${[size.width, size.height].join('-').replace(/-$/, '')}.${outputFormat}`);
            await sharp(src).resize(size)
                .toFormat(outputFormat)
                .toFile(outputPath);
            });
    });
});
