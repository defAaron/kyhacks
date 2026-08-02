import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local Food-101 vision (transformers.js + onnxruntime) must stay external.
  serverExternalPackages: ["@huggingface/transformers", "sharp", "onnxruntime-node"],
};

export default nextConfig;
