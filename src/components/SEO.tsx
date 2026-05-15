import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://spark-of-wonder-24.lovable.app";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string; // absolute URL or path relative to site root (e.g. "/og-home.jpg")
  type?: "website" | "article";
}

export const SEO: React.FC<SEOProps> = ({ title, description, path, image, type = "website" }) => {
  const url = `${SITE_URL}${path}`;
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${SITE_URL}${image}`
    : undefined;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      {imageUrl && <meta property="og:image:width" content="1200" />}
      {imageUrl && <meta property="og:image:height" content="640" />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </Helmet>
  );
};
