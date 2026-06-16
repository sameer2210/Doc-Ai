import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Creates a Swagger document for the NestJS application.
 * This function is used by scripts that need to export the OpenAPI spec
 * (e.g., `scripts/export-swagger.ts`).
 */
export async function createDocument(): Promise<OpenAPIObject> {
  // Create a temporary Nest application instance.
  const app = await NestFactory.create(AppModule);

  // Build the Swagger configuration. Adjust title/version as needed.
  const config = new DocumentBuilder()
    .setTitle('SpandaVidya API')
    .setDescription('Generated OpenAPI specification for SpandaVidya backend')
    .setVersion('1.0')
    .build();

  // Generate the document.
  const document = SwaggerModule.createDocument(app, config);

  // Close the Nest application to free resources.
  await app.close();

  return document;
}
