import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Home,
  Image as ImageIcon,
  Instagram,
  KeyRound,
  ListFilter,
  LogOut,
  PackageCheck,
  PackageOpen,
  Plus,
  QrCode,
  ReceiptText,
  Save,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  UserPlus,
  Users,
  WalletCards,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const STORAGE_KEYS = {
  products: "secondhand-ig-seller.products",
  customers: "secondhand-ig-seller.customers",
  orders: "secondhand-ig-seller.orders",
  settings: "secondhand-ig-seller.settings",
};

const LOCK_KEYS = {
  passwordHash: "secondhand_lock_password_hash",
  session: "secondhand_lock_session",
};

const DEFAULT_SETTINGS = {
  shopName: "banduthu",
  bankId: "MBBank",
  accountNo: "123456789",
  accountName: "NGUYEN VAN A",
  qrTemplate: "compact2",
};

const PRODUCT_STATUS = {
  available: "Còn hàng",
  holding: "Đang giữ",
  sold: "Đã bán",
  hidden: "Đã ẩn",
};

const ORDER_STATUS = {
  draft: "Nháp",
  waiting_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  packing: "Đang đóng gói",
  shipped: "Đã gửi hàng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const PAYMENT_STATUS = {
  unpaid: "Chưa thanh toán",
  partial: "Đã cọc",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn",
};

const STATUS_TONES = {
  available: "bg-moss-100 text-moss-700 border-moss-100",
  holding: "bg-clay-100 text-clay-700 border-clay-100",
  sold: "bg-bark-800 text-white border-bark-800",
  hidden: "bg-stone-200 text-stone-700 border-stone-200",
  draft: "bg-stone-200 text-stone-700 border-stone-200",
  waiting_payment: "bg-clay-100 text-clay-700 border-clay-100",
  paid: "bg-moss-100 text-moss-700 border-moss-100",
  packing: "bg-bark-100 text-bark-700 border-bark-100",
  shipped: "bg-sky-100 text-sky-800 border-sky-100",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-100",
  cancelled: "bg-rose-100 text-rose-800 border-rose-100",
  unpaid: "bg-clay-100 text-clay-700 border-clay-100",
  partial: "bg-amber-100 text-amber-800 border-amber-100",
  refunded: "bg-stone-200 text-stone-700 border-stone-200",
};

const QR_TEMPLATES = ["compact2", "compact", "qr_only", "print"];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const CLOUD_STATE_ID = "main";
const LEGACY_CLOUD_STATE_ID = "default";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getSupabaseEndpoint(path) {
  return `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
}

function isCloudPayloadEmpty(payload) {
  if (!payload || typeof payload !== "object") return true;
  return Object.keys(payload).length === 0;
}

async function fetchCloudStateRow(rowId) {
  const response = await fetch(
    getSupabaseEndpoint(
      `seller_app_state?id=eq.${encodeURIComponent(rowId)}&select=payload`,
    ),
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Không đọc được dữ liệu Supabase.");
  }

  const rows = await response.json();
  return rows?.[0]?.payload || null;
}

async function loadCloudState() {
  console.log("Loading cloud state from row:", CLOUD_STATE_ID);
  const mainPayload = await fetchCloudStateRow(CLOUD_STATE_ID);

  if (!isCloudPayloadEmpty(mainPayload)) {
    return mainPayload;
  }

  const legacyPayload = await fetchCloudStateRow(LEGACY_CLOUD_STATE_ID);
  if (!isCloudPayloadEmpty(legacyPayload)) {
    await saveCloudState(legacyPayload);
    return legacyPayload;
  }

  return mainPayload;
}

async function saveCloudState(payload) {
  console.log("Saving cloud state to row:", CLOUD_STATE_ID);
  const response = await fetch(getSupabaseEndpoint("seller_app_state?on_conflict=id"), {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: CLOUD_STATE_ID,
      payload,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error("Không lưu được dữ liệu Supabase.");
  }
}

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

async function hashPassword(password) {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampAmount(value, max = Number.POSITIVE_INFINITY) {
  return Math.min(Math.max(toNumber(value), 0), Math.max(toNumber(max), 0));
}

function calculatePayment(totalAmount, prepaidAmount = 0) {
  const total = Math.max(0, toNumber(totalAmount));
  const prepaid = clampAmount(prepaidAmount, total);
  const remaining = Math.max(0, total - prepaid);
  const paymentStatus =
    prepaid <= 0 ? "unpaid" : remaining <= 0 ? "paid" : "partial";

  return {
    prepaidAmount: prepaid,
    remainingAmount: remaining,
    paymentStatus,
  };
}

function getOrderPayment(order = {}) {
  const total = toNumber(order.totalAmount);
  const fallbackPrepaid = order.paymentStatus === "paid" ? total : 0;
  return calculatePayment(total, order.prepaidAmount ?? fallbackPrepaid);
}

function paymentAwareOrder(order = {}) {
  const payment = getOrderPayment(order);
  return {
    ...order,
    ...payment,
    paymentStatus: payment.paymentStatus,
  };
}

function makeRevenueEvent(amount, type, createdAt = nowIso()) {
  return {
    id: makeId(),
    amount: toNumber(amount),
    type,
    createdAt,
  };
}

function getOrderRevenueEvents(order = {}) {
  if (Array.isArray(order.revenueEvents)) {
    return order.revenueEvents
      .map((event) => ({
        ...event,
        amount: toNumber(event.amount),
        createdAt: event.createdAt || order.updatedAt || order.createdAt || nowIso(),
      }))
      .filter((event) => event.amount !== 0);
  }

  const total = toNumber(order.totalAmount);
  const payment = getOrderPayment(order);
  const amount =
    order.status === "completed"
      ? total
      : payment.paymentStatus === "paid"
        ? total
        : payment.paymentStatus === "partial"
          ? payment.prepaidAmount
          : 0;

  return amount > 0
    ? [
        {
          id: `${order.id || "order"}-legacy-revenue`,
          amount,
          type: "legacy",
          createdAt: order.updatedAt || order.createdAt || nowIso(),
        },
      ]
    : [];
}

function getOrderRevenueAmount(order = {}) {
  return getOrderRevenueEvents(order).reduce((sum, event) => sum + toNumber(event.amount), 0);
}

function getRevenueDelta(order = {}, targetAmount) {
  return toNumber(targetAmount) - getOrderRevenueAmount(order);
}

function getOrderCost(order = {}, products = []) {
  const productCostById = new Map(products.map((product) => [product.id, toNumber(product.costPrice)]));
  return (order.items || []).reduce(
    (sum, item) => sum + toNumber(item.costPrice ?? productCostById.get(item.id) ?? 0),
    0,
  );
}

function subtractCostOnceFromEvents(events = [], cost = 0) {
  let remainingCost = toNumber(cost);

  return events.map((event) => {
    if (remainingCost <= 0 || toNumber(event.amount) <= 0) return event;

    const nextEvent = {
      ...event,
      amount: toNumber(event.amount) - remainingCost,
    };
    remainingCost = 0;
    return nextEvent;
  });
}

function getOrderNetRevenueEvents(order = {}, products = []) {
  return subtractCostOnceFromEvents(getOrderRevenueEvents(order), getOrderCost(order, products));
}

function getDirectProductRevenueEvents(products = [], orders = []) {
  const orderedProductIds = new Set(
    orders.flatMap((order) => (order.items || []).map((item) => item.id)),
  );

  return products
    .filter(
      (product) =>
        product.status === "sold" &&
        !orderedProductIds.has(product.id),
    )
    .map((product) => ({
      id: `${product.id}-direct-sale`,
      amount: toNumber(product.directRevenueAmount ?? product.sellingPrice) - toNumber(product.costPrice),
      type: "direct_product_sale",
      createdAt: product.directRevenueAt || product.updatedAt || product.createdAt || nowIso(),
    }));
}

function instagramHandle(value = "") {
  const clean = value.trim();
  if (!clean) return "";
  return clean.startsWith("@") ? clean : `@${clean}`;
}

function sanitizeTransferContent(value = "") {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

function buildQrUrl(settings, amount, transferContent) {
  const numericAmount = Math.round(toNumber(amount));
  const cleanContent = sanitizeTransferContent(transferContent);

  if (numericAmount <= 0 || !cleanContent) return "";

  const bankId = encodeURIComponent(settings.bankId || DEFAULT_SETTINGS.bankId);
  const accountNo = encodeURIComponent(settings.accountNo || DEFAULT_SETTINGS.accountNo);
  const template = encodeURIComponent(settings.qrTemplate || DEFAULT_SETTINGS.qrTemplate);
  const params = new URLSearchParams({
    amount: String(numericAmount),
    addInfo: cleanContent,
    accountName: settings.accountName || DEFAULT_SETTINGS.accountName,
  });

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?${params.toString()}`;
}

function makePaymentMessage(orderLike, settings, qrUrl, options = {}) {
  const amount = toNumber(options.amount ?? orderLike.remainingAmount ?? orderLike.totalAmount);
  const remainingAmount = toNumber(options.remainingAmount ?? orderLike.remainingAmount ?? amount);
  const transferContent = orderLike.transferContent || "";

  if (options.mode === "deposit") {
    return [
      `Dạ bạn cọc trước giúp shop ${formatCurrency(amount)} theo QR này nha.`,
      `Nội dung CK: ${transferContent}`,
      "Sau khi nhận cọc, shop sẽ giữ đơn cho bạn.",
      qrUrl ? `QR: ${qrUrl}` : "",
    ].filter(Boolean).join("\n");
  }

  if (options.mode === "standalone") {
    return [
      `${settings.shopName || "Shop"} gửi bạn thông tin thanh toán:`,
      `Số tiền: ${formatCurrency(amount)}`,
      `Nội dung CK: ${transferContent}`,
      `Ngân hàng: ${settings.bankId}`,
      `Số tài khoản: ${settings.accountNo}`,
      `Tên tài khoản: ${settings.accountName}`,
      qrUrl ? `QR: ${qrUrl}` : "",
    ].filter(Boolean).join("\n");
  }

  return [
    `Dạ bạn chuyển giúp shop ${formatCurrency(amount)} theo QR này nha.`,
    `Nội dung CK: ${transferContent}`,
    `Số tiền còn lại của đơn: ${formatCurrency(remainingAmount)}.`,
    qrUrl ? `QR: ${qrUrl}` : "",
  ].filter(Boolean).join("\n");
}

