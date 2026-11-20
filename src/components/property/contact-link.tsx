"use client";
import type { ReactNode } from "react";
import { CallCaptureButton } from "./call-capture-button";
/** Contact actions require identification; opening the form records only a click KPI. */
export function ContactLink({href,channel,propertyId,refId,className,children}: {href:string;channel:string;propertyId:string;refId?:string;external?:boolean;className?:string;children:ReactNode}) {
 return <CallCaptureButton telHref={href} channel={channel === "WhatsApp" ? "WhatsApp" : channel === "SMS" ? "SMS" : "Chamada"} agentName="o consultor responsável" propertyId={propertyId} refId={refId} className={className}>{children}</CallCaptureButton>;
}
