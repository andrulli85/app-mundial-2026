/**
 * /mercado — Phase A: redirect to existing /trade engine.
 * Phase C will replace this redirect with the full 3-tab UI.
 */
import { redirect } from "next/navigation";

export default function MercadoPage() {
  redirect("/trade");
}
