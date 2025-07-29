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
  | GetSessionDataMessage
  | OptimizationActionMessage
  | AutosaveUpdateMessage
  | TimersExtractedMessage
  | StartTimerExtractionMessage
  | StopTimerExtractionMessage;


export interface OptimizationActionMessage extends MessageRequest {
  action: 'optimizationAction';
  suggestionType: string;
  parameters?: Record<string, any>;
}

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
  GET_SESSION_DATA = 'getSessionData',
  AUTOSAVE_UPDATE = 'autosaveUpdate',
  TIMERS_EXTRACTED = 'timersExtracted',
  START_TIMER_EXTRACTION = 'startTimerExtraction',
  STOP_TIMER_EXTRACTION = 'stopTimerExtraction',
  EXTRACT_TIMERS_ONCE = 'extractTimersOnce'
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
  type?: 'session' | 'autosave'; // Type de requête
  analyticsId?: string; // ID de tracking pour les autosaves
}

// Types pour le monitoring réseau
export interface NetworkMonitoringMessage extends MessageRequest {
  action: 'networkRequest';
  data?: SunflowerSessionData;
}

// Message pour les mises à jour en temps réel
export interface AutosaveUpdateMessage extends MessageRequest {
  action: 'autosaveUpdate';
  data: SunflowerGameData;
  analyticsId: string;
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
    achievements?: Record<string, any>;
    skills?: Record<string, any>;
    wearables?: Record<string, any>;
    [key: string]: any;
  };
  inventory?: Record<string, string>;
  buildings?: Record<string, BuildingData>;
  stones?: Record<string, ResourceData>;
  trees?: Record<string, ResourceData>;
  iron?: Record<string, ResourceData>;
  gold?: Record<string, ResourceData>;
  crimstones?: Record<string, ResourceData>;
  oil?: Record<string, ResourceData>;
  beehives?: Record<string, BeehiveData>;
  fruitPatches?: Record<string, any>;
  flowers?: Record<string, FlowerData>;
  crops?: Record<string, CropData>;
  bank?: BankData;
  dailyRewards?: DailyRewardsData;
  delivery?: DeliveryData;
  airdrops?: Record<string, any>;
  announcements?: any[];
  analyticsId?: string;
  deviceTrackerId?: string;
  [key: string]: any;
}


// Types pour les bâtiments
export interface BuildingData {
  id?: string;
  name?: string;
  type?: string;
  coordinates?: {
    x: number;
    y: number;
  };
  crafting?: {
    item: string;
    startedAt: number;
    timeRequired: number;
    ingredients: Record<string, number>;
  };
  readyAt?: number;
  [key: string]: any;
}

// Types pour les ressources
export interface ResourceData {
  id?: string;
  type?: string;
  amount?: number;
  stone?: {
    amount: number;
    minedAt?: number;
  };
  wood?: {
    amount: number;
    choppedAt?: number;
  };
  minesLeft?: number;
  coordinates?: {
    x: number;
    y: number;
  };
  [key: string]: any;
}

// Types pour les ruches
export interface BeehiveData {
  id?: string;
  honey?: {
    produced: number;
    updatedAt: number;
  };
  flowers?: {
    attachedAt: number;
    attachedUntil: number;
    rate: number;
  };
  swarm?: boolean;
  coordinates?: {
    x: number;
    y: number;
  };
  [key: string]: any;
}

// Types pour les fleurs
export interface FlowerData {
  id?: string;
  plantedAt?: number;
  amount?: number;
  attachedAt?: number;
  attachedUntil?: number;
  rate?: number;
  coordinates?: {
    x: number;
    y: number;
  };
  [key: string]: any;
}

// Types pour les cultures
export interface CropData {
  id?: string;
  crop?: string;
  plantedAt?: number;
  harvestsLeft?: number;
  harvestedAt?: number;
  amount?: number;
  coordinates?: {
    x: number;
    y: number;
  };
  [key: string]: any;
}

// Types pour les données bancaires
export interface BankData {
  taxFreeSFL?: string;
  withdrawnAmount?: string;
  [key: string]: any;
}

// Types pour les récompenses quotidiennes
export interface DailyRewardsData {
  streaks?: number;
  chest?: {
    collectedAt: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Types pour les livraisons
export interface DeliveryData {
  dailySFL?: number;
  [key: string]: any;
}

// Types pour l'extraction des timers DOM
export interface ExtractedTimer {
  id: string;                    // ID unique du timer
  position: {                    // Position dans l'interface
    x: number;
    y: number;
  };
  cropType?: string;             // Type de crop (détecté par l'image ou contexte)
  state: 'ready' | 'growing' | 'unknown';  // État actuel
  timeText: string;              // Texte affiché ("Ready", "2h 30m")
  timeRemaining?: number;        // Secondes restantes (si calculable)
  element: HTMLElement;          // Référence DOM
  lastUpdated: number;           // Timestamp de dernière MAJ
  extractionMethod: string;      // Méthode utilisée pour extraire (DOM, observer, etc.)
}

export interface TimerExtractionResult {
  timers: ExtractedTimer[];
  extractionTimestamp: number;
  totalFound: number;
  readyCount: number;
  growingCount: number;
}

// Messages pour l'extraction des timers
export interface TimersExtractedMessage extends MessageRequest {
  action: 'timersExtracted';
  data: TimerExtractionResult;
}

export interface StartTimerExtractionMessage extends MessageRequest {
  action: 'startTimerExtraction';
  options?: {
    interval?: number;
    strategies?: string[];
  };
}

export interface StopTimerExtractionMessage extends MessageRequest {
  action: 'stopTimerExtraction';
}

