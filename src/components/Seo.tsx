import { Helmet } from "react-helmet-async";

const getSiteUrl = () => {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return "";
};

interface SeoProps {
  title: string;
  description: string;
  /** Route path beginning with "/". Defaults to current pathname. */
  path?: string;
}

/**
 * Per-route head tags: unique title, description, and a self-referencing
 * canonical link so search engines don't see duplicate content across routes.
 */
export function Seo({ title, description, path }: SeoProps) {
  const pathname =
    path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const url = `${getSiteUrl()}${pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}

export default Seo;
