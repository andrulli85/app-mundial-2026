import Link from "next/link";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal/contact";

export const metadata = {
  title: "Aviso legal — Albumix",
};

export default function DisclaimerPage() {
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
        <span
          className="flex-1 text-center py-2 text-sm font-bold"
          style={{ backgroundColor: "#006847", color: "#fff" }}
          aria-current="page"
        >
          Aviso legal
        </span>
        <Link
          href="/legal/terms"
          className="flex-1 text-center py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: "#fff", color: "#555" }}
        >
          Términos
        </Link>
        <Link
          href="/legal/privacy"
          className="flex-1 text-center py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: "#fff", color: "#555" }}
        >
          Privacidad
        </Link>
      </nav>

      {/* Content */}
      <article
        className="leading-relaxed text-sm flex flex-col gap-4"
        style={{ color: "#1a1a1a" }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "#006847" }}>
          Aviso legal
        </h1>

        <p>
          Albumix es una aplicación independiente hecha por fans, para fans coleccionistas
          del álbum del Mundial. Es un proyecto personal sin fines de lucro.
        </p>

        <h2 className="text-lg font-bold mt-4">No estamos afiliados con nadie</h2>

        <p>
          Albumix <strong>no está afiliada, patrocinada, avalada ni asociada</strong> con la FIFA,
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

        <h2 className="text-lg font-bold mt-4">Marcas y derechos de autor</h2>

        <p>
          Todas las marcas, logos, nombres comerciales y cromos mencionados en
          esta aplicación son propiedad de sus respectivos titulares:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            <strong>FIFA®</strong>, <strong>FIFA World Cup™</strong>, y marcas asociadas son propiedad de
            Fédération Internationale de Football Association (FIFA).
          </li>
          <li>
            <strong>Panini®</strong> y las imágenes de cromos publicadas por Panini son
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

        <h2 className="text-lg font-bold mt-4">Contenido de usuarios</h2>

        <p>
          Las fotografías de cromos que aparecen en Albumix fueron tomadas por
          los propios usuarios de sus álbumes físicos personales (los compraron
          en kioscos, los abrieron en sus casas, los fotografiaron con su
          teléfono). Cada usuario es responsable del contenido que sube.
        </p>

        <h2 className="text-lg font-bold mt-4">Política de retirada (notice &amp; takedown)</h2>

        <p>
          Si sos titular de derechos y considerás que algún contenido en Albumix
          debe ser removido, escribinos a{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            style={{ color: "#006847", textDecoration: "underline" }}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          y lo retiraremos
          en menos de 48 horas. No hace falta proceso legal — basta tu pedido.
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
