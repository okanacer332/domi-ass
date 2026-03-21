import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const clientsTable = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  taxId: text("tax_id"),
  identityType: text("identity_type"),
  identityNumber: text("identity_number"),
  taxOffice: text("tax_office"),
  authorizedPerson: text("authorized_person"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  address: text("address"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  folderName: text("folder_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const documentsTable = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id"),
  source: text("source").notNull().default("manual"),
  originalName: text("original_name").notNull(),
  storedPath: text("stored_path").notNull(),
  status: text("status").notNull().default("waiting"),
  detectedType: text("detected_type"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const remindersTable = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id"),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"),
  channel: text("channel").notNull().default("desktop"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const mizanCustomCodesTable = sqliteTable("mizan_custom_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  baseCode: text("base_code").notNull(),
  parentCode: text("parent_code").notNull(),
  level: integer("level").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const licenseStateTable = sqliteTable("license_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull().default("lemonsqueezy"),
  licenseKey: text("license_key").notNull(),
  licenseStatus: text("license_status").notNull(),
  instanceId: text("instance_id"),
  instanceName: text("instance_name"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  storeId: integer("store_id"),
  productId: integer("product_id"),
  variantId: integer("variant_id"),
  orderId: integer("order_id"),
  orderItemId: integer("order_item_id"),
  expiresAt: text("expires_at"),
  activatedAt: text("activated_at"),
  validatedAt: text("validated_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const workspaceStateTable = sqliteTable("workspace_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  officeName: text("office_name"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  onboardingCompletedAt: text("onboarding_completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const trialStateTable = sqliteTable("trial_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status").notNull().default("not_started"),
  startedAt: text("started_at"),
  expiresAt: text("expires_at"),
  convertedAt: text("converted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const installationStateTable = sqliteTable("installation_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  installationId: text("installation_id").notNull(),
  deviceLabel: text("device_label").notNull(),
  platform: text("platform").notNull(),
  bindingHash: text("binding_hash"),
  bindingStatus: text("binding_status").notNull().default("bound"),
  sharedBindingPath: text("shared_binding_path").notNull(),
  firstBoundAt: text("first_bound_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
