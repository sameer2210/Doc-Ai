import { writeFileSync } from 'fs';
import { createDocument } from '../src/swagger'; // your Swagger module

async function main() {
  const doc = await createDocument();
  writeFileSync('swagger.json', JSON.stringify(doc, null, 2));
}

main();
