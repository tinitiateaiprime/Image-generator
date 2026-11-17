import { useRef, useState } from "react";
import type { ApiKeyOption, ApiKeySetupProps } from "../types/app";
import { API_BASE_URL } from "../utils/appHelpers";
import { getApiServiceIcon } from "./ApiServiceIcon";

export function ApiKeySetup({
  onComplete,
  onBackToHome,
}: ApiKeySetupProps) {
  const [apiFile, setApiFile] =
    useState<File | null>(null);

  const [apiKeys, setApiKeys] =
    useState<ApiKeyOption[]>([]);

  const [isUploading, setIsUploading] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const apiFileInputRef =
    useRef<HTMLInputElement | null>(null);


  async function handleApiFile(
    file: File,
  ) {
    setApiFile(file);
    setApiKeys([]);
    setError("");
    setIsUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file,
      );

      const response =
        await fetch(
          `${API_BASE_URL}/api/api-keys/upload`,
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
              "Unable to read the API keys file.",
          ),
        );
      }

      const rawKeys:
        ApiKeyOption[] =
        Array.isArray(data?.keys)
          ? data.keys
          : [];


      /*
       * Google Drive is intentionally NOT an API-key selection option.
       * It is an OAuth-backed reference source and is used directly by
       * the Google Drive reference loader in the Image Generator.
       *
       * Keep the Drive credential/configuration on the backend, but hide
       * its synthetic OAuth entry from this API selection screen.
       */
      const visibleRawKeys = rawKeys.filter((api) => {
        const name = String(api.name || "").toLowerCase();
        const keyName = String(api.keyName || "").toLowerCase();

        return (
          api.authType !== "oauth" &&
          !name.includes("google drive") &&
          !keyName.includes("google_drive") &&
          !keyName.includes("gdrive")
        );
      });


      /*
       * Keep every supported AI/API credential. Multiple credentials for
       * the same provider can be selected independently.
       *
       * Examples:
       *   Gemini API
       *   Gemini API 2
       *   Gemini API 3
       */
      const serviceCounts =
        new Map<string, number>();

      const keys = visibleRawKeys.map((api) => {
        const baseName =
          api.name.trim() || "API";
        const normalizedName =
          baseName.toLowerCase();
        const occurrence =
          (serviceCounts.get(normalizedName) || 0) + 1;

        serviceCounts.set(
          normalizedName,
          occurrence,
        );

        return {
          ...api,
          name: baseName,
          displayName: baseName,
          duplicateNumber: occurrence,
        };
      });

      const duplicateTotals =
        new Map<string, number>();

      keys.forEach((api) => {
        const normalizedName =
          api.name.trim().toLowerCase();
        duplicateTotals.set(
          normalizedName,
          (duplicateTotals.get(normalizedName) || 0) + 1,
        );
      });

      const displayKeys = keys.map((api) => {
        const normalizedName =
          api.name.trim().toLowerCase();
        const total =
          duplicateTotals.get(normalizedName) || 1;

        return {
          ...api,
          name:
            total > 1
              ? `${api.displayName} ${api.duplicateNumber}`
              : api.displayName,
        };
      });


      if (!displayKeys.length) {
        throw new Error(
          "No supported API keys were found in the uploaded file.",
        );
      }

      if (!displayKeys.length) {
        throw new Error(
          "No supported API keys were found in the uploaded file.",
        );
      }

      setApiKeys(displayKeys);

    } catch (err) {
      console.error(
        "API key file processing failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to read the API keys file.",
      );

      setApiFile(null);

    } finally {
      setIsUploading(false);
    }
  }

  async function handleContinue() {
    if (!apiKeys.length) {
      setError("Upload an API key file before continuing.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/api/api-keys/select`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              // Start the Image Generator with all uploaded AI keys selected.
              // The user can then deselect any key(s) from the header.
              selected_ids: apiKeys.map((api) => api.id),
            }),
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
              "Unable to activate the selected APIs.",
          ),
        );
      }

      const selectedServices =
        apiKeys.map((api) => ({
          id: api.id,
          name: api.name,
          keyName: api.keyName,
        }));

      // Keep all uploaded AI keys selected initially. The Image Generator
      // header still allows the user to select/deselect multiple keys.
      onComplete(
        apiKeys.map((api) => api.id),
        selectedServices,
      );

    } catch (err) {
      console.error(
        "API selection failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to activate the selected APIs.",
      );

    } finally {
      setIsSaving(false);
    }
  }


  return (
    <div className="api-setup-shell">

      <div className="api-setup-card">

        <div className="api-setup-header">

          <div className="api-setup-mark">
            ✦
          </div>

          <div>

            <div className="api-setup-kicker">
              INITIAL SETUP
            </div>

            <h1>
              Connect your API keys
            </h1>

            <p>
              Upload your API configuration
              file from your desktop. The file
              is processed by the backend and is
              not saved in the project.
            </p>

          </div>

        </div>


        <div className="api-setup-flow">

          <div className="api-setup-step active">

            <span>
              01
            </span>

            <div>
              <strong>
                Upload API Keys File
              </strong>

              <small>
                Choose the API configuration
                file from your desktop.
              </small>
            </div>

          </div>


          <div className="api-setup-connector" />


          <div
            className={`api-setup-step ${
              apiKeys.length
                ? "active"
                : ""
            }`}
          >

            <span>
              02
            </span>

            <div>

              <strong>
                Review APIs
              </strong>

              <small>
                API keys can be selected from the workspace header.
              </small>

            </div>

          </div>


          <div className="api-setup-connector" />


          <div
            className={`api-setup-step ${
              apiKeys.length
                ? "active"
                : ""
            }`}
          >

            <span>
              03
            </span>

            <div>

              <strong>
                Open Workspace
              </strong>

              <small>
                Open the Image Generator.
              </small>

            </div>

          </div>

        </div>


        <div className="api-setup-body">

          <div className="api-upload-panel">

            <input
              ref={apiFileInputRef}
              type="file"
              hidden
              accept=".env,.txt,.json"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  void handleApiFile(file);
                }

                event.target.value = "";
              }}
            />


            <button
              type="button"
              className="api-upload-button"
              onClick={() =>
                apiFileInputRef.current?.click()
              }
              disabled={isUploading}
            >

              <span className="api-upload-icon">
                ↑
              </span>

              <span>

                <strong>
                  {isUploading
                    ? "Reading API file..."
                    : "Upload API Keys File"}
                </strong>

                <small>
                  .env, .txt or .json
                </small>

              </span>

            </button>


            {apiFile &&
              !isUploading && (
                <div className="api-uploaded-file">

                  <span className="api-file-check">
                    ✓
                  </span>

                  <div>

                    <strong>
                      {apiFile.name}
                    </strong>

                    <small>
                      API configuration loaded
                    </small>

                  </div>

                </div>
              )}

          </div>


          <div className="api-selection-panel">

            <div className="api-selection-heading">

              <div>

                <span>
                  AVAILABLE APIs
                </span>

                <strong>
                  Available API services
                </strong>

              </div>

              {apiKeys.length > 0 && (
                <small>
                  {apiKeys.length} available
                </small>
              )}

            </div>


            {isUploading ? (

              <div className="api-setup-empty">

                <div className="api-setup-loader" />

                <strong>
                  Reading API configuration
                </strong>

                <span>
                  Detecting available API services.
                </span>

              </div>

            ) : apiKeys.length === 0 ? (

              <div className="api-setup-empty">

                <div className="api-setup-empty-icon">
                  ◇
                </div>

                <strong>
                  Upload a file to continue
                </strong>

                <span>
                  API values stay hidden. Only API
                  service names will be displayed.
                </span>

              </div>

            ) : (

              <div className="api-key-list">

                {apiKeys.map(
                  (api) => (

                    <div
                      key={api.id}
                      className="api-key-option"
                      style={{
                        cursor: "default",
                        transition:
                          "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
                      }}
                    >

                      <span
                        className="api-key-service-icon"
                        style={{
                          width: "32px",
                          height: "32px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: "9px",
                          flexShrink: 0,
                        }}
                      >
                        {getApiServiceIcon(api.name, api.keyName, 24)}
                      </span>

                      <span className="api-key-service-text">

                        <strong>
                          {api.name}
                        </strong>

                        <small>
                          API credential detected
                        </small>

                      </span>

                      <span className="api-key-state">
                        Available
                      </span>

                    </div>

                  ),
                )}

              </div>

            )}

          </div>

        </div>


        {error && (
          <div className="api-setup-error">
            {error}
          </div>
        )}


        <div className="api-setup-footer">

          <div className="api-security-note">

            <span>
              ✓
            </span>

            <div>

              <strong>
                API values are never displayed
              </strong>

              <small>
                Only API service names appear
                in the selection list.
              </small>

            </div>

          </div>


          <div className="api-setup-footer-actions">
            <button
              type="button"
              className="api-back-home-button"
              onClick={onBackToHome}
            >
              <span>←</span>
              Home
            </button>

            <button
              type="button"
              className="api-continue-button"
            disabled={
              !apiKeys.length ||
              isSaving
            }
            onClick={
              handleContinue
            }
          >

            {isSaving
              ? "Loading..."
              : "Continue to Image Generator"}

            <span>
              →
            </span>

          </button>
          </div>

        </div>

      </div>

    </div>
  );
}


