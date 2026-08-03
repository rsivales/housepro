import { redirect } from "next/navigation";

// Objetivos e Prémios foram unificados numa só área.
export default function ObjetivosPage() {
  redirect("/app/premios");
}
