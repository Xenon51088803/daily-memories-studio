import mdx from "@next/mdx";
import { fileURLToPath } from "node:url";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  ...(process.env.STATIC_EXPORT === "1"
    ? { output: "export", basePath: process.env.NEXT_PUBLIC_BASE_PATH || "", trailingSlash: true }
    : {}),
  devIndicators: false,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["next-mdx-remote"],
  images: {
    unoptimized: process.env.STATIC_EXPORT === "1",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "**",
      },
    ],
  },
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default withMDX(nextConfig);