function makeOrderCode(orders) {
  const highest = orders.reduce((max, order) => {
    const number = Number(String(order.orderCode || "").replace(/\D/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `DH${String(highest + 1).padStart(4, "0")}`;
}

function statusBadge(label, status) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
        STATUS_TONES[status] || "bg-bark-100 text-bark-700 border-bark-100",
      )}
    >
      {label}
    </span>
  );
}

function Button({ children, icon: Icon, variant = "primary", size = "md", className, ...props }) {
  const variants = {
    primary:
      "bg-bark-800 text-bark-50 hover:bg-bark-900 border-bark-900 shadow-[0_10px_24px_rgba(63,41,29,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]",
    secondary:
      "bg-cream-100 text-bark-900 hover:bg-bark-50 border-bark-200 shadow-[0_8px_20px_rgba(63,41,29,0.08),inset_0_1px_0_rgba(255,255,255,0.65)]",
    ghost: "bg-transparent text-bark-700 hover:bg-bark-100/70 border-transparent",
    danger:
      "bg-rose-800 text-white hover:bg-rose-900 border-rose-900 shadow-[0_10px_24px_rgba(136,19,55,0.18)]",
    moss:
      "bg-moss-700 text-white hover:bg-moss-800 border-moss-800 shadow-[0_10px_24px_rgba(70,81,47,0.20)]",
  };
  const sizes = {
    sm: "min-h-10 px-3.5 py-2 text-sm",
    md: "min-h-12 px-4 py-2.5 text-sm",
    lg: "min-h-[52px] px-5 py-3 text-base",
    icon: "h-11 w-11 p-0",
  };

  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-lg border font-bold transition duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-bark-800">
      <span className="text-[13px] uppercase tracking-[0.13em] text-bark-600">{label}</span>
      {children}
      {hint ? <span className="text-xs font-medium text-bark-500">{hint}</span> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      className="focus-ring min-h-12 rounded-lg border border-bark-200/80 bg-cream-50/95 px-3.5 py-2 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-bark-300"
      {...props}
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <select
      className="focus-ring min-h-12 rounded-lg border border-bark-200/80 bg-cream-50/95 px-3.5 py-2 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      {...props}
    >
      {children}
    </select>
  );
}

function TextareaInput(props) {
  return (
    <textarea
      className="focus-ring min-h-28 rounded-lg border border-bark-200/80 bg-cream-50/95 px-3.5 py-2.5 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-bark-300"
      {...props}
    />
  );
}

