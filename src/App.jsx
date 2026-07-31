import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.DEV ? "http://localhost:3000/api" : "https://api.goservices.lol/api";

const DISTRICTS = ["Ваке", "Сабуртало", "Мтацминда", "Дидубе", "Глдани", "Исани", "Самгори", "Чугурети", "Крцаниси", "Надзаладеви"];
const URGENCY_OPTIONS = ["Срочно, сегодня", "Завтра", "На этой неделе", "Не срочно"];
const LANGUAGE_OPTIONS = ["Русский", "Английский", "Грузинский"];

const FACTOR_LABELS = {
  service: "Совпадение по услуге",
  distance: "Расстояние",
  price: "Цена",
  rating: "Рейтинг",
  reviews: "Отзывы",
  speed: "Скорость ответа",
};
const FACTOR_WEIGHTS = { service: 30, distance: 20, price: 15, rating: 15, reviews: 10, speed: 10 };

const STATUS_LABELS = {
  open: "поиск мастера",
  matched: "мастер выбран",
  completed: "завершена",
  cancelled: "отменена",
};

/* ---------------------------------------------------------------
   Локализация. t(s) ищет русскую строку-ключ в словаре и возвращает
   английский перевод, если выбран английский язык, иначе — саму
   строку без изменений. Контент из базы (названия услуг/районов,
   которые вводит админ, описания мастеров, тексты отзывов) не
   переводится — это ограничение MVP, а не баг.
--------------------------------------------------------------- */

const RU_TO_EN = {
  // Общее
  "Русский": "Russian",
  "Английский": "English",
  "Грузинский": "Georgian",
  "Назад": "Back",
  "Начать заново": "Start over",
  "Отправить": "Send",
  "Написать сообщение…": "Write a message…",
  "Сообщений пока нет.": "No messages yet.",
  "звёзд": "stars",
  "Загрузка…": "Loading…",
  "Открыть": "Open",
  "Отмена": "Cancel",
  "Готово": "Done",
  "Имя": "Name",
  "Телефон": "Phone",
  "Email": "Email",
  "Описание": "Description",
  "Языки": "Languages",
  "Поддержка": "Support",
  "Написать в поддержку →": "Contact support →",
  "Опасная зона": "Danger zone",
  "Удалить аккаунт": "Delete account",
  "Да, удалить": "Yes, delete",
  "Уведомления": "Notifications",
  "Аккаунт": "Account",
  "район не указан": "area not specified",
  "не указан": "not specified",
  "Без описания": "No description",
  "Пользователь": "User",
  "Гость": "Guest",
  "Другое": "Other",
  // Районы (Тбилиси — переведены транслитерацией)
  "Ваке": "Vake",
  "Сабуртало": "Saburtalo",
  "Мтацминда": "Mtatsminda",
  "Дидубе": "Didube",
  "Глдани": "Gldani",
  "Исани": "Isani",
  "Самгори": "Samgori",
  "Чугурети": "Chughureti",
  "Крцаниси": "Krtsanisi",
  "Надзаладеви": "Nadzaladevi",
  // Срочность
  "Срочно, сегодня": "Urgent, today",
  "Завтра": "Tomorrow",
  "На этой неделе": "This week",
  "Не срочно": "Not urgent",
  // Статусы заявок
  "поиск мастера": "looking for a pro",
  "мастер выбран": "pro selected",
  "завершена": "completed",
  "отменена": "cancelled",
  "в архиве": "archived",
  // Язык-скрин
  "Выберите язык": "Choose language",
  "Язык приложения": "App language",
  // Таб-бар / общие разделы
  "Главная": "Home",
  "Заявки": "Requests",
  "Заказы": "Orders",
  "Профиль": "Profile",
  "Ещё": "More",
  "Предложения": "Offers",
  // Роль
  ", привет": ", hi",
  "Вы клиент или мастер?": "Are you a client or a pro?",
  "Я клиент": "I'm a client",
  "Ищу мастера для задачи": "Looking for a pro for a task",
  "Я мастер": "I'm a pro",
  "Хочу получать заявки": "Want to receive requests",
  // Клиент: создание заявки
  "Категории": "Categories",
  "Категорий пока нет — загляните позже.": "No categories yet — check back later.",
  "Услуга": "Service",
  "Опишите задачу": "Describe the task",
  "Район": "Area",
  "Срочность": "Urgency",
  "Бюджет": "Budget",
  "Выберите район и срочность, чтобы продолжить": "Choose an area and urgency to continue",
  "Заявка отправлена": "Request sent",
  "Эти мастера подходят под вашу задачу и могут откликнуться:": "These pros match your task and can respond:",
  "отз.": "rev.",
  "Подходящих мастеров пока нет — загляните позже в «Мои заявки».": "No matching pros yet — check «My requests» later.",
  // Отклик мастера (карточка)
  "Заявка": "Request",
  "Посмотреть мастера": "View pro",
  "Выбрать": "Select",
  "Отказаться": "Decline",
  "выбран": "selected",
  "отклонён": "declined",
  // Клиент: кабинет
  "Привет": "Hi",
  "Активная заявка": "Active request",
  "Заказы в работе": "Orders in progress",
  "+ Создать заявку": "+ Create request",
  "Мои заявки": "My requests",
  "Статус: поиск мастера": "Status: looking for a pro",
  "Бюджет: до": "Budget: up to",
  "Предложений": "Offers",
  "Активных заявок пока нет.": "No active requests yet.",
  "Архив заявок": "Archived requests",
  "· удалена": "· deleted",
  "срочность не указана": "urgency not specified",
  "Статус": "Status",
  "Заявка удалена и перенесена в архив — не участвует в статистике и не видна мастерам.": "The request was deleted and moved to the archive — it doesn't affect stats and isn't visible to pros.",
  "Пока никто не откликнулся.": "No one has responded yet.",
  "Удалить заявку": "Delete request",
  "Предложения от мастеров": "Offers from pros",
  "Пока нет новых предложений.": "No new offers yet.",
  "Специализация не указана": "Specialization not specified",
  "✅ Подтверждён": "✅ Verified",
  "⏳ На проверке": "⏳ Under review",
  "Мастер пока не добавил описание.": "The pro hasn't added a description yet.",
  "Мастер пока не указал языки в профиле.": "The pro hasn't listed languages in their profile yet.",
  "Мастер": "Pro",
  "· Завершён": "· Completed",
  "В работе": "In progress",
  "Активных заказов пока нет.": "No active orders yet.",
  "История": "History",
  "Завершённых заказов пока нет.": "No completed orders yet.",
  "Стоимость": "Cost",
  "Создано": "Created",
  "Ваш отзыв": "Your review",
  "Создать ещё заявку": "Create another request",
  "Завершить заказ": "Complete order",
  "Оцените мастера": "Rate the pro",
  "Комментарий (необязательно)": "Comment (optional)",
  "Что понравилось или что можно улучшить": "What you liked or what could be better",
  // Профиль клиента
  "Заявки взяты в работу": "Requests taken into work",
  "Чат с мастерами": "Chat with pros",
  "Все ваши заявки и отзывы будут удалены безвозвратно. Продолжить?": "All your requests and reviews will be permanently deleted. Continue?",
  // Регистрация мастера
  "Какие услуги оказываете": "Which services do you provide",
  "Можно выбрать несколько": "You can select several",
  "Районы работы": "Work areas",
  "— выберите хотя бы один, иначе анкету не отправить": "— select at least one, otherwise the form can't be submitted",
  "Цена от (₾)": "Price from (₾)",
  "О себе": "About you",
  "Опыт, специализация": "Experience, specialization",
  "Ваша цена (₾)": "Your price (₾)",
  "Комментарий": "Comment",
  "Когда сможете приехать, что учли": "When you can arrive, what you factored in",
  // Кабинет мастера
  "Сегодня": "Today",
  "Новых заявок": "New requests",
  "Рейтинг": "Rating",
  "Чаты с клиентами": "Chats with clients",
  "Доход за месяц": "Income this month",
  "Конверсия": "Conversion",
  "заявок": "requests",
  "обработано": "processed",
  "заказов": "orders",
  "конверсия": "conversion",
  "Новые": "New",
  "Завершённые": "Completed",
  "Отклонённые": "Declined",
  "Ждём ответа клиента": "Waiting for client response",
  "Клиент отклонил ваш отклик": "Client declined your offer",
  "Вы отказались от заявки": "You declined the request",
  "Здесь пока пусто.": "Nothing here yet.",
  "Взять в работу": "Take the job",
  "Подтверждённые": "Confirmed",
  "Отменённые": "Cancelled",
  "Описание работы": "Job description",
  "Клиент": "Client",
  "username не указан": "no username",
  "Адрес / район": "Address / area",
  "Сумма работы": "Job amount",
  "💬 Написать в Telegram": "💬 Message on Telegram",
  "Клиент не указал username в Telegram — свяжитесь через заявку.": "The client hasn't set a Telegram username — get in touch via the request.",
  "Клиенты по активным заказам": "Clients from active orders",
  "Основная информация": "Basic information",
  "Категория не выбрана": "No category selected",
  "Расскажите об опыте и специализации": "Tell us about your experience and specialization",
  "Контакты": "Contacts",
  "Скрывать контакты от клиентов": "Hide contacts from clients",
  "Клиент увидит контакты только после подтверждения заказа": "The client will see your contacts only after the order is confirmed",
  "География — работаю": "Areas — I work in",
  "Услуги": "Services",
  "Загрузка списка услуг…": "Loading services list…",
  "Цены": "Prices",
  "Выезд, ₾": "Callout, ₾",
  "Минимальный заказ, ₾": "Minimum order, ₾",
  "Почасовая ставка, ₾": "Hourly rate, ₾",
  "Аналитика": "Analytics",
  "Отзывы": "Reviews",
  "Финансы": "Finance",
  "Подписка": "Subscription",
  "Настройки": "Settings",
  "Получено заявок": "Requests received",
  "Обработано": "Processed",
  "Выбрали (заказы)": "Chosen (orders)",
  "Повторные клиенты": "Repeat clients",
  "отзывов": "reviews",
  "Последние отзывы": "Latest reviews",
  "Отзывов пока нет.": "No reviews yet.",
  "Показать все отзывы →": "Show all reviews →",
  "Раздел в разработке — сумма и история уже реальные, оформление появится позже": "Section in development — the amount and history are already real, the design will follow",
  "Баланс": "Balance",
  "История операций": "Transaction history",
  "заявка №": "request #",
  "Раздел в разработке": "Section in development",
  "Подписка появится позже": "Subscription coming later",
  "Как только определимся с моделью монетизации — здесь можно будет выбрать тариф и продвижение анкеты.": "Once we settle on a monetization model, you'll be able to choose a plan and promote your profile here.",
  "Новые заявки": "New requests",
  "Новые отзывы": "New reviews",
  "Действия по заказам": "Order actions",
  "Уведомления от Telegram-бота — донастроим отдельно.": "Telegram bot notifications — will be configured separately.",
  "Все данные анкеты, заявки и отзывы будут удалены безвозвратно. Продолжить?": "All profile data, requests and reviews will be permanently deleted. Continue?",
  "Опишите проблему или предложение — сообщение придёт в поддержку.": "Describe a problem or a suggestion — the message will reach support.",
  // Заголовки экранов
  "Заказ": "Order",
  "Мастера · Тбилиси": "Pros · Tbilisi",
  "Выбор услуги": "Choose service",
  "Новая заявка": "New request",
  "Подходящие мастера": "Matching pros",
  "Личный кабинет": "Dashboard",
  "Мои заказы": "My orders",
  "Отзыв о мастере": "Review the pro",
  "Регистрация мастера": "Pro registration",
  "Сообщения": "Messages",
  "Ваш отклик": "Your offer",
  "Все отзывы": "All reviews",
  // Кнопки нижней панели / состояния
  "Отправляю…": "Sending…",
  "Отправить заявку": "Send request",
  "Сохраняю…": "Saving…",
  "Оставить отзыв и завершить": "Leave a review and complete",
  "Отправить отклик": "Send offer",
  "Выберите хотя бы одну услугу": "Select at least one service",
  "Выберите хотя бы один район работы": "Select at least one work area",
  "Регистрирую…": "Registering…",
  "Зарегистрироваться": "Register",
  // Факторы подбора
  "Совпадение по услуге": "Service match",
  "Расстояние": "Distance",
  "Цена": "Price",
  "Скорость ответа": "Response speed",
};

