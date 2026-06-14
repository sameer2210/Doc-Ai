window.onload = function() {
  window.ui = SwaggerUIBundle({
    url: 'swagger.json',
    dom_id: '#swagger-ui',
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    layout: 'BaseLayout',
    deepLinking: true
  });
};
