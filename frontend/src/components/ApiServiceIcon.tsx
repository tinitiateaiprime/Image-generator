export function getApiServiceIcon(
  serviceName: string,
  keyName = "",
  size = 24,
) {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const service = normalize(serviceName);
  const key = normalize(keyName);

  /*
   * Provider icon registry
   * ------------------------------------------------------------
   *
   * The key name is checked before the display name. This is
   * important because different environment-variable names can
   * represent the same provider.
   *
   * Provider-specific assets are used instead of rendering the
   * first character of the provider name. Therefore the UI shows
   * only the real provider icon + provider name.
   *
   * Gemini uses Google's official Gemini sparkle asset.
   * Claude uses Claude's product favicon.
   * OpenRouter uses its current official app icon.
   * Other providers use their own official site favicon.
   */
  const brandIcons: Array<{
    matches: string[];
    iconUrl: string;
    alt: string;
  }> = [
    // Google / Gemini
    {
      matches: [
        "gemini api",
        "gemini",
        "google gemini",
        "gemini api key",
        "gemini api key",
        "google api key",
        "google ai api",
        "google ai api key",
        "generative ai api",
      ],
      iconUrl:
        "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
      alt: "Google Gemini",
    },
    {
      matches: [
        "google drive api",
        "google drive",
        "drive api",
        "gdrive api",
      ],
      iconUrl:
        "https://drive.google.com/favicon.ico",
      alt: "Google Drive",
    },
    {
      matches: [
        "google cloud api",
        "google cloud",
        "gcp api",
        "google vertex api",
        "google vertex",
      ],
      iconUrl:
        "https://cloud.google.com/favicon.ico",
      alt: "Google Cloud",
    },
    {
      matches: [
        "google api",
        "google",
      ],
      iconUrl:
        "https://www.google.com/favicon.ico",
      alt: "Google",
    },

    // AI providers — exact product icons
    {
      matches: [
        "openrouter api",
        "openrouter",
        "open router api",
        "open router",
        "openrouter api key",
      ],
      iconUrl:
        "https://openrouter.ai/apple-touch-icon.png",
      alt: "OpenRouter",
    },
    {
      matches: [
        "claude api",
        "claude",
        "claude ai",
        "anthropic claude",
        "anthropic api",
        "anthropic",
        "anthropic api key",
      ],
      iconUrl:
        // "https://claude.ai/favicon.ico",
        "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/claude-ai.svg",
      alt: "Claude",
    },
    {
      matches: [
        "openai api",
        "openai",
        "chatgpt api",
        "chatgpt",
        "openai api key",
      ],
      iconUrl:
        "https://openai.com/favicon.ico",
      alt: "OpenAI",
    },
    {
      matches: [
        "groq api",
        "groq",
        "groq api key",
      ],
      iconUrl:
        "https://groq.com/favicon.ico",
      alt: "Groq",
    },
    {
      matches: [
        "mistral api",
        "mistral",
        "mistralai",
        "mistral ai",
        "mistral ai api",
      ],
      iconUrl:
        "https://mistral.ai/favicon.ico",
      alt: "Mistral AI",
    },
    {
      matches: [
        "cohere api",
        "cohere",
        "cohere api key",
      ],
      iconUrl:
        "https://cohere.com/favicon.ico",
      alt: "Cohere",
    },
    {
      matches: [
        "hugging face api",
        "huggingface api",
        "hugging face",
        "huggingface",
      ],
      iconUrl:
        "https://huggingface.co/favicon.ico",
      alt: "Hugging Face",
    },
    {
      matches: [
        "perplexity api",
        "perplexity",
        "perplexity api key",
      ],
      iconUrl:
        "https://www.perplexity.ai/favicon.ico",
      alt: "Perplexity",
    },
    {
      matches: [
        "deepseek api",
        "deepseek",
        "deepseek api key",
      ],
      iconUrl:
        "https://www.deepseek.com/favicon.ico",
      alt: "DeepSeek",
    },
    {
      matches: [
        "xai api",
        "xai",
        "x ai api",
        "grok api",
        "grok",
        "x ai",
      ],
      iconUrl:
        "https://x.ai/favicon.ico",
      alt: "xAI",
    },
    {
      matches: [
        "qwen api",
        "qwen",
        "alibaba qwen",
      ],
      iconUrl:
        "https://qwen.ai/favicon.ico",
      alt: "Qwen",
    },
    {
      matches: [
        "fireworks api",
        "fireworks",
        "fireworks ai",
      ],
      iconUrl:
        "https://fireworks.ai/favicon.ico",
      alt: "Fireworks AI",
    },
    {
      matches: [
        "together ai api",
        "together api",
        "together ai",
        "together",
      ],
      iconUrl:
        "https://www.together.ai/favicon.ico",
      alt: "Together AI",
    },
    {
      matches: [
        "replicate api",
        "replicate",
      ],
      iconUrl:
        "https://replicate.com/favicon.ico",
      alt: "Replicate",
    },
    {
      matches: [
        "stability ai api",
        "stability ai",
        "stabilityai",
        "stability",
      ],
      iconUrl:
        "https://stability.ai/favicon.ico",
      alt: "Stability AI",
    },
    {
      matches: [
        "elevenlabs api",
        "eleven labs api",
        "elevenlabs",
        "eleven labs",
      ],
      iconUrl:
        "https://elevenlabs.io/favicon.ico",
      alt: "ElevenLabs",
    },
    {
      matches: [
        "assemblyai api",
        "assembly ai api",
        "assemblyai",
        "assembly ai",
      ],
      iconUrl:
        "https://www.assemblyai.com/favicon.ico",
      alt: "AssemblyAI",
    },

    // Microsoft / AWS / Meta
    {
      matches: [
        "azure api",
        "microsoft azure api",
        "azure",
        "microsoft azure",
        "azure openai api",
      ],
      iconUrl:
        "https://azure.microsoft.com/favicon.ico",
      alt: "Microsoft Azure",
    },
    {
      matches: [
        "microsoft api",
        "microsoft",
        "ms graph api",
        "microsoft graph api",
        "graph api",
      ],
      iconUrl:
        "https://www.microsoft.com/favicon.ico",
      alt: "Microsoft",
    },
    {
      matches: [
        "aws api",
        "amazon web services api",
        "amazon web services",
        "amazon api",
        "aws",
      ],
      iconUrl:
        "https://aws.amazon.com/favicon.ico",
      alt: "Amazon Web Services",
    },
    {
      matches: [
        "meta api",
        "meta",
        "facebook api",
        "facebook",
      ],
      iconUrl:
        "https://www.meta.com/favicon.ico",
      alt: "Meta",
    },

    // Developer / data / infrastructure
    {
      matches: ["pinecone api", "pinecone"],
      iconUrl:
        "https://www.pinecone.io/favicon.ico",
      alt: "Pinecone",
    },
    {
      matches: ["github api", "github"],
      iconUrl:
        "https://github.com/favicon.ico",
      alt: "GitHub",
    },
    {
      matches: ["gitlab api", "gitlab"],
      iconUrl:
        "https://gitlab.com/favicon.ico",
      alt: "GitLab",
    },

    // Communication / productivity / design
    {
      matches: ["youtube api", "youtube"],
      iconUrl:
        "https://www.youtube.com/favicon.ico",
      alt: "YouTube",
    },
    {
      matches: ["stripe api", "stripe"],
      iconUrl:
        "https://stripe.com/favicon.ico",
      alt: "Stripe",
    },
    {
      matches: ["twilio api", "twilio"],
      iconUrl:
        "https://www.twilio.com/favicon.ico",
      alt: "Twilio",
    },
    {
      matches: ["sendgrid api", "sendgrid"],
      iconUrl:
        "https://sendgrid.com/favicon.ico",
      alt: "SendGrid",
    },
    {
      matches: ["slack api", "slack"],
      iconUrl:
        "https://slack.com/favicon.ico",
      alt: "Slack",
    },
    {
      matches: ["discord api", "discord"],
      iconUrl:
        "https://discord.com/favicon.ico",
      alt: "Discord",
    },
    {
      matches: ["notion api", "notion"],
      iconUrl:
        "https://www.notion.so/favicon.ico",
      alt: "Notion",
    },
    {
      matches: ["canva api", "canva"],
      iconUrl:
        "https://www.canva.com/favicon.ico",
      alt: "Canva",
    },
    {
      matches: ["figma api", "figma"],
      iconUrl:
        "https://www.figma.com/favicon.ico",
      alt: "Figma",
    },
  ];

  const matchesEntry = (entry: (typeof brandIcons)[number]) =>
    entry.matches.some((match) => {
      const normalizedMatch = normalize(match);

      return (
        key === normalizedMatch ||
        service === normalizedMatch ||
        key.includes(normalizedMatch) ||
        service.includes(normalizedMatch)
      );
    });

  const brand = brandIcons.find(matchesEntry);

  if (brand) {
    return (
      <img
        src={brand.iconUrl}
        alt={`${brand.alt} icon`}
        title={brand.alt}
        aria-hidden="true"
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: "block",
          objectFit: "contain",
          flexShrink: 0,
          borderRadius: "4px",
        }}
        onError={(event) => {
          /*
           * Never render A, C, O, or any other provider letter.
           * If a remote provider asset is temporarily unavailable,
           * show a neutral icon until the asset loads again.
           */
          const image = event.currentTarget;
          image.style.display = "none";

          const fallback =
            document.createElement("span");

          fallback.innerHTML = `
            <svg
              width="${size}"
              height="${size}"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M8 12h8M12 8v8"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          `;

          fallback.style.width = `${size}px`;
          fallback.style.height = `${size}px`;
          fallback.style.display = "inline-flex";
          fallback.style.alignItems = "center";
          fallback.style.justifyContent = "center";
          fallback.style.color = "#7C6CFF";
          fallback.style.flexShrink = "0";

          image.parentElement?.appendChild(fallback);
        }}
      />
    );
  }

  /*
   * Unknown/custom provider:
   * never use the provider's first letter. Use a neutral API
   * symbol instead so the UI always remains icon + name.
   */
  return (
    <span
      title={`${serviceName} icon`}
      aria-label={`${serviceName} icon`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#7C6CFF",
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8 12h8M12 8v8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

