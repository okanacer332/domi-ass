export const DOMIZAN_FOLDER_NAMES = {
  root: "Domizan",
  clients: "Mukellefler",
  inbox: "GelenKutusu",
  data: "Veri",
  reports: "Raporlar",
  templates: "Sablonlar",
  system: "_Sistem",
  monthlySummary: "Aylik-Ozet",
  declarationTracking: "Beyanname-Takip"
} as const;

export const DOMIZAN_CLIENT_SUBFOLDERS = [
  "01-Gelen Belgeler",
  "02-Beyanname",
  "03-Faturalar",
  "04-Banka",
  "05-Personel",
  "06-Resmi Evrak",
  "99-Diger"
] as const;

export type LemonMode = "test" | "live";
export type ClientStatus = "active" | "passive";
export type ClientIdentityType = "vkn" | "tckn";
export type TrialStatus = "not_started" | "active" | "expired" | "converted";
export type AccessMode = "trial" | "licensed" | "blocked";
export type DocumentStatus = "waiting" | "reviewed" | "routed" | "error";
export type ReminderStatus = "pending" | "done";
export type PlannerReminderColor = "indigo" | "amber" | "mint" | "rose";
export type InboxAnalysisStatus =
  | "queued"
  | "analyzing"
  | "ready"
  | "needs_review"
  | "failed";
export type BindingStatus = "bound" | "mismatch" | "unavailable";
export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "not-available"
  | "error"
  | "unsupported";

export type ClientImportField =
  | "name"
  | "identityNumber"
  | "taxOffice"
  | "authorizedPerson"
  | "phone"
  | "email"
  | "city"
  | "address"
  | "notes";

export type DomizanDirectoryMap = {
  root: string;
  clients: string;
  inbox: string;
  data: string;
  reports: string;
  templates: string;
  system: string;
  monthlySummary: string;
  declarationTracking: string;
};

export type DashboardSummary = {
  clientCount: number;
  waitingDocumentCount: number;
  totalDocumentCount: number;
  pendingReminderCount: number;
  telegramReady: boolean;
  geminiReady: boolean;
  lemonReady: boolean;
  lemonMode: LemonMode;
};

