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

export interface EldoriaCore {
  system: "Eldoria.io";
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

export interface Source {
  title: string;
  uri: string;
}

export interface TextPart {
  type: 'text';
  content: string;
}

export interface ImagePart {
  type: 'image';
  content: string; // base64 data URI
  mimeType: string;
}

export type CanvasPart = TextPart | ImagePart;

export type TaskLogEntryType = 'plan' | 'thought' | 'tool_code' | 'tool_result' | 'error';

export interface TaskLogEntry {
  type: TaskLogEntryType;
  content: string;
  toolName?: string;
}


export interface Canvas {
  id: string;
  created_at: string;
  name: string;
  content: CanvasPart[];
  output: string;
  chat_history: ChatMessage[] | null;
  task_log: TaskLogEntry[] | null;
  output_sources: Source[] | null;
}

export interface Memory {
  id: string;
  content: string;
}

export type SAFStatus = 'idle' | 'planning' | 'thinking' | 'executing_tool' | 'responding';