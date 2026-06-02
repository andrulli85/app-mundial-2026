import Link from "next/link";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal/contact";

export const metadata = {
  title: "Aviso legal — Albumix",
};

export default function DisclaimerPage() {
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
        <span
          className="flex-1 text-center py-2 text-sm font-bold"
          style={{
            background: "var(--foil-gold-soft)",
            color: "var(--fg-onlight)",
          }}
          aria-current="page"
        >
          Aviso legal
        </span>
        <Link
          href="/legal/terms"
          className="flex-1 text-center py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-2)",
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          Términos
        </Link>
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
          Aviso legal
        </h1>

        <p>
          Albumix es una aplicación independiente hecha por fans, para fans coleccionistas
          del álbum del Mundial. Es un proyecto personal sin fines de lucro.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>No estamos afiliados con nadie</h2>

        <p>
          Albumix <strong style={{ color: "var(--fg-1)" }}>no está afiliada, patrocinada, avalada ni asociada</strong> con la FIFA,
          Panini S.p.A., Coca-Cola, ni con ninguna federación de fútbol nacional
          (AFA, CBF, RFEF, USSF, FMF, ni cualquier otra).
        </p>
        <p>
          Los nombres de jugadores, escudos de selecciones, y las referencias al
          &quot;Mundial 2026&quot; o al &quot;FIFA World Cup 2026™&quot; se usan únicamente con fines
          informativos y de identificación nominativa de los cromos físicos que
          cada usuario posee en su álbum. No hay intención de sugerir endoso ni
          asociación con ningún titular de marca.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Marcas y derechos de autor</h2>

        <p>
          Todas las marcas, logos, nombres comerciales y cromos mencionados en
          esta aplicación son propiedad de sus respectivos titulares:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            <strong style={{ color: "var(--fg-1)" }}>FIFA®</strong>, <strong style={{ color: "var(--fg-1)" }}>FIFA World Cup™</strong>, y marcas asociadas son propiedad de
            Fédération Internationale de Football Association (FIFA).
          </li>
          <li>
            <strong style={{ color: "var(--fg-1)" }}>Panini®</strong> y las imágenes de cromos publicadas por Panini son
            propiedad de Panini S.p.A.
          </li>
          <li>
            Los escudos de las selecciones nacionales son propiedad de cada
            federación de fútbol respectiva.
          </li>
          <li>
            Los nombres y la imagen de los jugadores son derechos personalísimos
            de cada deportista, gestionados por sus representantes o por FIFPro.
          </li>
        </ul>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Contenido de usuarios</h2>

        <p>
          Las fotografías de cromos que aparecen en Albumix fueron tomadas por
          los propios usuarios de sus álbumes físicos personales (los compraron
          en kioscos, los abrieron en sus casas, los fotografiaron con su
          teléfono). Cada usuario es responsable del contenido que sube.
        </p>

        <h2 className="t-h3" style={{ marginTop: "var(--s-4)" }}>Política de retirada (notice &amp; takedown)</h2>

        <p>
          Si sos titular de derechos y considerás que algún contenido en Albumix
          debe ser removido, escribinos a{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            style={{ color: "var(--gold)", textDecoration: "underline" }}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          y lo retiraremos
          en menos de 48 horas. No hace falta proceso legal — basta tu pedido.
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
