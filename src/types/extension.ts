// Types personnalisés pour l'extension Sunflower Helpers

export interface ExtensionSettings {
  isActive: boolean;
  autoMode: boolean;
  version?: string;
}

export interface ExtensionStats {
  pageCount: number;
  installDate?: number;
}

export interface ActivityLogEntry {
  timestamp: number;
  action: string;
  url: string;
  [key: string]: any;
}

export interface PageInfo {
  url: string;
  title: string;
  contentLength: number;
  linksCount: number;
  imagesCount: number;
}

export interface MessageRequest {
  action: string;
  [key: string]: any;
}

export interface ToggleFeatureMessage extends MessageRequest {
  action: 'toggleFeature';
  isActive: boolean;
}

export interface UpdateSettingsMessage extends MessageRequest {
  action: 'updateSettings';
  settings: Partial<ExtensionSettings>;
}

export interface GetPageInfoMessage extends MessageRequest {
  action: 'getPageInfo';
}

export interface PageVisitedMessage extends MessageRequest {
  action: 'pageVisited';
  url: string;
  title: string;
}

export interface LogActivityMessage extends MessageRequest {
  action: 'logActivity';
  data: Omit<ActivityLogEntry, 'timestamp'>;
}

export interface AutoModeChangedMessage extends MessageRequest {
  action: 'autoModeChanged';
  autoMode: boolean;
}

export interface GetSettingsMessage extends MessageRequest {
  action: 'getSettings';
}

export type ExtensionMessage = 
  | ToggleFeatureMessage
  | UpdateSettingsMessage
  | GetPageInfoMessage
  | PageVisitedMessage
  | LogActivityMessage
  | AutoModeChangedMessage
  | GetSettingsMessage
  | NetworkMonitoringMessage
  | GetSessionDataMessage;

// Types pour les éléments DOM spécifiques à l'extension
export interface SunflowerHelperUI extends HTMLElement {
  id: 'sunflower-helper-ui';
}

// Enums pour les actions
export enum ExtensionAction {
  TOGGLE_FEATURE = 'toggleFeature',
  UPDATE_SETTINGS = 'updateSettings',
  GET_PAGE_INFO = 'getPageInfo',
  PAGE_VISITED = 'pageVisited',
  LOG_ACTIVITY = 'logActivity',
  AUTO_MODE_CHANGED = 'autoModeChanged',
  GET_SETTINGS = 'getSettings',
  UPDATE_STATS = 'updateStats',
  TOGGLE_FROM_KEYBOARD = 'toggleFromKeyboard',
  NETWORK_REQUEST = 'networkRequest',
  GET_SESSION_DATA = 'getSessionData'
}

export enum ActivityAction {
  HELPERS_ACTIVATED = 'helpers_activated',
  HELPERS_DEACTIVATED = 'helpers_deactivated',
  LINKS_HIGHLIGHTED = 'links_highlighted',
  FOCUS_MODE_TOGGLED = 'focus_mode_toggled',
  PAGE_SUMMARIZED = 'page_summarized'
}

// Types pour le stockage Chrome
export interface ChromeStorageSync {
  isActive?: boolean;
  autoMode?: boolean;
  version?: string;
}

export interface ChromeStorageLocal {
  pageCount?: number;
  installDate?: number;
  activityLog?: ActivityLogEntry[];
  sessionData?: SunflowerSessionData[];
}

// Types pour les données de session Sunflower Land API
export interface SunflowerSessionData {
  timestamp: number;
  method: string;
  url: string;
  requestBody?: any;
  responseBody?: any;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  statusCode?: number;
}

// Types pour le monitoring réseau
export interface NetworkMonitoringMessage extends MessageRequest {
  action: 'networkRequest';
  data?: SunflowerSessionData;
}

export interface GetSessionDataMessage extends MessageRequest {
  action: 'getSessionData';
}

// Types pour la visualisation des données
export interface SessionDataSummary {
  totalRequests: number;
  lastRequest?: Date;
  uniqueEndpoints: string[];
  requestsByMethod: Record<string, number>;
}

// Types pour les données de jeu Sunflower Land
export interface SunflowerGameData {
  id?: number;
  coins?: number;
  balance?: string;
  experience?: number;
  level?: number;
  bumpkin?: {
    experience: number;
    level: number;
    [key: string]: any;
  };
  inventory?: Record<string, string>;
  chickens?: Record<string, any>;
  cows?: Record<string, any>;
  sheep?: Record<string, any>;
  buildings?: Record<string, any>;
  stones?: Record<string, any>;
  trees?: Record<string, any>;
  iron?: Record<string, any>;
  gold?: Record<string, any>;
  crimstones?: Record<string, any>;
  oil?: Record<string, any>;
  beehives?: Record<string, any>;
  fruitPatches?: Record<string, any>;
  flowers?: Record<string, any>;
  crops?: Record<string, any>;
  [key: string]: any;
}