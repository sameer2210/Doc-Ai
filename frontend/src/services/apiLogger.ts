export const logRequest = (method: string, url: string, data?: unknown) => {
  console.log('\n========== FRONTEND REQUEST ==========');

  console.log({
    method,
    url,
    body: data,
  });

  console.log('======================================\n');
};

export const logResponse = (method: string, url: string, response: unknown) => {
  console.log('\n========== FRONTEND RESPONSE ==========');

  console.log({
    method,
    url,
    response,
  });

  console.log('=======================================\n');
};

export const logError = (method: string, url: string, error: unknown) => {
  console.log('\n========== FRONTEND ERROR ==========');

  console.log({
    method,
    url,
    error,
  });

  console.log('====================================\n');
};
