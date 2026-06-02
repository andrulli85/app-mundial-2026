import Link from "next/link";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal/contact";

export const metadata = {
  title: "Términos de uso — Albumix",
};

export default function TermsPage() {
  return (
    <div
      className="flex flex-col flex-1 w-full mx-auto px-4 py-6"
      style={{ maxWidth: 640, background: "var(--bg-1)", color: "var(--fg-2)" }}
    >
      {/* Back link */}
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-opacity active:opacity-70"
        style={{ color: "var(--gold)", textDecoration: "none" }}
      >
        <span aria-hidden="true">‹</span> Volver al perfil
      </Link>

      {/* 3-tab legal nav */}
      <nav
        className="flex rounded-xl overflow-hidden mb-8"
        style={{ border: "1px solid var(--line-strong)" }}
        aria-label="Secciones legales"
      >
        <Link
          href="/legal/disclaimer"
          className="flex-1 text-center py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-2)",
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          Aviso legal
        </Link>
        <span
          className="flex-1 text-center py-2 text-sm font-bold"
          style={{
            background: "var(--foil-gold-soft)",
            color: "var(--fg-onlight)",
          }}
          aria-current="page"
        >
          Términos
        </span>
        <Link
          href="/legal/privacy"
          className="flex-1 text-center py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-2)",
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          Privacidad
        </Link>
      </nav>

      {/* Content */}
      <article className="leading-relaxed text-sm flex flex-col gap-4">
        <h1 className="t-h1" style={{ color: "var(--fg-1)" }}>
          Términos de uso
        </h1>

        <p>
          Bienvenido a Albumix. Estos términos describen las reglas del juego para
          usar la app. Son cortos a propósito.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Qué es Albumix</h2>

        <p>
          Albumix es una aplicación web (PWA) gratuita para llevar el control de
          tu álbum del Mundial 2026 y proponer intercambios de cromos en persona
          con amigos. No necesita cuenta ni registro — solo un apodo.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Quiénes pueden usarla</h2>

        <p>
          Albumix está pensada para uso personal entre familiares y amigos
          cercanos. Si sos menor de edad, pedile permiso a tus padres antes
          de usar la app, sobre todo cuando intercambies cromos con personas
          que no conocés de tu colegio o familia.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Cómo funciona</h2>

        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            Todo lo que la app guarda (tu álbum, tus repetidas, tus intercambios)
            vive en <strong style={{ color: "var(--fg-1)" }}>tu propio teléfono</strong>, dentro del navegador. No hay
            servidor central que almacene tus datos.
          </li>
          <li>
            Los intercambios se hacen <strong style={{ color: "var(--fg-1)" }}>en persona</strong> mediante códigos QR. Dos
            teléfonos se juntan físicamente, escanean el QR del otro, y la app
            calcula qué cromos puede ofrecer cada uno.
          </li>
          <li>
            No hay chat, no hay mensajería con extraños, no hay marketplace.
            Es un álbum digital, no una red social.
          </li>
        </ul>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Lo que no podés hacer</h2>

        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>Usar Albumix para vender cromos o cobrar por intercambios.</li>
          <li>Subir fotos que no sean tuyas (de tus propios cromos físicos).</li>
          <li>Hacerte pasar por otra persona con un apodo engañoso.</li>
          <li>Intentar romper la app o sus protecciones.</li>
        </ul>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Sin garantías</h2>

        <p>
          Albumix se ofrece <strong style={{ color: "var(--fg-1)" }}>&quot;tal cual&quot;</strong>, sin garantías. Es un proyecto personal
          hecho por fans. Si la app deja de funcionar, si perdés tu álbum por
          borrar el navegador, si un intercambio sale mal, <strong style={{ color: "var(--fg-1)" }}>no nos hacemos
          responsables</strong>. Cuidá tu álbum como cuidás el físico.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Marcas y derechos</h2>

        <p>
          Albumix respeta los derechos de FIFA, Panini, las federaciones y los
          jugadores. Para detalles, leé el{" "}
          <Link
            href="/legal/disclaimer"
            style={{ color: "var(--gold)", textDecoration: "underline" }}
          >
            Aviso legal
          </Link>
          .
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Política de retirada</h2>

        <p>
          Si sos titular de derechos: escribinos a{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            style={{ color: "var(--gold)", textDecoration: "underline" }}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          y retiraremos el contenido en menos de 48 horas.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Contacto</h2>

        <p>
          Para cualquier consulta:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            style={{ color: "var(--gold)", textDecoration: "underline" }}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>

        <hr style={{ borderColor: "var(--line-strong)", marginTop: "var(--s-4)" }} />

        <p className="t-small" style={{ color: "var(--fg-3)" }}>
          Última actualización: 1 de junio de 2026.
        </p>
      </article>

      {/* Global footer */}
      <footer
        className="mt-10 text-xs text-center pb-6"
        style={{ color: "var(--fg-3)" }}
      >
        Albumix · App independiente · No afiliada con FIFA, Panini o Coca-Cola ·{" "}
        <Link
          href="/legal/disclaimer"
          style={{ color: "var(--fg-3)", textDecoration: "underline" }}
        >
          Legal
        </Link>
      </footer>
    </div>
  );
}
