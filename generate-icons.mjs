import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const svgPath = resolve('./public/icons/logo.svg');

if (!existsSync(svgPath)) {
  console.error('❌ Arquivo não encontrado:', svgPath);
  process.exit(1);
}

const outDir = resolve('./public/icons');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

try {
  await sharp(svg).resize(512, 512).png().toFile(resolve(outDir, 'icon-512x512.png'));
  console.log('✓ icon-512x512.png gerado');

  await sharp(svg).resize(192, 192).png().toFile(resolve(outDir, 'icon-192x192.png'));
  console.log('✓ icon-192x192.png gerado');

  console.log('✓ Ícones PNG gerados com sucesso!');
} catch (err) {
  console.error('❌ Erro ao gerar ícones:', err.message);
  process.exit(1);
}