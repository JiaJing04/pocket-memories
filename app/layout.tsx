import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Pocket Memories — Photo Booth",description:"A private browser-based photo booth for beautiful downloadable photo strips."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
