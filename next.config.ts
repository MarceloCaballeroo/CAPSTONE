import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Una imagen de hasta 2 MB por envío, con espacio para los campos multipart.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
