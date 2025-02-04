import { EventEmitter } from 'events';

export interface AgentConfig {
  id: string;
  name: string;
  capabilities: string[];
}

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected state: Record<string, any> = {};

  constructor(config: AgentConfig) {
    super();
    this.config = config;
  }

  // Core agent methods
  abstract initialize(): Promise<void>;
  abstract process(input: any): Promise<any>;
  abstract handleEvent(eventType: string, payload: any): void;

  // Utility methods
  getCapabilities(): string[] {
    return this.config.capabilities;
  }

  hasCapability(capability: string): boolean {
    return this.config.capabilities.includes(capability);
  }

  setState(key: string, value: any) {
    this.state[key] = value;
    this.emit('stateChanged', { key, value });
  }

  getState(key: string): any {
    return this.state[key];
  }

  // Communication between agents
  async communicate(targetAgent: BaseAgent, message: any): Promise<any> {
    // Basic inter-agent communication
    return targetAgent.receive(this, message);
  }

  async receive(sender: BaseAgent, message: any): Promise<any> {
    // Default receive method, can be overridden
    this.emit('messageReceived', { sender: sender.config.id, message });
    return { status: 'received', sender: sender.config.id };
  }
}