function PageHeader({ title, eyebrow, action, backAction }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {backAction ? (
          <Button
            aria-label="Quay lại"
            icon={ArrowLeft}
            onClick={backAction}
            size="icon"
            variant="secondary"
          />
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 inline-flex rounded-full border border-clay-200 bg-clay-100/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-clay-700">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="max-w-4xl text-3xl font-black leading-[0.98] text-bark-900 sm:text-4xl">
            {title}
          </h1>
        </div>
      </div>
      {action}
    </div>
  );
}

function Panel({ children, className }) {
  return (
    <section
      className={cn(
        "rounded-lg border border-bark-200/70 bg-cream-100/88 p-4 shadow-soft backdrop-blur-sm transition duration-300",
        className,
      )}
    >
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <Panel className="grid place-items-center py-10 text-center">
      <div className="grid max-w-sm place-items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-bark-100 text-bark-700">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <h3 className="font-bold text-bark-900">{title}</h3>
          {text ? <p className="mt-1 text-sm text-bark-500">{text}</p> : null}
        </div>
        {action}
      </div>
    </Panel>
  );
}

function ShopLogo({ className }) {
  return (
    <img
      alt="Banduthu 2HAND"
      className={cn("h-full w-full rounded-lg object-cover", className)}
      src="/shop-logo.svg"
    />
  );
}

function ConfirmDeleteOrderModal({ order, onCancel, onConfirm }) {
  if (!order) return null;

  const payment = getOrderPayment(order);
  const isPaid = payment.paymentStatus === "paid";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bark-900/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-bark-200 bg-cream-100 p-5 shadow-retro">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-800 text-white">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-black text-bark-900">Xóa đơn hàng?</h2>
            <p className="mt-2 text-sm leading-6 text-bark-600">
              Đơn hàng sẽ bị xóa khỏi danh sách. Nếu đơn chưa thanh toán, sản phẩm trong đơn sẽ được trả về trạng thái còn hàng.
            </p>
          </div>
        </div>
        {isPaid ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-800">
            Đơn này đã có thanh toán. Hãy chắc chắn bạn đã xử lý hoàn tiền hoặc ghi chú trước khi xóa.
          </p>
        ) : null}
        <div className="mb-5 rounded-lg border border-bark-200 bg-cream-50/80 p-3 text-sm">
          <p className="font-bold text-bark-900">{order.orderCode}</p>
          <p className="mt-1 text-bark-600">
            {instagramHandle(order.customerInstagramUsername)} · {formatCurrency(order.totalAmount)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onCancel} type="button" variant="secondary">
            Giữ lại
          </Button>
          <Button icon={Trash2} onClick={onConfirm} type="button" variant="danger">
            Xóa đơn
          </Button>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        autoComplete={autoComplete}
        className="focus-ring min-h-12 w-full rounded-lg border border-bark-200/80 bg-cream-50/95 px-3.5 py-2 pr-12 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-bark-300"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="focus-ring absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-lg text-bark-500 transition hover:bg-bark-100 hover:text-bark-800"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function LockScreen({ hasPassword, onSetupPassword, onUnlock, settings }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const isSetup = !hasPassword;

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Nhập mật khẩu trước đã nhé.");
      return;
    }

    if (isSetup && password !== confirmPassword) {
      setError("Hai mật khẩu chưa khớp.");
      return;
    }

    setIsBusy(true);
    try {
      const ok = isSetup ? await onSetupPassword(password) : await onUnlock(password);
      if (!ok) setError("Mật khẩu chưa đúng. Thử lại một lần nữa.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="lock-stage min-h-screen overflow-hidden px-4 py-8 text-bark-900">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl place-items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section className="hidden lg:grid">
            <div className="relative rounded-lg border border-bark-200/70 bg-bark-900 p-8 text-cream-50 shadow-retro">
              <div className="absolute inset-0 rounded-lg opacity-40 [background-image:linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="relative">
                <p className="mb-16 inline-flex rounded-full border border-cream-50/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cream-200">
                  Bảng bán hàng
                </p>
                <h1 className="max-w-lg text-5xl font-black leading-none">
                  Mở khóa dashboard của shop.
                </h1>
                <div className="mt-8 grid grid-cols-3 gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cream-200">
                  <span className="rounded-lg border border-cream-50/15 p-3">Sản phẩm</span>
                  <span className="rounded-lg border border-cream-50/15 p-3">Đơn hàng</span>
                  <span className="rounded-lg border border-cream-50/15 p-3">VietQR</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md rounded-lg border border-bark-200/70 bg-cream-100/92 p-5 shadow-retro backdrop-blur sm:p-7">
            <div className="mb-7 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-bark-900 text-cream-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <ShopLogo />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black uppercase tracking-[0.12em] text-clay-700">
                    {settings.shopName || "banduthu"}
                  </p>
                  <p className="text-xs font-bold text-bark-500">Dashboard bán hàng</p>
                </div>
              </div>
              <span className="rounded-full border border-moss-100 bg-moss-100 px-2.5 py-1 text-xs font-black uppercase tracking-[0.1em] text-moss-700">
                MVP
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-black leading-none text-bark-900">
                {isSetup ? "Set seller password" : "Seller Access"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-bark-600">
                {isSetup
                  ? "Tạo mật khẩu cục bộ để mở dashboard bán hàng."
                  : "Enter your password to open the shop dashboard"}
              </p>
            </div>

            <form className="grid gap-4" onSubmit={submit}>
              <Field label={isSetup ? "New password" : "Password"}>
                <PasswordInput
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  onChange={setPassword}
                  placeholder={isSetup ? "Tạo mật khẩu" : "Nhập mật khẩu"}
                  value={password}
                />
              </Field>
              {isSetup ? (
                <Field label="Confirm password">
                  <PasswordInput
                    autoComplete="new-password"
                    onChange={setConfirmPassword}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                  />
                </Field>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" disabled={isBusy} icon={KeyRound} type="submit">
                {isSetup ? "Save password" : "Unlock"}
              </Button>
            </form>

            <p className="mt-5 rounded-lg border border-bark-200/70 bg-cream-50/80 p-3 text-xs font-semibold leading-5 text-bark-500">
              Personal MVP lock only. Do not store sensitive banking login data.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function ProductImage({ product, className }) {
  if (product?.imageUrl) {
    return (
      <img
        alt={product.name}
        className={cn("h-full w-full object-cover transition duration-700 group-hover:scale-105", className)}
        src={product.imageUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f1e6d8,#dfc8ad_48%,#e5ead8)] text-bark-600",
        className,
      )}
    >
      <ImageIcon className="h-8 w-8" />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone = "brown" }) {
  const tones = {
    brown: "bg-bark-900 text-cream-50 border-bark-900",
    ivory: "bg-cream-100 text-bark-900 border-bark-200",
    moss: "bg-moss-700 text-white border-moss-800",
    clay: "bg-clay-500 text-white border-clay-700",
  };

  return (
    <div
      className={cn(
        "group rounded-lg border p-4 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-retro",
        tones[tone],
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] opacity-75">{title}</p>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/12">
          <Icon className="h-4 w-4 opacity-90" />
        </span>
      </div>
      <p className="break-words text-2xl font-bold">{value}</p>
    </div>
  );
}

function DashboardPage({ products, orders, customers, go }) {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const revenueEvents = [
    ...orders.flatMap((order) => getOrderNetRevenueEvents(order, products)),
    ...getDirectProductRevenueEvents(products, orders),
  ];
  const revenueToday = revenueEvents
    .filter((event) => {
      const date = new Date(event.createdAt);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === today.getDate()
      );
    })
    .reduce((sum, event) => sum + toNumber(event.amount), 0);
  const revenueMonth = revenueEvents
    .filter((event) => {
      const date = new Date(event.createdAt);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .reduce((sum, event) => sum + toNumber(event.amount), 0);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        action={
          <Button icon={Plus} onClick={() => go("create-order")} size="sm">
            Tạo đơn
          </Button>
        }
        eyebrow="Tổng quan"
        title="Bán hàng secondhand"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Banknote} title="Doanh thu hôm nay" value={formatCurrency(revenueToday)} />
        <StatCard
          icon={CalendarDays}
          title="Doanh thu tháng này"
          tone="moss"
          value={formatCurrency(revenueMonth)}
        />
        <StatCard
          icon={Boxes}
          title="Sản phẩm còn hàng"
          tone="ivory"
          value={products.filter((product) => product.status === "available").length}
        />
        <StatCard
          icon={ReceiptText}
          title="Chờ thanh toán"
          tone="clay"
          value={orders.filter((order) => order.status === "waiting_payment").length}
        />
        <StatCard
          icon={PackageCheck}
          title="Cần đóng gói"
          tone="ivory"
          value={orders.filter((order) => order.status === "paid").length}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-bark-900">Đơn gần đây</h2>
            <Button icon={ShoppingBag} onClick={() => go("orders")} size="sm" variant="secondary">
              Xem đơn
            </Button>
          </div>
          {recentOrders.length ? (
            <div className="grid gap-3">
              {recentOrders.map((order) => (
                <button
                  className="focus-ring flex items-center justify-between gap-3 rounded-lg border border-bark-200/70 bg-cream-50/80 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition duration-300 hover:-translate-y-0.5 hover:bg-bark-100/80"
                  key={order.id}
                  onClick={() => go("order-detail", { id: order.id })}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-bark-900">{order.orderCode}</p>
                    <p className="truncate text-sm text-bark-500">
                      {instagramHandle(order.customerInstagramUsername)} · {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div className="grid justify-items-end gap-2">
                    {statusBadge(ORDER_STATUS[order.status], order.status)}
                    <ChevronRight className="h-4 w-4 text-bark-400" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="Chưa có đơn hàng nào."
              text=""
              action={<Button icon={Plus} onClick={() => go("create-order")}>Tạo đơn</Button>}
            />
          )}
        </Panel>

        <Panel className="bg-bark-800 text-white">
          <div className="grid h-full content-between gap-5">
            <div>
              <p className="text-sm font-semibold text-bark-100">Công việc hôm nay</p>
              <h2 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">
                Quản lý đơn, khách và QR thanh toán.
              </h2>
              <p className="mt-3 text-sm leading-6 text-bark-100">
                {customers.length} khách Instagram · {products.length} sản phẩm · {orders.length} đơn
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button icon={Plus} onClick={() => go("product-form")} variant="secondary">
                Sản phẩm
              </Button>
              <Button icon={QrCode} onClick={() => go("qr")} variant="secondary">
                Tạo QR
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ProductsPage({ products, go, updateProductStatus }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = products.filter((product) => {
    const target = [product.name, product.brand, product.sku].join(" ").toLowerCase();
    const matchesQuery = target.includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || product.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <PageHeader
        action={
          <Button icon={Plus} onClick={() => go("product-form")} size="sm">
            Thêm
          </Button>
        }
        eyebrow="Kho đồ"
        title="Sản phẩm"
      />

      <Panel className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-bark-400" />
            <TextInput
              className="focus-ring min-h-12 w-full rounded-lg border border-bark-200/80 bg-cream-50/95 py-2 pl-10 pr-3 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-bark-300"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên, thương hiệu, SKU"
              value={query}
            />
          </div>
          <div className="relative">
            <ListFilter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-bark-400" />
            <SelectInput className="focus-ring min-h-12 w-full rounded-lg border border-bark-200/80 bg-cream-50/95 py-2 pl-10 pr-3 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(PRODUCT_STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
      </Panel>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <Panel className="group overflow-hidden p-0 hover:-translate-y-1 hover:border-bark-300" key={product.id}>
              <div className="aspect-[4/3] overflow-hidden bg-bark-100">
                <ProductImage product={product} />
              </div>
              <div className="grid gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-bark-900">{product.name}</p>
                    <p className="text-sm text-bark-500">
                      {product.brand || "Không brand"} · {product.size || "Không size"}
                    </p>
                  </div>
                  {statusBadge(PRODUCT_STATUS[product.status], product.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-bark-100 bg-cream-50/80 p-3 text-sm">
                  <div>
                    <p className="text-bark-500">Giá bán</p>
                    <p className="font-bold text-bark-900">{formatCurrency(product.sellingPrice)}</p>
                  </div>
                  <div>
                    <p className="text-bark-500">Tình trạng</p>
                    <p className="font-bold text-bark-900">{product.condition || "Chưa ghi"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={Edit3}
                    onClick={() => go("product-form", { id: product.id })}
                    size="sm"
                    variant="secondary"
                  >
                    Sửa
                  </Button>
                  <Button
                    icon={PackageOpen}
                    onClick={() => updateProductStatus(product.id, "holding")}
                    size="sm"
                    variant="secondary"
                  >
                    Giữ
                  </Button>
                  <Button
                    icon={Check}
                    onClick={() => updateProductStatus(product.id, "sold")}
                    size="sm"
                    variant="moss"
                  >
                    Đã bán
                  </Button>
                  <Button
                    icon={EyeOff}
                    onClick={() =>
                      updateProductStatus(product.id, product.status === "hidden" ? "available" : "hidden")
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {product.status === "hidden" ? "Hiện" : "Ẩn"}
                  </Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Boxes}
          title="Chưa có sản phẩm nào."
          text=""
          action={<Button icon={Plus} onClick={() => go("product-form")}>Thêm sản phẩm</Button>}
        />
      )}
    </>
  );
}

const EMPTY_PRODUCT = {
  name: "",
  sku: "",
  brand: "",
  category: "",
  size: "",
  color: "",
  condition: "",
  flawNote: "",
  costPrice: "",
  sellingPrice: "",
  status: "available",
  shopeeUrl: "",
  instagramUrl: "",
  imageUrl: "",
};

function ProductFormPage({ product, onSave, go }) {
  const [form, setForm] = useState(() => product || EMPTY_PRODUCT);

  useEffect(() => {
    setForm(product || EMPTY_PRODUCT);
  }, [product]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      sku: form.sku.trim(),
      costPrice: toNumber(form.costPrice),
      sellingPrice: toNumber(form.sellingPrice),
    });
  };

  return (
    <>
      <PageHeader
        backAction={() => go("products")}
        eyebrow="Kho đồ"
        title={product ? "Sửa sản phẩm" : "Thêm sản phẩm"}
      />

      <form className="grid gap-4 lg:grid-cols-[1fr_320px]" onSubmit={submit}>
        <Panel className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên sản phẩm">
              <TextInput
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Áo blazer linen nâu"
                required
                value={form.name}
              />
            </Field>
            <Field label="SKU">
              <TextInput
                onChange={(event) => setField("sku", event.target.value)}
                placeholder="NB-001"
                value={form.sku}
              />
            </Field>
            <Field label="Thương hiệu">
              <TextInput onChange={(event) => setField("brand", event.target.value)} value={form.brand} />
            </Field>
            <Field label="Danh mục">
              <TextInput
                onChange={(event) => setField("category", event.target.value)}
                placeholder="Áo, quần, túi..."
                value={form.category}
              />
            </Field>
            <Field label="Size">
              <TextInput onChange={(event) => setField("size", event.target.value)} value={form.size} />
            </Field>
            <Field label="Màu">
              <TextInput onChange={(event) => setField("color", event.target.value)} value={form.color} />
            </Field>
            <Field label="Giá vốn">
              <TextInput
                inputMode="numeric"
                min="0"
                onChange={(event) => setField("costPrice", event.target.value)}
                type="number"
                value={form.costPrice}
              />
            </Field>
            <Field label="Giá bán">
              <TextInput
                inputMode="numeric"
                min="0"
                onChange={(event) => setField("sellingPrice", event.target.value)}
                required
                type="number"
                value={form.sellingPrice}
              />
            </Field>
            <Field label="Tình trạng">
              <TextInput
                onChange={(event) => setField("condition", event.target.value)}
                placeholder="Như mới, 8/10..."
                value={form.condition}
              />
            </Field>
            <Field label="Trạng thái">
              <SelectInput
                onChange={(event) => setField("status", event.target.value)}
                value={form.status}
              >
                {Object.entries(PRODUCT_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Lỗi / lưu ý">
            <TextareaInput
              onChange={(event) => setField("flawNote", event.target.value)}
              placeholder="Ví dụ: cổ áo có vệt mờ nhỏ"
              value={form.flawNote}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link Shopee">
              <TextInput
                onChange={(event) => setField("shopeeUrl", event.target.value)}
                placeholder="https://shopee.vn/..."
                value={form.shopeeUrl}
              />
            </Field>
            <Field label="Link Instagram">
              <TextInput
                onChange={(event) => setField("instagramUrl", event.target.value)}
                placeholder="https://instagram.com/..."
                value={form.instagramUrl}
              />
            </Field>
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel className="grid gap-4">
            <Field label="Ảnh sản phẩm">
              <TextInput
                onChange={(event) => setField("imageUrl", event.target.value)}
                placeholder="https://..."
                value={form.imageUrl}
              />
            </Field>
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-bark-100">
              <ProductImage product={form} />
            </div>
          </Panel>
          <Button className="w-full" icon={Save} type="submit">
            Lưu sản phẩm
          </Button>
        </div>
      </form>
    </>
  );
}

function CustomersPage({ customers, orders, go }) {
  const [query, setQuery] = useState("");
  const filtered = customers.filter((customer) =>
    [customer.instagramUsername, customer.name]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const orderCount = (customerId) => orders.filter((order) => order.customerId === customerId).length;

  return (
    <>
      <PageHeader
        action={
          <Button icon={UserPlus} onClick={() => go("customer-form")} size="sm">
            Thêm
          </Button>
        }
        eyebrow="Instagram"
        title="Khách hàng"
      />

      <Panel className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-bark-400" />
          <TextInput
            className="focus-ring min-h-12 w-full rounded-lg border border-bark-200/80 bg-cream-50/95 py-2 pl-10 pr-3 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-bark-300"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm username hoặc tên"
            value={query}
          />
        </div>
      </Panel>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <Panel className="grid gap-4" key={customer.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-bark-900">
                    {instagramHandle(customer.instagramUsername)}
                  </p>
                  <p className="text-sm text-bark-500">{customer.name || "Chưa có tên"}</p>
                </div>
                <span className="rounded-full bg-bark-100 px-2.5 py-1 text-xs font-bold text-bark-700">
                  {orderCount(customer.id)} đơn
                </span>
              </div>
              <div className="grid gap-2 text-sm text-bark-600">
                <p>{customer.phone || "Chưa có số điện thoại"}</p>
                <p className="line-clamp-2">{customer.address || "Chưa có địa chỉ"}</p>
              </div>
              {customer.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold text-clay-700"
                      key={tag}
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={Edit3}
                  onClick={() => go("customer-form", { id: customer.id })}
                  size="sm"
                  variant="secondary"
                >
                  Sửa
                </Button>
                <Button
                  icon={Plus}
                  onClick={() => go("create-order", { customerId: customer.id })}
                  size="sm"
                >
                  Tạo đơn
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Chưa có khách hàng nào."
          text=""
          action={<Button icon={UserPlus} onClick={() => go("customer-form")}>Thêm khách</Button>}
        />
      )}
    </>
  );
}

const EMPTY_CUSTOMER = {
  instagramUsername: "",
  name: "",
  phone: "",
  address: "",
  note: "",
  tags: [],
};

function CustomerFormPage({ customer, onSave, go }) {
  const [form, setForm] = useState(() => ({
    ...(customer || EMPTY_CUSTOMER),
    tagsText: (customer?.tags || []).join(", "),
  }));

  useEffect(() => {
    setForm({
      ...(customer || EMPTY_CUSTOMER),
      tagsText: (customer?.tags || []).join(", "),
    });
  }, [customer]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.instagramUsername.trim()) return;
    onSave({
      ...form,
      instagramUsername: instagramHandle(form.instagramUsername).replace("@", ""),
      tags: form.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  };

  return (
    <>
      <PageHeader
        backAction={() => go("customers")}
        eyebrow="Instagram"
        title={customer ? "Sửa khách hàng" : "Thêm khách hàng"}
      />

      <form className="grid gap-4 lg:grid-cols-[1fr_320px]" onSubmit={submit}>
        <Panel className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên Instagram">
              <TextInput
                onChange={(event) => setField("instagramUsername", event.target.value)}
                placeholder="@tenkhach"
                required
                value={form.instagramUsername}
              />
            </Field>
            <Field label="Tên khách">
              <TextInput onChange={(event) => setField("name", event.target.value)} value={form.name} />
            </Field>
            <Field label="Số điện thoại">
              <TextInput onChange={(event) => setField("phone", event.target.value)} value={form.phone} />
            </Field>
            <Field label="Tags">
              <TextInput
                onChange={(event) => setField("tagsText", event.target.value)}
                placeholder="khách quen, thích blazer"
                value={form.tagsText}
              />
            </Field>
          </div>
          <Field label="Địa chỉ">
            <TextareaInput onChange={(event) => setField("address", event.target.value)} value={form.address} />
          </Field>
          <Field label="Ghi chú">
            <TextareaInput onChange={(event) => setField("note", event.target.value)} value={form.note} />
          </Field>
        </Panel>
        <Panel className="grid content-start gap-4">
          <div className="rounded-lg bg-bark-50 p-4">
            <Instagram className="mb-3 h-8 w-8 text-clay-700" />
            <p className="text-lg font-bold text-bark-900">
              {instagramHandle(form.instagramUsername) || "@instagram"}
            </p>
            <p className="mt-1 text-sm text-bark-500">{form.name || "Tên khách"}</p>
          </div>
          <Button className="w-full" icon={Save} type="submit">
            Lưu khách hàng
          </Button>
        </Panel>
      </form>
    </>
  );
}

function OrdersPage({ orders, go, onRequestDelete }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = orders.filter((order) => {
    const target = [order.orderCode, order.customerInstagramUsername].join(" ").toLowerCase();
    const matchesQuery = target.includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || order.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <PageHeader
        action={
          <Button icon={Plus} onClick={() => go("create-order")} size="sm">
            Tạo đơn
          </Button>
        }
        eyebrow="Chốt đơn"
        title="Đơn hàng"
      />

      <Panel className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-bark-400" />
            <TextInput
              className="focus-ring min-h-12 w-full rounded-lg border border-bark-200/80 bg-cream-50/95 py-2 pl-10 pr-3 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-bark-300"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã đơn hoặc Instagram"
              value={query}
            />
          </div>
          <div className="relative">
            <ListFilter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-bark-400" />
            <SelectInput className="focus-ring min-h-12 w-full rounded-lg border border-bark-200/80 bg-cream-50/95 py-2 pl-10 pr-3 text-bark-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(ORDER_STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
      </Panel>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((order) => (
            <div
              className="focus-ring rounded-lg border border-bark-200/70 bg-cream-100/88 p-4 text-left shadow-soft transition duration-300 hover:-translate-y-1 hover:border-bark-300 hover:shadow-retro"
              key={order.id}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="focus-ring min-w-0 flex-1 rounded-lg text-left"
                  onClick={() => go("order-detail", { id: order.id })}
                  type="button"
                >
                  <p className="text-lg font-bold text-bark-900">{order.orderCode}</p>
                  <p className="truncate text-sm text-bark-500">
                    {instagramHandle(order.customerInstagramUsername)} · {formatDate(order.createdAt)}
                  </p>
                </button>
                <Button
                  icon={Trash2}
                  onClick={() => onRequestDelete(order)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Xóa đơn
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-bark-400">Tổng tiền</p>
                  <p className="font-bold text-bark-900">{formatCurrency(order.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-bark-400">Thanh toán</p>
                  <div className="mt-1">
                    {statusBadge(
                      PAYMENT_STATUS[getOrderPayment(order).paymentStatus],
                      getOrderPayment(order).paymentStatus,
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-bark-400">Còn lại</p>
                  <p className="font-bold text-bark-900">
                    {formatCurrency(getOrderPayment(order).remainingAmount)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                {statusBadge(ORDER_STATUS[order.status], order.status)}
                <Button
                  icon={ChevronRight}
                  onClick={() => go("order-detail", { id: order.id })}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Chi tiết
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ReceiptText}
          title="Chưa có đơn hàng nào."
          text=""
          action={<Button icon={Plus} onClick={() => go("create-order")}>Tạo đơn</Button>}
        />
      )}
    </>
  );
}

function CreateOrderPage({ products, customers, orders, settings, onCreate, go, initialCustomerId }) {
  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [productIds, setProductIds] = useState([]);
  const [shippingFee, setShippingFee] = useState("");
  const [discount, setDiscount] = useState("");
  const [prepaidAmount, setPrepaidAmount] = useState("");

  useEffect(() => {
    setCustomerId(initialCustomerId || "");
  }, [initialCustomerId]);

  const availableProducts = products.filter((product) => product.status === "available");
  const selectedProducts = availableProducts.filter((product) => productIds.includes(product.id));
  const subtotal = selectedProducts.reduce((sum, product) => sum + toNumber(product.sellingPrice), 0);
  const totalAmount = Math.max(0, subtotal + toNumber(shippingFee) - toNumber(discount));
  const payment = calculatePayment(totalAmount, prepaidAmount);
  const customer = customers.find((item) => item.id === customerId);
  const nextOrderCode = makeOrderCode(orders);
  const transferContent = sanitizeTransferContent(
    `${nextOrderCode} ${customer?.instagramUsername || ""}`,
  );
  const qrUrl = buildQrUrl(settings, payment.remainingAmount, transferContent);

  const toggleProduct = (id) => {
    setProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = (event) => {
    event.preventDefault();
    if (!customer || !selectedProducts.length || totalAmount <= 0) return;
    onCreate({
      customer,
      products: selectedProducts,
      shippingFee: toNumber(shippingFee),
      discount: toNumber(discount),
      subtotal,
      totalAmount,
      prepaidAmount: payment.prepaidAmount,
      remainingAmount: payment.remainingAmount,
      paymentStatus: payment.paymentStatus,
      transferContent,
      qrImageUrl: qrUrl,
    });
  };

  return (
    <>
      <PageHeader
        backAction={() => go("orders")}
        eyebrow="Chốt đơn"
        title="Tạo đơn hàng"
      />

      <form className="grid gap-4 xl:grid-cols-[1fr_360px]" onSubmit={submit}>
        <div className="grid gap-4">
          <Panel className="grid gap-4">
            <Field label="Khách Instagram">
              <SelectInput
                onChange={(event) => setCustomerId(event.target.value)}
                required
                value={customerId}
              >
                <option value="">Chọn khách hàng</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {instagramHandle(item.instagramUsername)} {item.name ? `· ${item.name}` : ""}
                  </option>
                ))}
              </SelectInput>
            </Field>
            {!customers.length ? (
              <Button icon={UserPlus} onClick={() => go("customer-form")} type="button" variant="secondary">
                Thêm khách hàng
              </Button>
            ) : null}
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-bark-900">Chọn sản phẩm</h2>
              <span className="rounded-full bg-bark-100 px-2.5 py-1 text-xs font-bold text-bark-700">
                {selectedProducts.length} món
              </span>
            </div>
            {availableProducts.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableProducts.map((product) => (
                  <label
                    className={cn(
                      "focus-within:ring-2 focus-within:ring-bark-500 grid cursor-pointer grid-cols-[76px_1fr_auto] gap-3 rounded-lg border p-2 transition",
                      productIds.includes(product.id)
                        ? "border-bark-700 bg-bark-50"
                        : "border-bark-200/70 bg-cream-50/90 hover:border-bark-400",
                    )}
                    key={product.id}
                  >
                    <div className="h-20 overflow-hidden rounded-md">
                      <ProductImage product={product} />
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate font-bold text-bark-900">{product.name}</p>
                      <p className="text-sm text-bark-500">
                        {product.size || "Không size"} · {formatCurrency(product.sellingPrice)}
                      </p>
                    </div>
                    <input
                      checked={productIds.includes(product.id)}
                      className="mt-2 h-5 w-5 accent-bark-700"
                      onChange={() => toggleProduct(product.id)}
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Boxes}
                title="Chưa có sản phẩm còn hàng."
                text=""
                action={<Button icon={Plus} onClick={() => go("product-form")} type="button">Thêm sản phẩm</Button>}
              />
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-4">
          <Panel className="grid gap-4">
            <h2 className="text-lg font-bold text-bark-900">Tính tiền</h2>
            <div className="grid gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-bark-500">Tạm tính</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <Field label="Phí ship">
                <TextInput
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setShippingFee(event.target.value)}
                  type="number"
                  value={shippingFee}
                />
              </Field>
              <Field label="Giảm giá">
                <TextInput
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setDiscount(event.target.value)}
                  type="number"
                  value={discount}
                />
              </Field>
              <Field label="Số tiền thanh toán trước">
                <TextInput
                  inputMode="numeric"
                  max={totalAmount}
                  min="0"
                  onChange={(event) => setPrepaidAmount(event.target.value)}
                  type="number"
                  value={prepaidAmount}
                />
              </Field>
              <div className="rounded-lg bg-bark-800 p-4 text-white">
                <p className="text-sm font-semibold text-bark-100">Tổng thanh toán</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="grid gap-2 rounded-lg border border-bark-200 bg-cream-50/80 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-bark-500">Đã thanh toán trước</span>
                  <strong>{formatCurrency(payment.prepaidAmount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-bark-500">Còn lại</span>
                  <strong>{formatCurrency(payment.remainingAmount)}</strong>
                </div>
              </div>
            </div>
          </Panel>
          <Panel className="grid gap-3">
            <p className="text-sm font-semibold text-bark-500">Mã đơn kế tiếp</p>
            <p className="text-xl font-bold text-bark-900">{nextOrderCode}</p>
            <p className="rounded-lg bg-bark-50 p-3 text-sm font-semibold text-bark-700">
              {transferContent || "Chọn khách để tạo nội dung chuyển khoản"}
            </p>
            {totalAmount > 0 && payment.remainingAmount <= 0 ? (
              <p className="rounded-lg border border-moss-100 bg-moss-100 p-3 text-sm font-semibold text-moss-700">
                Đơn này đã thanh toán đủ.
              </p>
            ) : qrUrl ? (
              <img
                alt="VietQR số tiền còn lại"
                className="mx-auto w-full max-w-64 rounded-lg border border-bark-100 bg-cream-50"
                src={qrUrl}
              />
            ) : null}
            <Button
              className="w-full"
              disabled={!customer || !selectedProducts.length || totalAmount <= 0}
              icon={ReceiptText}
              type="submit"
            >
              {payment.paymentStatus === "paid" ? "Tạo đơn đã thanh toán" : "Tạo đơn"}
            </Button>
          </Panel>
        </div>
      </form>
    </>
  );
}

function OrderDetailPage({
  order,
  customer,
  settings,
  onCopy,
  onDownload,
  onMarkPaid,
  onSavePayment,
  onRequestDelete,
  onSetOrderStatus,
  go,
}) {
  const [editablePrepaid, setEditablePrepaid] = useState("0");

  useEffect(() => {
    if (order) {
      setEditablePrepaid(String(getOrderPayment(order).prepaidAmount || 0));
    }
  }, [order?.id, order?.prepaidAmount, order?.totalAmount, order?.paymentStatus]);

  if (!order) {
    return (
      <>
        <PageHeader backAction={() => go("orders")} title="Không tìm thấy đơn" />
        <EmptyState
          icon={ReceiptText}
          title="Đơn không tồn tại"
          text="Có thể đơn đã bị xóa khỏi LocalStorage."
          action={<Button onClick={() => go("orders")}>Về danh sách đơn</Button>}
        />
      </>
    );
  }

  const orderPayment = getOrderPayment(order);
  const hydratedOrder = paymentAwareOrder(order);
  const qrUrl =
    orderPayment.remainingAmount > 0
      ? buildQrUrl(settings, orderPayment.remainingAmount, order.transferContent)
      : "";
  const message =
    orderPayment.remainingAmount > 0
      ? makePaymentMessage(hydratedOrder, settings, qrUrl, {
          amount: orderPayment.remainingAmount,
          remainingAmount: orderPayment.remainingAmount,
        })
      : "Đơn này đã thanh toán đủ.";
  const editablePayment = calculatePayment(order.totalAmount, editablePrepaid);

  const nextActions = [
    order.status === "waiting_payment"
      ? { label: "Chuyển sang đóng gói", status: "packing", icon: PackageOpen, variant: "secondary" }
      : null,
    order.status === "paid"
      ? { label: "Chuyển sang đóng gói", status: "packing", icon: PackageOpen, variant: "secondary" }
      : null,
    order.status === "packing"
      ? { label: "Đã gửi hàng", status: "shipped", icon: Truck, variant: "secondary" }
      : null,
    order.status === "shipped"
      ? { label: "Hoàn tất đơn", status: "completed", icon: Check, variant: "moss" }
      : null,
    ["waiting_payment", "paid", "packing"].includes(order.status)
      ? { label: "Hủy đơn", status: "cancelled", icon: XCircle, variant: "danger" }
      : null,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        backAction={() => go("orders")}
        eyebrow="Chi tiết đơn"
        title={order.orderCode}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4">
          <Panel className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-bark-500">Khách hàng</p>
                <h2 className="text-xl font-bold text-bark-900">
                  {instagramHandle(order.customerInstagramUsername)}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusBadge(ORDER_STATUS[order.status], order.status)}
                {statusBadge(PAYMENT_STATUS[orderPayment.paymentStatus], orderPayment.paymentStatus)}
              </div>
            </div>
            {customer ? (
              <div className="grid gap-2 rounded-lg bg-bark-50 p-3 text-sm text-bark-700">
                <p>{customer.name || "Chưa có tên"}</p>
                <p>{customer.phone || "Chưa có số điện thoại"}</p>
                <p>{customer.address || "Chưa có địa chỉ"}</p>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <h2 className="mb-4 text-lg font-bold text-bark-900">Sản phẩm</h2>
            <div className="grid gap-3">
              {order.items.map((item) => (
                <div
                  className="grid grid-cols-[72px_1fr_auto] gap-3 rounded-lg border border-bark-100 bg-bark-50 p-2"
                  key={item.id}
                >
                  <div className="h-20 overflow-hidden rounded-md">
                    <ProductImage product={item} />
                  </div>
                  <div className="min-w-0 self-center">
                    <p className="truncate font-bold text-bark-900">{item.name}</p>
                    <p className="text-sm text-bark-500">
                      {item.sku || "Không SKU"} · {item.size || "Không size"}
                    </p>
                  </div>
                  <p className="self-center text-right font-bold text-bark-900">
                    {formatCurrency(item.sellingPrice)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="grid gap-3">
            <h2 className="text-lg font-bold text-bark-900">Tổng kết tiền</h2>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-bark-500">Tạm tính</span>
                <strong>{formatCurrency(order.subtotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-bark-500">Phí ship</span>
                <strong>{formatCurrency(order.shippingFee)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-bark-500">Giảm giá</span>
                <strong>-{formatCurrency(order.discount)}</strong>
              </div>
              <div className="mt-2 flex justify-between rounded-lg bg-bark-800 p-3 text-white">
                <span>Tổng thanh toán</span>
                <strong>{formatCurrency(order.totalAmount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-bark-500">Đã thanh toán trước</span>
                <strong>{formatCurrency(orderPayment.prepaidAmount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-bark-500">Còn lại</span>
                <strong>{formatCurrency(orderPayment.remainingAmount)}</strong>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-4">
          <Panel className="grid gap-4">
            <div>
              <p className="text-sm font-semibold text-bark-500">Thanh toán VietQR</p>
              <h2 className="text-xl font-bold text-bark-900">
                {formatCurrency(orderPayment.remainingAmount)}
              </h2>
            </div>
            <div className="rounded-lg bg-bark-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-bark-400">Nội dung CK</p>
              <p className="mt-1 font-bold text-bark-900">{order.transferContent}</p>
            </div>
            {orderPayment.remainingAmount <= 0 ? (
              <div className="rounded-lg border border-moss-100 bg-moss-100 p-4 text-center text-sm font-semibold text-moss-700">
                Đơn này đã thanh toán đủ.
              </div>
            ) : qrUrl ? (
              <img
                alt={`QR thanh toán ${order.orderCode}`}
                className="mx-auto w-full max-w-72 rounded-lg border border-bark-100 bg-white"
                src={qrUrl}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-bark-200 p-5 text-center text-sm text-bark-500">
                Chưa tạo được QR vì thiếu số tiền hoặc nội dung chuyển khoản.
              </div>
            )}
            <Field label="Tin nhắn gửi khách">
              <TextareaInput readOnly value={message} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="col-span-2 sm:col-span-1"
                icon={Clipboard}
                onClick={() => onCopy(message, "Đã copy tin nhắn")}
                type="button"
              >
                Sao chép tin
              </Button>
              <Button
                className="col-span-2 sm:col-span-1"
                disabled={!qrUrl}
                icon={QrCode}
                onClick={() => onCopy(qrUrl, "Đã copy link QR")}
                type="button"
                variant="secondary"
              >
                Tạo QR số tiền còn lại
              </Button>
              <Button
                className="col-span-2"
                disabled={!qrUrl}
                icon={Download}
                onClick={() => onDownload(qrUrl, order.orderCode)}
                type="button"
                variant="secondary"
              >
                Tải ảnh QR
              </Button>
            </div>
            <Button
              disabled={orderPayment.paymentStatus === "paid" || order.status === "cancelled"}
              icon={WalletCards}
              onClick={() => onMarkPaid(order.id)}
              type="button"
              variant="moss"
            >
              Đã thanh toán đủ
            </Button>
          </Panel>

          <Panel className="grid gap-4">
            <h2 className="text-lg font-bold text-bark-900">Cập nhật thanh toán</h2>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-bark-500">Tổng tiền</span>
                <strong>{formatCurrency(order.totalAmount)}</strong>
              </div>
              <Field label="Số tiền thanh toán trước">
                <TextInput
                  inputMode="numeric"
                  max={order.totalAmount}
                  min="0"
                  onChange={(event) => setEditablePrepaid(event.target.value)}
                  type="number"
                  value={editablePrepaid}
                />
              </Field>
              <div className="flex justify-between">
                <span className="text-bark-500">Còn lại sau khi lưu</span>
                <strong>{formatCurrency(editablePayment.remainingAmount)}</strong>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                icon={Save}
                onClick={() => onSavePayment(order.id, editablePrepaid)}
                type="button"
              >
                Lưu thanh toán
              </Button>
              <Button
                icon={WalletCards}
                onClick={() => onSavePayment(order.id, order.totalAmount)}
                type="button"
                variant="moss"
              >
                Đã thanh toán đủ
              </Button>
            </div>
          </Panel>

          {nextActions.length ? (
            <Panel className="grid gap-3">
              <h2 className="text-lg font-bold text-bark-900">Cập nhật trạng thái</h2>
              <div className="grid gap-2">
                {nextActions.map((action) => (
                  <Button
                    icon={action.icon}
                    key={action.status}
                    onClick={() => onSetOrderStatus(order.id, action.status)}
                    type="button"
                    variant={action.variant}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel className="grid gap-3 border-rose-200 bg-rose-50/80">
            <h2 className="text-lg font-bold text-rose-900">Xóa đơn hàng</h2>
            <p className="text-sm leading-6 text-rose-800">
              Xóa đơn khỏi danh sách. Nếu đơn chưa thanh toán đủ, sản phẩm sẽ được trả về còn hàng.
            </p>
            <Button
              icon={Trash2}
              onClick={() => onRequestDelete(order)}
              type="button"
              variant="danger"
            >
              Xóa đơn
            </Button>
          </Panel>
        </div>
      </div>
    </>
  );
}

function QrGeneratorPage({ settings, onCopy, onDownload }) {
  const [amount, setAmount] = useState("");
  const [orderCode, setOrderCode] = useState("DH0001");
  const [username, setUsername] = useState("");

  const transferContent = sanitizeTransferContent(`${orderCode} ${username}`);
  const totalAmount = toNumber(amount);
  const qrUrl = buildQrUrl(settings, totalAmount, transferContent);
  const message = makePaymentMessage(
    {
      totalAmount,
      transferContent: transferContent || "NOI DUNG CK",
    },
    settings,
    qrUrl,
    { amount: totalAmount, mode: "standalone" },
  );

  return (
    <>
      <PageHeader eyebrow="VietQR" title="Tạo QR riêng" />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số tiền">
              <TextInput
                inputMode="numeric"
                min="1"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="350000"
                type="number"
                value={amount}
              />
            </Field>
            <Field label="Mã đơn">
              <TextInput onChange={(event) => setOrderCode(event.target.value)} value={orderCode} />
            </Field>
            <Field label="Tên Instagram">
              <TextInput
                onChange={(event) => setUsername(event.target.value)}
                placeholder="@tenkhach"
                value={username}
              />
            </Field>
            <Field label="Mẫu QR">
              <TextInput readOnly value={settings.qrTemplate} />
            </Field>
          </div>
          <div className="rounded-lg bg-bark-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-bark-400">Nội dung sau lọc</p>
            <p className="mt-1 font-bold text-bark-900">{transferContent || "Chưa có nội dung"}</p>
          </div>
        </Panel>

        <Panel className="grid content-start gap-4">
          <div>
            <p className="text-sm font-semibold text-bark-500">Xem trước QR</p>
            <h2 className="text-xl font-bold text-bark-900">{formatCurrency(totalAmount)}</h2>
          </div>
          {qrUrl ? (
            <img
              alt="QR thanh toán"
              className="mx-auto w-full max-w-72 rounded-lg border border-bark-100 bg-white"
              src={qrUrl}
            />
          ) : (
            <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-bark-200 bg-bark-50 text-center text-sm text-bark-500">
              Nhập số tiền và nội dung để xem QR.
            </div>
          )}
          <Field label="Tin nhắn thanh toán">
            <TextareaInput readOnly value={message} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!qrUrl}
              icon={Clipboard}
              onClick={() => onCopy(message, "Đã copy tin nhắn")}
              type="button"
            >
              Sao chép tin
            </Button>
            <Button
              disabled={!qrUrl}
              icon={Copy}
              onClick={() => onCopy(qrUrl, "Đã copy link QR")}
              type="button"
              variant="secondary"
            >
              Sao chép QR
            </Button>
            <Button
              className="col-span-2"
              disabled={!qrUrl}
              icon={Download}
              onClick={() => onDownload(qrUrl, transferContent || "vietqr")}
              type="button"
              variant="secondary"
            >
              Tải ảnh QR
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function SettingsPage({
  settings,
  onSave,
  go,
  onLockApp,
  onChangePassword,
  cloudConfigured,
  cloudStatus,
  onExportData,
  onImportData,
}) {
  const [form, setForm] = useState(settings);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const importInputRef = useRef(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const setPasswordField = (name, value) =>
    setPasswordForm((current) => ({ ...current, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  const changePassword = async () => {
    setPasswordMessage("");
    if (!passwordForm.newPassword.trim()) {
      setPasswordMessage("Nhập mật khẩu mới trước đã nhé.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("Hai mật khẩu chưa khớp.");
      return;
    }
    await onChangePassword(passwordForm.newPassword);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordMessage("Đã đổi mật khẩu truy cập.");
  };

  return (
    <>
      <PageHeader
        backAction={() => go("dashboard")}
        eyebrow="Cấu hình"
        title="Cài đặt shop"
      />

      <form className="grid gap-4 lg:grid-cols-[1fr_360px]" onSubmit={submit}>
        <Panel className="grid gap-4">
          <Field label="Tên shop">
            <TextInput
              onChange={(event) => setField("shopName", event.target.value)}
              required
              value={form.shopName}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mã ngân hàng / tên viết tắt / BIN">
              <TextInput
                onChange={(event) => setField("bankId", event.target.value)}
                placeholder="MBBank"
                required
                value={form.bankId}
              />
            </Field>
            <Field label="Số tài khoản">
              <TextInput
                onChange={(event) => setField("accountNo", event.target.value)}
                required
                value={form.accountNo}
              />
            </Field>
            <Field label="Tên tài khoản">
              <TextInput
                onChange={(event) => setField("accountName", event.target.value)}
                required
                value={form.accountName}
              />
            </Field>
            <Field label="Mẫu QR">
              <SelectInput
                onChange={(event) => setField("qrTemplate", event.target.value)}
                value={form.qrTemplate}
              >
                {QR_TEMPLATES.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </Panel>

        <Panel className="grid content-start gap-4">
          <div className="rounded-lg bg-bark-800 p-5 text-white">
            <WalletCards className="mb-4 h-8 w-8 text-bark-100" />
            <p className="text-sm font-semibold text-bark-100">{form.shopName || "Tên shop"}</p>
            <p className="mt-2 text-2xl font-bold">{form.bankId || "MBBank"}</p>
            <p className="mt-1 text-bark-100">{form.accountNo || "123456789"}</p>
            <p className="mt-1 font-semibold">{form.accountName || "NGUYEN VAN A"}</p>
          </div>
          <Button className="w-full" icon={Save} type="submit">
            Lưu cài đặt
          </Button>
        </Panel>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel className="grid gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-moss-700 text-white">
              <Boxes className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-bark-900">Sao lưu dữ liệu</h2>
              <p className="mt-1 text-sm leading-6 text-bark-600">
                Xuất dữ liệu trước khi đổi máy hoặc chuyển sang Supabase.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button icon={Download} onClick={onExportData} type="button" variant="secondary">
              Export JSON
            </Button>
            <Button
              icon={Clipboard}
              onClick={() => importInputRef.current?.click()}
              type="button"
              variant="secondary"
            >
              Import JSON
            </Button>
          </div>
          <input
            accept="application/json,.json"
            className="hidden"
            onChange={onImportData}
            ref={importInputRef}
            type="file"
          />
        </Panel>

        <Panel
          className={cn(
            "grid content-start gap-3",
            cloudConfigured ? "border-moss-100 bg-moss-100/80" : "border-clay-200 bg-clay-100/80",
          )}
        >
          <h2 className="text-lg font-black text-bark-900">Cloud database</h2>
          <p className="rounded-lg border border-bark-200/70 bg-cream-50/80 px-3 py-2 text-sm font-bold text-bark-700">
            Cloud row: {CLOUD_STATE_ID}
          </p>
          {cloudConfigured ? (
            <p className="text-sm leading-6 text-moss-700">
              Supabase đã được cấu hình. {cloudStatus}
            </p>
          ) : (
            <p className="text-sm leading-6 text-clay-700">
              Cloud database is not configured. Data is currently saved on this browser only.
            </p>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel className="grid gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-bark-900 text-cream-50">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-bark-900">Mật khẩu truy cập</h2>
              <p className="mt-1 text-sm leading-6 text-bark-600">
                Mật khẩu dashboard được lưu cục bộ bằng SHA-256 cho MVP cá nhân.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mật khẩu mới">
              <PasswordInput
                autoComplete="new-password"
                onChange={(value) => setPasswordField("newPassword", value)}
                placeholder="Nhập mật khẩu mới"
                value={passwordForm.newPassword}
              />
            </Field>
            <Field label="Xác nhận mật khẩu">
              <PasswordInput
                autoComplete="new-password"
                onChange={(value) => setPasswordField("confirmPassword", value)}
                placeholder="Nhập lại mật khẩu mới"
                value={passwordForm.confirmPassword}
              />
            </Field>
          </div>
          {passwordMessage ? (
            <p className="rounded-lg border border-bark-200 bg-cream-50 px-3 py-2 text-sm font-semibold text-bark-700">
              {passwordMessage}
            </p>
          ) : null}
          <Button icon={KeyRound} onClick={changePassword} type="button" variant="secondary">
            Đổi mật khẩu
          </Button>
        </Panel>

        <Panel className="grid content-start gap-4 border-clay-200 bg-clay-100/80">
          <div>
            <h2 className="text-lg font-black text-bark-900">Khóa phiên làm việc</h2>
            <p className="mt-1 text-sm leading-6 text-bark-600">
              Đưa app về màn hình nhập mật khẩu khi bạn rời máy.
            </p>
          </div>
          <Button icon={LogOut} onClick={onLockApp} type="button" variant="danger">
            Lock app
          </Button>
        </Panel>
      </div>
    </>
  );
}

function AppShell({ children, view, go, settings, toast }) {
  const navItems = [
    { page: "dashboard", label: "Trang chủ", icon: Home },
    { page: "products", label: "Sản phẩm", icon: Boxes },
    { page: "orders", label: "Đơn", icon: ShoppingBag },
    { page: "qr", label: "QR", icon: QrCode },
    { page: "customers", label: "Khách", icon: Users },
  ];

  const navActive = (page) => {
    if (page === "orders") return ["orders", "create-order", "order-detail"].includes(view.page);
    if (page === "products") return ["products", "product-form"].includes(view.page);
    if (page === "customers") return ["customers", "customer-form"].includes(view.page);
    return view.page === page;
  };

  return (
    <div className="app-stage min-h-screen overflow-x-hidden pb-24 text-bark-900 lg:pb-0">
      <header className="sticky top-3 z-20 px-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-lg border border-bark-200/80 bg-cream-100/86 px-3 py-2.5 shadow-retro backdrop-blur sm:px-4">
          <button
            className="focus-ring group flex min-w-0 items-center gap-3 rounded-lg text-left"
            onClick={() => go("dashboard")}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-bark-900 text-cream-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition group-hover:rotate-2">
              <ShopLogo />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-bark-900">
                {settings.shopName || "banduthu"}
              </span>
            </span>
          </button>
          <div className="hidden items-center gap-1 rounded-lg border border-bark-100 bg-cream-50/70 p-1 lg:flex">
            {navItems.map((item) => (
              <Button
                icon={item.icon}
                key={item.page}
                onClick={() => go(item.page)}
                size="sm"
                variant={navActive(item.page) ? "primary" : "ghost"}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button
            aria-label="Cài đặt"
            icon={SettingsIcon}
            onClick={() => go("settings")}
            size="icon"
            variant={view.page === "settings" ? "primary" : "secondary"}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:py-9">{children}</main>

      <nav className="fixed inset-x-0 bottom-3 z-30 px-3 lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 rounded-lg border border-bark-200/80 bg-cream-100/92 p-1.5 shadow-retro backdrop-blur">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = navActive(item.page);
            return (
              <button
                className={cn(
                  "focus-ring grid min-h-14 place-items-center gap-1 rounded-lg px-1 text-[11px] font-black transition duration-200 active:translate-y-px",
                  active
                    ? "bg-bark-900 text-cream-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "text-bark-500 hover:bg-bark-100/70",
                )}
                key={item.page}
                onClick={() => go(item.page)}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-cream-50/10 bg-bark-900 px-4 py-2 text-sm font-bold text-cream-50 shadow-retro lg:bottom-6">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useLocalStorageState(STORAGE_KEYS.products, []);
  const [customers, setCustomers] = useLocalStorageState(STORAGE_KEYS.customers, []);
  const [orders, setOrders] = useLocalStorageState(STORAGE_KEYS.orders, []);
  const [settings, setSettings] = useLocalStorageState(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [lockState, setLockState] = useState(() => {
    const hasPassword = Boolean(window.localStorage.getItem(LOCK_KEYS.passwordHash));
    const hasSession = window.localStorage.getItem(LOCK_KEYS.session) === "unlocked";
    return { hasPassword, unlocked: hasPassword && hasSession };
  });
  const [view, setView] = useState({ page: "dashboard" });
  const [toast, setToast] = useState("");
  const [deleteOrderCandidate, setDeleteOrderCandidate] = useState(null);
  const [cloudStatus, setCloudStatus] = useState(
    SUPABASE_CONFIGURED ? "Đang kiểm tra kết nối." : "",
  );
  const hasLoadedCloudRef = useRef(!SUPABASE_CONFIGURED);
  const cloudSaveTimerRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return undefined;

    let cancelled = false;
    setCloudStatus("Đang tải dữ liệu cloud.");

    loadCloudState()
      .then((payload) => {
        if (cancelled) return;

        if (payload) {
          setProducts(Array.isArray(payload.products) ? payload.products : []);
          setCustomers(Array.isArray(payload.customers) ? payload.customers : []);
          setOrders(Array.isArray(payload.orders) ? payload.orders : []);
          setSettings(payload.settings || DEFAULT_SETTINGS);
          setCloudStatus("Đã tải dữ liệu cloud.");
        } else {
          setCloudStatus("Chưa có dữ liệu cloud. App sẽ tạo bản sao từ trình duyệt này.");
        }

        hasLoadedCloudRef.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        hasLoadedCloudRef.current = true;
        setCloudStatus("Không kết nối được Supabase. App vẫn dùng dữ liệu trên trình duyệt.");
      });

    return () => {
      cancelled = true;
    };
  }, [setProducts, setCustomers, setOrders, setSettings]);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED || !hasLoadedCloudRef.current) return undefined;

    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
    }

    cloudSaveTimerRef.current = window.setTimeout(() => {
      saveCloudState({ products, customers, orders, settings })
        .then(() => setCloudStatus("Đã lưu dữ liệu cloud."))
        .catch(() =>
          setCloudStatus("Không lưu được lên Supabase. Dữ liệu vẫn được giữ trên trình duyệt."),
        );
    }, 800);

    return () => {
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, [products, customers, orders, settings]);

  const go = (page, options = {}) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setView({ page, ...options });
  };

  const copyText = async (text, successMessage = "Đã copy") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast(successMessage);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setToast(successMessage);
    }
  };

  const downloadQr = (url, name = "vietqr") => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeTransferContent(name) || "vietqr"}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Đã mở tải ảnh QR");
  };

  const exportData = () => {
    const payload = {
      app: "secondhand-ig-seller",
      exportedAt: nowIso(),
      products,
      customers,
      orders,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `secondhand-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast("Đã export dữ liệu JSON");
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || "{}"));
        if (
          !Array.isArray(payload.products) ||
          !Array.isArray(payload.customers) ||
          !Array.isArray(payload.orders) ||
          !payload.settings
        ) {
          throw new Error("Invalid backup");
        }

        setProducts(payload.products);
        setCustomers(payload.customers);
        setOrders(payload.orders);
        setSettings(payload.settings);
        setToast("Đã import dữ liệu JSON");
      } catch {
        setToast("File import không hợp lệ");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const setupLockPassword = async (password) => {
    const passwordHash = await hashPassword(password);
    window.localStorage.setItem(LOCK_KEYS.passwordHash, passwordHash);
    window.localStorage.setItem(LOCK_KEYS.session, "unlocked");
    setLockState({ hasPassword: true, unlocked: true });
    return true;
  };

  const unlockApp = async (password) => {
    const storedHash = window.localStorage.getItem(LOCK_KEYS.passwordHash);
    const incomingHash = await hashPassword(password);
    if (storedHash && storedHash === incomingHash) {
      window.localStorage.setItem(LOCK_KEYS.session, "unlocked");
      setLockState({ hasPassword: true, unlocked: true });
      return true;
    }
    return false;
  };

  const lockApp = () => {
    window.localStorage.removeItem(LOCK_KEYS.session);
    setLockState((current) => ({ ...current, unlocked: false }));
    setToast("");
  };

  const changeLockPassword = async (password) => {
    const passwordHash = await hashPassword(password);
    window.localStorage.setItem(LOCK_KEYS.passwordHash, passwordHash);
    window.localStorage.setItem(LOCK_KEYS.session, "unlocked");
    setLockState({ hasPassword: true, unlocked: true });
    setToast("Đã đổi mật khẩu truy cập");
    return true;
  };

  const selectedProduct = products.find((product) => product.id === view.id);
  const selectedCustomer = customers.find((customer) => customer.id === view.id);
  const selectedOrder = orders.find((order) => order.id === view.id);
  const selectedOrderCustomer = customers.find((customer) => customer.id === selectedOrder?.customerId);

  const saveProduct = (form) => {
    const timestamp = nowIso();
    if (form.id) {
      setProducts((current) =>
        current.map((product) =>
          product.id === form.id ? { ...product, ...form, updatedAt: timestamp } : product,
        ),
      );
      setToast("Đã lưu sản phẩm");
    } else {
      setProducts((current) => [
        {
          ...form,
          id: makeId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ...current,
      ]);
      setToast("Đã thêm sản phẩm");
    }
    go("products");
  };

  const updateProductStatus = (id, status) => {
    const orderedProductIds = new Set(
      orders.flatMap((order) => (order.items || []).map((item) => item.id)),
    );
    const timestamp = nowIso();

    setProducts((current) =>
      current.map((product) => {
        if (product.id !== id) return product;

        const shouldAddDirectRevenue =
          status === "sold" &&
          product.status !== "sold" &&
          !orderedProductIds.has(product.id);
        const shouldRemoveDirectRevenue = status !== "sold" && product.directRevenueAmount;

        const nextProduct = {
          ...product,
          status,
          updatedAt: timestamp,
        };

        if (shouldAddDirectRevenue) {
          nextProduct.directRevenueAmount = toNumber(product.sellingPrice);
          nextProduct.directRevenueAt = timestamp;
        }

        if (shouldRemoveDirectRevenue) {
          delete nextProduct.directRevenueAmount;
          delete nextProduct.directRevenueAt;
        }

        return nextProduct;
      }),
    );
    setToast(status === "sold" ? "Đã bán và ghi nhận doanh thu" : "Đã cập nhật sản phẩm");
  };

  const saveCustomer = (form) => {
    const timestamp = nowIso();
    const cleanForm = {
      instagramUsername: form.instagramUsername.trim(),
      name: form.name?.trim() || "",
      phone: form.phone?.trim() || "",
      address: form.address?.trim() || "",
      note: form.note?.trim() || "",
      tags: form.tags || [],
    };

    if (form.id) {
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === form.id ? { ...customer, ...cleanForm } : customer,
        ),
      );
      setToast("Đã lưu khách hàng");
    } else {
      setCustomers((current) => [
        {
          ...cleanForm,
          id: makeId(),
          createdAt: timestamp,
        },
        ...current,
      ]);
      setToast("Đã thêm khách hàng");
    }
    go("customers");
  };

  const createOrder = ({
    customer,
    products: selectedProducts,
    shippingFee,
    discount,
    subtotal,
    totalAmount,
    prepaidAmount = 0,
    remainingAmount,
    paymentStatus,
    transferContent,
    qrImageUrl,
  }) => {
    const timestamp = nowIso();
    const payment = calculatePayment(totalAmount, prepaidAmount);
    const nextPaymentStatus = paymentStatus || payment.paymentStatus;
    const nextStatus = nextPaymentStatus === "paid" ? "paid" : "waiting_payment";
    const revenueEvents =
      payment.prepaidAmount > 0
        ? [
            makeRevenueEvent(
              payment.prepaidAmount,
              nextPaymentStatus === "paid" ? "paid" : "deposit",
              timestamp,
            ),
          ]
        : [];
    const order = {
      id: makeId(),
      orderCode: makeOrderCode(orders),
      customerId: customer.id,
      customerInstagramUsername: customer.instagramUsername,
      items: selectedProducts.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        category: product.category,
        size: product.size,
        color: product.color,
        condition: product.condition,
        costPrice: toNumber(product.costPrice),
        sellingPrice: toNumber(product.sellingPrice),
        imageUrl: product.imageUrl,
      })),
      subtotal,
      shippingFee,
      discount,
      totalAmount,
      prepaidAmount: payment.prepaidAmount,
      remainingAmount: remainingAmount ?? payment.remainingAmount,
      status: nextStatus,
      paymentStatus: nextPaymentStatus,
      revenueEvents,
      transferContent,
      qrImageUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setOrders((current) => [order, ...current]);
    setProducts((current) =>
      current.map((product) =>
        selectedProducts.some((item) => item.id === product.id)
          ? {
              ...product,
              status: nextPaymentStatus === "paid" ? "sold" : "holding",
              updatedAt: timestamp,
            }
          : product,
      ),
    );
    setToast(nextPaymentStatus === "paid" ? "Đã tạo đơn đã thanh toán" : "Đã tạo đơn");
    go("order-detail", { id: order.id });
  };

  const updateOrderPayment = (orderId, prepaidAmount) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const timestamp = nowIso();
    const payment = calculatePayment(order.totalAmount, prepaidAmount);
    const revenueDelta = getRevenueDelta(order, payment.prepaidAmount);
    const nextRevenueEvents =
      revenueDelta !== 0
        ? [
            ...getOrderRevenueEvents(order),
            makeRevenueEvent(
              revenueDelta,
              payment.paymentStatus === "paid" ? "paid" : "deposit",
              timestamp,
            ),
          ]
        : getOrderRevenueEvents(order);
    const nextStatus =
      order.status === "cancelled"
        ? "cancelled"
        : payment.paymentStatus === "paid"
          ? "paid"
          : "waiting_payment";
    const nextQrUrl =
      payment.remainingAmount > 0
        ? buildQrUrl(settings, payment.remainingAmount, order.transferContent)
        : "";

    setOrders((current) =>
      current.map((item) =>
        item.id === orderId
          ? {
              ...item,
              prepaidAmount: payment.prepaidAmount,
              remainingAmount: payment.remainingAmount,
              paymentStatus: payment.paymentStatus,
              revenueEvents: nextRevenueEvents,
              status: nextStatus,
              qrImageUrl: nextQrUrl,
              updatedAt: timestamp,
            }
          : item,
      ),
    );
    setProducts((current) =>
      current.map((product) =>
        order.items.some((item) => item.id === product.id)
          ? {
              ...product,
              status: payment.paymentStatus === "paid" ? "sold" : "holding",
              updatedAt: timestamp,
            }
          : product,
      ),
    );
    setToast(
      payment.paymentStatus === "paid"
        ? "Đơn đã thanh toán đủ"
        : "Đã lưu thanh toán",
    );
  };

  const markOrderPaid = (orderId) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    updateOrderPayment(orderId, order.totalAmount);
  };

  const requestDeleteOrder = (order) => {
    setDeleteOrderCandidate(order);
  };

  const cancelDeleteOrder = () => {
    setDeleteOrderCandidate(null);
  };

  const confirmDeleteOrder = () => {
    if (!deleteOrderCandidate) return;

    const order = deleteOrderCandidate;
    const payment = getOrderPayment(order);
    const timestamp = nowIso();

    if (payment.paymentStatus !== "paid") {
      setProducts((current) =>
        current.map((product) =>
          order.items.some((item) => item.id === product.id)
            ? { ...product, status: "available", updatedAt: timestamp }
            : product,
        ),
      );
    }

    setOrders((current) => current.filter((item) => item.id !== order.id));
    setDeleteOrderCandidate(null);
    setToast("Đã xóa đơn hàng");

    if (view.page === "order-detail" && view.id === order.id) {
      go("orders");
    }
  };

  const setOrderStatus = (orderId, status) => {
    const order = orders.find((item) => item.id === orderId);
    const timestamp = nowIso();
    const shouldComplete = status === "completed" && order;
    const completedPayment = shouldComplete
      ? calculatePayment(order.totalAmount, order.totalAmount)
      : null;
    const completionRevenueDelta = shouldComplete
      ? getRevenueDelta(order, order.totalAmount)
      : 0;
    const completionRevenueEvents =
      shouldComplete && completionRevenueDelta !== 0
        ? [
            ...getOrderRevenueEvents(order),
            makeRevenueEvent(completionRevenueDelta, "completion", timestamp),
          ]
        : shouldComplete
          ? getOrderRevenueEvents(order)
          : null;

    setOrders((current) =>
      current.map((item) =>
        item.id === orderId
          ? {
              ...item,
              status,
              ...(shouldComplete
                ? {
                    prepaidAmount: completedPayment.prepaidAmount,
                    remainingAmount: completedPayment.remainingAmount,
                    paymentStatus: completedPayment.paymentStatus,
                    revenueEvents: completionRevenueEvents,
                  }
                : {}),
              updatedAt: timestamp,
            }
          : item,
      ),
    );

    if (shouldComplete) {
      setProducts((current) =>
        current.map((product) =>
          order.items.some((item) => item.id === product.id)
            ? { ...product, status: "sold", updatedAt: timestamp }
            : product,
        ),
      );
    }

    if (status === "cancelled" && order && order.paymentStatus !== "paid") {
      setProducts((current) =>
        current.map((product) =>
          order.items.some((item) => item.id === product.id)
            ? { ...product, status: "available", updatedAt: timestamp }
            : product,
        ),
      );
    }

    setToast("Đã cập nhật trạng thái đơn");
  };

  const saveSettings = (form) => {
    setSettings({
      shopName: form.shopName.trim() || DEFAULT_SETTINGS.shopName,
      bankId: form.bankId.trim() || DEFAULT_SETTINGS.bankId,
      accountNo: form.accountNo.trim() || DEFAULT_SETTINGS.accountNo,
      accountName: form.accountName.trim() || DEFAULT_SETTINGS.accountName,
      qrTemplate: QR_TEMPLATES.includes(form.qrTemplate) ? form.qrTemplate : DEFAULT_SETTINGS.qrTemplate,
    });
    setToast("Đã lưu cài đặt");
    go("dashboard");
  };

  const page = useMemo(() => {
    switch (view.page) {
      case "products":
        return (
          <ProductsPage
            go={go}
            products={products}
            updateProductStatus={updateProductStatus}
          />
        );
      case "product-form":
        return <ProductFormPage go={go} onSave={saveProduct} product={selectedProduct} />;
      case "customers":
        return <CustomersPage customers={customers} go={go} orders={orders} />;
      case "customer-form":
        return <CustomerFormPage customer={selectedCustomer} go={go} onSave={saveCustomer} />;
      case "orders":
        return <OrdersPage go={go} onRequestDelete={requestDeleteOrder} orders={orders} />;
      case "create-order":
        return (
          <CreateOrderPage
            customers={customers}
            go={go}
            initialCustomerId={view.customerId}
            onCreate={createOrder}
            orders={orders}
            products={products}
            settings={settings}
          />
        );
      case "order-detail":
        return (
          <OrderDetailPage
            customer={selectedOrderCustomer}
            go={go}
            onCopy={copyText}
            onDownload={downloadQr}
            onMarkPaid={markOrderPaid}
            onRequestDelete={requestDeleteOrder}
            onSavePayment={updateOrderPayment}
            onSetOrderStatus={setOrderStatus}
            order={selectedOrder}
            settings={settings}
          />
        );
      case "qr":
        return <QrGeneratorPage onCopy={copyText} onDownload={downloadQr} settings={settings} />;
      case "settings":
        return (
          <SettingsPage
            cloudConfigured={SUPABASE_CONFIGURED}
            cloudStatus={cloudStatus}
            go={go}
            onChangePassword={changeLockPassword}
            onExportData={exportData}
            onImportData={importData}
            onLockApp={lockApp}
            onSave={saveSettings}
            settings={settings}
          />
        );
      default:
        return (
          <DashboardPage
            customers={customers}
            go={go}
            orders={orders}
            products={products}
          />
        );
    }
  }, [view, products, customers, orders, settings, selectedProduct, selectedCustomer, selectedOrder, selectedOrderCustomer]);

  if (!lockState.unlocked) {
    return (
      <LockScreen
        hasPassword={lockState.hasPassword}
        onSetupPassword={setupLockPassword}
        onUnlock={unlockApp}
        settings={settings}
      />
    );
  }

  return (
    <AppShell go={go} settings={settings} toast={toast} view={view}>
      {page}
      <ConfirmDeleteOrderModal
        onCancel={cancelDeleteOrder}
        onConfirm={confirmDeleteOrder}
        order={deleteOrderCandidate}
      />
    </AppShell>
  );
}
