"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics";
export function SignatureTrack() { useEffect(()=>track("signature_view"),[]); return null; }
