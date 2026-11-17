export type ReferenceType =
  | "image"
  | "gif"
  | "pdf"
  | "video"
  | "youtube"
  | "image-link";

export interface InputFile {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  sizeFormatted: string;
  url: string;
  tag?: string;
  tagError?: string;
  source?: "google-drive" | "manual-upload" | "input-folder";
}

export interface DriveOutputFolder {
  id: string;
  name: string;
  label?: string;
}

export interface ReferenceData {
  type: ReferenceType;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  source?: "input-folder" | "external-url" | "upload" | "google-drive";
  /**
   * Backend source is kept separate from the browser preview URL.
   * For Google Drive this is the Drive file ID. Never send a browser blob URL to FastAPI.
   */
  sourceId?: string;
  tag?: string;
}

export interface ApiKeyOption {
  id: string;
  name: string;
  keyName: string;
  authType?: string;
  displayName?: string;
  duplicateNumber?: number;
}

export interface SelectedApiService {
  id: string;
  name: string;
  keyName?: string;
}

export interface ApiKeySetupProps {
  onComplete: (
    selectedKeys: string[],
    selectedServices: SelectedApiService[],
  ) => void;
  onBackToHome: () => void;
}

export interface ImageGeneratorProps {
  selectedApiKeys: string[];
  selectedApiServices: SelectedApiService[];
  availableApiServices: SelectedApiService[];
  onApiSelectionChange: (selectedIds: string[]) => void;
  onBackToApiSetup: () => void;
  onBackToHome: () => void;
}

export interface AppSessionState {
  apiSetupComplete: boolean;
  selectedApiKeys: string[];
  selectedApiServices: SelectedApiService[];
  availableApiServices: SelectedApiService[];
}
