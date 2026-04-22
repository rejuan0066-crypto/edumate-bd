export type DesignTool =
  | 'select'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'text'
  | 'image';

export interface DesignProject {
  id: string;
  user_id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  canvas_json: any;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}
