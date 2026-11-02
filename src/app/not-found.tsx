import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <div className="not-found"><span className="section-tag">404</span><h1>This link leads nowhere.</h1><p>Let’s get you back to the original.</p><Button asChild><Link href="/">Back to TikSave</Link></Button></div>; }
