import { useEffect, useRef, useState } from "react";
import type { UIEvent } from "react";
import "./App.css";
import type { GenerateTemplateResponse } from "./services/templateService";
import type {
  AppSessionState,
  DriveOutputFolder,
  ImageGeneratorProps,
  InputFile,
  ReferenceData,
  SelectedApiService,
} from "./types/app";
import {
  API_BASE_URL,
  buildFallbackTopicHashtags,
  extractExplicitCompanyTags,
  getReferenceType,
  normalizeSocialTags,
  readAppSession,
  resolveApiUrl,
  writeAppSession,
} from "./utils/appHelpers";
import { ApiKeySetup } from "./components/ApiKeySetup";
import { getApiServiceIcon } from "./components/ApiServiceIcon";
import { ContentGeneratorHome, HomePage } from "./components/HomePage";

function ImageGenerator({
  selectedApiKeys,
  availableApiServices,
  onApiSelectionChange,
  onBackToApiSetup,
  onBackToHome,
}: ImageGeneratorProps) {


  const [inputFiles, setInputFiles] =
    useState<InputFile[]>([]);

  const [selectedInputIds, setSelectedInputIds] =
    useState<string[]>([]);

  // Keep the first selected reference for the existing preview area.
  const selectedInputId = selectedInputIds[0] || "";

  const [reference, setReference] =
    useState<ReferenceData | null>(null);
  const externalReferences: ReferenceData[] = [];

  const [templatePrompt, setTemplatePrompt] =
    useState("");

  const [, setPromptMode] =
    useState<"manual" | "ai">(
      "manual",
    );

  const [templateResult, setTemplateResult] =
    useState<GenerateTemplateResponse | null>(
      null,
    );

  const [, setTemplateApiProvider] =
    useState("");

  const [, setTemplateApiModel] =
    useState("");

  const [generatedImageUrl, setGeneratedImageUrl] =
    useState("");

  const [generatedImageFilename, setGeneratedImageFilename] =
    useState("");

  const [, setGeneratedImageDescription] =
    useState("");

  type SocialDescriptionItem = {
    text: string;
    character_count: number;
    character_limit: number;
    word_count: number;
    target_word_count?: number;
    minimum_word_count?: number;
    maximum_word_count?: number;
    company_tags?: string[];
    tags?: string[];
  };

  const [socialDescriptions, setSocialDescriptions] =
    useState<Record<string, SocialDescriptionItem>>({});
  const [socialDescriptionFilename, setSocialDescriptionFilename] =
    useState("");
  const [isGeneratingSocialDescriptions, setIsGeneratingSocialDescriptions] =
    useState(false);
  const [socialDescriptionError, setSocialDescriptionError] =
    useState("");
  const [socialDescriptionSaved, setSocialDescriptionSaved] =
    useState(false);
  const [socialDescriptionSaveMessage, setSocialDescriptionSaveMessage] =
    useState("");
  const [isSocialDescriptionPreviewOpen, setIsSocialDescriptionPreviewOpen] =
    useState(false);

  const [generatedImageModel, setGeneratedImageModel] =
    useState("");

  const [generatedImageProvider, setGeneratedImageProvider] =
    useState("");

  const [isSavingGeneratedImage, setIsSavingGeneratedImage] =
    useState(false);

  const [generatedImageSaved, setGeneratedImageSaved] =
    useState(false);

  const [generatedImageSaveMessage, setGeneratedImageSaveMessage] =
    useState("");

  const [driveOutputFolders, setDriveOutputFolders] = useState<DriveOutputFolder[]>([]);
  const [selectedOutputFolderId, setSelectedOutputFolderId] = useState("");
  const [isOutputFolderPickerOpen, setIsOutputFolderPickerOpen] = useState(false);

  const [generatedTextChanges, setGeneratedTextChanges] =
    useState<Record<string, string>>({});

  const [isGeneratingImage, setIsGeneratingImage] =
    useState(false);

  const [isLoadingInputs, setIsLoadingInputs] =
    useState(false);

  const [isTaggingImages, setIsTaggingImages] =
    useState(false);

  const [previewUrls, setPreviewUrls] =
    useState<Record<string, string>>({});

  const [error, setError] =
    useState("");


  const [
    isReferenceListAtTop,
    setIsReferenceListAtTop,
  ] = useState(true);


  const [
    isReferenceListAtBottom,
    setIsReferenceListAtBottom,
  ] = useState(false);

  const referenceListRef =
    useRef<HTMLDivElement | null>(
      null,
    );


  /*
   * ------------------------------------------------------------
   * Load reference images from Google Drive and manual uploads
   * ------------------------------------------------------------
   */

  async function loadDriveOutputFolders(): Promise<DriveOutputFolder[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/drive/folders`,
        { credentials: "include" },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          String(
            data?.detail ||
              "Unable to load Google Drive folders.",
          ),
        );
      }

      const folders: DriveOutputFolder[] =
        Array.isArray(data?.folders)
          ? data.folders
          : [];

      setDriveOutputFolders(folders);

      setSelectedOutputFolderId((current) =>
        current &&
        folders.some((folder) => folder.id === current)
          ? current
          : String(folders[0]?.id || ""),
      );

      return folders;
    } catch (error) {
      console.error(
        "Loading Google Drive output folders failed:",
        error,
      );

      // Preserve an already-loaded list if a refresh fails.
      return driveOutputFolders;
    }
  }


  async function loadInputFiles() {
    setIsLoadingInputs(true);
    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/api/inputs`,
          {
            credentials: "include",
          },
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          String(
            errorData?.detail ||
              "Unable to load reference images.",
          ),
        );
      }


      const data =
        await response.json();


      const files: InputFile[] =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data?.files,
            )
            ? data.files
            : [];


      const images =
        files.filter(
          (
            file: InputFile,
          ) =>
            file.type ===
              "image" ||
            file.type ===
              "gif",
        );


      setInputFiles(
        images,
      );


      /*
       * Load the actual image bytes through
       * the backend and create browser blob URLs.
       *
       * This makes Drive previews independent
       * of browser caching and Google Drive's
       * response headers.
       */

      void preloadReferencePreviews(
        images,
      );

    } catch (err) {

      console.error(
        "Loading input files failed:",
        err,
      );


      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reference images.",
      );


      setInputFiles([]);

    } finally {

      setIsLoadingInputs(
        false,
      );
    }
  }


  /*
   * ------------------------------------------------------------
   * FIX:
   * Automatically load Google Drive references
   * when Image Generator opens.
   * ------------------------------------------------------------
   */

  useEffect(() => {
    void loadInputFiles();
    void loadDriveOutputFolders();

    // Load Google Drive references once when
    // the workspace opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function preloadReferencePreviews(
    files: InputFile[],
  ) {

    const entries =
      await Promise.all(
        files.map(
          async (
            file,
          ) => {

            try {

              const response =
                await fetch(
                  resolveApiUrl(
                    file.url,
                  ),
                  {
                    cache:
                      "no-store",
                    credentials:
                      "include",
                  },
                );


              if (!response.ok) {
                throw new Error(
                  `Preview request failed (${response.status})`,
                );
              }


              const blob =
                await response.blob();


              if (
                !blob.size ||
                !blob.type.startsWith(
                  "image/",
                )
              ) {
                throw new Error(
                  "The backend did not return a valid image.",
                );
              }


              const objectUrl =
                URL.createObjectURL(
                  blob,
                );


              return [
                file.id,
                objectUrl,
              ] as const;

            } catch (
              previewError
            ) {

              console.error(
                "Reference preview failed:",
                file.name,
                previewError,
              );


              return null;
            }
          },
        ),
      );


    setPreviewUrls(
      (current) => {

        const next = {
          ...current,
        };


        entries.forEach(
          (entry) => {

            if (!entry) {
              return;
            }


            const [
              id,
              url,
            ] = entry;


            if (
              current[id] &&
              current[id] !==
                url
            ) {

              URL.revokeObjectURL(
                current[id],
              );
            }


            next[id] =
              url;
          },
        );


        return next;
      },
    );
  }


  useEffect(() => {

  ;

  return () => {

      Object.values(
        previewUrls,
      ).forEach(
        (url) => {

          URL.revokeObjectURL(
            url as string,
          );

        },
      );

    };

  }, [previewUrls]);


  /*
   * ------------------------------------------------------------
   * Generate AI tags for existing images
   * ------------------------------------------------------------
   */

  async function generateInputImageTags(
    filesToTag: InputFile[] =
      inputFiles,
  ) {

    if (!filesToTag.length) {
      return;
    }


    setIsTaggingImages(true);
    setError("");


    try {

      // The backend keeps API selection in memory. After a backend restart,
      // the browser can still have the selected IDs in its session state,
      // so synchronize them before starting any AI operation. This also
      // prevents a race between restoring the UI selection and /tag-all.
      if (selectedApiKeys.length === 0) {
        throw new Error(
          "No API key is selected. Select at least one API key before using the AI pipeline.",
        );
      }

      const selectionResponse = await fetch(
        `${API_BASE_URL}/api/api-keys/select`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected_ids: selectedApiKeys }),
          credentials: "include",
        },
      );

      const selectionData = await selectionResponse.json().catch(() => null);
      if (!selectionResponse.ok) {
        throw new Error(
          String(
            selectionData?.detail ||
              "Unable to synchronize the selected API keys.",
          ),
        );
      }

      const response =
        await fetch(
          `${API_BASE_URL}/api/inputs/tag-all`,
          {
            method: "POST",
            credentials: "include",
          },
        );


      const data =
        await response
          .json()
          .catch(() => null);


      if (!response.ok) {

        throw new Error(
          String(
            data?.detail ||
              "Unable to generate image tags.",
          ),
        );
      }


      const tagMapById:
        Record<
          string,
          string
        > = {};


      const tagMapByFilename:
        Record<
          string,
          string
        > = {};


      const errorMapById:
        Record<
          string,
          string
        > = {};


      if (
        Array.isArray(
          data?.results,
        )
      ) {

        data.results.forEach(
          (
            result: {
              id?: string;
              filename?: string;
              tag?: string;
            },
          ) => {

            if (
              result.tag &&
              result.id
            ) {

              tagMapById[
                result.id
              ] =
                result.tag;
            }


            if (
              result.tag &&
              result.filename
            ) {

              tagMapByFilename[
                result.filename
              ] =
                result.tag;
            }

          },
        );

      }


      if (
        Array.isArray(
          data?.errors,
        )
      ) {

        data.errors.forEach(
          (
            result: {
              id?: string;
              filename?: string;
              error?: string;
            },
          ) => {

            const message =
              String(
                result.error ||
                  "Gemini could not generate a tag.",
              );


            if (result.id) {

              errorMapById[
                result.id
              ] =
                message;
            }


            if (
              result.filename
            ) {

              errorMapById[
                `filename:${result.filename}`
              ] =
                message;
            }

          },
        );

      }


      setInputFiles(
        (currentFiles) =>
          currentFiles.map(
            (file) => ({
              ...file,

              tag:
                tagMapById[
                  file.id
                ] ||
                tagMapByFilename[
                  file.name
                ] ||
                file.tag,

              tagError:
                errorMapById[
                  file.id
                ] ||
                errorMapById[
                  `filename:${file.name}`
                ],
            }),
          ),
      );


      setReference(
        (currentReference) => {

          if (!currentReference) {
            return currentReference;
          }


          const updatedTag =
            (
              selectedInputId
                ? tagMapById[
                    selectedInputId
                  ]
                : undefined
            ) ||
            tagMapByFilename[
              currentReference.name
            ];


          if (!updatedTag) {
            return currentReference;
          }


          return {
            ...currentReference,
            tag: updatedTag,
          };
        },
      );


      if (
        Array.isArray(
          data?.errors,
        ) &&
        data.errors.length >
          0
      ) {

        console.error(
          "Gemini tagging errors:",
          data.errors,
        );


        const firstError =
          data.errors[0];


        setError(
          `Image tagging issue: ${String(
            firstError?.error ||
              "Gemini could not tag one or more images.",
          )}`,
        );
      }

    } catch (err) {

      console.error(
        "Image tagging failed:",
        err,
      );


      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate image tags.",
      );

    } finally {

      setIsTaggingImages(
        false,
      );
    }
  }


  function getDriveReferenceNumber(file: InputFile): number | null {
    if (file.source !== "google-drive") {
      return null;
    }

    const driveFiles = inputFiles.filter(
      (item) => item.source === "google-drive",
    );

    const index = driveFiles.findIndex(
      (item) => item.id === file.id,
    );

    return index >= 0 ? index + 1 : null;
  }


  /*
   * ------------------------------------------------------------
   * Automatically tag loaded images
   * ------------------------------------------------------------
   */

  useEffect(() => {
    // Do not call the AI tagging endpoint until at least one AI API key
    // has been selected. API selection is the source of truth for the
    // complete AI pipeline.
    if (
      inputFiles.length > 0 &&
      selectedApiKeys.length > 0
    ) {
      void generateInputImageTags(inputFiles);
    }

    // generateInputImageTags is intentionally omitted because it is recreated
    // on render. The effect is driven by the input count and selected-key count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputFiles.length, selectedApiKeys.length]);


  /*
   * ------------------------------------------------------------
   * Reference selection
   * ------------------------------------------------------------
   */

  function handleReferenceSelection(
    file: InputFile,
  ) {
    const wasSelected = selectedInputIds.includes(file.id);
    const nextSelectedIds = wasSelected
      ? selectedInputIds.filter((id) => id !== file.id)
      : [...selectedInputIds, file.id];

    setSelectedInputIds(nextSelectedIds);

    const nextPrimaryId = nextSelectedIds[0] || "";
    const primaryFile = inputFiles.find((item) => item.id === nextPrimaryId);

    if (!primaryFile) {
      setReference(null);
      setTemplatePrompt("");
      setGeneratedImageUrl("");
      setGeneratedImageFilename("");
      setGeneratedImageModel("");
      setError("");
      setTemplateResult(null);
      return;
    }

    const extension = primaryFile.name.includes(".")
      ? `.${primaryFile.name.split(".").pop()?.toLowerCase()}`
      : "";

    const selectedReference: ReferenceData = {
      type: getReferenceType(extension, primaryFile.mimeType),
      name: primaryFile.name,
      url: previewUrls[primaryFile.id] || resolveApiUrl(primaryFile.url),
      size: primaryFile.size,
      mimeType: primaryFile.mimeType,
      source: primaryFile.source === "google-drive"
        ? "google-drive"
        : primaryFile.source === "manual-upload"
          ? "upload"
          : "input-folder",
      sourceId: primaryFile.source === "google-drive"
        ? primaryFile.id.replace(/^drive:/, "")
        : primaryFile.name,
      tag: primaryFile.tag,
    };

    setReference(selectedReference);
    setPromptMode("manual");
    setGeneratedImageUrl("");
    setGeneratedImageFilename("");
    setGeneratedImageDescription("");
    setSocialDescriptions({});
    setSocialDescriptionFilename("");
    setSocialDescriptionSaved(false);
    setSocialDescriptionSaveMessage("");
    setIsSocialDescriptionPreviewOpen(false);
    setGeneratedImageModel("");
    setSocialDescriptions({});
    setSocialDescriptionError("");
    setSocialDescriptionSaved(false);
    setSocialDescriptionSaveMessage("");
    setIsSocialDescriptionPreviewOpen(false);
    setSocialDescriptions({});
    setSocialDescriptionError("");
    setSocialDescriptionSaved(false);
    setSocialDescriptionSaveMessage("");
    setIsSocialDescriptionPreviewOpen(false);
    setGeneratedImageProvider("");
    setGeneratedImageSaved(false);
    setGeneratedImageSaveMessage("");
    setError("");

    // Template generation is disabled. Selected references are passed
    // directly to image generation and addressed by their numbers.
    setTemplateResult(null);
    setTemplateApiProvider("");
    setTemplateApiModel("");
  }


  /*
   * ------------------------------------------------------------
   * Reference list scroll state
   * ------------------------------------------------------------
   */

  function updateReferenceScrollState() {

    const element =
      referenceListRef.current;


    if (!element) {
      return;
    }


    const atTop =
      element.scrollTop <=
      2;


    const atBottom =
      element.scrollTop +
        element.clientHeight >=
      element.scrollHeight -
        2;


    setIsReferenceListAtTop(
      atTop,
    );

    setIsReferenceListAtBottom(
      atBottom,
    );
  }


  function handleReferenceListScroll(
    event: UIEvent<HTMLDivElement>,
  ) {

    const element =
      event.currentTarget;


    const atTop =
      element.scrollTop <=
      2;


    const atBottom =
      element.scrollTop +
        element.clientHeight >=
      element.scrollHeight -
        2;


    setIsReferenceListAtTop(
      atTop,
    );

    setIsReferenceListAtBottom(
      atBottom,
    );
  }


  function scrollReferenceList(
    direction:
      | "up"
      | "down",
  ) {

    if (
      !referenceListRef.current
    ) {
      return;
    }


    referenceListRef.current.scrollBy(
      {
        top:
          direction ===
          "down"
            ? 180
            : -180,

        behavior:
          "smooth",
      },
    );


    window.setTimeout(
      updateReferenceScrollState,
      250,
    );
  }


  /*
   * ------------------------------------------------------------
   * Automatic template generation
   * ------------------------------------------------------------
   */

  /*
   * ------------------------------------------------------------
   * Template generation temporarily disabled
   * ------------------------------------------------------------
   * Keep the existing template state/functions in place so the feature
   * can be re-enabled later, but do not invoke the template-generation
   * pipeline anywhere in the current flow.
   */



  /*
   * ------------------------------------------------------------
   * Generate output image
   * ------------------------------------------------------------
   */

  async function handleGenerateImage() {
    if (selectedInputIds.length === 0 && !reference) {
      setError("Please select at least one reference image.");
      return;
    }

    if (!templatePrompt.trim()) {
      setError("Enter a content prompt before generating the output image.");
      return;
    }

    if (reference && (reference.type === "pdf" || reference.type === "video" || reference.type === "youtube")) {
      setError("Image generation currently requires image references.");
      return;
    }

    setError("");
    setPromptMode("manual");
    setGeneratedImageUrl("");
    setGeneratedImageFilename("");
    setGeneratedImageModel("");
    setGeneratedImageProvider("");
    setGeneratedImageSaved(false);
    setGeneratedImageSaveMessage("");
    setIsOutputFolderPickerOpen(false);
    setGeneratedTextChanges({});
    setIsGeneratingImage(true);

    try {
      if (selectedApiKeys.length === 0) {
        throw new Error(
          "No API key is selected. Select at least one API key before generating an image.",
        );
      }

      const apiStatusResponse = await fetch(
        `${API_BASE_URL}/api/api-keys/status`,
        { credentials: "include" },
      );
      const apiStatus = await apiStatusResponse.json().catch(() => null);

      if (!apiStatusResponse.ok || !apiStatus?.configured) {
        throw new Error(
          String(
            apiStatus?.detail ||
              "The API key configuration is no longer available. Please return to API Setup and upload the API key file again.",
          ),
        );
      }

      // The current UI selection is always authoritative. Do not use a cached
      // pipeline key from a previous generation.
      const selectionResponse = await fetch(
        `${API_BASE_URL}/api/api-keys/select`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected_ids: selectedApiKeys }),
          credentials: "include",
        },
      );
      const selectionData = await selectionResponse.json().catch(() => null);
      if (!selectionResponse.ok) {
        throw new Error(
          String(selectionData?.detail || "Unable to synchronize the selected API keys."),
        );
      }

      const selectedNames = Array.isArray(selectionData?.selected)
        ? selectionData.selected
        : [];
      if (selectedNames.length === 0) {
        throw new Error(
          "None of the selected API keys are available on the backend.",
        );
      }

      // Build the reference list from the actual selected reference IDs.
      // External URL/manual reference remains supported when no Drive/input
      // item is selected. Google Drive IDs are sent as IDs, never preview URLs.
      const selectedReferences = selectedInputIds
        .map((id) => {
          const file = inputFiles.find((item) => item.id === id);
          if (!file) return null;

          const sourceType =
            file.source === "google-drive"
              ? "google-drive"
              : file.source === "manual-upload"
                ? "upload"
                : "input-folder";

          return {
            number:
              getDriveReferenceNumber(file) ??
              selectedInputIds.indexOf(id) + 1,
            source_type: sourceType,
            source:
              file.source === "google-drive"
                ? file.id.replace(/^drive:/i, "")
                : file.name,
            filename: file.name,
            content_type: file.mimeType || "",
          };
        })
        .filter(Boolean);

      // Add every external reference alongside selected Drive and input files.
for (const externalReference of externalReferences) {
  if (
    externalReference.type === "pdf" ||
    externalReference.type === "video" ||
    externalReference.type === "youtube"
  ) {
    throw new Error(
      "Image generation requires image references. Remove video or YouTube references.",
    );
  }

  const source = externalReference.sourceId || externalReference.url;

  if (!source || source.startsWith("blob:")) {
    throw new Error(
      `Reference "${externalReference.name}" is not available to the backend.`,
    );
  }

  selectedReferences.push({
    number: selectedReferences.length + 1,
    source_type: "external-url",
    source,
    filename: externalReference.name || "reference.png",
    content_type: externalReference.mimeType || "",
  });
}

// Preserve support for a single existing reference, such as a manual upload,
// when no selected files or external URL references are available.
if (
  selectedReferences.length === 0 &&
  externalReferences.length === 0 &&
  reference
) {
  const sourceType =
    reference.source === "google-drive"
      ? "google-drive"
      : reference.source === "upload"
        ? "upload"
        : reference.source === "input-folder"
          ? "input-folder"
          : "external-url";

  const source = reference.sourceId || reference.url;

  if (!source || source.startsWith("blob:")) {
    throw new Error(
      "The selected reference is not available to the backend.",
    );
  }

  selectedReferences.push({
    number: 1,
    source_type: sourceType,
    source,
    filename: reference.name || "reference.png",
    content_type: reference.mimeType || "",
  });
}

      if (selectedReferences.length === 0) {
        throw new Error("At least one reference image is required.");
      }

      if (selectedReferences.length > 16) {
        throw new Error("A maximum of 16 reference images can be selected.");
      }

      const firstReference = selectedReferences[0];
      if (!firstReference) {
        throw new Error("At least one reference image is required.");
      }
      const formData = new FormData();
      formData.append("source_type", firstReference.source_type);
      formData.append("source", firstReference.source);
      formData.append("filename", firstReference.filename);
      formData.append("content_type", firstReference.content_type);
      formData.append("references_json", JSON.stringify(selectedReferences));
      formData.append("prompt", templatePrompt.trim());
      formData.append("template_json", "{}");

      const response = await fetch(
        `${API_BASE_URL}/api/images/generate`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          String(data?.detail || "Unable to generate the output image."),
        );
      }

      if (!data?.image_url) {
        throw new Error("Image generation completed without an output image.");
      }

      setGeneratedImageUrl(resolveApiUrl(data.image_url));
      setGeneratedImageFilename(String(data.filename || ""));
      // Do not display or expose the backend's automatic image description.
     // Social-media descriptions are generated separately through
     // "Generate Description" and are shown only through "Preview".
      setGeneratedImageDescription("");
      setGeneratedImageModel(String(data.model || ""));
      setGeneratedImageProvider(String(data.provider || ""));
      setGeneratedImageSaved(false);
      setGeneratedImageSaveMessage("");
      setGeneratedTextChanges(
        data?.changes && typeof data.changes === "object"
          ? data.changes
          : {},
      );
    } catch (err) {
      console.error("Image generation failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate the output image.",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }


  function getReferencePreviewColumns(count: number): number {
    // Keep the reference previews readable. Two columns are used for the
    // first six references so the tiles do not collapse into tiny thumbnails.
    if (count <= 1) return 1;
    if (count <= 6) return 2;
    if (count <= 12) return 3;
    return 4;
  }

  function getReferencePreviewHeight(count: number): number {
    if (count <= 1) return 300;
    if (count <= 2) return 240;
    if (count <= 4) return 190;
    return 160;
  }


  /*
   * ------------------------------------------------------------
   * Reference preview
   * ------------------------------------------------------------
   */

  function renderReferencePreview(
    currentReference: ReferenceData,
  ) {

    if (
      currentReference.type ===
      "youtube"
    ) {

      return (
        <div className="media-preview youtube-preview">

          <div className="youtube-icon">
            ▶
          </div>

          <div className="youtube-preview-text">

            <strong>
              YouTube Reference
            </strong>

            <span>
              External video reference
            </span>

          </div>

        </div>
      );
    }


    if (
      currentReference.type ===
      "pdf"
    ) {

      return (
        <div className="media-preview document-preview">

          <div className="document-icon">
            PDF
          </div>

          <div className="document-name">
            {currentReference.name}
          </div>

        </div>
      );
    }


    if (
      currentReference.type ===
      "video"
    ) {

      return (
        <video
          src={
            currentReference.url
          }
          controls
          className="reference-media"
        />
      );
    }


    return (
      <img
        src={
          currentReference.url
        }
        alt={
          currentReference.name
        }
        className="reference-media"
        loading="eager"
        decoding="async"
        onError={(event) => {

          console.error(
            "Reference preview failed:",
            currentReference.url,
          );


          event.currentTarget.style.display =
            "none";
        }}
      />
    );
  }


  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  async function handleGenerateSocialDescriptions() {
    if (!generatedImageFilename || isGeneratingSocialDescriptions) {
      return;
    }

    setIsGeneratingSocialDescriptions(true);
    // Generation must NEVER open the preview or display generated text.
    setIsSocialDescriptionPreviewOpen(false);
    setSocialDescriptionError("");
    setSocialDescriptionSaved(false);
    setSocialDescriptionSaveMessage("");

    try {
      const formData = new FormData();
      formData.append("filename", generatedImageFilename);
      formData.append("prompt", templatePrompt.trim());
      formData.append("template_json", "{}");

      const response = await fetch(
        `${API_BASE_URL}/api/social-media/generate`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          String(
            data?.detail ||
              "Unable to generate the social media descriptions.",
          ),
        );
      }

      setSocialDescriptionFilename(
        String(data?.social_media_filename || ""),
      );

      const promptCompanyTags = extractExplicitCompanyTags(
        templatePrompt.trim(),
      );

      const returnedDescriptions =
        data?.descriptions && typeof data.descriptions === "object"
          ? data.descriptions as Record<string, any>
          : null;

      const normalizedDescriptions: Record<string, SocialDescriptionItem> = {};

      if (returnedDescriptions) {
        Object.entries(returnedDescriptions).forEach(([platform, value]) => {
          const item = value && typeof value === "object" ? value : {};
          const text = String(item.text || item.content || "").trim();

          const companyTags = normalizeSocialTags(
            item.company_tags ?? data?.company_tags,
          );

          const topicTags = normalizeSocialTags(
            item.tags ?? item.hashtags ?? item.topic_hashtags,
          );

          normalizedDescriptions[platform] = {
            text,
            character_count: Number(
              item.character_count || text.length,
            ),
            character_limit: Number(
              item.character_limit || 0,
            ),
            word_count: Number(
              item.word_count ||
                text.split(/\s+/).filter(Boolean).length,
            ),
            target_word_count:
              Number(item.target_word_count || 0) || undefined,
            minimum_word_count:
              Number(item.minimum_word_count || 0) || undefined,
            maximum_word_count:
              Number(item.maximum_word_count || 0) || undefined,
            company_tags:
              companyTags.length > 0
                ? companyTags
                : promptCompanyTags,
            tags:
              topicTags.length > 0
                ? topicTags
                : buildFallbackTopicHashtags(
                    templatePrompt.trim(),
                    text,
                  ),
          };
        });
      } else {
        const rawContent = String(data?.content || "").trim();

        const limits: Record<string, number> = {
          "[LINKEDIN]": 3000,
          "[X / TWITTER]": 280,
          "[FACEBOOK]": 10000,
          "[INSTAGRAM]": 2200,
        };

        const headings = Object.keys(limits);

        headings.forEach((heading, index) => {
          const startIndex = rawContent.indexOf(heading);
          if (startIndex < 0) return;

          const contentStart = startIndex + heading.length;
          const nextPositions = headings
            .slice(index + 1)
            .map((nextHeading) =>
              rawContent.indexOf(nextHeading, contentStart),
            )
            .filter((position) => position >= 0);

          const endIndex =
            nextPositions.length > 0
              ? Math.min(...nextPositions)
              : rawContent.length;

          const content = rawContent
            .slice(contentStart, endIndex)
            .trim();

          const platform = heading
            .replace(/^\[|\]$/g, "")
            .replace("X / TWITTER", "X / Twitter")
            .replace("LINKEDIN", "LinkedIn")
            .replace("FACEBOOK", "Facebook")
            .replace("INSTAGRAM", "Instagram");

          if (!content) return;

          const contentTags = normalizeSocialTags(
            content.match(/#[A-Za-z0-9_]+/g) || [],
          );

          normalizedDescriptions[platform] = {
            text: content,
            character_count: content.length,
            character_limit: limits[heading],
            word_count: content.split(/\s+/).filter(Boolean).length,
            company_tags: promptCompanyTags,
            tags:
              contentTags.length > 0
                ? contentTags
                : buildFallbackTopicHashtags(
                    templatePrompt.trim(),
                    content,
                  ),
          };
        });
      }

      if (!Object.keys(normalizedDescriptions).length) {
        throw new Error(
          "The selected API returned no recognizable social media descriptions.",
        );
      }

      // Store the generated result silently. Nothing is rendered here.
      setSocialDescriptions(normalizedDescriptions);

      if (!String(data?.social_media_filename || "").trim()) {
        setSocialDescriptionFilename(
          `${generatedImageFilename.replace(/\.[^.]+$/, "")}_description.txt`,
        );
      }

      // Keep Preview closed after Generate.
      setIsSocialDescriptionPreviewOpen(false);
    } catch (error) {
      console.error(
        "Social media description generation failed:",
        error,
      );

      setSocialDescriptionError(
        error instanceof Error
          ? error.message
          : "Unable to generate the social media descriptions.",
      );
    } finally {
      setIsGeneratingSocialDescriptions(false);
    }
  }

  async function handleSaveSocialDescriptionsToDrive() {
    if (
      !generatedImageFilename ||
      Object.keys(socialDescriptions).length === 0 ||
      isGeneratingSocialDescriptions ||
      socialDescriptionSaved
    ) {
      return;
    }

    setSocialDescriptionError("");
    setSocialDescriptionSaveMessage("");

    try {
      const formData = new FormData();

      const descriptionFilename =
        socialDescriptionFilename ||
        `${generatedImageFilename.replace(
          /\.[^.]+$/,
          "",
        )}_description.txt`;

      formData.append("filename", descriptionFilename);

      const response = await fetch(
        `${API_BASE_URL}/api/social-media/save-to-drive`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          String(
            data?.detail ||
              "Unable to save the description to Google Drive.",
          ),
        );
      }

      setSocialDescriptionSaved(true);
      setSocialDescriptionSaveMessage(
        String(
          data?.message ||
            "Description saved to Google Drive / outputs.",
        ),
      );
    } catch (error) {
      console.error(
        "Saving social media descriptions failed:",
        error,
      );

      setSocialDescriptionError(
        error instanceof Error
          ? error.message
          : "Unable to save the description.",
      );
    }
  }


  const handleSaveGeneratedImageToDrive = async () => {
    if (!generatedImageFilename || isSavingGeneratedImage) return;

    // First click on Save opens the folder picker. The actual upload only
    // happens after the user chooses a folder and confirms.
    if (!isOutputFolderPickerOpen) {
      const folders =
        await loadDriveOutputFolders();

      if (
        folders.length > 0 &&
        !selectedOutputFolderId
      ) {
        setSelectedOutputFolderId(
          String(folders[0].id || ""),
        );
      }

      setGeneratedImageSaveMessage("");
      setIsOutputFolderPickerOpen(true);
      return;
    }

    if (!selectedOutputFolderId) {
      setGeneratedImageSaveMessage(
        "Select a Google Drive output folder before saving.",
      );
      return;
    }

    setIsSavingGeneratedImage(true);
    setGeneratedImageSaveMessage("");
    try {
      const formData = new FormData();
      formData.append("filename", generatedImageFilename);
      if (selectedOutputFolderId) formData.append("folder_id", selectedOutputFolderId);

      const response = await fetch(
        `${API_BASE_URL}/api/images/save-to-drive`,
        { method: "POST", body: formData, credentials: "include" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          String(
            data?.detail ||
              "Unable to save the generated image to Google Drive.",
          ),
        );
      }

      setGeneratedImageSaved(true);
      setGeneratedImageSaveMessage(
        String(data?.message || "Saved to Google Drive / outputs."),
      );
    } catch (error) {
      setGeneratedImageSaved(false);
      setGeneratedImageSaveMessage(
        error instanceof Error
          ? error.message
          : "Unable to save the generated image.",
      );
    } finally {
      setIsSavingGeneratedImage(false);
    }
  };

  return (
    <div className="app-shell">


      <header className="top-header">

        <div className="brand-area">

          <div className="brand-mark">
            ✦
          </div>

          <div>

            <div className="brand-title">
              Image Generator
            </div>

            <div className="brand-subtitle">
              Reference-driven creative
              workspace
            </div>

          </div>

        </div>


        <div className="header-actions">

          <div
            className="active-api-summary"
            aria-label="Available API services. Click to select or deselect."
            title="Select the API keys that may be used by the pipeline"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              maxWidth: "min(58vw, 700px)",
              justifyContent: "flex-end",
            }}
          >
            {availableApiServices.length > 0 ? (
              availableApiServices.map((service) => {
                const selected = selectedApiKeys.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    className={`active-api-service ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => {
                      const next = selected
                        ? selectedApiKeys.filter((id) => id !== service.id)
                        : [...selectedApiKeys, service.id];
                      onApiSelectionChange(next);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      border: selected
                        ? "1px solid rgba(120, 180, 255, 0.95)"
                        : "1px solid rgba(255,255,255,0.12)",
                      background: selected
                        ? "rgba(80, 140, 255, 0.18)"
                        : "rgba(255,255,255,0.055)",
                      boxShadow: selected
                        ? "0 0 0 1px rgba(120, 180, 255, 0.22)"
                        : "none",
                      color: "inherit",
                      whiteSpace: "nowrap",
                      fontSize: "12px",
                      fontWeight: 600,
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    <span aria-hidden="true">
                      {getApiServiceIcon(service.name, service.keyName, 18)}
                    </span>
                    <span>{service.name}</span>
                  </button>
                );
              })
            ) : (
              <span>APIs 0</span>
            )}
          </div>


          <button
            type="button"
            className="header-button"
            onClick={onBackToApiSetup}
          >
            ← API Setup
          </button>

          <button
            type="button"
            className="header-button"
            onClick={onBackToHome}
          >
            ⌂ Home
          </button>

          <button
            type="button"
            className="header-button"
          >
            Documentation
          </button>


          <button
            type="button"
            className="settings-button"
            aria-label="Settings"
          >
            ⚙
          </button>

        </div>

      </header>


      <main className="main-content">


        <section className="hero-section">

          <div>

            <h1>
              Transform references into
              reusable visual content.
            </h1>

            <p>
              Select a reference, define the
              template, and prepare it for
              image generation.
            </p>

          </div>

        </section>


        <section className="workflow-section">


          <div className="workflow-step active">

            <span className="workflow-number">
              01
            </span>

            <span className="workflow-label">
              Reference
            </span>

          </div>


          <div className="workflow-line" />


          <div className="workflow-step">

            <span className="workflow-number">
              02
            </span>

            <span className="workflow-label">
              Template
            </span>

          </div>


          <div className="workflow-line" />


          <div className="workflow-step">

            <span className="workflow-number">
              03
            </span>

            <span className="workflow-label">
              Image Builder
            </span>

          </div>


          <div className="workflow-line" />


          <div className="workflow-step">

            <span className="workflow-number">
              04
            </span>

            <span className="workflow-label">
              Output
            </span>

          </div>

        </section>


        <section className="workspace-grid">


          {/* ====================================================
              REFERENCE
              ==================================================== */}

          <article className="workspace-card">


            <div className="card-header">

              <div>

                <div className="section-kicker">
                  REFERENCE
                </div>

                <h2>
                  Reference Image
                </h2>

              </div>


              {reference && (
                <span className="status-pill">
                  Selected
                </span>
              )}

            </div>


            {!reference ? (

              <>

                <div className="reference-file-selector">

                  <div className="selector-header">

                    <div>

                      <strong>
                        Select reference images
                      </strong>

                      <span>
                        Choose one or more images. Each Google Drive image has a number you can use in the prompt (for example: “Use 1 and 3”).
                      </span>

                    </div>

                    {isTaggingImages && (
                      <span className="tagging-status">
                        AI tagging...
                      </span>
                    )}

                  </div>

                  {isLoadingInputs ? (

                    <div className="reference-loading">
                      Loading images...
                    </div>

                  ) : inputFiles.length === 0 ? (

                    <div className="reference-empty-list">
                      No Google Drive references
                      found. You can still add a
                      manual upload below.
                    </div>

                  ) : (

                    <>

                      <button
                        type="button"
                        className={`reference-scroll-button reference-scroll-up ${
                          isReferenceListAtTop
                            ? "scroll-indicator-top"
                            : ""
                        }`}
                        onClick={() =>
                          scrollReferenceList("up")
                        }
                        aria-label="Scroll reference images up"
                      >
                        ▲
                      </button>

                      <div
                        ref={referenceListRef}
                        className={`reference-file-list ${
                          isReferenceListAtTop ||
                          isReferenceListAtBottom
                            ? "scrollbar-red"
                            : "scrollbar-green"
                        }`}
                        onScroll={handleReferenceListScroll}
                      >

                        {inputFiles.map((file) => (

                          <label
                            key={file.id}
                            className={`reference-file-item ${
                              selectedInputIds.includes(file.id)
                                ? "selected"
                                : ""
                            }`}
                          >

                            <input
                              type="checkbox"
                              checked={selectedInputIds.includes(file.id)}
                              onChange={() =>
                                handleReferenceSelection(file)
                              }
                              aria-label={`Select ${file.name} as reference`}
                            />

                            {getDriveReferenceNumber(file) !== null && (
                              <span
                                className={`reference-image-number reference-preview-number-badge ${
                                  selectedInputIds.includes(file.id)
                                    ? "selected"
                                    : ""
                                }`}
                                title={`Reference ${getDriveReferenceNumber(file)}`}
                                style={{
                                  minWidth: "32px",
                                  height: "32px",
                                  padding: "0 8px",
                                  borderRadius: "10px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  fontWeight: 800,
                                  fontSize: "14px",
                                  border: selectedInputIds.includes(file.id)
                                    ? "2px solid currentColor"
                                    : "1px solid rgba(255,255,255,0.25)",
                                  background: selectedInputIds.includes(file.id)
                                    ? "rgba(99, 91, 255, 0.14)"
                                    : "#ffffff",
                                  color: selectedInputIds.includes(file.id)
                                    ? "#4f46e5"
                                    : "#5f6b7a",
                                  boxSizing: "border-box",
                                }}
                              >
                                {getDriveReferenceNumber(file)}
                              </span>
                            )}

                            <div className="reference-list-thumbnail">

                              <img
                                src={
                                  previewUrls[file.id] ||
                                  resolveApiUrl(file.url)
                                }
                                alt={file.name}
                                loading="eager"
                                decoding="async"
                                onError={(event) => {
                                  console.error(
                                    "Reference thumbnail failed:",
                                    file.name,
                                    file.url,
                                  );
                                  event.currentTarget.style.display =
                                    "none";
                                }}
                              />

                            </div>

                            <div className="reference-list-file-info">

                              <div className="reference-list-file-name">
                                {file.name}
                              </div>

                              <div className="reference-list-file-tag">
                                {file.tag ||
                                  (isTaggingImages
                                    ? "Analyzing image..."
                                    : file.tagError
                                      ? "Tagging failed"
                                      : "Tag unavailable")}
                              </div>

                              {file.tagError && !file.tag && (
                                <div className="reference-list-file-error">
                                  {file.tagError}
                                </div>
                              )}

                              <div className="reference-list-file-meta">
                                {file.sizeFormatted}
                              </div>

                            </div>

                          </label>

                        ))}

                      </div>

                      {selectedInputIds.length > 0 && (
                        <div className="selected-reference-previews" style={{ marginTop: "14px", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.025)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                            <strong>Selected reference previews</strong>
                            <span style={{ fontSize: "12px", opacity: 0.7 }}>{selectedInputIds.length} selected</span>
                          </div>
                          <div
                            className="reference-selected-preview-grid"
                            style={{
                              display: "grid",
                              gridTemplateColumns: `repeat(${getReferencePreviewColumns(selectedInputIds.length)}, minmax(0, 1fr))`,
                              gap: "10px",
                              alignItems: "start",
                            }}
                          >
                            {selectedInputIds.map((id) => {
                              const selectedFile = inputFiles.find((item) => item.id === id);
                              if (!selectedFile) return null;
                              const number = getDriveReferenceNumber(selectedFile);
                              return (
                                <div
                                  key={selectedFile.id}
                                  className="selected-reference-preview-card"
                                  style={{
                                    position: "relative",
                                    minWidth: 0,
                                    overflow: "hidden",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(99,91,255,0.28)",
                                    background: "#ffffff",
                                  }}
                                >
                                  <div style={{ position: "relative", width: "100%", height: `${getReferencePreviewHeight(selectedInputIds.length)}px`, overflow: "hidden", borderRadius: "10px", background: "#f5f7fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src={previewUrls[selectedFile.id] || resolveApiUrl(selectedFile.url)} alt={`Reference ${number ?? ""}: ${selectedFile.name}`} loading="eager" decoding="async" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                                    {number !== null && <span style={{ position: "absolute", top: "6px", left: "6px", minWidth: "27px", height: "27px", padding: "0 7px", borderRadius: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", background: "rgba(255,255,255,0.96)", color: "#4f46e5", border: "2px solid #635bff", boxShadow: "0 3px 10px rgba(79,70,229,0.18)" }}>{number}</span>}
                                  </div>
                                  <div title={selectedFile.name} style={{ marginTop: "5px", fontSize: "11px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {number !== null ? `${number} · ` : ""}{selectedFile.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        className={`reference-scroll-button reference-scroll-down ${
                          isReferenceListAtBottom
                            ? "scroll-indicator-bottom"
                            : ""
                        }`}
                        onClick={() =>
                          scrollReferenceList("down")
                        }
                        aria-label="Scroll reference images down"
                      >
                        ▼
                      </button>

                    </>

                  )}

                </div>

              </>

            ) : (

              <div className="reference-selected-layout">

                <div className="reference-selected-list-panel">

                  <div className="reference-file-selector reference-file-selector-compact">

                    <div className="selector-header">

                      <div>

                        <strong>
                          Numbered reference library
                        </strong>

                        <span>
                          Select multiple reference images. Use their highlighted numbers in the prompt (for example: “Use 1 for layout and 3 for the logo”).
                        </span>

                      </div>

                      <span className="reference-count-pill">
                        {inputFiles.filter((file) => file.source === "google-drive").length} Drive images · {selectedInputIds.length} selected
                      </span>

                    </div>

                    {isTaggingImages && (
                      <span className="tagging-status compact-tagging-status">
                        AI tagging...
                      </span>
                    )}

                    {isLoadingInputs ? (

                      <div className="reference-loading">
                        Loading images...
                      </div>

                    ) : inputFiles.length === 0 ? (

                      <div className="reference-empty-list">
                        No Google Drive references found.
                      </div>

                    ) : (

                      <>

                        <button
                          type="button"
                          className={`reference-scroll-button reference-scroll-up ${
                            isReferenceListAtTop
                              ? "scroll-indicator-top"
                              : ""
                          }`}
                          onClick={() =>
                            scrollReferenceList("up")
                          }
                          aria-label="Scroll reference images up"
                        >
                          ▲
                        </button>

                        <div
                          ref={referenceListRef}
                          className={`reference-file-list reference-file-list-compact ${
                            isReferenceListAtTop ||
                            isReferenceListAtBottom
                              ? "scrollbar-red"
                              : "scrollbar-green"
                          }`}
                          onScroll={handleReferenceListScroll}
                        >

                          {inputFiles.map((file) => (

                            <label
                              key={file.id}
                              className={`reference-file-item ${
                                selectedInputIds.includes(file.id)
                                  ? "selected"
                                  : ""
                              }`}
                            >

                              <input
                                type="checkbox"
                                checked={selectedInputIds.includes(file.id)}
                                onChange={() =>
                                  handleReferenceSelection(file)
                                }
                                aria-label={`Select ${file.name} as reference`}
                              />

                              {getDriveReferenceNumber(file) !== null && (
                              <span
                                className={`reference-image-number ${
                                  selectedInputIds.includes(file.id)
                                    ? "selected"
                                    : ""
                                }`}
                                title={`Reference ${getDriveReferenceNumber(file)}`}
                                style={{
                                  minWidth: "32px",
                                  height: "32px",
                                  padding: "0 8px",
                                  borderRadius: "10px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  fontWeight: 800,
                                  fontSize: "14px",
                                  border: selectedInputIds.includes(file.id)
                                    ? "2px solid currentColor"
                                    : "1px solid rgba(255,255,255,0.25)",
                                  background: selectedInputIds.includes(file.id)
                                    ? "rgba(99, 91, 255, 0.14)"
                                    : "#ffffff",
                                  color: selectedInputIds.includes(file.id)
                                    ? "#4f46e5"
                                    : "#5f6b7a",
                                  boxSizing: "border-box",
                                }}
                              >
                                {getDriveReferenceNumber(file)}
                              </span>
                            )}

                            <div className="reference-list-thumbnail">

                                <img
                                  src={
                                    previewUrls[file.id] ||
                                    resolveApiUrl(file.url)
                                  }
                                  alt={file.name}
                                  loading="eager"
                                  decoding="async"
                                  onError={(event) => {
                                    console.error(
                                      "Reference thumbnail failed:",
                                      file.name,
                                      file.url,
                                    );
                                    event.currentTarget.style.display =
                                      "none";
                                  }}
                                />

                              </div>

                              <div className="reference-list-file-info">

                                <div className="reference-list-file-name">
                                  {file.name}
                                </div>

                                <div className="reference-list-file-tag">
                                  {file.tag ||
                                    (isTaggingImages
                                      ? "Analyzing image..."
                                      : file.tagError
                                        ? "Tagging failed"
                                        : "Tag unavailable")}
                                </div>

                                <div className="reference-list-file-meta">
                                  {file.sizeFormatted}
                                </div>

                              </div>

                            </label>

                          ))}

                        </div>

                        <button
                          type="button"
                          className={`reference-scroll-button reference-scroll-down ${
                            isReferenceListAtBottom
                              ? "scroll-indicator-bottom"
                              : ""
                          }`}
                          onClick={() =>
                            scrollReferenceList("down")
                          }
                          aria-label="Scroll reference images down"
                        >
                          ▼
                        </button>

                      </>

                    )}

                  </div>

                  {selectedInputIds.length > 0 && (
                    <div className="selected-reference-info" style={{ marginTop: "12px" }}>
                      <div>
                        <strong>
                          {`${selectedInputIds.length} reference${selectedInputIds.length === 1 ? "" : "s"} selected`}
                        </strong>
                        <span>
                          Use the highlighted image numbers directly in your prompt.
                        </span>
                      </div>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setSelectedInputIds([]);
                          setReference(null);
                        }}
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}

                </div>

              </div>

            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

          </article>


          {/* ====================================================
              TEMPLATE
              ==================================================== */}

          <article className="workspace-card">


            <div className="card-header">

              <div>

                <div className="section-kicker">
                  PROMPT &amp; PREVIEW
                </div>

                <h2>
                  Selected References &amp; Prompt
                </h2>

              </div>


              {templateResult && (
                <span className="status-pill success">
                  Generated
                </span>
              )}

            </div>


            <div className="template-workspace-grid">


              <div className="template-reference-area">


                <div className="template-panel-heading">

                  <div className="template-panel-index">
                    01
                  </div>


                  <div>

                    <div className="template-preview-label">
                      REFERENCE
                    </div>

                    <h3>
                      Source Visual
                    </h3>

                    <p>
                      All selected references are shown here.
                      Their highlighted numbers can be used in the prompt.
                    </p>

                  </div>

                </div>


                <div className="template-reference-frame">


                  {selectedInputIds.length > 0 ? (

                    <div
                      className="selected-reference-preview-grid"
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: "240px",
                        display: "grid",
                        gridTemplateColumns: `repeat(${getReferencePreviewColumns(selectedInputIds.length)}, minmax(0, 1fr))`,
                        gap: "10px",
                        padding: "10px",
                        overflowY: "auto",
                        alignContent: "start",
                      }}
                    >
                      {selectedInputIds.map((id) => {
                        const selectedFile = inputFiles.find(
                          (item) => item.id === id,
                        );
                        if (!selectedFile) return null;

                        const number =
                          getDriveReferenceNumber(selectedFile);
                        const previewUrl =
                          previewUrls[selectedFile.id] ||
                          resolveApiUrl(selectedFile.url);

                        const selectedReference: ReferenceData = {
                          type: getReferenceType(
                            selectedFile.name.includes(".")
                              ? `.${selectedFile.name.split(".").pop()?.toLowerCase()}`
                              : "",
                            selectedFile.mimeType,
                          ),
                          name: selectedFile.name,
                          url: previewUrl,
                          size: selectedFile.size,
                          mimeType: selectedFile.mimeType,
                          source:
                            selectedFile.source === "google-drive"
                              ? "google-drive"
                              : selectedFile.source === "manual-upload"
                                ? "upload"
                                : "input-folder",
                          sourceId:
                            selectedFile.source === "google-drive"
                              ? selectedFile.id.replace(/^drive:/, "")
                              : selectedFile.name,
                          tag: selectedFile.tag,
                        };

                        return (
                          <div
                            key={selectedFile.id}
                            className="selected-reference-preview-card"
                            style={{
                              position: "relative",
                              minWidth: 0,
                              borderRadius: "12px",
                              border: "2px solid currentColor",
                              overflow: "hidden",
                              background: "rgba(255,255,255,0.035)",
                              minHeight: "150px",
                            }}
                          >
                            <div
                              className="reference-preview-number-badge"
                              style={{
                                position: "absolute",
                                top: "7px",
                                left: "7px",
                                zIndex: 3,
                                minWidth: "28px",
                                height: "28px",
                                padding: "0 7px",
                                borderRadius: "9px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "13px",
                                background: "rgba(255,255,255,0.96)",
                                color: "#4f46e5",
                                border: "2px solid #635bff",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                              }}
                            >
                              {number ?? selectedInputIds.indexOf(id) + 1}
                            </div>

                            <div
                              style={{
                                width: "100%",
                                height: `${getReferencePreviewHeight(selectedInputIds.length)}px`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                              }}
                            >
                              {renderReferencePreview(
                                selectedReference,
                              )}
                            </div>

                            <div
                              title={selectedFile.name}
                              style={{
                                padding: "7px 9px",
                                fontSize: "11px",
                                lineHeight: 1.2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                borderTop: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              {number ?? selectedInputIds.indexOf(id) + 1}. {selectedFile.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  ) : reference ? (

                    <div className="fixed-reference-preview">

                      {
                        renderReferencePreview(
                          reference,
                        )
                      }

                    </div>

                  ) : (

                    <div className="template-no-reference">

                      <div className="template-empty-icon">
                        ✦
                      </div>

                      <strong>
                        Select a reference image
                      </strong>

                      <span>
                        The selected reference will
                        appear here.
                      </span>

                    </div>

                  )}

                </div>


                {reference && (

                  <div className="template-reference-meta">


                    <div className="template-reference-file">

                      <span className="template-file-dot" />


                      <div>

                        <strong>
                          {
                            reference.name
                          }
                        </strong>

                        <span>

                          {
                            reference.source ===
                            "external-url"
                              ? "External reference"
                              : reference.source ===
                                  "upload"
                                ? "Uploaded reference"
                                : reference.source ===
                                    "google-drive"
                                  ? "From Google Drive"
                                  : "Manual upload"
                          }

                        </span>

                      </div>

                    </div>


                    <span className="template-reference-type">

                      {
                        reference.type ===
                        "youtube"
                          ? "YouTube"
                          : reference.type.toUpperCase()
                      }

                    </span>

                  </div>

                )}

              </div>


            </div>

            <div className="template-prompt-area">

              <label htmlFor="template-prompt" className="input-label">
                Content Prompt
              </label>

              <textarea
                id="template-prompt"
                className="template-textarea"
                value={
                  templatePrompt
                }
                onChange={(
                  event,
                ) =>
                  setTemplatePrompt(
                    event.target
                      .value,
                  )
                }
                placeholder="Describe which poster text or content should change while keeping the reference design..."
                rows={6}
              />


              <div className="template-helper">
                Use the highlighted Google Drive reference numbers directly in your prompt. Example: “Use 1 for the layout, 3 for the logo, and 5 for the color style.”
              </div>

            </div>

          </article>

        </section>


        {/* ======================================================
            IMAGE BUILDER
            ====================================================== */}

        <section className="full-width-card">


          <div className="card-header">

            <div>

              <div className="section-kicker">
                IMAGE BUILDER
              </div>

              <h2>
                Generate Image
              </h2>

            </div>


            <span className="status-pill success">
              Reference Design + Content Changes
            </span>

          </div>


          <div className="image-builder-panel">

            <div className="image-builder-summary">

              <div className="image-builder-input-card">
                <span className="image-builder-number">
                  01
                </span>

                <div>
                  <strong>
                    Reference Image
                  </strong>

                  <span>
                    {selectedInputIds.length > 0
                      ? `${selectedInputIds.length} reference image${selectedInputIds.length === 1 ? "" : "s"} selected`
                      : "Not selected"}
                  </span>
                </div>

              </div>


              <div className="image-builder-plus">
                +
              </div>


              <div className="image-builder-input-card">
                <span className="image-builder-number">
                  02
                </span>

                <div>
                  <strong>
                    Template Generation
                  </strong>

                  <span>
                    Temporarily disabled
                  </span>
                </div>

              </div>


              <div className="image-builder-plus">
                +
              </div>


              <div className="image-builder-input-card">
                <span className="image-builder-number">
                  03
                </span>

                <div>
                  <strong>
                    Content Prompt
                  </strong>

                  <span>
                    {templatePrompt.trim()
                      ? "Prompt ready"
                      : "Enter a prompt below"}
                  </span>
                </div>

              </div>

            </div>


            <button
              type="button"
              className="generate-button"
              disabled={
                selectedInputIds.length === 0 ||
                !reference ||
                !templatePrompt.trim() ||
                isGeneratingImage
              }
              onClick={
                handleGenerateImage
              }
            >
              {isGeneratingImage
                ? "Generating Image..."
                : "Generate Image"}
            </button>


            {isGeneratingImage && (

              <div className="generation-progress">

                <div className="generation-spinner" />

                <div>
                  <strong>
                    Generating your image
                  </strong>

                  <span>
                    The selected image-capable API is applying your manual
                    content prompt to the original reference image.
                  </span>
                </div>

              </div>

            )}

          </div>

        </section>


        {/* ======================================================
            OUTPUT
            ====================================================== */}

        <section className="full-width-card">


          <div className="card-header">

            <div>

              <div className="section-kicker">
                OUTPUT
              </div>

              <h2>
                Generated Output
              </h2>

            </div>


            <span className="output-path">
              Google Drive / outputs
            </span>

          </div>


          {generatedImageUrl ? (

            <div className="generated-output-card">

              <div className="generated-output-preview">

                <img
                  src={
                    generatedImageUrl
                  }
                  alt="Generated output"
                />

              </div>


              <div className="generated-output-details">

                <span className="generated-output-status">
                  Generation complete
                </span>

                <h3>
                  Generated Image
                </h3>


                <p>
                  The selected reference images are synthesized into one
                  coherent output. Their requested visual features are
                  combined rather than rendered as a collage.
                </p>


                {Object.keys(generatedTextChanges).length > 0 && (
                  <div className="generated-change-list">
                    <span className="generated-change-heading">
                      Applied content changes
                    </span>
                    {Object.entries(generatedTextChanges).map(([id, value]) => (
                      <div key={id} className="generated-change-item">
                        <span>{id}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {generatedImageFilename && (

                  <div className="generated-output-meta">

                    <span>
                      File
                    </span>

                    <strong>
                      {generatedImageFilename}
                    </strong>

                  </div>

                )}


                {generatedImageProvider && (
                  <div className="generated-output-meta">
                    <span>API Provider</span>
                    <strong>{generatedImageProvider}</strong>
                  </div>
                )}


                {generatedImageModel && (

                  <div className="generated-output-meta">

                    <span>
                      Model
                    </span>

                    <strong>
                      {generatedImageModel}
                    </strong>

                  </div>

                )}

{/* ======================================================
    SOCIAL MEDIA DESCRIPTION
    ------------------------------------------------------
    Required flow:
      1. Generate Description -> generate silently.
      2. Preview -> display generated descriptions/tags.
      3. Save Description -> save the already-generated result.
    ====================================================== */}
<div
  style={{
    marginTop: "18px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(120, 100, 255, 0.22)",
    background: "rgba(120, 100, 255, 0.045)",
  }}
>
  <div style={{ marginBottom: "10px" }}>
    <span
      style={{
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        opacity: 0.7,
      }}
    >
      NEXT STEP
    </span>

    <h3 style={{ margin: "4px 0 5px" }}>
      Social Media Description
    </h3>

    <p
      style={{
        margin: 0,
        fontSize: "12px",
        opacity: 0.72,
      }}
    >
      Generate platform-specific descriptions from the final generated image.
    </p>
  </div>

  <div
    style={{
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      className="primary-button"
      onClick={handleGenerateSocialDescriptions}
      disabled={
        !generatedImageFilename ||
        isGeneratingSocialDescriptions
      }
    >
      {isGeneratingSocialDescriptions
        ? "Generating Description..."
        : "Generate Description"}
    </button>

    <button
      type="button"
      className="secondary-button"
      onClick={() => {
        // Preview is the ONLY action that opens the generated text.
        if (Object.keys(socialDescriptions).length > 0) {
          setIsSocialDescriptionPreviewOpen(true);
        }
      }}
      disabled={
        Object.keys(socialDescriptions).length === 0 ||
        isGeneratingSocialDescriptions
      }
    >
      Preview
    </button>

    <button
      type="button"
      className="secondary-button"
      onClick={handleSaveSocialDescriptionsToDrive}
      disabled={
        Object.keys(socialDescriptions).length === 0 ||
        socialDescriptionSaved ||
        isGeneratingSocialDescriptions
      }
    >
      {socialDescriptionSaved
        ? "Saved to Google Drive / descriptions"
        : "Save Description"}
    </button>
  </div>

  {socialDescriptionError && (
    <p
      style={{
        margin: "9px 0 0",
        color: "#d84a6a",
        fontSize: "12px",
      }}
    >
      {socialDescriptionError}
    </p>
  )}

  {socialDescriptionSaveMessage && (
    <p
      style={{
        margin: "9px 0 0",
        fontSize: "12px",
      }}
    >
      {socialDescriptionSaveMessage}
    </p>
  )}
</div>

                {isOutputFolderPickerOpen && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(120, 100, 255, 0.35)",
                      background: "rgba(255,255,255,0.035)",
                    }}
                  >
                    <label
                      htmlFor="output-drive-folder"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 700,
                      }}
                    >
                      Select Google Drive output folder
                    </label>

                    {driveOutputFolders.length > 0 ? (
                      <>
                        <select
                          id="output-drive-folder"
                          value={selectedOutputFolderId}
                          onChange={(event) => {
                            setSelectedOutputFolderId(event.target.value);
                            setGeneratedImageSaved(false);
                            setGeneratedImageSaveMessage("");
                          }}
                          disabled={isSavingGeneratedImage}
                          style={{
                            width: "100%",
                            padding: "11px 12px",
                            borderRadius: "10px",
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.05)",
                            color: "inherit",
                            font: "inherit",
                          }}
                        >
                          <option value="">
                            Select a configured Google Drive folder
                          </option>
                          {driveOutputFolders.map((folder, index) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name || `Google Drive ${index + 1}`}
                            </option>
                          ))}
                        </select>

                        <span
                          style={{
                            display: "block",
                            marginTop: "7px",
                            fontSize: "12px",
                            opacity: 0.7,
                          }}
                        >
                          The generated image will be saved inside an{" "}
                          <strong>outputs</strong> subfolder of the selected
                          folder. These folders come from the uploaded API key
                          configuration.
                        </span>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            className="primary-button"
                            onClick={handleSaveGeneratedImageToDrive}
                            disabled={
                              isSavingGeneratedImage ||
                              generatedImageSaved ||
                              !selectedOutputFolderId
                            }
                          >
                            {isSavingGeneratedImage
                              ? "Saving..."
                              : generatedImageSaved
                                ? "Saved to Google Drive / outputs"
                                : "Confirm Save"}
                          </button>

                          {!isSavingGeneratedImage && !generatedImageSaved && (
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => {
                                setIsOutputFolderPickerOpen(false);
                                setGeneratedImageSaveMessage("");
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div>
                        <p style={{ margin: 0, opacity: 0.75 }}>
                          No output Google Drive folders were configured in the
                          uploaded API key file.
                        </p>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setIsOutputFolderPickerOpen(false)}
                          style={{ marginTop: "10px" }}
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSaveGeneratedImageToDrive}
                  disabled={
                    isSavingGeneratedImage ||
                    generatedImageSaved
                  }
                  style={{ marginTop: 16 }}
                >
                  {isSavingGeneratedImage
                    ? "Saving to Google Drive..."
                    : generatedImageSaved
                      ? "Saved to Google Drive / outputs"
                      : "Save"}
                </button>

                {generatedImageSaveMessage && (
                  <p style={{ marginTop: 8 }}>
                    {generatedImageSaveMessage}
                  </p>
                )}

              </div>

            </div>

          ) : (

            <div className="output-placeholder">

              <div className="placeholder-icon">
                □
              </div>


              <div>

                <h3>
                  No generated outputs yet
                </h3>

                <p>
                  Enter a content prompt and
                  generate an image using the
                  selected reference and template.
                </p>

              </div>

            </div>

          )}

        </section>

      </main>


      {isSocialDescriptionPreviewOpen && (
  <div
    className="modal-backdrop"
    onMouseDown={() =>
      setIsSocialDescriptionPreviewOpen(false)
    }
  >
    <div
      className="social-description-modal"
      onMouseDown={(event) =>
        event.stopPropagation()
      }
      style={{
        maxHeight: "85vh",
        overflowY: "auto",
      }}
    >
      <div className="modal-header">
        <div>
          <div className="section-kicker">
            SOCIAL MEDIA PREVIEW
          </div>
          <h2 style={{ margin: "4px 0 0" }}>
            Generated Descriptions
          </h2>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setIsSocialDescriptionPreviewOpen(false)
          }
        >
          Close
        </button>
      </div>

      <div
        className="social-description-preview-list"
        style={{
          display: "grid",
          gap: "14px",
        }}
      >
        {(Object.entries(socialDescriptions) as Array<[string, SocialDescriptionItem]>).map(
          ([platform, item]) => (
            <article
              key={platform}
              className="social-description-preview-card"
              style={{
                padding: "16px",
                borderRadius: "12px",
                border:
                  "1px solid rgba(255,255,255,0.10)",
                background:
                  "rgba(255,255,255,0.035)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <strong
                  style={{
                    fontSize: "16px",
                  }}
                >
                  {platform}
                </strong>

                <span
                  style={{
                    fontSize: "12px",
                    opacity: 0.65,
                  }}
                >
                  {item.character_count} / {item.character_limit}
                </span>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.65,
                  fontSize: "14px",
                }}
              >
                {item.text}
              </div>

              {item.company_tags &&
                item.company_tags.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "12px",
                        marginBottom: "7px",
                        opacity: 0.8,
                      }}
                    >
                      Company Tags
                    </strong>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      {item.company_tags.map(
                        (tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            style={{
                              padding: "5px 9px",
                              borderRadius: "999px",
                              background:
                                "rgba(120,100,255,0.12)",
                              border:
                                "1px solid rgba(120,100,255,0.25)",
                              fontSize: "12px",
                            }}
                          >
                            {tag}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {item.tags && item.tags.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "12px",
                      marginBottom: "7px",
                      opacity: 0.8,
                    }}
                  >
                    Topic Hashtags
                  </strong>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    {item.tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        style={{
                          padding: "5px 9px",
                          borderRadius: "999px",
                          background:
                            "rgba(255,255,255,0.06)",
                          border:
                            "1px solid rgba(255,255,255,0.10)",
                          fontSize: "12px",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ),
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "16px",
        }}
      >
        <button
          type="button"
          className="primary-button"
          onClick={handleSaveSocialDescriptionsToDrive}
          disabled={
            socialDescriptionSaved ||
            Object.keys(socialDescriptions).length === 0
          }
        >
          {socialDescriptionSaved
            ? "Saved to Google Drive"
            : "Save Description"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}



function App() {

  const normalizePath = (path: string) =>
    path.replace(/\/+$/, "") || "/";

  const [currentPath, setCurrentPath] = useState(() =>
    normalizePath(window.location.pathname),
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [initialAppSession] = useState<AppSessionState>(
    () => readAppSession(),
  );

  const [apiSetupComplete, setApiSetupComplete] = useState(
    initialAppSession.apiSetupComplete,
  );

  const [selectedApiKeys, setSelectedApiKeys] = useState<string[]>(
    initialAppSession.selectedApiKeys,
  );

  const [selectedApiServices, setSelectedApiServices] =
    useState<SelectedApiService[]>(initialAppSession.selectedApiServices);

  const [availableApiServices, setAvailableApiServices] =
    useState<SelectedApiService[]>(initialAppSession.availableApiServices);

  // Keep Home, API Setup and Image Generator mounted so navigation between
  // them does not destroy the current Image Generator work in progress.
  const navigateTo = (path: string) => {
    const normalized = normalizePath(path);
    if (normalizePath(window.location.pathname) !== normalized) {
      window.history.pushState({}, "", normalized);
    }
    setCurrentPath(normalized);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showHome = currentPath === "/";
  const showApiSetup =
    currentPath === "/api-setup" ||
    (currentPath === "/image-generator" && !apiSetupComplete);
  const showImageGenerator =
    currentPath === "/image-generator" && apiSetupComplete;

  // Rehydrate the backend's in-memory API selection after a backend restart.
  // The browser session can retain selectedApiKeys even though FastAPI has
  // reset its process state. Synchronizing here makes all AI endpoints
  // (tagging, templates, prompts and image generation) use the same selection.
  useEffect(() => {
    if (!apiSetupComplete || selectedApiKeys.length === 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const statusResponse = await fetch(
          `${API_BASE_URL}/api/api-keys/status`,
          { credentials: "include" },
        );
        const statusData = await statusResponse.json().catch(() => null);

        if (!statusResponse.ok) {
          throw new Error(
            String(statusData?.detail || "Unable to read API key status."),
          );
        }

        if (!statusData?.configured) {
          if (!cancelled) {
            setSelectedApiKeys([]);
            setSelectedApiServices([]);
            setAvailableApiServices([]);
            setApiSetupComplete(false);
          }
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/api-keys/select`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected_ids: selectedApiKeys }),
          credentials: "include",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            String(data?.detail || "Unable to restore API selection."),
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("API selection restore failed:", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiSetupComplete, selectedApiKeys.join("|")]);

  useEffect(() => {
    writeAppSession({
      apiSetupComplete,
      selectedApiKeys,
      selectedApiServices,
      availableApiServices,
    });
  }, [
    apiSetupComplete,
    selectedApiKeys,
    selectedApiServices,
    availableApiServices,
  ]);

  if (currentPath === "/content-generator") {
    return <ContentGeneratorHome />;
  }

  // Unknown paths return to the home workspace.
  const safeHome =
    currentPath !== "/" &&
    currentPath !== "/api-setup" &&
    currentPath !== "/image-generator";

  return (
    <>
      <div
        style={{ display: showHome || safeHome ? "block" : "none" }}
        aria-hidden={!(showHome || safeHome)}
      >
        <HomePage
          onOpenImageGenerator={() => navigateTo("/api-setup")}
          onOpenContentGenerator={() => navigateTo("/content-generator")}
        />
      </div>

      <div
        style={{ display: showApiSetup ? "block" : "none" }}
        aria-hidden={!showApiSetup}
      >
        <ApiKeySetup
          onBackToHome={() => navigateTo("/")}
          onComplete={(selectedKeys, selectedServices) => {
            // Keep any API selections that are still present after returning
            // from the Image Generator. If the uploaded API file changed,
            // automatically discard only IDs that no longer exist.
            const availableIds = new Set(
              selectedServices.map((service) => service.id),
            );
            const validSelectedIds = selectedKeys.filter((id) =>
              availableIds.has(id),
            );

            setSelectedApiKeys(validSelectedIds);
            setSelectedApiServices(
              selectedServices.filter((service) =>
                validSelectedIds.includes(service.id),
              ),
            );
            setAvailableApiServices(selectedServices);
            setApiSetupComplete(true);
            navigateTo("/image-generator");
          }}
        />
      </div>

      <div
        style={{ display: showImageGenerator ? "block" : "none" }}
        aria-hidden={!showImageGenerator}
      >
        <ImageGenerator
          selectedApiKeys={selectedApiKeys}
          selectedApiServices={selectedApiServices}
          availableApiServices={availableApiServices}
          onApiSelectionChange={async (nextSelectedIds) => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/api-keys/select`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selected_ids: nextSelectedIds }),
                credentials: "include",
              });

              const data = await response.json().catch(() => null);
              if (!response.ok) {
                throw new Error(
                  String(data?.detail || "Unable to update API selection."),
                );
              }

              setSelectedApiKeys(nextSelectedIds);
              setSelectedApiServices(
                availableApiServices.filter((service) =>
                  nextSelectedIds.includes(service.id),
                ),
              );
            } catch (error) {
              console.error("API selection update failed:", error);
            }
          }}
          onBackToApiSetup={() => navigateTo("/api-setup")}
          onBackToHome={() => navigateTo("/")}
        />
      </div>
    </>
  );
}

export default App;
