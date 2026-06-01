import Link from "next/link";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal/contact";

export const metadata = {
  title: "Privacidad — Albumix",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm mb-6"
        style={{ color: "#006847" }}
      >
        <span aria-hidden="true">‹</span> Volver al perfil
      </Link>

      {/* 3-tab legal nav */}
      <nav
        className="flex rounded-xl overflow-hidden mb-8 border"
        style={{ borderColor: "#d1c9b8" }}
        aria-label="Secciones legales"
      >
        <Link
          href="/legal/disclaimer"
          className="flex-1 text-center py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: "#fff", color: "#555" }}
        >
          Aviso legal
        </Link>
        <Link
          href="/legal/terms"
          className="flex-1 text-center py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: "#fff", color: "#555" }}
        >
          Términos
        </Link>
        <span
          className="flex-1 text-center py-2 text-sm font-bold"
          style={{ backgroundColor: "#006847", color: "#fff" }}
          aria-current="page"
        >
          Privacidad
        </span>
      </nav>

      {/* Content */}
      <article
        className="leading-relaxed text-sm flex flex-col gap-4"
        style={{ color: "#1a1a1a" }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "#006847" }}>
          Política de privacidad
        </h1>

        <p>
          La política de privacidad de Albumix se puede resumir en una frase:
          <strong> no recopilamos nada sobre vos.</strong> Pero vale la pena explicar el detalle.
        </p>

        <h2 className="text-lg font-bold mt-4">Qué información NO pedimos</h2>

        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>No pedimos email, teléfono, dirección, ni nombre real.</li>
          <li>No pedimos fecha de nacimiento, foto de perfil, ni documento.</li>
          <li>No tenemos cuenta de usuario. No tenemos contraseña que recordar.</li>
          <li>
            Lo único que te pedimos al empezar es <strong>un apodo</strong> (puede ser
            cualquier cosa: &quot;Domi&quot;, &quot;El Capi&quot;, &quot;ARG10&quot;). Ese apodo vive en{" "}
            <strong>tu teléfono</strong>, no en un servidor nuestro.
          </li>
        </ul>

        <h2 className="text-lg font-bold mt-4">Dónde viven tus datos</h2>

        <p>
          Toda la información que la app maneja — tu álbum, tus cromos
          repetidos, los intercambios que hiciste, tus configuraciones —
          se guarda en el <strong>almacenamiento local de tu navegador</strong>{" "}
          (tecnología IndexedDB). Eso significa:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>Tus datos viven en <strong>tu propio teléfono</strong>.</li>
          <li>Si cerrás la app, los datos quedan en tu teléfono.</li>
          <li>
            Si borrás el historial / la caché del navegador, <strong>se borran</strong>{" "}
            los datos de Albumix también.
          </li>
          <li>
            Si cambiás de teléfono, <strong>no se transfieren automáticamente</strong>{" "}
            (en una versión futura podría haber sincronización opcional;
            hoy no la hay).
          </li>
        </ul>

        <h2 className="text-lg font-bold mt-4">Cuándo Albumix usa la red</h2>

        <p>
          Albumix funciona casi completamente sin internet. Las únicas veces
          que la app se conecta a la red son:
        </p>
        <ol className="list-decimal pl-5 flex flex-col gap-2">
          <li>
            <strong>La primera vez que la abrís</strong> (o cuando hay una actualización):
            se descarga el código de la app y los cromos semilla.
          </li>
          <li>
            <strong>Cuando intercambiás cromos</strong>: si elegís el modo WhatsApp para
            pasarle el código a otra persona, esa parte usa WhatsApp (no
            nosotros). El intercambio en sí se hace cara a cara con QR.
          </li>
        </ol>
        <p>
          No enviamos analíticas a nadie. No usamos Google Analytics, ni Meta
          Pixel, ni Mixpanel, ni similares.
        </p>

        <h2 className="text-lg font-bold mt-4">Cookies</h2>

        <p>Albumix no usa cookies de seguimiento.</p>

        <h2 className="text-lg font-bold mt-4">Menores de edad</h2>

        <p>
          Albumix está diseñada de modo que <strong>no recopila ningún dato personal
          identificable</strong> — ni de adultos ni de menores. El apodo es opcional,
          no se valida, y se guarda solamente en el teléfono del usuario.
        </p>
        <p>
          Aun así, si sos menor de 13 años (en general) o de 14 años (en
          Argentina, según la Ley 25.326 y normas posteriores): pedile a tus
          padres que vean la app primero y te den el OK para usarla.
        </p>

        <h2 className="text-lg font-bold mt-4">Cambios a esta política</h2>

        <p>
          Si cambiamos algo importante de cómo manejamos tus datos, lo vamos
          a explicar acá. Esta página tiene la fecha de última actualización
          abajo.
        </p>

        <h2 className="text-lg font-bold mt-4">Contacto</h2>

        <p>
          Para cualquier consulta de privacidad:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            style={{ color: "#006847", textDecoration: "underline" }}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>

        <hr style={{ borderColor: "#d1c9b8", marginTop: "1rem" }} />

        <p className="text-xs" style={{ color: "#888" }}>
          Última actualización: 1 de junio de 2026.
        </p>
      </article>

      {/* Global footer */}
      <footer className="mt-10 text-xs text-center pb-6" style={{ color: "#aaa" }}>
        Albumix · App independiente · No afiliada con FIFA, Panini o Coca-Cola ·{" "}
        <Link href="/legal/disclaimer" style={{ color: "#888", textDecoration: "underline" }}>
          Legal
        </Link>
      </footer>
    </div>
  );
}
