export type ServiceStatus =
  | "requested"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed";

export type DriverStatus = "available" | "busy" | "offline" | "inactive";

export type Service = {
  id: string;
  status: ServiceStatus;
  passenger: string;
  driver: string | null;
  origin: string;
  destination: string;
  createdAt: string;
  updatedAt: string;
  stale?: boolean;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  lastSeen: string;
  activeServiceId: string | null;
  tripsToday: number;
};

export type MetricPoint = {
  label: string;
  value: number;
};

export type SystemSignal = {
  id: string;
  label: string;
  status: "ok" | "degraded" | "error" | "unknown";
  detail: string;
  updatedAt: string;
};

export type QueueEvent = {
  id: string;
  type: string;
  severity: "info" | "warning" | "error";
  message: string;
  createdAt: string;
};

export const mockDashboard = {
  activeServices: 7,
  pendingAssignment: 3,
  completedToday: 42,
  cancelledToday: 5,
  driversAvailable: 4,
  driversBusy: 6,
  driversOffline: 3,
  lastUpdated: "hace 12 s",
  botStatus: "operativo" as const,
  intakePaused: false,
};

export const mockAttentionItems = [
  {
    id: "SVC-1042",
    title: "Servicio estancado en assigned",
    detail: "Sin actualización hace 18 min",
    level: "warning" as const,
  },
  {
    id: "SVC-1038",
    title: "Pendiente sin conductor",
    detail: "Solicitado hace 9 min",
    level: "warning" as const,
  },
  {
    id: "BOT-ERR-12",
    title: "Reintento de evento en cola",
    detail: "whatsapp.delivery_timeout",
    level: "error" as const,
  },
];

export const mockServices: Service[] = [
  {
    id: "SVC-1048",
    status: "in_progress",
    passenger: "María G.",
    driver: "Carlos R.",
    origin: "Centro Comercial Andino",
    destination: "Calle 127 #15-20",
    createdAt: "16:42",
    updatedAt: "16:55",
  },
  {
    id: "SVC-1047",
    status: "assigned",
    passenger: "Andrés P.",
    driver: "Laura M.",
    origin: "Aeropuerto El Dorado",
    destination: "Chapinero Alto",
    createdAt: "16:38",
    updatedAt: "16:40",
  },
  {
    id: "SVC-1046",
    status: "requested",
    passenger: "Valentina S.",
    driver: null,
    origin: "Universidad Nacional",
    destination: "Salitre Plaza",
    createdAt: "16:51",
    updatedAt: "16:51",
    stale: true,
  },
  {
    id: "SVC-1045",
    status: "completed",
    passenger: "Diego L.",
    driver: "Julián T.",
    origin: "Zona T",
    destination: "Calle 85",
    createdAt: "15:10",
    updatedAt: "15:48",
  },
  {
    id: "SVC-1044",
    status: "cancelled",
    passenger: "Camila H.",
    driver: null,
    origin: "Usaquén",
    destination: "Chicó",
    createdAt: "14:55",
    updatedAt: "15:02",
  },
  {
    id: "SVC-1043",
    status: "failed",
    passenger: "Sebastián N.",
    driver: "Carlos R.",
    origin: "Modelia",
    destination: "Fontibón",
    createdAt: "14:20",
    updatedAt: "14:33",
  },
  {
    id: "SVC-1042",
    status: "assigned",
    passenger: "Natalia V.",
    driver: "Sofía K.",
    origin: "Suba Centro",
    destination: "Calle 170",
    createdAt: "16:20",
    updatedAt: "16:22",
    stale: true,
  },
  {
    id: "SVC-1041",
    status: "completed",
    passenger: "Felipe A.",
    driver: "Laura M.",
    origin: "Parkway",
    destination: "Teusaquillo",
    createdAt: "13:05",
    updatedAt: "13:41",
  },
];

