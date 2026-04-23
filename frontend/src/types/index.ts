export type ContentType = 'stat_block' | 'spell' | 'feat' | 'rules_text' | 'table' | 'flavor';

export interface Citation {
  book: string;
  page: number;
  section: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentType: ContentType;
  citations: Citation[];
  isStreaming?: boolean;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  book_name: string;
  collection: string;
  status: 'queued' | 'processing' | 'indexed' | 'error';
  chunk_count: number;
  page_count: number;
  uploaded_at: string;
  error_message?: string;
}

export interface DocumentStatus {
  document_id: string;
  status: string;
  progress: number;
  current_step: string;
  chunks_processed: number;
  total_chunks: number;
}

export interface Collection {
  name: string;
  document_count: number;
}

export interface StatBlock {
  name: string;
  size: string;
  creature_type: string;
  subtypes: string[];
  hit_dice: string;
  hit_points: number;
  initiative: string;
  speed: string;
  armor_class: number;
  ac_components: string;
  base_attack: string;
  grapple: string;
  attacks: string[];
  full_attack: string[];
  space: string;
  reach: string;
  special_attacks: string[];
  special_qualities: string[];
  saves: { fort: string; ref: string; will: string };
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  skills: Record<string, string>;
  feats: string[];
  challenge_rating: string;
  alignment: string;
  source_book?: string;
  source_page?: number;
}
