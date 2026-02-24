"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const isSpeechSupported = () => !!getSpeechRecognition();

interface VoiceInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  variant?: "input" | "textarea";
  rows?: number;
}

export function VoiceInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  hasError,
  variant = "input",
  rows = 3,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const valueRef = useRef(value);
  const supported = isSpeechSupported();

  valueRef.current = value;

  const appendTranscript = useCallback(
    (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;
      const current = valueRef.current;
      onChange(current ? `${current} ${trimmed}` : trimmed);
    },
    [onChange]
  );

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("Spracherkennung wird in diesem Browser nicht unterstützt.");
      return;
    }

    setError(null);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "de-DE";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const finalTranscript = Array.from(event.results)
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript)
        .join(" ");
      if (finalTranscript.trim()) {
        appendTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setError("Mikrofon-Zugriff wurde verweigert.");
        setIsListening(false);
      } else if (event.error !== "aborted") {
        setError(`Fehler: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (e) {
      setError("Spracherkennung konnte nicht gestartet werden.");
    }
  }, [appendTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const inputClassName = cn(
    "pr-10",
    hasError ? "border-destructive" : "",
    className
  );

  const containerClassName = "relative flex w-full";

  return (
    <div className={containerClassName}>
      {variant === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={inputClassName}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
      )}
      {supported && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
                  variant === "textarea" && "top-3 translate-y-0"
                )}
                onClick={toggleMic}
                aria-label={isListening ? "Aufnahme beenden" : "Mit Mikrofon eingeben"}
                aria-pressed={isListening}
              >
                {isListening ? (
                  <MicOff className="size-4 text-destructive animate-pulse" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isListening ? "Aufnahme beenden" : "Per Sprache eingeben"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