export const mockDrivers: Driver[] = [
  {
    id: "DRV-01",
    name: "Carlos R.",
    phone: "+57 300 •••• 214",
    status: "busy",
    lastSeen: "hace 1 min",
    activeServiceId: "SVC-1048",
    tripsToday: 5,
  },
  {
    id: "DRV-02",
    name: "Laura M.",
    phone: "+57 310 •••• 882",
    status: "busy",
    lastSeen: "hace 2 min",
    activeServiceId: "SVC-1047",
    tripsToday: 4,
  },
  {
    id: "DRV-03",
    name: "Julián T.",
    phone: "+57 320 •••• 441",
    status: "available",
    lastSeen: "hace 3 min",
    activeServiceId: null,
    tripsToday: 6,
  },
  {
    id: "DRV-04",
    name: "Sofía K.",
    phone: "+57 301 •••• 903",
    status: "busy",
    lastSeen: "hace 18 min",
    activeServiceId: "SVC-1042",
    tripsToday: 3,
  },
  {
    id: "DRV-05",
    name: "Andrés Q.",
    phone: "+57 315 •••• 117",
    status: "available",
    lastSeen: "hace 5 min",
    activeServiceId: null,
    tripsToday: 2,
  },
  {
    id: "DRV-06",
    name: "Paola D.",
    phone: "+57 318 •••• 660",
    status: "offline",
    lastSeen: "hace 2 h",
    activeServiceId: null,
    tripsToday: 0,
  },
  {
    id: "DRV-07",
    name: "Miguel B.",
    phone: "+57 300 •••• 558",
    status: "available",
    lastSeen: "hace 8 min",
    activeServiceId: null,
    tripsToday: 1,
  },
  {
    id: "DRV-08",
    name: "Elena W.",
    phone: "+57 312 •••• 290",
    status: "inactive",
    lastSeen: "hace 3 d",
    activeServiceId: null,
    tripsToday: 0,
  },
];

export const mockMetrics = {
  rangeLabel: "Hoy",
  servicesCreated: 58,
  completed: 42,
  cancelled: 5,
  failed: 2,
  completionRate: "85%",
  activeDrivers: 11,
  avgAssignMinutes: "4.2 min",
  byStatus: [
    { label: "Completados", value: 42 },
    { label: "En curso", value: 7 },
    { label: "Asignados", value: 3 },
    { label: "Solicitados", value: 3 },
    { label: "Cancelados", value: 5 },
    { label: "Fallidos", value: 2 },
  ] satisfies MetricPoint[],
  trend: [
    { label: "09:00", value: 4 },
    { label: "11:00", value: 9 },
    { label: "13:00", value: 14 },
    { label: "15:00", value: 11 },
    { label: "17:00", value: 20 },
  ] satisfies MetricPoint[],
};

export const mockSystemSignals: SystemSignal[] = [
  {
    id: "sig-bot",
    label: "Estado del Bot",
    status: "ok",
    detail: "Runtime operativo · última actividad hace 8 s",
    updatedAt: "16:58:12",
  },
  {
    id: "sig-intake",
    label: "Recepción de nuevos servicios",
    status: "ok",
    detail: "Activa — admitiendo solicitudes",
    updatedAt: "16:58:12",
  },
  {
    id: "sig-data",
    label: "Frescura de datos",
    status: "ok",
    detail: "Panel sincronizado hace 12 s",
    updatedAt: "16:58:08",
  },
  {
    id: "sig-queue",
    label: "Cola de eventos",
    status: "degraded",
    detail: "3 eventos con reintento · 1 error reciente",
    updatedAt: "16:57:44",
  },
  {
    id: "sig-whatsapp",
    label: "Canal WhatsApp",
    status: "ok",
    detail: "Cloud API reachable (mock)",
    updatedAt: "16:57:30",
  },
];

export const mockQueueEvents: QueueEvent[] = [
  {
    id: "EVT-9021",
    type: "service.assigned",
    severity: "info",
    message: "SVC-1047 asignado a Laura M.",
    createdAt: "16:40:02",
  },
  {
    id: "EVT-9020",
    type: "whatsapp.delivery_timeout",
    severity: "error",
    message: "Timeout al entregar confirmación SVC-1042",
    createdAt: "16:39:18",
  },
  {
    id: "EVT-9019",
    type: "service.requested",
    severity: "info",
    message: "Nueva solicitud SVC-1046",
    createdAt: "16:51:04",
  },
  {
    id: "EVT-9018",
    type: "queue.retry",
    severity: "warning",
    message: "Reintento #2 evento EVT-9020",
    createdAt: "16:45:11",
  },
  {
    id: "EVT-9017",
    type: "bot.heartbeat",
    severity: "info",
    message: "Heartbeat OK",
    createdAt: "16:58:00",
  },
];

export const serviceStatusLabel: Record<ServiceStatus, string> = {
  requested: "Solicitado",
  assigned: "Asignado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
  failed: "Fallido",
};

export const driverStatusLabel: Record<DriverStatus, string> = {
  available: "Disponible",
  busy: "Ocupado",
  offline: "Offline",
  inactive: "Inactivo",
};
