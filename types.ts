
export interface EmeraldMind {
  description: string;
  capabilities: string[];
  data_types: string[];
  architecture: {
    short_term_memory: string;
    long_term_memory: string;
    versioning: string;
    indexing: string;
  };
  interfaces: {
    frontend: string[];
    backend: string[];
  };
}

export interface SAF {
  description: string;
  capabilities: string[];
  data_types: string[];
  architecture: {
    engine_core: string;
    math_engine: string;
    logic_engine: string;
    visualization: string;
    integration: string;
  };
  interfaces: {
    frontend: string[];
    backend: string[];
  };
}

export interface ZenBotCore {
  system: "ZenBot.io";
  core: {
    EmeraldMind: EmeraldMind;
    SAF: SAF;
  };
  vision: string;
}

export interface ChatMessage {
    sender: 'user' | 'bot';
    text: string;
}

export interface Canvas {
  id: string;
  created_at: string;
  name: string;
  content: string;
  output: string;
  chat_history: ChatMessage[] | null;
}