export type PlannerReminderRecord = {
  id: number;
  clientId: number | null;
  clientName: string | null;
  title: string;
  dueDate: string | null;
  status: ReminderStatus;
  channel: string;
  color: PlannerReminderColor;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannerReminderCreateInput = {
  title: string;
  dueDate: string | null;
  clientId?: number | null;
  color: PlannerReminderColor;
  notes?: string | null;
};

export type PlannerReminderUpdateInput = {
  id: number;
  title: string;
  dueDate: string | null;
  clientId?: number | null;
  color: PlannerReminderColor;
  notes?: string | null;
};

export type PlannerReminderStatusInput = {
  id: number;
  status: ReminderStatus;
};

export type PlannerNoteColor = "indigo" | "amber" | "mint" | "slate";

export type PlannerNoteRecord = {
  id: number;
  title: string;
  content: string;
  color: PlannerNoteColor;
  createdAt: string;
  updatedAt: string;
};

export type PlannerNoteCreateInput = {
  title: string;
  content: string;
  color: PlannerNoteColor;
};

export type PlannerEventSource = "system" | "manual" | "reminder";
export type PlannerEventCategory = "beyanname" | "odeme" | "hatirlatma";
export type PlannerEventSeverity = "high" | "medium" | "low";

export type PlannerEventRecord = {
  id: number;
  title: string;
  date: string;
  category: PlannerEventCategory;
  severity: PlannerEventSeverity;
  source: Exclude<PlannerEventSource, "reminder">;
  description: string | null;
  seedKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannerEventUpdateInput = {
  id: number;
  title: string;
  date: string;
  category: PlannerEventCategory;
  severity: PlannerEventSeverity;
  description?: string | null;
};

export type PlannerCalendarEvent = {
  id: string;
  recordId: number | null;
  title: string;
  date: string;
  category: PlannerEventCategory;
  severity: PlannerEventSeverity;
  source: PlannerEventSource;
  description: string | null;
  color?: PlannerReminderColor | null;
  reminderStatus?: ReminderStatus | null;
  clientId?: number | null;
  clientName?: string | null;
};

export type PlannerCalendarDay = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  items: PlannerCalendarEvent[];
};

export type DashboardPlannerPayload = {
  referenceDate: string;
  monthLabel: string;
  focusPhaseLabel: string;
  focusPhaseText: string;
  nextDeadline: PlannerCalendarEvent | null;
  overdueReminderCount: number;
  todayItemCount: number;
  calendarDays: PlannerCalendarDay[];
  allEvents: PlannerCalendarEvent[];
  upcomingEvents: PlannerCalendarEvent[];
  reminders: PlannerReminderRecord[];
  notes: PlannerNoteRecord[];
};

export type AppUpdateState = {
  status: AppUpdateStatus;
  currentVersion: string;
  nextVersion: string | null;
  releaseName: string | null;
  releaseDate: string | null;
  progressPercent: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  lastCheckedAt: string | null;
  error: string | null;
  canCheck: boolean;
  canInstall: boolean;
};

export type WorkspaceProfile = {
  officeName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type InstallationSnapshot = {
  installationId: string;
  deviceLabel: string;
  platform: string;
  bindingStatus: BindingStatus;
  sharedBindingPath: string;
  firstBoundAt: string | null;
  lastSeenAt: string | null;
};

export type TrialSnapshot = {
  status: TrialStatus;
  startedAt: string | null;
  expiresAt: string | null;
  convertedAt: string | null;
  daysLeft: number;
  hoursLeft: number;
};

export type CheckoutOpenInput = {
  email?: string;
  name?: string;
};

export type CheckoutOpenResult = {
  opened: boolean;
  url: string | null;
  error: string | null;
};

export type LicenseActivationInput = {
  licenseKey: string;
  email?: string;
  instanceName?: string;
};

export type StoredLicenseState = {
  provider: "lemonsqueezy";
  licenseKey: string;
  licenseStatus: string;
  instanceId: string | null;
  instanceName: string | null;
  customerEmail: string | null;
  customerName: string | null;
  storeId: number | null;
  productId: number | null;
  variantId: number | null;
  orderId: number | null;
  orderItemId: number | null;
  expiresAt: string | null;
  activatedAt: string | null;
  validatedAt: string | null;
  updatedAt: string;
};

export type LicenseActivationResult = {
  success: boolean;
  error: string | null;
  license: StoredLicenseState | null;
};

export type LicenseValidationResult = {
  valid: boolean;
  error: string | null;
  license: StoredLicenseState | null;
};

export type AccessSnapshot = {
  mode: AccessMode;
  canUseApp: boolean;
  reason: string | null;
  requiresPurchase: boolean;
  canStartTrial: boolean;
  installation: InstallationSnapshot;
  trial: TrialSnapshot;
  license: StoredLicenseState | null;
};

export type OnboardingSnapshot = {
  isComplete: boolean;
  recommendedStep: "welcome" | "workspace" | "trial" | "locked";
};

export type BootstrapPayload = {
  directories: DomizanDirectoryMap;
  summary: DashboardSummary;
  workspace: WorkspaceProfile | null;
  onboarding: OnboardingSnapshot;
  access: AccessSnapshot;
};

export type OnboardingSetupInput = {
  officeName: string;
  ownerName: string;
  ownerEmail: string;
};

export type ClientRecord = {
  id: number;
  name: string;
  identityType: ClientIdentityType | null;
  identityNumber: string | null;
  taxOffice: string | null;
  authorizedPerson: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  status: ClientStatus;
  folderName: string;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientFormInput = {
  name: string;
  identityType?: ClientIdentityType | null;
  identityNumber?: string | null;
  taxOffice?: string | null;
  authorizedPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type ClientUpdateInput = ClientFormInput & {
  id: number;
};

export type ClientStatusUpdateInput = {
  id: number;
  status: ClientStatus;
};

export type FolderOpenResult = {
  opened: boolean;
  error: string | null;
};

export type InboxDocumentRecord = {
  id: number;
  clientId: number | null;
  source: string;
  originalName: string;
  storedPath: string;
  status: DocumentStatus;
  detectedType: string | null;
  mimeType: string | null;
  fileExtension: string | null;
  fileSize: number | null;
  sourceModifiedAt: string | null;
  analysisStatus: InboxAnalysisStatus;
  analysisSummary: string | null;
  analysisDetails: string | null;
  extractedTextPreview: string | null;
  matchedClientName: string | null;
  matchedClientConfidence: number | null;
  matchedBy: string | null;
  suggestedFolder: string | null;
  routedFolder: string | null;
  analysisProvider: string | null;
  analysisError: string | null;
  lastAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InboxRouteFolder = (typeof DOMIZAN_CLIENT_SUBFOLDERS)[number];

export type InboxMonitorSnapshot = {
  inboxPath: string;
  isWatching: boolean;
  lastScanAt: string | null;
  lastAnalysisAt: string | null;
  queuedCount: number;
  analyzingCount: number;
  readyCount: number;
  needsReviewCount: number;
  failedCount: number;
};

export type InboxReanalyzeResult = {
  queued: boolean;
};

export type InboxDeleteResult = {
  deleted: boolean;
};

export type InboxRouteInput = {
  documentId: number;
  clientId: number;
  targetFolder: InboxRouteFolder;
};

export type InboxRouteResult = {
  moved: boolean;
  document: InboxDocumentRecord;
};

export type ClientImportFile = {
  filePath: string;
  fileName: string;
};

export type ClientImportTemplateResult = {
  folderPath: string;
  xlsxPath: string;
  csvPath: string;
  opened: boolean;
  error: string | null;
};

export type ClientImportColumn = {
  key: string;
  index: number;
  header: string;
  sampleValues: string[];
  guessedField: ClientImportField | null;
  confidence: number;
};

export type ClientImportPreviewRow = {
  rowNumber: number;
  raw: Record<string, string>;
  mapped: Partial<Record<ClientImportField, string>>;
  warnings: string[];
  canImport: boolean;
};

export type ClientImportPreview = {
  filePath: string;
  fileName: string;
  sheetName: string;
  headerRowIndex: number;
  totalRows: number;
  columns: ClientImportColumn[];
  suggestedMapping: Partial<Record<ClientImportField, string>>;
  previewRows: ClientImportPreviewRow[];
  globalWarnings: string[];
};

export type ClientImportCommitInput = {
  filePath: string;
  mapping: Partial<Record<ClientImportField, string>>;
};

export type ClientImportCommitResult = {
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
};

export type MizanCustomCodeRecord = {
  id: number;
  code: string;
  title: string;
  baseCode: string;
  parentCode: string;
  level: number;
  createdAt: string;
  updatedAt: string;
};

export type MizanCodeCreateInput = {
  parentCode: string;
  code: string;
  title: string;
};

export type MizanCodeDeleteResult = {
  deletedCount: number;
};

export type DomizanApi = {
  getBootstrap: () => Promise<BootstrapPayload>;
  getDashboardPlanner: (referenceDate?: string) => Promise<DashboardPlannerPayload>;
  completeOnboarding: (input: OnboardingSetupInput) => Promise<WorkspaceProfile>;
  getUpdateState: () => Promise<AppUpdateState>;
  checkForUpdates: () => Promise<AppUpdateState>;
  installUpdate: () => Promise<AppUpdateState>;
  onUpdateStateChanged: (listener: (state: AppUpdateState) => void) => () => void;
  startTrial: () => Promise<AccessSnapshot>;
  openCheckout: (input?: CheckoutOpenInput) => Promise<CheckoutOpenResult>;
  getStoredLicense: () => Promise<StoredLicenseState | null>;
  activateLicense: (input: LicenseActivationInput) => Promise<LicenseActivationResult>;
  validateStoredLicense: () => Promise<LicenseValidationResult | null>;
  updatePlannerEvent: (input: PlannerEventUpdateInput) => Promise<PlannerEventRecord>;
  deletePlannerEvent: (id: number) => Promise<{ deleted: boolean }>;
  createPlannerReminder: (input: PlannerReminderCreateInput) => Promise<PlannerReminderRecord>;
  updatePlannerReminder: (input: PlannerReminderUpdateInput) => Promise<PlannerReminderRecord>;
  setPlannerReminderStatus: (input: PlannerReminderStatusInput) => Promise<PlannerReminderRecord>;
  deletePlannerReminder: (id: number) => Promise<{ deleted: boolean }>;
  createPlannerNote: (input: PlannerNoteCreateInput) => Promise<PlannerNoteRecord>;
  deletePlannerNote: (id: number) => Promise<{ deleted: boolean }>;
  listClients: () => Promise<ClientRecord[]>;
  createClient: (input: ClientFormInput) => Promise<ClientRecord>;
  updateClient: (input: ClientUpdateInput) => Promise<ClientRecord>;
  setClientStatus: (input: ClientStatusUpdateInput) => Promise<ClientRecord>;
  openClientFolder: (clientId: number) => Promise<FolderOpenResult>;
  prepareClientImportTemplate: () => Promise<ClientImportTemplateResult>;
  pickClientImportFile: () => Promise<ClientImportFile | null>;
  previewClientImport: (filePath: string) => Promise<ClientImportPreview>;
  commitClientImport: (input: ClientImportCommitInput) => Promise<ClientImportCommitResult>;
  listInboxDocuments: () => Promise<InboxDocumentRecord[]>;
  getInboxMonitor: () => Promise<InboxMonitorSnapshot>;
  openInboxFolder: () => Promise<FolderOpenResult>;
  openInboxDocument: (documentId: number) => Promise<FolderOpenResult>;
  reanalyzeInboxDocument: (documentId: number) => Promise<InboxReanalyzeResult>;
  deleteInboxDocument: (documentId: number) => Promise<InboxDeleteResult>;
  routeInboxDocument: (input: InboxRouteInput) => Promise<InboxRouteResult>;
  listMizanCodes: () => Promise<MizanCustomCodeRecord[]>;
  createMizanCode: (input: MizanCodeCreateInput) => Promise<MizanCustomCodeRecord>;
  deleteMizanCode: (id: number) => Promise<MizanCodeDeleteResult>;
};
