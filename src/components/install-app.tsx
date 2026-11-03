"use client";
import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
interface InstallPrompt extends Event { prompt:()=>Promise<void>; userChoice:Promise<{outcome:"accepted"|"dismissed"}> }
export function InstallApp() {
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[message,setMessage]=useState("");
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).catch(()=>{});
    const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);};
    const installed=()=>{setPrompt(null);setMessage("TikSave is installed. Open it from your home screen or app launcher.");};
    window.addEventListener("beforeinstallprompt",offer);window.addEventListener("appinstalled",installed);
    return()=>{window.removeEventListener("beforeinstallprompt",offer);window.removeEventListener("appinstalled",installed);};
  },[]);
  async function install(){
    if(!prompt){dialog.current?.showModal();return;}
    try {await prompt.prompt();const choice=await prompt.userChoice;setMessage(choice.outcome==="accepted"?"Installation accepted. Follow your browser's instructions.":"You can install TikSave later from your browser menu.");setPrompt(null);dialog.current?.showModal();}catch{dialog.current?.showModal();setPrompt(null);}
  }
  return <><Button size="sm" variant="secondary" onClick={()=>void install()} className="install-app-button"><Download size={15} aria-hidden="true"/><span>Install app</span></Button>
    <dialog ref={dialog} aria-labelledby="install-title" className="install-dialog" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><Button size="icon" variant="ghost" aria-label="Close installation instructions" autoFocus onClick={()=>dialog.current?.close()}><X size={18}/></Button><h2 id="install-title">Take TikSave with you.</h2>{message&&<p role="status">{message}</p>}<p>Install the same downloader and tools as an app—no app-store account needed.</p><ol><li><strong>iPhone / iPad:</strong> open this site in Safari, tap Share, then Add to Home Screen.</li><li><strong>Android:</strong> open your browser menu and choose Install app or Add to Home screen.</li><li><strong>Desktop:</strong> use the install icon in the address bar, or your browser’s app-install menu.</li></ol><p className="tool-footnote">Availability depends on your browser. Downloads need internet. The offline screen does not store your documents or download history.</p></dialog>
  </>;
}
