import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers(){return [{source:"/recolha-mais-valias/:path*",headers:[
    {key:"Referrer-Policy",value:"no-referrer"},
    {key:"Cache-Control",value:"private, no-store"},
    {key:"X-Robots-Tag",value:"noindex, nofollow"},
  ]}];},
};

export default nextConfig;
