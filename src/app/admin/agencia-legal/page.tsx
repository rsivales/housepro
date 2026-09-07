import { redirect } from "next/navigation";

/**
 * Os dados legais passaram a fazer parte da ficha completa da agência, em
 * /admin/agencias (um só sítio). Esta rota antiga reencaminha para lá.
 */
export default function AgenciaLegalRedirect() {
  redirect("/admin/agencias");
}
