import { Injectable } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Counter } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly httpRequestCounter: Counter<string>;

  constructor() {
    this.registry = new Registry();

    // Register default metrics like CPU, memory
    collectDefaultMetrics({ register: this.registry });

    // Define your custom counter metric
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
  }

  increment(method: string, route: string, status: string) {
    this.httpRequestCounter.labels(method, route, status).inc();
  }

  getMetrics() {
    return this.registry.metrics();
  }

  get contentType() {
    return this.registry.contentType;
  }
}
