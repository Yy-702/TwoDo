import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TwoDo",
    short_name: "TwoDo",
    description: "双人协作待办应用",
    start_url: "/app",
    display: "standalone",
    background_color: "#fcfcfc",
    theme_color: "#f06e42",
    lang: "zh-CN",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64",
        type: "image/x-icon",
      },
    ],
  };
}
