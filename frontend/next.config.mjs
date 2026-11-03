import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Face inference runs in-process: keep these as real node_modules packages
  // (native sharp binary, onnxruntime WASM loaded from disk at runtime).
  serverExternalPackages: ['onnxruntime-web', 'sharp'],
  // Ship the ONNX model weights and the WASM runtime with the server function.
  outputFileTracingIncludes: {
    '/api/compare': [
      './ai-models/**/*',
      './node_modules/onnxruntime-web/dist/ort.node.min.*',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
    ],
    '/api/admin/stats': [
      './ai-models/**/*',
      './node_modules/onnxruntime-web/dist/ort.node.min.*',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;


