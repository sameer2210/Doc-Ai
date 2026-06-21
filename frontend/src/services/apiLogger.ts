export const logRequest = (method: string, url: string, data?: unknown) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('\n========== FRONTEND REQUEST ==========');
  console.log({
    method,
    url,
    body: data,
  });
};

export const logResponse = (method: string, url: string, response: unknown) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('\n========== FRONTEND RESPONSE ==========');
  console.log({
    method,
    url,
    response,
  });
};

export const logError = (method: string, url: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('\n========== FRONTEND ERROR ==========');
  console.log({
    method,
    url,
    error,
  });
};