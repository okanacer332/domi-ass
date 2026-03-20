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

export type LemonMode = "test" | "live";
export type ClientStatus = "active" | "passive";
export type ClientIdentityType = "vkn" | "tckn";

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

export type BootstrapPayload = {
  directories: DomizanDirectoryMap;
  summary: DashboardSummary;
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

export type ClientImportFile = {
  filePath: string;
  fileName: string;
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

export type DomizanApi = {
  getBootstrap: () => Promise<BootstrapPayload>;
  openCheckout: (input?: CheckoutOpenInput) => Promise<CheckoutOpenResult>;
  getStoredLicense: () => Promise<StoredLicenseState | null>;
  activateLicense: (input: LicenseActivationInput) => Promise<LicenseActivationResult>;
  validateStoredLicense: () => Promise<LicenseValidationResult | null>;
  listClients: () => Promise<ClientRecord[]>;
  createClient: (input: ClientFormInput) => Promise<ClientRecord>;
  updateClient: (input: ClientUpdateInput) => Promise<ClientRecord>;
  setClientStatus: (input: ClientStatusUpdateInput) => Promise<ClientRecord>;
  openClientFolder: (clientId: number) => Promise<FolderOpenResult>;
  pickClientImportFile: () => Promise<ClientImportFile | null>;
  previewClientImport: (filePath: string) => Promise<ClientImportPreview>;
  commitClientImport: (input: ClientImportCommitInput) => Promise<ClientImportCommitResult>;
};
