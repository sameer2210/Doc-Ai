import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'tsconfig-paths/register';
import { AppModule } from '../src/app.module';

async function generateSwaggerJson() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('spandavidya API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const docsDir = resolve(__dirname, '../docs');
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir);
  }

  const outputPath = resolve(docsDir, 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  await app.close();
}
void generateSwaggerJson();
