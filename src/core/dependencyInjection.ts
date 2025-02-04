import { z } from 'zod';

// Service Registration Schema
const ServiceRegistrationSchema = z.object({
  name: z.string(),
  service: z.any(),
  dependencies: z.array(z.string()).optional(),
  lifecycle: z.enum(['singleton', 'transient']).default('singleton')
});

class DependencyInjectionContainer {
  private services: Map<string, z.infer<typeof ServiceRegistrationSchema>> = new Map();
  private instances: Map<string, any> = new Map();

  // Register a service
  register(
    serviceName: string, 
    service: any, 
    options: {
      dependencies?: string[];
      lifecycle?: 'singleton' | 'transient';
    } = {}
  ): void {
    const registration = ServiceRegistrationSchema.parse({
      name: serviceName,
      service,
      dependencies: options.dependencies || [],
      lifecycle: options.lifecycle || 'singleton'
    });

    this.services.set(serviceName, registration);
  }

  // Resolve a service
  resolve<T>(serviceName: string): T {
    const registration = this.services.get(serviceName);
    
    if (!registration) {
      throw new Error(`Service ${serviceName} not found`);
    }

    // Check if singleton instance already exists
    if (
      registration.lifecycle === 'singleton' && 
      this.instances.has(serviceName)
    ) {
      return this.instances.get(serviceName);
    }

    // Resolve dependencies
    const dependencies = (registration.dependencies || []).map(
      depName => this.resolve(depName)
    );

    // Create service instance
    const serviceInstance = typeof registration.service === 'function'
      ? new registration.service(...dependencies)
      : registration.service;

    // Cache singleton instances
    if (registration.lifecycle === 'singleton') {
      this.instances.set(serviceName, serviceInstance);
    }

    return serviceInstance;
  }

  // Unregister a service
  unregister(serviceName: string): void {
    this.services.delete(serviceName);
    this.instances.delete(serviceName);
  }

  // List all registered services
  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  // Clear all services
  clear(): void {
    this.services.clear();
    this.instances.clear();
  }

  // Create a child container with inherited services
  createChildContainer(): DependencyInjectionContainer {
    const childContainer = new DependencyInjectionContainer();
    
    // Copy all service registrations
    for (const [name, registration] of this.services) {
      childContainer.register(name, registration.service, {
        dependencies: registration.dependencies,
        lifecycle: registration.lifecycle
      });
    }

    return childContainer;
  }
}

// Global container instance
export const container = new DependencyInjectionContainer();

// Decorator for easy service registration
export function Injectable(
  options: {
    name?: string;
    dependencies?: string[];
    lifecycle?: 'singleton' | 'transient';
  } = {}
) {
  return function(target: any) {
    container.register(
      options.name || target.name, 
      target, 
      {
        dependencies: options.dependencies,
        lifecycle: options.lifecycle
      }
    );
  };
}