const TAB_BAR_SCREENS = new Set([
  "provider-dashboard", "provider-requests", "provider-orders", "provider-profile-cabinet", "provider-more",
  "client-dashboard", "client-my-requests", "client-offers-all", "client-my-orders", "client-profile",
]);

/* ---------------------------------------------------------------
   Telegram: кто открыл Mini App
--------------------------------------------------------------- */

function getTelegramUser() {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  tg?.ready?.();
  tg?.expand?.();
  const u = tg?.initDataUnsafe?.user;
  if (u) {
    return {
      id: String(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Пользователь",
      username: u.username,
      photoUrl: u.photo_url || null,
    };
  }
  // Фоллбэк для тестирования вне Telegram (обычный браузер)
  let demoId = sessionStorage.getItem("demo_telegram_id");
  if (!demoId) {
    demoId = "demo-" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("demo_telegram_id", demoId);
  }
  return { id: demoId, name: "Гость", username: undefined, photoUrl: null };
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function groupServicesByCategory(list, t = (s) => s) {
  const groups = [];
  const byCat = {};
  for (const s of list) {
    const catId = s.category?.id ?? 0;
    if (!byCat[catId]) {
      byCat[catId] = { id: catId, name: s.category?.name || t("Другое"), icon: s.category?.icon || "", items: [] };
      groups.push(byCat[catId]);
    }
    byCat[catId].items.push(s);
  }
  return groups;
}

/* ---------------------------------------------------------------
   Мелкие компоненты
--------------------------------------------------------------- */

function Chip({ label, active, onClick }) {
  return (
    <button type="button" className={`tms-chip ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function MatchRing({ score, size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="tms-matchring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="51%" textAnchor="middle" dominantBaseline="middle" className="tms-matchring-text">{score}</text>
    </svg>
  );
}

function Header({ title, onBack, onClose, t = (s) => s }) {
  return (
    <div className="tms-header">
      {onBack ? <button className="tms-header-btn" onClick={onBack} aria-label={t("Назад")}>←</button> : <span className="tms-header-spacer" />}
      <span className="tms-header-title">{title}</span>
      <button className="tms-header-btn" onClick={onClose} aria-label={t("Начать заново")}>✕</button>
    </div>
  );
}

function BottomBar({ label, onClick, disabled, hint }) {
  if (!label) return null;
  return (
    <div className="tms-bottombar">
      {hint && <p className="tms-bottombar-hint">{hint}</p>}
      <button className="tms-mainbutton" onClick={onClick} disabled={disabled}>{label}</button>
    </div>
  );
}

const PROVIDER_TABS = [
  { key: "provider-dashboard", icon: "🏠", label: "Главная" },
  { key: "provider-requests", icon: "📋", label: "Заявки" },
  { key: "provider-orders", icon: "📦", label: "Заказы" },
  { key: "provider-profile-cabinet", icon: "👤", label: "Профиль" },
  { key: "provider-more", icon: "⋯", label: "Ещё" },
];

const CLIENT_TABS = [
  { key: "client-dashboard", icon: "🏠", label: "Главная" },
  { key: "client-my-requests", icon: "📋", label: "Заявки" },
  { key: "client-offers-all", icon: "🤝", label: "Предложения" },
  { key: "client-my-orders", icon: "📦", label: "Заказы" },
  { key: "client-profile", icon: "👤", label: "Профиль" },
];

function TabBar({ items, active, onNavigate }) {
  return (
    <div className="tms-tabbar">
      {items.map((it) => (
        <button key={it.key} className={`tms-tabbar-item ${active === it.key ? "is-active" : ""}`} onClick={() => onNavigate(it.key)}>
          <span className="tms-tabbar-icon">{it.icon}</span>
          <span className="tms-tabbar-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, onClick, tone }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`tms-stat-card ${onClick ? "is-clickable" : ""} ${tone ? `tms-stat-${tone}` : ""}`} onClick={onClick}>
      <span className="tms-stat-icon">{icon}</span>
      <span className="tms-stat-body">
        <span className="tms-stat-value">{value}</span>
        <span className="tms-stat-label">{label}</span>
      </span>
      {onClick && <span className="tms-chevron">→</span>}
    </Tag>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="tms-segmented">
      {options.map((o) => (
        <button key={o.value} className={`tms-segmented-item ${value === o.value ? "is-active" : ""}`} onClick={() => onChange(o.value)}>
          {o.label}
          {typeof o.count === "number" && <span className="tms-segmented-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, sub }) {
  return (
    <div className="tms-toggle-row">
      <span className="tms-toggle-text">
        <span>{label}</span>
        {sub && <span className="tms-toggle-sub">{sub}</span>}
      </span>
      <button type="button" className={`tms-toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)} aria-label={label}>
        <span className="tms-toggle-knob" />
      </button>
    </div>
  );
}

function ReviewRow({ review }) {
  return (
    <div className="tms-review-row">
      <div className="tms-review-top">
        <span className="tms-provider-name">{review.name}</span>
        <span className="tms-review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
      </div>
      <p className="tms-review-text">«{review.text}»</p>
      <span className="tms-provider-meta">{review.date}</span>
    </div>
  );
}

function ChatThread({ messages, t = (s) => s }) {
  return (
    <div className="tms-chat-thread">
      {messages.map((m, i) => (
        <div key={i} className={`tms-chat-bubble ${m.from === "me" ? "is-me" : "is-client"}`}>
          <p className="tms-chat-text">{m.text}</p>
          <span className="tms-chat-time">{m.time}</span>
        </div>
      ))}
      {messages.length === 0 && <p className="muted">{t("Сообщений пока нет.")}</p>}
    </div>
  );
}

function StarPicker({ value, onChange, t = (s) => s }) {
  return (
    <div className="tms-starpicker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className="tms-starpicker-btn" onClick={() => onChange(n)} aria-label={`${n} ${t("звёзд")}`}>
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

function ChatInputBar({ value, onChange, onSend, t = (s) => s }) {
  return (
    <div className="tms-chatbar">
      <input className="tms-chatbar-input" placeholder={t("Написать сообщение…")} value={value}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSend(); }} />
      <button className="tms-chatbar-send" onClick={onSend} disabled={!value.trim()} aria-label={t("Отправить")}>➤</button>
    </div>
  );
}

/* ---------------------------------------------------------------
   Основной компонент
--------------------------------------------------------------- */

export default function TbilisiMiniApp() {
  const tgUser = useMemo(getTelegramUser, []);

  // Язык выбирается на отдельном экране при каждом открытии приложения
  // (см. renderLanguage); последний выбор запоминается только для того,
  // чтобы подсветить его при следующем открытии, а не чтобы пропустить экран.
  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || "ru");
  const t = (s) => (language === "en" ? RU_TO_EN[s] ?? s : s);
  const locale = language === "en" ? "en-GB" : "ru-RU";

  const [history, setHistory] = useState([]);
  const [screen, setScreen] = useState("language");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- Клиент: создание заявки (существующий рабочий поток) ----
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ categoryId: null, categoryName: null, serviceId: null, serviceName: null, description: "", district: null, urgency: null, budget: 100 });
  const [candidates, setCandidates] = useState([]);
  const [expandedCandidate, setExpandedCandidate] = useState(null);

  // ---- Клиент: личный кабинет (заявки/предложения/заказы — реальные данные с backend) ----
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [viewedProvider, setViewedProvider] = useState(null);
  const [selectedClientOrderId, setSelectedClientOrderId] = useState(null);
  const [reviewTargetRequestId, setReviewTargetRequestId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: "" });
  // Публичного эндпоинта «завершить заказ» на backend пока нет (только admin) —
  // фактическое завершение и отзыв (POST /reviews) реальны, а статус заказа
  // «завершён» до появления такого эндпоинта отслеживаем локально в сессии.
  const [locallyCompletedRequestIds, setLocallyCompletedRequestIds] = useState(() => new Set());
  const [submittedReviews, setSubmittedReviews] = useState({});
  const [clientSettingsForm, setClientSettingsForm] = useState({
    name: tgUser.name,
    phone: "",
    email: "",
    notifyOrders: true,
    notifyChat: true,
  });
  const [clientShowDeleteConfirm, setClientShowDeleteConfirm] = useState(false);

  // ---- Мастер: регистрация / реальные данные ----
  const [provider, setProvider] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [providerForm, setProviderForm] = useState({ description: "", priceFrom: "", serviceIds: [], areas: [] });

  // ---- Мастер: личный кабинет (реальные данные с backend) ----
  const [requestsTab, setRequestsTab] = useState("new");
  const [ordersTab, setOrdersTab] = useState("confirmed");
  const [openRequests, setOpenRequests] = useState([]); // GET /requests/open — подходящие под услуги мастера
  const [myOffers, setMyOffers] = useState([]); // GET /offers/mine — все мои отклики + заявки по ним
  const [dismissedRequestIds, setDismissedRequestIds] = useState(() => new Set()); // «отказаться» от новой заявки — локально в сессии, на backend такого статуса нет
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offerTargetRequest, setOfferTargetRequest] = useState(null);
  const [offerForm, setOfferForm] = useState({ price: "", comment: "" });
  const [profileExtra, setProfileExtra] = useState({
    languages: ["Русский"],
    phone: "",
    telegramContact: tgUser.username ? `@${tgUser.username}` : "",
    email: "",
    contactsHidden: false,
    calloutPrice: "",
    minOrderPrice: "",
    hourlyRate: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    name: tgUser.name,
    phone: "",
    email: "",
    notifyRequests: true,
    notifyReviews: true,
    notifyOrders: true,
    notifyChat: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportDraft, setSupportDraft] = useState("");

  function navigate(next) {
    setError(null);
    setHistory((h) => [...h, screen]);
    setScreen(next);
  }
  function goBack() {
    setError(null);
    setHistory((h) => {
      const copy = [...h];
      const prev = copy.pop();
      if (prev) setScreen(prev);
      return copy;
    });
  }
  function goHome() {
    setHistory([]);
    setError(null);
    setScreen("role");
  }
  function goTab(next) {
    setError(null);
    setHistory([]);
    setScreen(next);
  }

  function chooseLanguage(lang) {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
    setHistory([]);
    setError(null);
    setScreen("role");
  }

  async function withLoading(fn) {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  // ---- Роль: клиент ----

  async function loadMyRequests() {
    setMyRequests(await api(`/requests/mine?telegramId=${tgUser.id}`));
  }

  async function chooseClient() {
    await withLoading(loadMyRequests);
    goTab("client-dashboard");
  }

  function openCreateRequest() {
    navigate("client-home");
    if (categories.length === 0) {
      withLoading(async () => setCategories(await api("/categories"))).catch(() => {});
    }
  }

  async function pickCategory(cat) {
    setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, serviceId: null }));
    navigate("client-services");
    await withLoading(async () => setServices(await api(`/services?categoryId=${cat.id}`)));
  }

  function pickService(s) {
    setForm((f) => ({ ...f, serviceId: s.id, serviceName: s.name }));
    navigate("client-request");
  }

  async function submitRequest() {
    await withLoading(async () => {
      const created = await api("/requests", {
        method: "POST",
        body: JSON.stringify({
          telegramId: tgUser.id,
          name: tgUser.name,
          username: tgUser.username,
          serviceId: form.serviceId,
          description: form.description,
          budget: form.budget,
          urgency: form.urgency,
          area: form.district,
        }),
      });
      const matched = await api(`/requests/${created.id}/candidates`);
      setCandidates(matched);
      await loadMyRequests();
      navigate("client-matches");
    });
  }

  function openRequestDetail(request) {
    setSelectedRequestId(request.id);
    navigate("client-request-detail");
  }

  async function respondToOffer(offerId, status) {
    await withLoading(async () => {
      await api(`/offers/${offerId}/respond`, { method: "PUT", body: JSON.stringify({ status }) });
      await loadMyRequests();
    });
  }

  // Клиент удаляет свою заявку, пока к ней не выбран мастер — уходит в архив,
  // не в статистику и не в ленту мастеров (см. backend requestsService.archive).
  async function archiveRequest(request) {
    await withLoading(async () => {
      await api(`/requests/${request.id}/archive`, { method: "PUT", body: JSON.stringify({ telegramId: tgUser.id }) });
      await loadMyRequests();
      goTab("client-my-requests");
    });
  }

  async function viewProvider(providerId) {
    await withLoading(async () => setViewedProvider(await api(`/providers/${providerId}`)));
    navigate("client-provider-view");
  }

  function openClientOrder(request) {
    setSelectedClientOrderId(request.id);
    navigate("client-order-detail");
  }

  function startReview(request) {
    setReviewTargetRequestId(request.id);
    setReviewForm({ rating: 5, text: "" });
    navigate("client-review");
  }

  async function submitReview() {
    const request = myRequests.find((r) => r.id === reviewTargetRequestId);
    const acceptedOffer = request?.offers.find((o) => o.status === "accepted");
    if (!request || !acceptedOffer) return;
    await withLoading(async () => {
      await api("/reviews", {
        method: "POST",
        body: JSON.stringify({
          telegramId: tgUser.id,
          name: tgUser.name,
          requestId: request.id,
          providerId: acceptedOffer.providerId,
          rating: reviewForm.rating,
          text: reviewForm.text || undefined,
        }),
      });
      setSubmittedReviews((m) => ({ ...m, [request.id]: { rating: reviewForm.rating, text: reviewForm.text } }));
      setLocallyCompletedRequestIds((s) => new Set(s).add(request.id));
      goTab("client-my-orders");
    });
  }

  function confirmDeleteClientAccount() {
    setClientShowDeleteConfirm(false);
    goHome();
  }

  // ---- Роль: мастер ----

  async function ensureAllServices() {
    if (allServices.length === 0) {
      const all = await api("/services");
      setAllServices(all);
    }
  }

  // Открытые заявки под услуги мастера + все его отклики — единственный источник
  // данных для дашборда/заявок/заказов/аналитики, никаких чисел в отрыве от этого.
  async function loadProviderInbox(prov) {
    const serviceIds = (prov.services || []).map((s) => s.serviceId ?? s.service?.id).filter(Boolean);
    const [open, offers] = await Promise.all([
      serviceIds.length ? api(`/requests/open?serviceId=${serviceIds.join(",")}`) : Promise.resolve([]),
      api(`/offers/mine?providerId=${prov.id}`),
    ]);
    setOpenRequests(open);
    setMyOffers(offers);
  }

  async function chooseProvider() {
    await withLoading(async () => {
      const existing = await api(`/providers/by-telegram/${tgUser.id}`);
      if (existing) {
        const full = await api(`/providers/${existing.id}`);
        setProvider(full);
        setProviderForm({
          description: full.description || "",
          priceFrom: full.priceFrom ?? "",
          serviceIds: (full.services || []).map((s) => s.serviceId ?? s.service?.id).filter(Boolean),
          areas: (full.areas || []).map((a) => a.area ?? a),
        });
        await ensureAllServices();
        await loadProviderInbox(full);
        goTab("provider-dashboard");
      } else {
        await ensureAllServices();
        navigate("provider-register");
      }
    });
  }

  function toggleProviderArea(area) {
    setProviderForm((f) => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area],
    }));
  }

  function toggleProviderService(id) {
    setProviderForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }));
  }

  async function submitProviderRegister() {
    await withLoading(async () => {
      const created = await api("/providers/register", {
        method: "POST",
        body: JSON.stringify({
          telegramId: tgUser.id,
          name: tgUser.name,
          username: tgUser.username,
          description: providerForm.description,
          priceFrom: providerForm.priceFrom ? Number(providerForm.priceFrom) : undefined,
          serviceIds: providerForm.serviceIds,
          areas: providerForm.areas,
        }),
      });
      setProvider(created);
      await loadProviderInbox(created);
      goTab("provider-dashboard");
    });
  }

  function openProfileTab() {
    goTab("provider-profile-cabinet");
    ensureAllServices().catch((e) => setError(e.message));
  }

  function toggleProfileLanguage(lang) {
    setProfileExtra((f) => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
    }));
  }

  // Все производные числа кабинета мастера считаются из myOffers/openRequests —
  // реальных данных backend, никаких отдельных чисел-заглушек.
  function getOfferedRequestIds() {
    return new Set(myOffers.map((o) => o.requestId));
  }
  function getNewRequests() {
    const offered = getOfferedRequestIds();
    return openRequests.filter((r) => !offered.has(r.id) && !dismissedRequestIds.has(r.id));
  }
  function getInWorkOffers() {
    return myOffers.filter((o) => o.status === "pending" || (o.status === "accepted" && o.request.status === "matched"));
  }
  function getCompletedOffers() {
    return myOffers.filter((o) => o.status === "accepted" && o.request.status === "completed");
  }
  function getDeclinedOffers() {
    return myOffers.filter((o) => o.status === "declined");
  }
  function getConfirmedOrders() {
    return myOffers.filter((o) => o.status === "accepted" && o.request.status === "matched");
  }
  function getCancelledOrders() {
    return myOffers.filter((o) => o.request.status === "cancelled");
  }

  function getReviewStats() {
    return { avg: provider?.rating ?? 0, total: provider?.reviewCount ?? (provider?.reviews || []).length };
  }
  function getReviewDistribution() {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of provider?.reviews || []) counts[r.rating] = (counts[r.rating] || 0) + 1;
    return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: counts[stars] }));
  }

  function getMonthIncome() {
    const now = new Date();
    return getCompletedOffers()
      .filter((o) => {
        const d = new Date(o.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, o) => s + o.price, 0);
  }
  function getAllTimeIncome() {
    return getCompletedOffers().reduce((s, o) => s + o.price, 0);
  }

  function getFunnelStats() {
    const offered = getOfferedRequestIds();
    const receivedIds = new Set([...openRequests.map((r) => r.id), ...offered]);
    const received = receivedIds.size;
    const responded = myOffers.length;
    const chosen = myOffers.filter((o) => o.status === "accepted").length;
    const conversion = received ? Math.round((chosen / received) * 100) : 0;
    return { received, responded, chosen, conversion };
  }

  function getRepeatClients() {
    const counts = {};
    for (const o of myOffers.filter((o) => o.status === "accepted")) {
      const key = o.request.user.telegramId;
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.values(counts).filter((c) => c > 1).length;
  }

  function startOffer(request) {
    setOfferTargetRequest(request);
    setOfferForm({ price: provider?.priceFrom ? String(provider.priceFrom) : "", comment: "" });
    navigate("provider-offer");
  }

  async function submitOffer() {
    await withLoading(async () => {
      await api("/offers", {
        method: "POST",
        body: JSON.stringify({
          requestId: offerTargetRequest.id,
          providerId: provider.id,
          price: Number(offerForm.price),
          comment: offerForm.comment,
        }),
      });
      goBack();
      await loadProviderInbox(provider);
    });
  }

  function dismissRequest(id) {
    setDismissedRequestIds((s) => new Set(s).add(id));
  }

  function openOrderDetail(offer) {
    setSelectedOffer(offer);
    navigate("provider-order-detail");
  }

  function sendSupportMessage() {
    if (!supportDraft.trim()) return;
    setSupportMessages((m) => [...m, { from: "me", text: supportDraft.trim(), time: "сейчас" }]);
    setSupportDraft("");
  }

  function confirmDeleteAccount() {
    setShowDeleteConfirm(false);
    setProvider(null);
    goHome();
  }

  function renderLanguage() {
    return (
      <div className="tms-screen">
        <div className="tms-hero">
          <h1 className="tms-hero-title">{t("Выберите язык")}</h1>
        </div>
        <div className="tms-role-grid">
          <button className="tms-role-card" onClick={() => chooseLanguage("ru")}>
            <span className="tms-role-emoji">🇷🇺</span>
            <span className="tms-role-title">Русский</span>
          </button>
          <button className="tms-role-card" onClick={() => chooseLanguage("en")}>
            <span className="tms-role-emoji">🇬🇧</span>
            <span className="tms-role-title">English</span>
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------- Экраны: клиент (без изменений) -------------------------- */

  function renderRole() {
    return (
      <div className="tms-screen">
        <div className="tms-hero">
          <p className="tms-greeting">{tgUser.name}{t(", привет")}</p>
          <h1 className="tms-hero-title">{t("Вы клиент или мастер?")}</h1>
        </div>
        <div className="tms-role-grid">
          <button className="tms-role-card" onClick={chooseClient}>
            <span className="tms-role-emoji">🔍</span>
            <span className="tms-role-title">{t("Я клиент")}</span>
            <span className="tms-role-sub">{t("Ищу мастера для задачи")}</span>
          </button>
          <button className="tms-role-card" onClick={chooseProvider}>
            <span className="tms-role-emoji">🛠️</span>
            <span className="tms-role-title">{t("Я мастер")}</span>
            <span className="tms-role-sub">{t("Хочу получать заявки")}</span>
          </button>
        </div>
        {error && <p className="tms-error">{error}</p>}
      </div>
    );
  }

  function renderClientHome() {
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">{t("Категории")}</p>
          {loading && <p className="muted">{t("Загрузка…")}</p>}
          {error && <p className="tms-error">{error}</p>}
          <div className="tms-cat-grid">
            {categories.map((cat) => (
              <button key={cat.id} className="tms-cat-card" onClick={() => pickCategory(cat)}>
                <span className="tms-cat-icon">{cat.icon || "•"}</span>
                <span className="tms-cat-name">{cat.name}</span>
              </button>
            ))}
          </div>
          {!loading && categories.length === 0 && !error && (
            <p className="muted">{t("Категорий пока нет — загляните позже.")}</p>
          )}
        </div>
      </div>
    );
  }

  function renderClientServices() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{form.categoryName}</p>
          {loading && <p className="muted">{t("Загрузка…")}</p>}
          <div className="tms-list">
            {services.map((s) => (
              <button key={s.id} className="tms-list-row" onClick={() => pickService(s)}>
                <span>{s.name}</span><span className="tms-chevron">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderClientRequest() {
    const ready = form.district && form.urgency;
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{t("Услуга")}</p>
          <div className="tms-summary-pill">{form.categoryName} · {form.serviceName}</div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Описание")}</p>
          <textarea className="tms-textarea" rows={2} placeholder={t("Опишите задачу")}
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Район")}</p>
          <div className="tms-chip-wrap">
            {DISTRICTS.map((d) => <Chip key={d} label={t(d)} active={form.district === d} onClick={() => setForm((f) => ({ ...f, district: d }))} />)}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Срочность")}</p>
          <div className="tms-chip-wrap">
            {URGENCY_OPTIONS.map((u) => <Chip key={u} label={t(u)} active={form.urgency === u} onClick={() => setForm((f) => ({ ...f, urgency: u }))} />)}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Бюджет")} — {language === "en" ? "up to" : "до"} {form.budget} ₾</p>
          <input type="range" min={20} max={300} step={5} value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} className="tms-range" />
        </div>
        {error && <p className="tms-error">{error}</p>}
        {!ready && <p className="muted">{t("Выберите район и срочность, чтобы продолжить")}</p>}
      </div>
    );
  }

  function renderClientMatches() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{t("Заявка отправлена")}</p>
          <p className="muted">{t("Эти мастера подходят под вашу задачу и могут откликнуться:")}</p>
        </div>
        <div className="tms-provider-list">
          {candidates.map(({ provider: p, overall, breakdown }) => (
            <div key={p.id} className="tms-provider-row">
              <button className="tms-provider-main" onClick={() => setExpandedCandidate(expandedCandidate === p.id ? null : p.id)}>
                <span className="tms-provider-avatar">👤</span>
                <span className="tms-provider-info">
                  <span className="tms-provider-name">{p.user.name}</span>
                  <span className="tms-provider-meta">{p.rating.toFixed(1)} · {p.reviewCount} {t("отз.")}</span>
                </span>
                <MatchRing score={overall} />
              </button>
              {expandedCandidate === p.id && (
                <div className="tms-legend">
                  {Object.entries(breakdown).map(([key, score]) => (
                    <div className="tms-legend-row" key={key}>
                      <span className="tms-legend-label">{t(FACTOR_LABELS[key])}</span>
                      <span className="tms-legend-bar-track"><span className="tms-legend-bar-fill" style={{ width: `${score}%` }} /></span>
                      <span className="tms-legend-weight">{FACTOR_WEIGHTS[key]}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {candidates.length === 0 && <p className="muted">{t("Подходящих мастеров пока нет — загляните позже в «Мои заявки».")}</p>}
        </div>
      </div>
    );
  }

  /* -------------------------- Экраны: клиент — личный кабинет -------------------------- */

  // Строка отклика мастера — используется и в агрегированной вкладке «Предложения»,
  // и внутри конкретной заявки (там showRequestLabel не нужен — контекст и так ясен).
  function renderOfferRow(o, { showRequestLabel } = {}) {
    return (
      <div key={o.id} className="tms-offer-row">
        <div className="tms-offer-top">
          <span className="tms-provider-avatar">👤</span>
          <div>
            <p className="tms-provider-name">{o.provider.user.name}</p>
            <p className="tms-provider-meta">★ {o.provider.rating.toFixed(1)}{showRequestLabel ? ` · ${t("Заявка")}: ${o.request.service.name}` : ""}</p>
          </div>
          <p className="tms-offer-terms">{o.price} ₾</p>
        </div>
        {o.comment && <p className="tms-offer-comment">«{o.comment}»</p>}
        <div className="tms-offer-actions">
          <button className="tms-decline-btn" onClick={() => viewProvider(o.providerId)}>{t("Посмотреть мастера")}</button>
          {o.status === "pending" ? (
            <>
              <button className="tms-select-btn" onClick={() => respondToOffer(o.id, "accepted")}>{t("Выбрать")}</button>
              <button className="tms-decline-btn" onClick={() => respondToOffer(o.id, "declined")}>{t("Отказаться")}</button>
            </>
          ) : (
            <span className="tms-provider-meta">{t(o.status === "accepted" ? "выбран" : "отклонён")}</span>
          )}
        </div>
      </div>
    );
  }

  function renderClientDashboard() {
    const activeRequests = myRequests.filter((r) => r.status === "open" && !r.archived);
    const inWorkRequests = myRequests.filter((r) => r.status === "matched" && !locallyCompletedRequestIds.has(r.id));
    return (
      <div className="tms-screen">
        <div className="tms-hero">
          <p className="tms-greeting">{t("Привет")}</p>
          <h1 className="tms-hero-title">{tgUser.name}</h1>
        </div>
        <div className="tms-stat-grid">
          <StatCard icon="📨" label={t("Активная заявка")} value={activeRequests.length}
            onClick={activeRequests.length ? () => openRequestDetail(activeRequests[0]) : undefined} />
          <StatCard icon="🟢" label={t("Заказы в работе")} value={inWorkRequests.length}
            onClick={() => goTab("client-my-orders")} />
        </div>
        <div className="tms-section">
          <button className="tms-mainbutton" onClick={openCreateRequest}>{t("+ Создать заявку")}</button>
        </div>
      </div>
    );
  }

  function renderClientMyRequests() {
    const openList = myRequests.filter((r) => r.status === "open" && !r.archived);
    const archivedList = myRequests.filter((r) => r.archived);
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}><p className="tms-section-label">{t("Мои заявки")}</p></div>
        <div className="tms-provider-list">
          {openList.map((r) => (
            <div key={r.id} className="tms-provider-row">
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{r.description || r.service.name}</span>
                <span className="tms-provider-meta">{t(r.area) || t("район не указан")}</span>
                <span className="tms-provider-meta">{t("Статус: поиск мастера")}</span>
                {r.urgency && <span className="tms-provider-meta">{t(r.urgency)}</span>}
                {typeof r.budget === "number" && <span className="tms-provider-meta">{t("Бюджет: до")} {r.budget} ₾</span>}
                <span className="tms-provider-meta">{t("Предложений")}: {r.offers.length}</span>
              </div>
              <button className="tms-select-btn" onClick={() => openRequestDetail(r)}>{t("Открыть")}</button>
            </div>
          ))}
          {openList.length === 0 && <p className="muted">{t("Активных заявок пока нет.")}</p>}
        </div>
        {archivedList.length > 0 && (
          <details className="tms-archive">
            <summary>{t("Архив заявок")} ({archivedList.length})</summary>
            <div className="tms-provider-list" style={{ marginTop: 10 }}>
              {archivedList.map((r) => (
                <div key={r.id} className="tms-provider-row">
                  <div className="tms-provider-info" style={{ flex: 1 }}>
                    <span className="tms-provider-name">{r.description || r.service.name}</span>
                    <span className="tms-provider-meta">{t(r.area) || t("район не указан")} {t("· удалена")}</span>
                  </div>
                  <button className="tms-decline-btn" onClick={() => openRequestDetail(r)}>{t("Открыть")}</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  }

  function renderClientRequestDetail() {
    const r = myRequests.find((x) => x.id === selectedRequestId);
    if (!r) return null;
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">{r.service.name}</p>
          <p className="tms-body-text">{r.description || t("Без описания")}</p>
        </div>
        <div className="tms-section">
          <div className="tms-chip-wrap">
            <span className="tms-summary-pill">{t(r.area) || t("район не указан")}</span>
            <span className="tms-summary-pill">{t(r.urgency) || t("срочность не указана")}</span>
            {typeof r.budget === "number" && <span className="tms-summary-pill">{language === "en" ? "up to" : "до"} {r.budget} ₾</span>}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Статус")}: {t(r.archived ? "в архиве" : STATUS_LABELS[r.status] || r.status)}</p>
        </div>
        {r.archived ? (
          <div className="tms-section">
            <p className="muted">{t("Заявка удалена и перенесена в архив — не участвует в статистике и не видна мастерам.")}</p>
          </div>
        ) : (
          <>
            <div className="tms-section">
              <p className="tms-section-label">{t("Предложения")} ({r.offers.length})</p>
              <div className="tms-offer-list">{r.offers.map((o) => renderOfferRow(o))}</div>
              {r.offers.length === 0 && <p className="muted">{t("Пока никто не откликнулся.")}</p>}
            </div>
            {r.status === "open" && (
              <div className="tms-section">
                <button className="tms-decline-btn" onClick={() => archiveRequest(r)}>{t("Удалить заявку")}</button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderClientOffersAll() {
    const pending = myRequests
      .filter((r) => r.status === "open" && !r.archived)
      .flatMap((r) => r.offers.filter((o) => o.status === "pending").map((o) => ({ ...o, request: r })));
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}><p className="tms-section-label">{t("Предложения от мастеров")}</p></div>
        <div className="tms-offer-list">{pending.map((o) => renderOfferRow(o, { showRequestLabel: true }))}</div>
        {pending.length === 0 && <p className="muted">{t("Пока нет новых предложений.")}</p>}
      </div>
    );
  }

  function renderClientProviderView() {
    const p = viewedProvider;
    if (!p) return null;
    const specialization = (p.services || []).map((s) => s.service?.name).filter(Boolean).join(", ");
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <div className="tms-profile-head">
            <span className="tms-provider-avatar" style={{ fontSize: 32 }}>👤</span>
            <div>
              <p className="tms-provider-name" style={{ fontSize: 16 }}>{p.user.name}</p>
              <p className="tms-provider-meta">{specialization || t("Специализация не указана")}</p>
            </div>
            <span className={`tms-badge-verify ${p.verified ? "is-verified" : ""}`}>{t(p.verified ? "✅ Подтверждён" : "⏳ На проверке")}</span>
          </div>
          <p className="tms-provider-meta">★ {p.rating.toFixed(1)} · {p.reviewCount} {t("отз.")}</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Описание")}</p>
          <p className="tms-body-text">{p.description || t("Мастер пока не добавил описание.")}</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Языки")}</p>
          <p className="muted">{t("Мастер пока не указал языки в профиле.")}</p>
        </div>
      </div>
    );
  }

  function renderClientOrderRow(r) {
    const offer = r.offers.find((o) => o.status === "accepted");
    return (
      <button key={r.id} className="tms-order-card" onClick={() => openClientOrder(r)}>
        <div className="tms-provider-info" style={{ flex: 1 }}>
          <span className="tms-provider-name">{offer?.provider.user.name || t("Мастер")}{offer ? ` · ★${offer.provider.rating.toFixed(1)}` : ""}</span>
          <span className="tms-provider-meta">{r.service.name}{locallyCompletedRequestIds.has(r.id) ? ` ${t("· Завершён")}` : ""}</span>
        </div>
        <span className="tms-offer-terms">{offer?.price ?? r.budget} ₾</span>
        <span className="tms-chevron">→</span>
      </button>
    );
  }

  function renderClientMyOrders() {
    const inWork = myRequests.filter((r) => r.status === "matched" && !locallyCompletedRequestIds.has(r.id));
    const history = myRequests.filter((r) => r.status === "matched" && locallyCompletedRequestIds.has(r.id));
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">{t("В работе")}</p>
          <div className="tms-provider-list">
            {inWork.map(renderClientOrderRow)}
            {inWork.length === 0 && <p className="muted">{t("Активных заказов пока нет.")}</p>}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("История")}</p>
          <div className="tms-provider-list">
            {history.map(renderClientOrderRow)}
            {history.length === 0 && <p className="muted">{t("Завершённых заказов пока нет.")}</p>}
          </div>
        </div>
      </div>
    );
  }

  function renderClientOrderDetail() {
    const r = myRequests.find((x) => x.id === selectedClientOrderId);
    if (!r) return null;
    const offer = r.offers.find((o) => o.status === "accepted");
    const isCompleted = locallyCompletedRequestIds.has(r.id);
    const review = submittedReviews[r.id];
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <div className="tms-profile-head">
            <span className="tms-provider-avatar" style={{ fontSize: 32 }}>👤</span>
            <div>
              <p className="tms-provider-name" style={{ fontSize: 16 }}>{offer?.provider.user.name || t("Мастер")}</p>
              <p className="tms-provider-meta">{r.service.name}</p>
            </div>
            {offer && <span className={`tms-badge-verify ${offer.provider.verified ? "is-verified" : ""}`}>{t(offer.provider.verified ? "✅ Подтверждён" : "⏳ На проверке")}</span>}
          </div>
          {offer && <p className="tms-provider-meta">★ {offer.provider.rating.toFixed(1)} · {offer.provider.reviewCount} {t("отз.")}</p>}
        </div>
        {offer?.provider.description && (
          <div className="tms-section">
            <p className="tms-section-label">{t("Описание")}</p>
            <p className="tms-body-text">{offer.provider.description}</p>
          </div>
        )}
        <div className="tms-section">
          <p className="tms-section-label">{t("Языки")}</p>
          <p className="muted">{t("Мастер пока не указал языки в профиле.")}</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Стоимость")}</p>
          <p className="tms-body-text">{offer?.price ?? r.budget} ₾</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Создано")}</p>
          <p className="tms-body-text">{new Date(r.createdAt).toLocaleDateString(locale)}</p>
        </div>
        {isCompleted ? (
          <>
            {review && (
              <div className="tms-section">
                <p className="tms-section-label">{t("Ваш отзыв")}</p>
                <p className="tms-review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                {review.text && <p className="tms-body-text">«{review.text}»</p>}
              </div>
            )}
            <div className="tms-section">
              <button className="tms-select-btn" style={{ width: "100%", padding: "12px" }} onClick={openCreateRequest}>{t("Создать ещё заявку")}</button>
            </div>
          </>
        ) : (
          <div className="tms-section">
            <button className="tms-select-btn" style={{ width: "100%", padding: "12px" }} onClick={() => startReview(r)}>{t("Завершить заказ")}</button>
          </div>
        )}
      </div>
    );
  }

  function renderClientReview() {
    const r = myRequests.find((x) => x.id === reviewTargetRequestId);
    if (!r) return null;
    const offer = r.offers.find((o) => o.status === "accepted");
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">{t("Оцените мастера")}</p>
          <p className="muted">{offer?.provider.user.name} · {r.service.name}</p>
        </div>
        <div className="tms-section">
          <StarPicker value={reviewForm.rating} onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))} t={t} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Комментарий (необязательно)")}</p>
          <textarea className="tms-textarea" rows={3} placeholder={t("Что понравилось или что можно улучшить")}
            value={reviewForm.text} onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))} />
        </div>
        {error && <p className="tms-error">{error}</p>}
      </div>
    );
  }

  function renderClientProfile() {
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">{t("Аккаунт")}</p>
          <div className="tms-profile-card">
            <div className="tms-profile-head">
              {tgUser.photoUrl ? (
                <img className="tms-avatar-img" src={tgUser.photoUrl} alt="" />
              ) : (
                <span className="tms-provider-avatar" style={{ fontSize: 32 }}>👤</span>
              )}
              <div>
                <p className="tms-provider-name" style={{ fontSize: 16 }}>{tgUser.name}</p>
                {tgUser.username && <p className="tms-provider-meta">@{tgUser.username}</p>}
              </div>
            </div>
            <div className="tms-field-group">
              <label className="tms-field"><span>{t("Имя")}</span><input className="tms-field-input"
                value={clientSettingsForm.name} onChange={(e) => setClientSettingsForm((f) => ({ ...f, name: e.target.value }))} /></label>
              <label className="tms-field"><span>{t("Телефон")}</span><input className="tms-field-input" placeholder="+995 5xx xx xx xx"
                value={clientSettingsForm.phone} onChange={(e) => setClientSettingsForm((f) => ({ ...f, phone: e.target.value }))} /></label>
              <label className="tms-field"><span>{t("Email")}</span><input className="tms-field-input" placeholder="mail@example.com"
                value={clientSettingsForm.email} onChange={(e) => setClientSettingsForm((f) => ({ ...f, email: e.target.value }))} /></label>
            </div>
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Уведомления")}</p>
          <div className="tms-profile-card">
            <Toggle checked={clientSettingsForm.notifyOrders} onChange={(v) => setClientSettingsForm((f) => ({ ...f, notifyOrders: v }))} label={t("Заявки взяты в работу")} />
            <Toggle checked={clientSettingsForm.notifyChat} onChange={(v) => setClientSettingsForm((f) => ({ ...f, notifyChat: v }))} label={t("Чат с мастерами")} />
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Поддержка")}</p>
          <button className="tms-link-row" onClick={() => navigate("client-support")}>{t("Написать в поддержку →")}</button>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Опасная зона")}</p>
          {!clientShowDeleteConfirm ? (
            <button className="tms-decline-btn" onClick={() => setClientShowDeleteConfirm(true)}>{t("Удалить аккаунт")}</button>
          ) : (
            <div className="tms-profile-card">
              <p className="tms-body-text">{t("Все ваши заявки и отзывы будут удалены безвозвратно. Продолжить?")}</p>
              <div className="tms-offer-actions">
                <button className="tms-decline-btn" onClick={confirmDeleteClientAccount}>{t("Да, удалить")}</button>
                <button className="tms-select-btn" onClick={() => setClientShowDeleteConfirm(false)}>{t("Отмена")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* -------------------------- Экраны: мастер — регистрация -------------------------- */

  function renderProviderRegister() {
    const ready = providerForm.serviceIds.length > 0 && providerForm.areas.length > 0;
    const groups = groupServicesByCategory(allServices, t);
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{t("Какие услуги оказываете")}</p>
          <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>{t("Можно выбрать несколько")}</p>
          {groups.map((group) => (
            <div key={group.id} className="tms-cat-group">
              <p className="tms-cat-group-title">{group.icon} {group.name}</p>
              <div className="tms-list">
                {group.items.map((s) => (
                  <button key={s.id}
                    className={`tms-list-row ${providerForm.serviceIds.includes(s.id) ? "is-active-row" : ""}`}
                    onClick={() => toggleProviderService(s.id)}>
                    <span>{s.name}</span>
                    {providerForm.serviceIds.includes(s.id) && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Районы работы")} {providerForm.areas.length === 0 && <span className="tms-hint-inline">{t("— выберите хотя бы один, иначе анкету не отправить")}</span>}</p>
          <div className="tms-chip-wrap">
            {DISTRICTS.map((d) => <Chip key={d} label={t(d)} active={providerForm.areas.includes(d)} onClick={() => toggleProviderArea(d)} />)}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Цена от (₾)")}</p>
          <input className="tms-textarea" type="number" placeholder="50"
            value={providerForm.priceFrom} onChange={(e) => setProviderForm((f) => ({ ...f, priceFrom: e.target.value }))} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("О себе")}</p>
          <textarea className="tms-textarea" rows={2} placeholder={t("Опыт, специализация")}
            value={providerForm.description} onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        {error && <p className="tms-error">{error}</p>}
      </div>
    );
  }

  /* -------------------------- Экраны: мастер — личный кабинет -------------------------- */

  function renderProviderOffer() {
    if (!offerTargetRequest) return null;
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{t("Заявка")}</p>
          <div className="tms-summary-pill">{offerTargetRequest.service.name} · {t(offerTargetRequest.area) || t("район не указан")}</div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Ваша цена (₾)")}</p>
          <input className="tms-textarea" type="number" placeholder="80"
            value={offerForm.price} onChange={(e) => setOfferForm((f) => ({ ...f, price: e.target.value }))} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Комментарий")}</p>
          <textarea className="tms-textarea" rows={2} placeholder={t("Когда сможете приехать, что учли")}
            value={offerForm.comment} onChange={(e) => setOfferForm((f) => ({ ...f, comment: e.target.value }))} />
        </div>
        {error && <p className="tms-error">{error}</p>}
      </div>
    );
  }

  function renderProviderDashboard() {
    const funnel = getFunnelStats();
    const monthIncome = getMonthIncome();
    const { avg: ratingAvg } = getReviewStats();
    const newCount = getNewRequests().length;
    const confirmedCount = getConfirmedOrders().length;
    return (
      <div className="tms-screen">
        <div className="tms-hero">
          <p className="tms-greeting">{t("Сегодня")}</p>
          <h1 className="tms-hero-title">{tgUser.name}</h1>
        </div>
        <div className="tms-stat-grid">
          <StatCard icon="🔔" label={t("Новых заявок")} value={newCount} />
          <StatCard icon="🟢" label={t("В работе")} value={confirmedCount}
            onClick={() => { setOrdersTab("confirmed"); navigate("provider-orders"); }} />
          <StatCard icon="⭐" label={t("Рейтинг")} value={ratingAvg.toFixed(1)}
            onClick={() => navigate("provider-reviews")} />
          <StatCard icon="💬" label={t("Чаты с клиентами")} value={confirmedCount}
            onClick={() => navigate("provider-messages")} />
        </div>
        <div className="tms-section">
          <div className="tms-income-card">
            <span className="tms-provider-meta">{t("Доход за месяц")}</span>
            <span className="tms-income-value">{monthIncome.toLocaleString(locale)} ₾</span>
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Конверсия")}</p>
          <div className="tms-funnel">
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.received}</span><span className="tms-provider-meta">{t("заявок")}</span></div>
            <span className="tms-funnel-arrow">→</span>
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.responded}</span><span className="tms-provider-meta">{t("обработано")}</span></div>
            <span className="tms-funnel-arrow">→</span>
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.chosen}</span><span className="tms-provider-meta">{t("заказов")}</span></div>
            <span className="tms-funnel-arrow">→</span>
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.conversion}%</span><span className="tms-provider-meta">{t("конверсия")}</span></div>
          </div>
        </div>
      </div>
    );
  }

  function renderProviderRequests() {
    const newList = getNewRequests();
    const inWorkList = getInWorkOffers();
    const completedList = getCompletedOffers();
    const declinedOffers = getDeclinedOffers();
    const dismissedList = openRequests.filter((r) => dismissedRequestIds.has(r.id));
    const tabs = [
      { value: "new", label: t("Новые"), count: newList.length },
      { value: "inWork", label: t("В работе"), count: inWorkList.length },
      { value: "completed", label: t("Завершённые"), count: completedList.length },
      { value: "declined", label: t("Отклонённые"), count: declinedOffers.length + dismissedList.length },
    ];
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <Segmented options={tabs} value={requestsTab} onChange={setRequestsTab} />
        </div>
        <div className="tms-provider-list" style={{ marginTop: 16 }}>
          {requestsTab === "new" && newList.map((r) => (
            <div key={r.id} className="tms-provider-row">
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{r.service.name}</span>
                <span className="tms-provider-meta">{t(r.area) || t("район не указан")}{r.urgency ? ` · ${t(r.urgency)}` : ""}</span>
                {r.description && <span className="tms-provider-meta">{r.description}</span>}
                {typeof r.budget === "number" && <span className="tms-provider-meta">{language === "en" ? "up to" : "до"} {r.budget} ₾</span>}
              </div>
              <div className="tms-offer-actions" style={{ marginTop: 0 }}>
                <button className="tms-select-btn" onClick={() => startOffer(r)}>{t("Взять в работу")}</button>
                <button className="tms-decline-btn" onClick={() => dismissRequest(r.id)}>{t("Отказаться")}</button>
              </div>
            </div>
          ))}
          {requestsTab === "inWork" && inWorkList.map((o) => (
            <div key={o.id} className="tms-provider-row">
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{o.request.service.name}</span>
                <span className="tms-provider-meta">{t(o.request.area) || t("район не указан")}</span>
                <span className="tms-provider-meta">{t(o.status === "pending" ? "Ждём ответа клиента" : "В работе")}</span>
                <span className="tms-provider-meta">{o.price} ₾</span>
              </div>
            </div>
          ))}
          {requestsTab === "completed" && completedList.map((o) => (
            <div key={o.id} className="tms-provider-row">
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{o.request.service.name}</span>
                <span className="tms-provider-meta">{o.price} ₾</span>
                <span className="tms-provider-meta">{t("Создано")} {new Date(o.createdAt).toLocaleDateString(locale)}</span>
              </div>
            </div>
          ))}
          {requestsTab === "declined" && (
            <>
              {declinedOffers.map((o) => (
                <div key={`o-${o.id}`} className="tms-provider-row">
                  <div className="tms-provider-info" style={{ flex: 1 }}>
                    <span className="tms-provider-name">{o.request.service.name}</span>
                    <span className="tms-provider-meta">{t("Клиент отклонил ваш отклик")} ({o.price} ₾)</span>
                  </div>
                </div>
              ))}
              {dismissedList.map((r) => (
                <div key={`r-${r.id}`} className="tms-provider-row">
                  <div className="tms-provider-info" style={{ flex: 1 }}>
                    <span className="tms-provider-name">{r.service.name}</span>
                    <span className="tms-provider-meta">{t("Вы отказались от заявки")}</span>
                  </div>
                </div>
              ))}
            </>
          )}
          {((requestsTab === "new" && newList.length === 0) ||
            (requestsTab === "inWork" && inWorkList.length === 0) ||
            (requestsTab === "completed" && completedList.length === 0) ||
            (requestsTab === "declined" && declinedOffers.length === 0 && dismissedList.length === 0)) && (
            <p className="muted">{t("Здесь пока пусто.")}</p>
          )}
        </div>
      </div>
    );
  }

  function renderProviderOrders() {
    const confirmedOrders = getConfirmedOrders();
    const completedOrders = getCompletedOffers();
    const cancelledOrders = getCancelledOrders();
    const listByTab = { confirmed: confirmedOrders, completed: completedOrders, cancelled: cancelledOrders };
    const tabs = [
      { value: "confirmed", label: t("Подтверждённые"), count: confirmedOrders.length },
      { value: "completed", label: t("Завершённые"), count: completedOrders.length },
      { value: "cancelled", label: t("Отменённые"), count: cancelledOrders.length },
    ];
    const list = listByTab[ordersTab];
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <Segmented options={tabs} value={ordersTab} onChange={setOrdersTab} />
        </div>
        <div className="tms-provider-list" style={{ marginTop: 16 }}>
          {list.map((o) => (
            <button key={o.id} className="tms-order-card" onClick={() => openOrderDetail(o)}>
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{o.request.service.name}</span>
                <span className="tms-provider-meta">{o.request.user.name} · {t(o.request.area) || t("район не указан")}</span>
              </div>
              <span className="tms-offer-terms">{o.price} ₾</span>
              <span className="tms-chevron">→</span>
            </button>
          ))}
          {list.length === 0 && <p className="muted">{t("Здесь пока пусто.")}</p>}
        </div>
      </div>
    );
  }

  function renderProviderOrderDetail() {
    const o = selectedOffer;
    if (!o) return null;
    const telegramLink = o.request.user.username ? `https://t.me/${o.request.user.username}` : null;
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{t("Описание работы")}</p>
          <p className="tms-body-text">{o.request.description || t("Без описания")}</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Клиент")}</p>
          <div className="tms-provider-main" style={{ cursor: "default" }}>
            <span className="tms-provider-avatar">👤</span>
            <span className="tms-provider-info">
              <span className="tms-provider-name">{o.request.user.name}</span>
              <span className="tms-provider-meta">{o.request.user.username ? `@${o.request.user.username}` : t("username не указан")}</span>
            </span>
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Адрес / район")}</p>
          <p className="tms-body-text">{t(o.request.area) || t("не указан")}</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("Сумма работы")}</p>
          <p className="tms-body-text">{o.price} ₾</p>
        </div>
        <div className="tms-section">
          {telegramLink ? (
            <a className="tms-select-btn" style={{ display: "block", width: "100%", padding: "12px", textAlign: "center", textDecoration: "none" }} href={telegramLink} target="_blank" rel="noreferrer">
              {t("💬 Написать в Telegram")}
            </a>
          ) : (
            <p className="muted">{t("Клиент не указал username в Telegram — свяжитесь через заявку.")}</p>
          )}
        </div>
      </div>
    );
  }

  function renderProviderMessages() {
    const confirmedOrders = getConfirmedOrders();
    return (
      <div className="tms-screen">
        <div className="tms-section"><p className="tms-section-label">{t("Клиенты по активным заказам")}</p></div>
        <div className="tms-list">
          {confirmedOrders.map((o) => (
            <button key={o.id} className="tms-list-row" onClick={() => openOrderDetail(o)}>
              <span>
                <span style={{ fontWeight: 600 }}>{o.request.user.name}</span>
                <span className="tms-provider-meta" style={{ display: "block" }}>{o.request.service.name}</span>
              </span>
              <span className="tms-chevron">→</span>
            </button>
          ))}
          {confirmedOrders.length === 0 && <p className="muted">{t("Активных заказов пока нет.")}</p>}
        </div>
      </div>
    );
  }

  function renderProviderProfileCabinet() {
    const groups = groupServicesByCategory(allServices, t);
    const selectedCategoryNames = [
      ...new Set(allServices.filter((s) => providerForm.serviceIds.includes(s.id)).map((s) => s.category?.name).filter(Boolean)),
    ];
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">{t("Основная информация")}</p>
          <div className="tms-profile-card">
            <div className="tms-profile-head">
              {tgUser.photoUrl ? (
                <img className="tms-avatar-img" src={tgUser.photoUrl} alt="" />
              ) : (
                <span className="tms-provider-avatar" style={{ fontSize: 32 }}>👤</span>
              )}
              <div>
                <p className="tms-provider-name" style={{ fontSize: 16 }}>{tgUser.name}</p>
                <p className="tms-provider-meta">{selectedCategoryNames.length ? selectedCategoryNames.join(" · ") : t("Категория не выбрана")}</p>
              </div>
              <span className={`tms-badge-verify ${provider?.verified ? "is-verified" : ""}`}>
                {t(provider?.verified ? "✅ Подтверждён" : "⏳ На проверке")}
              </span>
            </div>
            <textarea className="tms-textarea" rows={3} placeholder={t("Расскажите об опыте и специализации")}
              value={providerForm.description} onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Языки")}</p>
          <div className="tms-chip-wrap">
            {LANGUAGE_OPTIONS.map((l) => <Chip key={l} label={t(l)} active={profileExtra.languages.includes(l)} onClick={() => toggleProfileLanguage(l)} />)}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Контакты")}</p>
          <div className="tms-field-group">
            <label className="tms-field"><span>{t("Телефон")}</span><input className="tms-field-input" placeholder="+995 5xx xx xx xx"
              value={profileExtra.phone} onChange={(e) => setProfileExtra((f) => ({ ...f, phone: e.target.value }))} /></label>
            <label className="tms-field"><span>Telegram</span><input className="tms-field-input" placeholder="@username"
              value={profileExtra.telegramContact} onChange={(e) => setProfileExtra((f) => ({ ...f, telegramContact: e.target.value }))} /></label>
            <label className="tms-field"><span>{t("Email")}</span><input className="tms-field-input" placeholder="mail@example.com"
              value={profileExtra.email} onChange={(e) => setProfileExtra((f) => ({ ...f, email: e.target.value }))} /></label>
          </div>
          <Toggle checked={profileExtra.contactsHidden} onChange={(v) => setProfileExtra((f) => ({ ...f, contactsHidden: v }))}
            label={t("Скрывать контакты от клиентов")} sub={t("Клиент увидит контакты только после подтверждения заказа")} />
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("География — работаю")}</p>
          <div className="tms-chip-wrap">
            {DISTRICTS.map((d) => <Chip key={d} label={t(d)} active={providerForm.areas.includes(d)} onClick={() => toggleProviderArea(d)} />)}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Услуги")}</p>
          {groups.map((group) => (
            <div key={group.id} className="tms-cat-group">
              <p className="tms-cat-group-title">{group.icon} {group.name}</p>
              <div className="tms-list">
                {group.items.map((s) => (
                  <button key={s.id}
                    className={`tms-list-row ${providerForm.serviceIds.includes(s.id) ? "is-active-row" : ""}`}
                    onClick={() => toggleProviderService(s.id)}>
                    <span>{s.name}</span>
                    {providerForm.serviceIds.includes(s.id) && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="muted">{t("Загрузка списка услуг…")}</p>}
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Цены")}</p>
          <div className="tms-field-group">
            <label className="tms-field"><span>{t("Выезд, ₾")}</span><input className="tms-field-input" type="number" placeholder="20"
              value={profileExtra.calloutPrice} onChange={(e) => setProfileExtra((f) => ({ ...f, calloutPrice: e.target.value }))} /></label>
            <label className="tms-field"><span>{t("Минимальный заказ, ₾")}</span><input className="tms-field-input" type="number" placeholder="50"
              value={profileExtra.minOrderPrice} onChange={(e) => setProfileExtra((f) => ({ ...f, minOrderPrice: e.target.value }))} /></label>
            <label className="tms-field"><span>{t("Почасовая ставка, ₾")}</span><input className="tms-field-input" type="number" placeholder="40"
              value={profileExtra.hourlyRate} onChange={(e) => setProfileExtra((f) => ({ ...f, hourlyRate: e.target.value }))} /></label>
          </div>
        </div>
      </div>
    );
  }

  function renderProviderMore() {
    const items = [
      { key: "provider-analytics", icon: "📈", label: t("Аналитика") },
      { key: "provider-reviews", icon: "⭐", label: t("Отзывы") },
      { key: "provider-finance", icon: "💰", label: t("Финансы") },
      { key: "provider-subscription", icon: "💳", label: t("Подписка") },
      { key: "provider-settings", icon: "⚙️", label: t("Настройки") },
    ];
    return (
      <div className="tms-screen">
        <div className="tms-list">
          {items.map((it) => (
            <button key={it.key} className="tms-list-row" onClick={() => navigate(it.key)}>
              <span>{it.icon} {it.label}</span><span className="tms-chevron">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderProviderAnalytics() {
    const funnel = getFunnelStats();
    const monthIncome = getMonthIncome();
    const repeatClients = getRepeatClients();
    return (
      <div className="tms-screen">
        <div className="tms-stat-grid">
          <StatCard icon="📥" label={t("Получено заявок")} value={funnel.received} />
          <StatCard icon="✉️" label={t("Обработано")} value={funnel.responded} />
          <StatCard icon="✅" label={t("Выбрали (заказы)")} value={funnel.chosen} />
          <StatCard icon="📊" label={t("Конверсия")} value={`${funnel.conversion}%`} />
          <StatCard icon="🔁" label={t("Повторные клиенты")} value={repeatClients} />
          <StatCard icon="💰" label={t("Доход за месяц")} value={`${monthIncome.toLocaleString(locale)} ₾`} />
        </div>
      </div>
    );
  }

  function renderProviderReviews(all) {
    const { avg: rating, total } = getReviewStats();
    const distribution = getReviewDistribution();
    const maxCount = Math.max(1, ...distribution.map((d) => d.count));
    const reviews = provider?.reviews || [];
    const list = (all ? reviews : reviews.slice(0, 3)).map((r) => ({
      name: r.user?.name || t("Клиент"),
      text: r.text,
      rating: r.rating,
      date: new Date(r.createdAt).toLocaleDateString(locale),
    }));
    return (
      <div className="tms-screen">
        {!all && (
          <div className="tms-section" style={{ marginTop: 4 }}>
            <div className="tms-review-summary">
              <div className="tms-review-score">
                <span className="tms-review-score-value">{rating.toFixed(1)}</span>
                <span className="tms-review-stars">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
                <span className="tms-provider-meta">{total} {t("отзывов")}</span>
              </div>
              <div className="tms-review-bars">
                {distribution.map((d) => (
                  <div className="tms-review-bar-row" key={d.stars}>
                    <span className="tms-provider-meta">{d.stars} ★</span>
                    <span className="tms-legend-bar-track"><span className="tms-legend-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} /></span>
                    <span className="tms-provider-meta">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="tms-section">
          {!all && <p className="tms-section-label">{t("Последние отзывы")}</p>}
          <div className="tms-list-plain">
            {list.map((r, i) => <ReviewRow key={i} review={r} />)}
          </div>
          {list.length === 0 && <p className="muted">{t("Отзывов пока нет.")}</p>}
          {!all && reviews.length > 3 && (
            <button className="tms-link-row" style={{ marginTop: 12 }} onClick={() => navigate("provider-reviews-all")}>
              {t("Показать все отзывы →")}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderProviderFinance() {
    const balance = getAllTimeIncome();
    const history = getCompletedOffers()
      .map((o) => ({ date: new Date(o.createdAt).toLocaleDateString(locale), requestId: o.requestId, amount: o.price }))
      .sort((a, b) => b.requestId - a.requestId);
    return (
      <div className="tms-screen">
        <p className="tms-inprogress-note">{t("Раздел в разработке — сумма и история уже реальные, оформление появится позже")}</p>
        <div className="tms-section" style={{ marginTop: 4 }}>
          <div className="tms-income-card">
            <span className="tms-provider-meta">{t("Баланс")}</span>
            <span className="tms-income-value">{balance.toLocaleString(locale)} ₾</span>
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">{t("История операций")}</p>
          <div className="tms-list">
            {history.map((h, i) => (
              <div key={i} className="tms-list-row" style={{ cursor: "default" }}>
                <span>{h.date} · {t("заявка №")}{h.requestId}</span>
                <span>+{h.amount} ₾</span>
              </div>
            ))}
          </div>
          {history.length === 0 && <p className="muted">{t("Завершённых заказов пока нет.")}</p>}
        </div>
      </div>
    );
  }

  function renderProviderSubscription() {
    return (
      <div className="tms-screen">
        <p className="tms-inprogress-note">{t("Раздел в разработке")}</p>
        <div className="tms-section" style={{ marginTop: 4 }}>
          <div className="tms-profile-card">
            <p className="tms-provider-name">{t("Подписка появится позже")}</p>
            <p className="muted">{t("Как только определимся с моделью монетизации — здесь можно будет выбрать тариф и продвижение анкеты.")}</p>
          </div>
        </div>
      </div>
    );
  }

  function renderProviderSettings() {
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">{t("Аккаунт")}</p>
          <div className="tms-field-group">
            <label className="tms-field"><span>{t("Имя")}</span><input className="tms-field-input"
              value={settingsForm.name} onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))} /></label>
            <label className="tms-field"><span>{t("Телефон")}</span><input className="tms-field-input" placeholder="+995 5xx xx xx xx"
              value={settingsForm.phone} onChange={(e) => setSettingsForm((f) => ({ ...f, phone: e.target.value }))} /></label>
            <label className="tms-field"><span>{t("Email")}</span><input className="tms-field-input" placeholder="mail@example.com"
              value={settingsForm.email} onChange={(e) => setSettingsForm((f) => ({ ...f, email: e.target.value }))} /></label>
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Уведомления")}</p>
          <div className="tms-profile-card">
            <Toggle checked={settingsForm.notifyRequests} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyRequests: v }))} label={t("Новые заявки")} />
            <Toggle checked={settingsForm.notifyReviews} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyReviews: v }))} label={t("Новые отзывы")} />
            <Toggle checked={settingsForm.notifyOrders} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyOrders: v }))} label={t("Действия по заказам")} />
            <Toggle checked={settingsForm.notifyChat} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyChat: v }))} label={t("Чат с клиентами")} />
          </div>
          <p className="muted">{t("Уведомления от Telegram-бота — донастроим отдельно.")}</p>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Поддержка")}</p>
          <button className="tms-link-row" onClick={() => navigate("provider-support")}>{t("Написать в поддержку →")}</button>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">{t("Опасная зона")}</p>
          {!showDeleteConfirm ? (
            <button className="tms-decline-btn" onClick={() => setShowDeleteConfirm(true)}>{t("Удалить аккаунт")}</button>
          ) : (
            <div className="tms-profile-card">
              <p className="tms-body-text">{t("Все данные анкеты, заявки и отзывы будут удалены безвозвратно. Продолжить?")}</p>
              <div className="tms-offer-actions">
                <button className="tms-decline-btn" onClick={confirmDeleteAccount}>{t("Да, удалить")}</button>
                <button className="tms-select-btn" onClick={() => setShowDeleteConfirm(false)}>{t("Отмена")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSupportChat() {
    return (
      <div className="tms-screen" style={{ paddingBottom: 8 }}>
        <div className="tms-section" style={{ marginTop: 0 }}>
          <p className="muted">{t("Опишите проблему или предложение — сообщение придёт в поддержку.")}</p>
        </div>
        <ChatThread messages={supportMessages} t={t} />
      </div>
    );
  }

  function render() {
    switch (screen) {
      case "language": return renderLanguage();
      case "role": return renderRole();
      case "client-home": return renderClientHome();
      case "client-services": return renderClientServices();
      case "client-request": return renderClientRequest();
      case "client-matches": return renderClientMatches();
      case "client-dashboard": return renderClientDashboard();
      case "client-my-requests": return renderClientMyRequests();
      case "client-request-detail": return renderClientRequestDetail();
      case "client-offers-all": return renderClientOffersAll();
      case "client-provider-view": return renderClientProviderView();
      case "client-my-orders": return renderClientMyOrders();
      case "client-order-detail": return renderClientOrderDetail();
      case "client-review": return renderClientReview();
      case "client-profile": return renderClientProfile();
      case "client-support": return renderSupportChat();
      case "provider-register": return renderProviderRegister();
      case "provider-dashboard": return renderProviderDashboard();
      case "provider-requests": return renderProviderRequests();
      case "provider-orders": return renderProviderOrders();
      case "provider-order-detail": return renderProviderOrderDetail();
      case "provider-messages": return renderProviderMessages();
      case "provider-offer": return renderProviderOffer();
      case "provider-profile-cabinet": return renderProviderProfileCabinet();
      case "provider-more": return renderProviderMore();
      case "provider-analytics": return renderProviderAnalytics();
      case "provider-reviews": return renderProviderReviews(false);
      case "provider-reviews-all": return renderProviderReviews(true);
      case "provider-finance": return renderProviderFinance();
      case "provider-subscription": return renderProviderSubscription();
      case "provider-settings": return renderProviderSettings();
      case "provider-support": return renderSupportChat();
      default: return null;
    }
  }

  const TITLES = {
    language: t("Выберите язык"),
    role: t("Мастера · Тбилиси"),
    "client-home": t("Категории"),
    "client-services": t("Выбор услуги"),
    "client-request": t("Новая заявка"),
    "client-matches": t("Подходящие мастера"),
    "client-dashboard": t("Личный кабинет"),
    "client-my-requests": t("Мои заявки"),
    "client-request-detail": t("Заявка"),
    "client-offers-all": t("Предложения"),
    "client-provider-view": t("Мастер"),
    "client-my-orders": t("Мои заказы"),
    "client-order-detail": t("Заказ"),
    "client-review": t("Отзыв о мастере"),
    "client-profile": t("Профиль"),
    "client-support": t("Поддержка"),
    "provider-register": t("Регистрация мастера"),
    "provider-dashboard": t("Личный кабинет"),
    "provider-requests": t("Заявки"),
    "provider-orders": t("Заказы"),
    "provider-order-detail": t("Заказ"),
    "provider-messages": t("Сообщения"),
    "provider-offer": t("Ваш отклик"),
    "provider-profile-cabinet": t("Профиль"),
    "provider-more": t("Ещё"),
    "provider-analytics": t("Аналитика"),
    "provider-reviews": t("Отзывы"),
    "provider-reviews-all": t("Все отзывы"),
    "provider-finance": t("Финансы"),
    "provider-subscription": t("Подписка"),
    "provider-settings": t("Настройки"),
    "provider-support": t("Поддержка"),
  };

  function bottomBarConfig() {
    switch (screen) {
      case "client-request":
        return { label: loading ? t("Отправляю…") : t("Отправить заявку"), disabled: loading || !(form.district && form.urgency), onClick: submitRequest };
      case "client-matches":
        return { label: t("Готово"), disabled: false, onClick: () => goTab("client-dashboard") };
      case "client-review":
        return { label: loading ? t("Сохраняю…") : t("Оставить отзыв и завершить"), disabled: loading, onClick: submitReview };
      case "provider-offer":
        return { label: loading ? t("Отправляю…") : t("Отправить отклик"), disabled: loading || !offerForm.price, onClick: submitOffer };
      case "provider-register": {
        let hint;
        if (providerForm.serviceIds.length === 0) hint = t("Выберите хотя бы одну услугу");
        else if (providerForm.areas.length === 0) hint = t("Выберите хотя бы один район работы");
        return {
          label: loading ? t("Регистрирую…") : t("Зарегистрироваться"),
          disabled: loading || !(providerForm.serviceIds.length > 0 && providerForm.areas.length > 0),
          onClick: submitProviderRegister,
          hint,
        };
      }
      default:
        return null;
    }
  }

  const bb = bottomBarConfig() || {};
  // Экран профиля мастера использует ту же вкладку "Профиль" в таб-баре, но переход
  // на неё должен подгружать список услуг; остальные вкладки при каждом заходе тихо
  // обновляют заявки/отклики — используем общий обработчик клика таб-бара.
  function handleTabNavigate(key) {
    if (key === "provider-profile-cabinet") {
      openProfileTab();
      return;
    }
    goTab(key);
    if (key.startsWith("client-") && key !== "client-profile") {
      loadMyRequests().catch((e) => setError(e.message));
    } else if (key.startsWith("provider-") && provider) {
      loadProviderInbox(provider).catch((e) => setError(e.message));
    }
  }
  const showBack = history.length > 0;

  let bottomArea = null;
  if (screen === "provider-support" || screen === "client-support") {
    bottomArea = <ChatInputBar value={supportDraft} onChange={setSupportDraft} onSend={sendSupportMessage} t={t} />;
  } else if (TAB_BAR_SCREENS.has(screen)) {
    const tabs = (screen.startsWith("client-") ? CLIENT_TABS : PROVIDER_TABS).map((it) => ({ ...it, label: t(it.label) }));
    bottomArea = <TabBar items={tabs} active={screen} onNavigate={handleTabNavigate} />;
  } else if (bb.label) {
    bottomArea = <BottomBar label={bb.label} disabled={bb.disabled} onClick={bb.onClick} hint={bb.hint} />;
  }

  return (
    <div className="tms-root">
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; }
        .tms-root {
          --ink: #14161A; --paper: #F6F5F2; --card: #FFFFFF; --accent: #1F6F5C; --line: #E4E2DC; --muted: #86847C;
          font-family: 'Inter', -apple-system, sans-serif; color: var(--ink);
          display: flex; justify-content: center; align-items: center;
          min-height: 100dvh; padding: 24px 0;
        }
        .tms-root * { box-sizing: border-box; }
        .tms-phone { width: 380px; max-width: 100%; height: 740px; max-height: 100dvh; background: var(--paper); border-radius: 28px; border: 1px solid var(--line); box-shadow: 0 24px 48px -24px rgba(20,22,26,0.35); display: flex; flex-direction: column; overflow: hidden; position: relative; }
        /* На реальном мобильном экране (Telegram Mini App) декоративная рамка
           «телефона» не нужна — приложение растягивается на весь вьюпорт. */
        @media (max-width: 480px) {
          .tms-root { padding: 0; min-height: 100dvh; height: 100dvh; }
          .tms-phone { width: 100%; height: 100dvh; max-height: none; border-radius: 0; border: none; box-shadow: none; }
        }
        .tms-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px; background: var(--paper); border-bottom: 1px solid var(--line); flex-shrink: 0; }
        .tms-header-btn { width: 26px; height: 26px; border-radius: 8px; border: none; background: transparent; color: var(--muted); font-size: 15px; cursor: pointer; }
        .tms-header-spacer { width: 26px; }
        .tms-header-title { font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; color: var(--muted); }
        .tms-body { flex: 1; overflow-y: auto; }
        .tms-screen { padding: 20px 20px 32px; display: flex; flex-direction: column; gap: 2px; }
        .tms-hero { padding: 4px 0 8px; }
        .tms-greeting { font-size: 13px; color: var(--muted); margin: 0 0 4px; }
        .tms-hero-title { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 600; margin: 0; line-height: 1.2; }
        .tms-role-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        .tms-role-card { text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
        .tms-role-emoji { font-size: 22px; }
        .tms-role-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px; }
        .tms-role-sub { font-size: 12px; color: var(--muted); }
        .tms-section { margin-top: 22px; }
        .tms-section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 10px; font-weight: 500; }
        .tms-link-row { border: none; background: transparent; color: var(--accent); font-weight: 600; font-size: 13px; cursor: pointer; padding: 0; }
        .tms-textarea { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 14px; resize: none; background: var(--card); color: var(--ink); }
        .tms-hint-inline { text-transform: none; letter-spacing: normal; font-weight: 400; color: var(--muted); }
        .tms-cat-group { margin-top: 16px; }
        .tms-cat-group:first-child { margin-top: 0; }
        .tms-cat-group-title { font-size: 12px; font-weight: 600; margin: 0 0 6px; }
        .tms-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .tms-cat-card { text-align: center; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px 6px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .tms-cat-icon { font-size: 20px; }
        .tms-cat-name { font-size: 12.5px; font-weight: 500; }
        .tms-list { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--card); }
        .tms-list-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 16px; border-bottom: 1px solid var(--line); background: transparent; border-left: none; border-right: none; border-top: none; font-size: 14px; cursor: pointer; color: var(--ink); text-align: left; }
        .tms-list-row:last-child { border-bottom: none; }
        .tms-list-row.is-active-row { background: var(--paper); font-weight: 600; }
        .tms-list-plain { display: flex; flex-direction: column; gap: 14px; }
        .tms-chevron { color: var(--muted); }
        .tms-summary-pill { display: inline-block; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 9px 14px; font-size: 13px; font-weight: 500; }
        .tms-chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .tms-chip { border: 1px solid var(--line); background: var(--card); border-radius: 8px; padding: 8px 13px; font-size: 12.5px; cursor: pointer; color: var(--ink); }
        .tms-chip.is-active { background: var(--ink); border-color: var(--ink); color: var(--paper); font-weight: 600; }
        .tms-range { width: 100%; accent-color: var(--ink); }
        .tms-provider-list { display: flex; flex-direction: column; }
        .tms-provider-row { border-bottom: 1px solid var(--line); padding: 12px 0; display: flex; flex-direction: column; gap: 8px; }
        .tms-provider-row:first-child { padding-top: 0; }
        .tms-provider-main { display: flex; align-items: center; gap: 10px; padding: 0; background: transparent; border: none; cursor: pointer; text-align: left; width: 100%; }
        .tms-provider-avatar { font-size: 22px; flex-shrink: 0; }
        .tms-provider-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .tms-provider-name { font-size: 14px; font-weight: 600; }
        .tms-provider-meta { font-size: 11px; color: var(--muted); }
        .tms-matchring-text { font-size: 11px; font-weight: 600; fill: var(--ink); }
        .tms-legend { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .tms-legend-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
        .tms-legend-label { width: 120px; flex-shrink: 0; }
        .tms-legend-bar-track { flex: 1; height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
        .tms-legend-bar-fill { display: block; height: 100%; background: var(--accent); border-radius: 2px; }
        .tms-legend-weight { width: 26px; text-align: right; color: var(--muted); flex-shrink: 0; }
        .tms-offer-list { display: flex; flex-direction: column; }
        .tms-offer-row { border-bottom: 1px solid var(--line); padding: 16px 0; display: flex; flex-direction: column; gap: 8px; }
        .tms-offer-row:first-child { padding-top: 0; }
        .tms-offer-top { display: flex; align-items: center; gap: 10px; }
        .tms-offer-top .tms-provider-name, .tms-offer-top .tms-provider-meta { margin: 0; }
        .tms-offer-terms { margin-left: auto; font-size: 13px; font-weight: 600; }
        .tms-offer-comment { font-size: 12.5px; color: var(--muted); margin: 0; }
        .tms-offer-actions { display: flex; gap: 8px; margin-top: 2px; }
        .tms-select-btn { border: none; border-radius: 9px; background: var(--ink); color: var(--paper); padding: 9px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .tms-decline-btn { border: 1px solid var(--line); background: transparent; border-radius: 9px; padding: 9px 14px; font-size: 12.5px; cursor: pointer; color: var(--muted); }
        .tms-bottombar { padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--paper); flex-shrink: 0; }
        .tms-bottombar-hint { margin: 0 0 8px; font-size: 12px; color: var(--muted); text-align: center; }
        .tms-mainbutton { width: 100%; border: none; border-radius: 12px; background: var(--ink); color: var(--paper); padding: 14px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .tms-mainbutton:disabled { background: var(--line); color: var(--muted); cursor: default; }
        .tms-error { color: #B4532F; font-size: 12.5px; margin-top: 8px; }
        .muted { color: var(--muted); font-size: 12.5px; margin-top: 8px; }
        .tms-body-text { font-size: 14px; line-height: 1.5; margin: 0; }

        /* --- Личный кабинет мастера --- */
        .tms-tabbar { display: flex; border-top: 1px solid var(--line); background: var(--card); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
        .tms-tabbar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 4px 8px; background: transparent; border: none; cursor: pointer; color: var(--muted); }
        .tms-tabbar-icon { font-size: 18px; }
        .tms-tabbar-label { font-size: 10px; font-weight: 500; }
        .tms-tabbar-item.is-active { color: var(--accent); }
        .tms-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 18px; }
        .tms-stat-card { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; text-align: left; cursor: default; }
        .tms-stat-card.is-clickable { cursor: pointer; }
        .tms-stat-icon { font-size: 18px; }
        .tms-stat-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .tms-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 600; }
        .tms-stat-label { font-size: 10.5px; color: var(--muted); }
        .tms-income-card { background: var(--ink); color: var(--paper); border-radius: 16px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
        .tms-income-card .tms-provider-meta { color: rgba(246,245,242,0.65); }
        .tms-income-value { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 600; }
        .tms-funnel { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px 10px; }
        .tms-funnel-step { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .tms-funnel-value { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 600; }
        .tms-funnel-arrow { color: var(--muted); font-size: 12px; }
        .tms-segmented { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .tms-segmented-item { flex-shrink: 0; border: 1px solid var(--line); background: var(--card); border-radius: 9px; padding: 8px 12px; font-size: 12px; cursor: pointer; color: var(--ink); display: flex; align-items: center; gap: 5px; }
        .tms-segmented-item.is-active { background: var(--ink); border-color: var(--ink); color: var(--paper); font-weight: 600; }
        .tms-segmented-count { font-size: 10.5px; opacity: 0.7; }
        .tms-order-card { display: flex; align-items: center; gap: 8px; width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--line); padding: 14px 0; cursor: pointer; text-align: left; }
        .tms-order-card:first-child { padding-top: 0; }
        .tms-badge { color: var(--accent); font-size: 16px; line-height: 1; }
        .tms-badge-verify { font-size: 10.5px; font-weight: 600; color: var(--muted); background: var(--paper); border-radius: 8px; padding: 4px 8px; white-space: nowrap; }
        .tms-badge-verify.is-verified { color: var(--accent); }
        .tms-profile-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .tms-profile-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .tms-profile-head > div { flex: 1; min-width: 0; }
        .tms-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .tms-field-group { display: flex; flex-direction: column; gap: 10px; }
        .tms-field { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: var(--muted); font-weight: 500; }
        .tms-field-input { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 13.5px; background: var(--card); color: var(--ink); }
        .tms-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 13px; }
        .tms-toggle-text { display: flex; flex-direction: column; gap: 2px; }
        .tms-toggle-sub { font-size: 11px; color: var(--muted); font-weight: 400; }
        .tms-toggle { width: 38px; height: 22px; border-radius: 11px; border: none; background: var(--line); position: relative; cursor: pointer; flex-shrink: 0; padding: 0; }
        .tms-toggle.is-on { background: var(--accent); }
        .tms-toggle-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left 0.15s; }
        .tms-toggle.is-on .tms-toggle-knob { left: 18px; }
        .tms-review-summary { display: flex; gap: 16px; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
        .tms-review-score { display: flex; flex-direction: column; align-items: center; gap: 2px; flex-shrink: 0; }
        .tms-review-score-value { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; }
        .tms-review-stars { color: #D9A441; font-size: 13px; letter-spacing: 1px; }
        .tms-review-bars { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .tms-review-bar-row { display: flex; align-items: center; gap: 6px; font-size: 10.5px; }
        .tms-review-row { display: flex; flex-direction: column; gap: 3px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
        .tms-review-row:last-child { border-bottom: none; padding-bottom: 0; }
        .tms-review-top { display: flex; align-items: center; justify-content: space-between; }
        .tms-review-text { font-size: 13px; margin: 0; }
        .tms-inprogress-note { font-size: 11px; color: var(--muted); background: var(--card); border: 1px dashed var(--line); border-radius: 10px; padding: 8px 10px; margin: 4px 0 0; }
        .tms-archive { margin-top: 22px; }
        .tms-archive summary { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); font-weight: 500; cursor: pointer; }
        .tms-chat-thread { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .tms-chat-bubble { max-width: 78%; border-radius: 14px; padding: 9px 12px; display: flex; flex-direction: column; gap: 3px; }
        .tms-chat-bubble.is-client { align-self: flex-start; background: var(--card); border: 1px solid var(--line); border-bottom-left-radius: 4px; }
        .tms-chat-bubble.is-me { align-self: flex-end; background: var(--ink); color: var(--paper); border-bottom-right-radius: 4px; }
        .tms-chat-text { font-size: 13.5px; margin: 0; }
        .tms-chat-time { font-size: 10px; opacity: 0.6; align-self: flex-end; }
        .tms-chatbar { display: flex; gap: 8px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--paper); flex-shrink: 0; }
        .tms-chatbar-input { flex: 1; border: 1px solid var(--line); border-radius: 20px; padding: 10px 14px; font-size: 13.5px; background: var(--card); color: var(--ink); }
        .tms-chatbar-send { width: 38px; height: 38px; border-radius: 50%; border: none; background: var(--ink); color: var(--paper); cursor: pointer; flex-shrink: 0; }
        .tms-chatbar-send:disabled { background: var(--line); color: var(--muted); }
        .tms-starpicker { display: flex; gap: 6px; }
        .tms-starpicker-btn { border: none; background: transparent; font-size: 32px; line-height: 1; padding: 0; cursor: pointer; color: #D9A441; }
      `}</style>
      <div className="tms-phone">
        <Header title={TITLES[screen]} onBack={showBack ? goBack : null} onClose={goHome} t={t} />
        <div className="tms-body">{render()}</div>
        {bottomArea}
      </div>
    </div>
  );
}
