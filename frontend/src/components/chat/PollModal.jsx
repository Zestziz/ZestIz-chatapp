import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@heroui/react";
import { BarChart3Icon, PlusIcon, XIcon } from "lucide-react";

const MAX_OPTIONS = 8;

export function PollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isSaving, setIsSaving] = useState(false);

  const updateOption = (index, value) => setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option));
  const removeOption = (index) => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((option) => option.trim());
    if (!trimmedQuestion || trimmedQuestion.length > 240 || trimmedOptions.length < 2 || trimmedOptions.length > MAX_OPTIONS || trimmedOptions.some((option) => !option || option.length > 120)) return;
    if (new Set(trimmedOptions.map((option) => option.toLowerCase())).size !== trimmedOptions.length) return;
    setIsSaving(true);
    const didCreate = await onCreate(trimmedQuestion, trimmedOptions);
    setIsSaving(false);
    if (didCreate) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3Icon className="size-5 text-accent" /> Create poll
          </h2>
          <Button type="button" variant="ghost" size="sm" isIconOnly aria-label="Close" onPress={onClose}>
            <XIcon className="size-5" />
          </Button>
        </div>
        <label className="block text-xs text-muted">
          Question
          <input
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            value={question}
            maxLength={240}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should we eat tonight?"
            required
          />
        </label>
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted">Options</p>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                value={option}
                maxLength={120}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
                required
              />
              {options.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label={`Remove option ${index + 1}`}
                  onPress={() => removeOption(index)}
                >
                  <XIcon className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {options.length < MAX_OPTIONS ? (
          <Button
            type="button"
            variant="flat"
            size="sm"
            className="mt-3"
            onPress={() => setOptions((current) => [...current, ""])}
          >
            <PlusIcon className="size-4" /> Add option
          </Button>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isDisabled={isSaving || !question.trim() || options.some((option) => !option.trim())}
          >
            {isSaving ? "Creating..." : "Create poll"}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}
