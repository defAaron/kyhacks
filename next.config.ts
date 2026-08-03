import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local Food-101 vision (transformers.js + onnxruntime) must stay external.
  serverExternalPackages: ["@huggingface/transformers", "sharp", "onnxruntime-node"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.higgsfield.ai",
      },
      {
        protocol: "https",
        hostname: "**.hf.space",
      },
    ],
  },
};

export default nextConfig;
