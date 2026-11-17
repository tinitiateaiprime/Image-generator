import type {
  AppSessionState,
  ReferenceType,
  SelectedApiService,
} from "../types/app";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname.includes("railway.app")
    ? "https://agentic-content-generator-production.up.railway.app"
    : "http://localhost:8000");

export function resolveApiUrl(url: string): string {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url) || url.startsWith("blob:")) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function getReferenceType(
  extension: string,
  mimeType = "",
): ReferenceType {
  const normalizedExtension = extension.toLowerCase();

  if (normalizedExtension === ".gif") return "gif";
  if (normalizedExtension === ".pdf") return "pdf";
  if (
    normalizedExtension === ".mp4" ||
    normalizedExtension === ".webm" ||
    normalizedExtension === ".mov"
  ) {
    return "video";
  }
  if (
    normalizedExtension === ".png" ||
    normalizedExtension === ".jpg" ||
    normalizedExtension === ".jpeg" ||
    normalizedExtension === ".webp" ||
    mimeType.startsWith("image/")
  ) {
    return "image";
  }

  return "image";
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

export function isImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return (
      pathname.endsWith(".png") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".jpeg") ||
      pathname.endsWith(".webp") ||
      pathname.endsWith(".gif")
    );
  } catch {
    return false;
  }
}

export function cleanSocialTag(value: unknown): string {
  const tag = String(value || "").trim();
  if (!tag) return "";
  return tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`;
}

export function normalizeSocialTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanSocialTag)
    .filter(Boolean)
    .filter((tag, index, list) => list.indexOf(tag) === index);
}

export function buildFallbackTopicHashtags(
  prompt: string,
  description: string,
): string[] {
  const source = `${prompt} ${description}`.toLowerCase();
  const stopWords = new Set([
    "this", "that", "with", "from", "into", "about", "have", "has",
    "will", "your", "their", "there", "where", "which", "what", "when",
    "while", "using", "used", "make", "made", "show", "shows", "image",
    "create", "created", "content", "post", "social", "media", "the", "and",
    "for", "are", "you", "our", "its", "not", "but", "can", "all", "one",
    "two", "new", "more", "very", "also", "than", "then", "they", "them",
    "a", "an", "to", "of", "in", "on", "at", "by", "is", "it",
    "be", "as", "or", "if", "we", "i", "me", "my", "how", "why", "do",
  ]);

  const candidates = source.match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
  const tags: string[] = [];

  for (const word of candidates) {
    const normalized = word.replace(/^[^a-z]+|[^a-z0-9]+$/g, "");
    if (!normalized || stopWords.has(normalized)) continue;
    if (/^https?$/.test(normalized)) continue;
    const tag = `#${normalized.replace(/[^a-z0-9]/gi, "")}`;
    if (tag.length < 4 || tag.length > 40) continue;
    if (!tags.includes(tag)) tags.push(tag);
    if (tags.length >= 8) break;
  }

  const defaults = ["#Technology", "#Innovation", "#DigitalContent"];
  for (const fallback of defaults) {
    if (tags.length >= 8) break;
    if (!tags.includes(fallback)) tags.push(fallback);
  }

  return tags.slice(0, 8);
}

export function extractExplicitCompanyTags(prompt: string): string[] {
  const explicit = prompt.match(/#[A-Za-z0-9_]+/g) || [];
  return normalizeSocialTags(explicit).slice(0, 5);
}

const APP_SESSION_KEY = "image-generator-ui-session";

export function readAppSession(): AppSessionState {
  const defaultSession: AppSessionState = {
    apiSetupComplete: false,
    selectedApiKeys: [],
    selectedApiServices: [],
    availableApiServices: [],
  };

  try {
    const stored = window.sessionStorage.getItem(APP_SESSION_KEY);
    if (!stored) return defaultSession;

    const parsed = JSON.parse(stored) as Partial<AppSessionState>;

    const parseServices = (items: unknown, includeKeyName: boolean): SelectedApiService[] =>
      Array.isArray(items)
        ? items
            .filter(
              (service): service is SelectedApiService =>
                Boolean(service) &&
                typeof service === "object" &&
                typeof (service as SelectedApiService).id === "string" &&
                typeof (service as SelectedApiService).name === "string",
            )
            .map((service) =>
              includeKeyName
                ? { id: service.id, name: service.name, keyName: service.keyName }
                : { id: service.id, name: service.name },
            )
        : [];

    return {
      apiSetupComplete: parsed.apiSetupComplete === true,
      selectedApiKeys: Array.isArray(parsed.selectedApiKeys)
        ? parsed.selectedApiKeys.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      availableApiServices: parseServices(parsed.availableApiServices, true),
      selectedApiServices: parseServices(parsed.selectedApiServices, false),
    };
  } catch (error) {
    console.warn("Unable to restore application session:", error);
    return defaultSession;
  }
}

export function writeAppSession(state: AppSessionState) {
  try {
    window.sessionStorage.setItem(
      APP_SESSION_KEY,
      JSON.stringify({
        apiSetupComplete: state.apiSetupComplete,
        selectedApiKeys: state.selectedApiKeys,
        selectedApiServices: state.selectedApiServices,
        availableApiServices: state.availableApiServices,
      }),
    );
  } catch (error) {
    console.warn("Unable to save application session:", error);
  }
}

