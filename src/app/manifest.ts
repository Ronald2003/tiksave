import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest {
  return {id:"/",name:"TikSave — Downloader & Tools",short_name:"TikSave",description:"Save available videos and photos. Convert and edit documents on your device.",start_url:"/",scope:"/",display:"standalone",background_color:"#eee9ff",theme_color:"#eee9ff",icons:[{src:"/icons/icon-192.png",sizes:"192x192",type:"image/png"},{src:"/icons/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},{src:"/icons/maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}],shortcuts:[{name:"Downloader",url:"/"},{name:"Document tools",url:"/tools"}]};
}
