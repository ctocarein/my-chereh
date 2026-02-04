import {
  type ChangeEvent,
  type PointerEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Question, QuestionOption } from "@/types/questions";

type ChatInputBarProps = {
  question: Question;
  onAnswer: (answer: string | string[] | File) => Promise<void> | void;
  disabled?: boolean;
};

const normalizeOptions = (options?: Question["options"]): QuestionOption[] => {
  if (!options) {
    return [];
  }

  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) {
        return parsed.map((option) => ({
          value: String(option.value ?? option),
          label: String(option.label ?? option),
        }));
      }
    } catch {
      return [];
    }
  }

  if (Array.isArray(options)) {
    return options.map((option) =>
      typeof option === "string"
        ? { value: option, label: option }
        : { value: String(option.value), label: String(option.label) },
    );
  }

  return [];
};

export default function ChatInputBar({
  question,
  onAnswer,
  disabled = false,
}: ChatInputBarProps) {
  const questionId = question.id ?? question.key;
  const options = useMemo(
    () => normalizeOptions(question.options),
    [question.options],
  );
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [otherValue, setOtherValue] = useState("");
  const [sliderValue, setSliderValue] = useState(question.min ?? 5);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHoverValue, setRatingHoverValue] = useState<number | null>(null);
  const [showRatingHint, setShowRatingHint] = useState(false);
  const [fileValue, setFileValue] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [locationValue, setLocationValue] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const ratingPointerRef = useRef<number | null>(null);

  useEffect(() => {
    setInputValue("");
    setSelectedOptions([]);
    setOtherValue("");
    setSliderValue(question.min ?? 5);
    setDateValue("");
    setTimeValue("");
    setTimeError(null);
    setRatingValue(0);
    setRatingHoverValue(null);
    setShowRatingHint(false);
    setFileValue(null);
    setFilePreviewUrl(null);
    setFileError(null);
    setLocationValue("");
    setLocationError(null);
    setIsLocating(false);
    setIsDragActive(false);
  }, [questionId, question.min]);

  const submitAnswer = (answer: string | string[] | File) => {
    if (disabled) {
      return;
    }

    void onAnswer(answer);
  };

  const handleMultiToggle = (value: string) => {
    setSelectedOptions((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleSelectMultiple = () => {
    const payload = otherValue ? [...selectedOptions, otherValue] : selectedOptions;

    if (payload.length) {
      submitAnswer(payload);
    }
  };

  const processFile = (file: File | null) => {
    if (!file) {
      setFileValue(null);
      setFilePreviewUrl(null);
      setFileError(null);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");

    const maxSizeMb = isVideo ? 30 : isAudio ? 12 : isImage ? 8 : 10;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileValue(null);
      setFilePreviewUrl(null);
      setFileError(`Fichier trop volumineux (max ${maxSizeMb} Mo).`);
      return;
    }

    const validType =
      question.type === "file" ||
      (question.type === "image" && isImage) ||
      (question.type === "audio" && isAudio) ||
      (question.type === "video" && isVideo);

    if (!validType) {
      setFileValue(null);
      setFilePreviewUrl(null);
      setFileError("Type de fichier non supporte pour cette question.");
      return;
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setFileError(null);
    setFileValue(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  const handleClearFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFileValue(null);
    setFilePreviewUrl(null);
    setFileError(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    processFile(file);
    event.target.value = "";
  };

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleFileDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    processFile(file);
  };

  const handleFileDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleFileDragLeave = () => {
    setIsDragActive(false);
  };

  const handleUseLocation = () => {
    if (disabled || isLocating || typeof navigator === "undefined") {
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("La geolocalisation n'est pas disponible.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const value = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
        setLocationValue(value);
        setLocationError(null);
        submitAnswer(value);
        setIsLocating(false);
      },
      () => {
        setLocationError("Impossible d'obtenir la position.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (question.type === "info" || question.type === "custom") {
    const label =
      question.actionLabel ??
      (question.type === "custom" ? "Continuer" : "J'ai compris");

    return (
      <div className="chat__input">
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => submitAnswer(label)}
          disabled={disabled}
        >
          {label}
        </button>
      </div>
    );
  }

  if (question.type === "valide") {
    const label = question.actionLabel ?? "Je valide";

    return (
      <div className="chat__input">
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => submitAnswer(label)}
          disabled={disabled}
        >
          {label}
        </button>
      </div>
    );
  }

  if (question.type === "boolean") {
    return (
      <div className="chat__choices" role="list">
        {[
          { value: "yes", label: "Oui" },
          { value: "no", label: "Non" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            className="choice"
            onClick={() => submitAnswer(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "select_one") {
    return (
      <div className="chat__choices" role="list">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="choice"
            onClick={() => submitAnswer(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "select_multiple") {
    const isReady = selectedOptions.length > 0 || otherValue.trim().length > 0;

    return (
      <div className="chat__input">
        <div className="chat__choices" role="list">
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                className={`choice${isSelected ? " is-selected" : ""}`}
                onClick={() => handleMultiToggle(option.value)}
                disabled={disabled}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="chat__stack">
          <input
            className="chat-input__control"
            type="text"
            placeholder="Autre (precisez)"
            value={otherValue}
            onChange={(event) => setOtherValue(event.target.value)}
            disabled={disabled}
            aria-label="Autre reponse"
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={handleSelectMultiple}
            disabled={disabled || !isReady}
          >
            Valider
          </button>
        </div>
      </div>
    );
  }

  if (question.type === "slider") {
    const minValue = question.min ?? 0;
    const maxValue = question.max ?? 10;
    const stepValue = question.step ?? 1;

    return (
      <div className="chat__input">
        <input
          className="chat-range"
          type="range"
          min={minValue}
          max={maxValue}
          step={stepValue}
          value={sliderValue}
          onChange={(event) => setSliderValue(Number(event.target.value))}
          disabled={disabled}
          aria-label="Niveau d'inconfort"
        />
        <div className="chat-range__value">
          {sliderValue} / {maxValue}
        </div>
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => submitAnswer(String(sliderValue))}
          disabled={disabled}
        >
          Valider
        </button>
      </div>
    );
  }

  if (question.type === "date") {
    return (
      <div className="chat__input">
        <input
          className="chat-input__control chat-date"
          type="date"
          value={dateValue}
          onChange={(event) => setDateValue(event.target.value)}
          disabled={disabled}
          aria-label="Choisir une date"
        />
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => {
            if (dateValue) {
              submitAnswer(dateValue);
            }
          }}
          disabled={disabled || !dateValue}
        >
          Valider
        </button>
      </div>
    );
  }

  if (question.type === "time") {
    return (
      <div className="chat__input">
        <input
          className="chat-input__control chat-time"
          type="time"
          value={timeValue}
          onChange={(event) => {
            setTimeValue(event.target.value);
            setTimeError(null);
          }}
          disabled={disabled}
          aria-label="Choisir une heure"
        />
        {timeError ? <div className="chat-input__error">{timeError}</div> : null}
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => {
            if (timeValue) {
              setTimeError(null);
              submitAnswer(timeValue);
              return;
            }
            setTimeError("Merci de choisir une heure.");
          }}
          disabled={disabled}
        >
          Valider
        </button>
      </div>
    );
  }

  if (question.type === "rating") {
    const maxRating = question.max ?? 5;
    const values = Array.from({ length: maxRating }, (_, index) => index + 1);
    const stepValue = question.step ?? 1;
    const allowHalf = stepValue === 0.5;
    const clipBase = questionId.replace(/[^a-z0-9_-]/gi, "");
    const displayValue =
      ratingValue > 0
        ? String(ratingValue).replace(/\.0$/, "")
        : "Choisir une note";
    const effectiveValue = ratingHoverValue ?? ratingValue;

    const handlePointerSelect = (
      value: number,
      event: PointerEvent<HTMLButtonElement>,
    ) => {
      if (!allowHalf) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const isHalf = event.clientX - rect.left < rect.width / 2;
      const nextValue = isHalf ? value - 0.5 : value;
      ratingPointerRef.current = nextValue;
      setRatingValue(nextValue);
      submitAnswer(String(nextValue));
    };

    const handleClickSelect = (value: number) => {
      if (ratingPointerRef.current !== null) {
        ratingPointerRef.current = null;
        return;
      }

      setRatingValue(value);
      submitAnswer(String(value));
    };

    const handlePointerMove = (
      value: number,
      event: PointerEvent<HTMLButtonElement>,
    ) => {
      if (!allowHalf) {
        setRatingHoverValue(value);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const isHalf = event.clientX - rect.left < rect.width / 2;
      setRatingHoverValue(isHalf ? value - 0.5 : value);
    };

    return (
      <div className="rating" role="list" aria-label="Evaluation">
        <div
          className="rating__stars"
          onPointerEnter={() => setShowRatingHint(true)}
          onPointerLeave={() => {
            setShowRatingHint(false);
            setRatingHoverValue(null);
          }}
        >
          {values.map((value) => {
            const fillRatio = Math.min(
              1,
              Math.max(0, effectiveValue - (value - 1)),
            );
            const isFilled = fillRatio > 0;
            const clipId = `${clipBase}-star-${value}`;

            return (
              <button
                key={value}
                type="button"
                className={`rating__star${isFilled ? " is-active" : ""}`}
                onClick={() => handleClickSelect(value)}
                onPointerDown={(event) => handlePointerSelect(value, event)}
                onPointerMove={(event) => handlePointerMove(value, event)}
                onPointerLeave={() => setRatingHoverValue(null)}
                disabled={disabled}
                aria-label={`Note ${value} sur ${maxRating}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <defs>
                    <clipPath id={clipId}>
                      <rect width={24 * fillRatio} height="24" x="0" y="0" />
                    </clipPath>
                  </defs>
                  <path
                    className="rating__star-outline"
                    d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.9 6.2 20.5l1.1-6.5-4.8-4.6 6.6-.9L12 2.5z"
                  />
                  <path
                    className="rating__star-fill"
                    d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.9 6.2 20.5l1.1-6.5-4.8-4.6 6.6-.9L12 2.5z"
                    clipPath={`url(#${clipId})`}
                  />
                </svg>
              </button>
            );
          })}
        </div>
        {showRatingHint ? (
          <div className="rating__hint">Glisser pour noter</div>
        ) : null}
        <div className="rating__value">{displayValue}</div>
      </div>
    );
  }

  if (
    question.type === "file" ||
    question.type === "image" ||
    question.type === "audio" ||
    question.type === "video"
  ) {
    const acceptMap: Record<string, string> = {
      file: "*/*",
      image: "image/*",
      audio: "audio/*",
      video: "video/*",
    };
    const acceptValue = acceptMap[question.type] ?? "*/*";

    return (
      <div className="chat__input">
        <label
          className={`chat-file__drop${isDragActive ? " is-active" : ""}`}
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
          onDrop={handleFileDrop}
        >
          <input
            className="chat-file__input"
            type="file"
            accept={acceptValue}
            onChange={handleFileChange}
            disabled={disabled}
            aria-label="Choisir un fichier"
          />
          <span className="chat-file__label">
            Glisser-deposer ou cliquer pour choisir
          </span>
          <span className="chat-file__type">
            {question.type === "image"
              ? "PNG, JPG, WebP"
              : question.type === "audio"
                ? "MP3, WAV"
                : question.type === "video"
                  ? "MP4, MOV"
                  : "Tous formats"}
          </span>
        </label>
        {fileError ? <div className="chat-file__error">{fileError}</div> : null}
        {fileValue ? (
          <div className="chat-file__meta">
            <div className="chat-file__name">{fileValue.name}</div>
            {filePreviewUrl && question.type === "image" ? (
              <img
                src={filePreviewUrl}
                alt="Apercu"
                className="chat-file__preview chat-file__preview--image"
              />
            ) : null}
            {filePreviewUrl && question.type === "audio" ? (
              <audio className="chat-file__preview" controls src={filePreviewUrl}>
                Votre navigateur ne supporte pas l'audio.
              </audio>
            ) : null}
            {filePreviewUrl && question.type === "video" ? (
              <video
                className="chat-file__preview"
                controls
                src={filePreviewUrl}
              />
            ) : null}
            <div className="chat-file__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearFile}
                disabled={disabled}
              >
                Retirer
              </button>
              <label className="btn btn-primary chat-file__replace">
                Remplacer
                <input
                  className="chat-file__input"
                  type="file"
                  accept={acceptValue}
                  onChange={handleFileChange}
                  disabled={disabled}
                  aria-label="Remplacer le fichier"
                />
              </label>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => {
            if (fileValue) {
              submitAnswer(fileValue);
            }
          }}
          disabled={disabled || !fileValue || Boolean(fileError)}
        >
          Envoyer
        </button>
      </div>
    );
  }

  if (question.type === "location") {
    const isReady = Boolean(locationValue.trim());

    return (
      <div className="chat__input">
        <input
          className="chat-input__control"
          type="text"
          placeholder="Ville ou quartier"
          value={locationValue}
          onChange={(event) => {
            setLocationValue(event.target.value);
            setLocationError(null);
          }}
          disabled={disabled}
          aria-label="Localisation"
        />
        {locationError ? (
          <div className="chat-input__error">{locationError}</div>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={handleUseLocation}
          disabled={disabled || isLocating}
        >
          {isLocating ? "Localisation..." : "Utiliser ma position"}
        </button>
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => {
            if (isReady) {
              setLocationError(null);
              submitAnswer(locationValue.trim());
              return;
            }
            setLocationError("Merci d'indiquer une localisation.");
          }}
          disabled={disabled}
        >
          Envoyer
        </button>
      </div>
    );
  }

  const inputType = question.type === "number" ? "number" : "text";
  const placeholder = question.placeholder ?? "Votre reponse...";
  const isDisabled = disabled || inputValue.trim().length === 0;

  return (
    <div className="chat-input">
      <input
        className="chat-input__control"
        type={inputType}
        inputMode={question.type === "number" ? "numeric" : "text"}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Reponse"
      />
      <button
        type="button"
        className="chat-input__send"
        onClick={() => submitAnswer(inputValue.trim())}
        disabled={isDisabled}
      >
        Envoyer
      </button>
    </div>
  );
}
