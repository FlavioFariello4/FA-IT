import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

const pages = [
  "",
  "/servizi",
  "/portfolio",
  "/studio",
  "/contatti",
  "/lavora-con-noi",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((page) => ({
    url: new URL(page, siteConfig.url).toString(),
    changeFrequency: page === "" ? "weekly" : "monthly",
    priority: page === "" ? 1 : 0.7,
  }));
}
