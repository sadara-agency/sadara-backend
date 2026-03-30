// Model
export { Notification } from "./notification.model";
export type {
  NotificationType,
  NotificationPriority,
} from "./notification.model";

// Service
export * as notificationService from "./notification.service";

// Routes
export { default as notificationRoutes } from "./notification.routes";
