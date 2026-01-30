export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);

    if (
      !env.ANALYTICS_SCRIPT_URL ||
      !env.ANALYTICS_SITE_ID ||
      !response.headers.get('content-type')?.includes('text/html')
    ) {
      return response;
    }

    return new HTMLRewriter()
      .on('head', {
        element(el) {
          el.append(
            `<script src="${env.ANALYTICS_SCRIPT_URL}" data-site-id="${env.ANALYTICS_SITE_ID}" defer></script>`,
            { html: true },
          );
        },
      })
      .transform(response);
  },
};
