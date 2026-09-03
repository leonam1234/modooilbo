const ADSENSE_SCRIPT_SELECTOR =
  'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';
const CLOUDFLARE_BEACON_SELECTOR =
  'script[src="https://static.cloudflareinsights.com/beacon.min.js"]';
const GA4_BOOTSTRAP_SELECTOR = "script#ga4-consent-bootstrap";
const GA4_LOADER_SELECTOR =
  'script#ga4-loader[src^="https://www.googletagmanager.com/gtag/js?id="]';

// Next.js static export serializes head elements into inline Flight data. Removing only
// the rendered tag is insufficient because hydration recreates it. Keep each match
// bounded to one serialized script node so unrelated head elements remain untouched.
const ADSENSE_FLIGHT_SCRIPT_PATTERN =
  /\[\\"\$\\",\\"script\\",null,\{(?:(?!\}\])[\s\S])*?\\"src\\":\\"https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js(?:\?[^\\"]*)?\\"(?:(?!\}\])[\s\S])*?\}\]/g;
const CLOUDFLARE_BEACON_FLIGHT_SCRIPT_PATTERN =
  /\[\\"\$\\",\\"script\\",null,\{(?:(?!\}\])[\s\S])*?\\"src\\":\\"https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js\\"(?:(?!\}\])[\s\S])*?\}\]/g;
const GA4_BOOTSTRAP_FLIGHT_SCRIPT_PATTERN =
  /\[\\"\$\\",\\"script\\",null,\{(?:(?!\}\])[\s\S])*?\\"id\\":\\"ga4-consent-bootstrap\\"(?:(?!\}\])[\s\S])*?\}\]/g;
const GA4_LOADER_FLIGHT_SCRIPT_PATTERN =
  /\[\\"\$\\",\\"script\\",null,\{(?:(?!\}\])[\s\S])*?\\"id\\":\\"ga4-loader\\"(?:(?!\}\])[\s\S])*?\}\]/g;
const ADSENSE_FLIGHT_TEXT_SCRIPT_PATTERN =
  /\["\$","script",null,\{(?:(?!\}\])[\s\S])*?"src":"https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js(?:\?[^\"]*)?"(?:(?!\}\])[\s\S])*?\}\]/g;
const CLOUDFLARE_BEACON_FLIGHT_TEXT_SCRIPT_PATTERN =
  /\["\$","script",null,\{(?:(?!\}\])[\s\S])*?"src":"https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"(?:(?!\}\])[\s\S])*?\}\]/g;
const GA4_BOOTSTRAP_FLIGHT_TEXT_SCRIPT_PATTERN =
  /\["\$","script",null,\{(?:(?!\}\])[\s\S])*?"id":"ga4-consent-bootstrap"(?:(?!\}\])[\s\S])*?\}\]/g;
const GA4_LOADER_FLIGHT_TEXT_SCRIPT_PATTERN =
  /\["\$","script",null,\{(?:(?!\}\])[\s\S])*?"id":"ga4-loader"(?:(?!\}\])[\s\S])*?\}\]/g;

function sanitizeFlightData(source: string): string {
  return source
    .replace(ADSENSE_FLIGHT_SCRIPT_PATTERN, "null")
    .replace(CLOUDFLARE_BEACON_FLIGHT_SCRIPT_PATTERN, "null")
    .replace(GA4_BOOTSTRAP_FLIGHT_SCRIPT_PATTERN, "null")
    .replace(GA4_LOADER_FLIGHT_SCRIPT_PATTERN, "null")
    .replace(ADSENSE_FLIGHT_TEXT_SCRIPT_PATTERN, "null")
    .replace(CLOUDFLARE_BEACON_FLIGHT_TEXT_SCRIPT_PATTERN, "null")
    .replace(GA4_BOOTSTRAP_FLIGHT_TEXT_SCRIPT_PATTERN, "null")
    .replace(GA4_LOADER_FLIGHT_TEXT_SCRIPT_PATTERN, "null");
}

const removeScript: HTMLRewriterElementContentHandlers = {
  element(element) {
    element.remove();
  },
};

function createFlightDataHandler(): HTMLRewriterElementContentHandlers {
  let bufferedText = "";

  return {
    text(chunk) {
      bufferedText += chunk.text;
      chunk.remove();

      if (chunk.lastInTextNode) {
        const sanitized = sanitizeFlightData(bufferedText);
        chunk.after(sanitized, { html: true });
        bufferedText = "";
      }
    },
  };
}

export const stripTokenPageThirdPartyScripts: PagesFunction = async (context) => {
  // Never let a browser reuse a pre-fix cached token document through 304 revalidation.
  // A reused document could restore both the old referrer policy and removed third-party tags.
  const upstreamHeaders = new Headers(context.request.headers);
  for (const name of [
    "If-Match",
    "If-None-Match",
    "If-Modified-Since",
    "If-Unmodified-Since",
    "If-Range",
    "Range",
  ]) {
    upstreamHeaders.delete(name);
  }
  upstreamHeaders.set("Cache-Control", "no-cache");
  const freshRequest = new Request(context.request, { headers: upstreamHeaders });
  const response = await context.next(freshRequest);
  const contentType = response.headers.get("content-type") ?? "";

  // A same-origin navigation would otherwise send the full token URL as document.referrer.
  // Apply this before the content-type branch so redirects and unexpected 304s stay protected.
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "no-referrer");
  // `no-transform` also prevents Cloudflare's zone-level Web Analytics and
  // JavaScript Detection features from injecting scripts after this Function sanitizes HTML.
  headers.set("Cache-Control", "no-store, no-transform, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.delete("ETag");
  headers.delete("Last-Modified");
  headers.delete("Content-Length");
  const protectedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  const normalizedContentType = contentType.toLowerCase();
  if (
    normalizedContentType.startsWith("text/plain") ||
    normalizedContentType.includes("text/x-component")
  ) {
    const sanitizedBody = sanitizeFlightData(await protectedResponse.text());
    return new Response(sanitizedBody, {
      status: protectedResponse.status,
      statusText: protectedResponse.statusText,
      headers,
    });
  }

  if (!normalizedContentType.startsWith("text/html")) {
    return protectedResponse;
  }

  return new HTMLRewriter()
    .on(ADSENSE_SCRIPT_SELECTOR, removeScript)
    .on(CLOUDFLARE_BEACON_SELECTOR, removeScript)
    .on(GA4_BOOTSTRAP_SELECTOR, removeScript)
    .on(GA4_LOADER_SELECTOR, removeScript)
    .on("script:not([src])", createFlightDataHandler())
    .transform(protectedResponse);
};
