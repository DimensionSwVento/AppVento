"use client";

import {
  useCallback,
  useId,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { MAX_CAPACITY_MW } from "../../Utils/capacity";

export { MIN_CAPACITY_MW, MAX_CAPACITY_MW } from "../../Utils/capacity";

export type MWPickerDecimalStep = 5 | 10;

/**
 * Paso decimal provisional. El cliente aún debe confirmar si el valor
 * predeterminado definitivo será 5 o 10 centésimas.
 */
export const DEFAULT_MW_PICKER_DECIMAL_STEP: MWPickerDecimalStep = 5;

export interface MWPickerProps {
  value: number;
  onChange: (mw: number) => void;
  /** Paso de la parte decimal, expresado en centésimas de MW. */
  decimalStep?: MWPickerDecimalStep;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Selector de capacidad nominal en MW estilo "ruedas tipo iOS".
 *
 * Presenta cinco dígitos: `[C][D][U] . [d][c]`. Cada dígito acepta entrada
 * numérica directa y mueve el foco al siguiente. Las flechas, botones y rueda
 * del mouse conservan la interacción original; el bloque decimal avanza en el
 * paso configurado (0.05 MW provisionalmente por defecto, o 0.10 MW).
 */
export default function MWPicker({
  value,
  onChange,
  decimalStep = DEFAULT_MW_PICKER_DECIMAL_STEP,
  invalid = false,
  describedBy,
}: MWPickerProps) {
  const hundredsInputRef = useRef<HTMLInputElement>(null);
  const tensInputRef = useRef<HTMLInputElement>(null);
  const unitsInputRef = useRef<HTMLInputElement>(null);
  const tenthsInputRef = useRef<HTMLInputElement>(null);
  const hundredthsInputRef = useRef<HTMLInputElement>(null);
  const decimalStepDescriptionId = useId();
  const totalCents = toCents(value);
  const integer = Math.floor(totalCents / 100);
  const decimals = totalCents % 100;

  const digits = [
    Math.floor(integer / 100) % 10,
    Math.floor(integer / 10) % 10,
    integer % 10,
    Math.floor(decimals / 10),
    decimals % 10,
  ] as const;

  const emitDigits = useCallback(
    (nextDigits: readonly number[]) => {
      const nextCents =
        nextDigits[0] * 10_000 +
        nextDigits[1] * 1_000 +
        nextDigits[2] * 100 +
        nextDigits[3] * 10 +
        nextDigits[4];
      onChange(fromCents(nextCents));
    },
    [onChange],
  );

  const setDigit = (index: number, digit: number) => {
    const nextDigits = [...digits];
    nextDigits[index] = wrap(digit, 10);
    emitDigits(nextDigits);
  };

  const setDecimals = (nextDecimals: number) => {
    const normalized = wrap(nextDecimals, 100);
    emitDigits([
      digits[0],
      digits[1],
      digits[2],
      Math.floor(normalized / 10),
      normalized % 10,
    ]);
  };

  return (
    <div
      role="group"
      className="flex items-center justify-center gap-1"
      aria-label="Capacidad nominal en megavatios"
      aria-describedby={describedBy}
    >
      <Wheel
        ariaLabel="Centenas"
        digit={digits[0]}
        inputRef={hundredsInputRef}
        nextInputRef={tensInputRef}
        onDigitInput={(digit) => setDigit(0, digit)}
        onIncrement={() => setDigit(0, digits[0] + 1)}
        onDecrement={() => setDigit(0, digits[0] - 1)}
        invalid={invalid}
      />
      <Wheel
        ariaLabel="Decenas"
        digit={digits[1]}
        inputRef={tensInputRef}
        nextInputRef={unitsInputRef}
        onDigitInput={(digit) => setDigit(1, digit)}
        onIncrement={() => setDigit(1, digits[1] + 1)}
        onDecrement={() => setDigit(1, digits[1] - 1)}
        invalid={invalid}
      />
      <Wheel
        ariaLabel="Unidades"
        digit={digits[2]}
        inputRef={unitsInputRef}
        nextInputRef={tenthsInputRef}
        onDigitInput={(digit) => setDigit(2, digit)}
        onIncrement={() => setDigit(2, digits[2] + 1)}
        onDecrement={() => setDigit(2, digits[2] - 1)}
        invalid={invalid}
      />
      <Dot />
      <DecimalWheel
        digits={[digits[3], digits[4]]}
        tenthsInputRef={tenthsInputRef}
        hundredthsInputRef={hundredthsInputRef}
        onDigitInput={(index, digit) => setDigit(index + 3, digit)}
        onIncrement={() => setDecimals(decimals + decimalStep)}
        onDecrement={() => setDecimals(decimals - decimalStep)}
        decimalStep={decimalStep}
        stepDescriptionId={decimalStepDescriptionId}
        invalid={invalid}
      />
      <span className="ml-2 select-none text-sm font-semibold text-gray-500">
        MW
      </span>
    </div>
  );
}

function toCents(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(
    MAX_CAPACITY_MW * 100,
    Math.max(0, Math.round(value * 100)),
  );
}

function fromCents(value: number) {
  return toCents(value / 100) / 100;
}

function wrap(value: number, limit: number) {
  return ((value % limit) + limit) % limit;
}

interface WheelInteractionProps {
  onIncrement: () => void;
  onDecrement: () => void;
}

function Wheel({
  digit,
  onDigitInput,
  inputRef,
  nextInputRef,
  onIncrement,
  onDecrement,
  ariaLabel,
  invalid,
}: WheelInteractionProps & {
  digit: number;
  onDigitInput: (digit: number) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  nextInputRef: RefObject<HTMLInputElement | null>;
  ariaLabel: string;
  invalid: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex w-8 flex-col items-center select-none"
      onWheel={(event) => handleWheel(event, onIncrement, onDecrement)}
    >
      <WheelButton direction="up" ariaLabel={ariaLabel} onClick={onIncrement} />
      <DigitInput
        inputRef={inputRef}
        nextInputRef={nextInputRef}
        ariaLabel={ariaLabel}
        digit={digit}
        onDigitInput={onDigitInput}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        invalid={invalid}
      />
      <WheelButton
        direction="down"
        ariaLabel={ariaLabel}
        onClick={onDecrement}
      />
    </div>
  );
}

function DecimalWheel({
  digits,
  tenthsInputRef,
  hundredthsInputRef,
  onDigitInput,
  onIncrement,
  onDecrement,
  decimalStep,
  stepDescriptionId,
  invalid,
}: WheelInteractionProps & {
  digits: readonly [number, number];
  tenthsInputRef: RefObject<HTMLInputElement | null>;
  hundredthsInputRef: RefObject<HTMLInputElement | null>;
  onDigitInput: (index: number, digit: number) => void;
  decimalStep: MWPickerDecimalStep;
  stepDescriptionId: string;
  invalid: boolean;
}) {
  const stepLabel = `${decimalStep / 100} MW`;
  return (
    <div
      role="group"
      aria-label="Centésimas"
      aria-describedby={stepDescriptionId}
      className="flex w-12 flex-col items-center select-none"
      onWheel={(event) => handleWheel(event, onIncrement, onDecrement)}
    >
      <WheelButton
        direction="up"
        ariaLabel="Centésimas"
        detail={`Paso de ${stepLabel}`}
        onClick={onIncrement}
      />
      <div className="flex w-full rounded-md bg-gray-50 py-1.5 ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-[#165170ff]/40">
        <DigitInput
          inputRef={tenthsInputRef}
          nextInputRef={hundredthsInputRef}
          ariaLabel="Décimas"
          digit={digits[0]}
          onDigitInput={(digit) => onDigitInput(0, digit)}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          invalid={invalid}
          embedded
        />
        <DigitInput
          inputRef={hundredthsInputRef}
          ariaLabel="Centésimas"
          digit={digits[1]}
          onDigitInput={(digit) => onDigitInput(1, digit)}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          invalid={invalid}
          embedded
        />
      </div>
      <WheelButton
        direction="down"
        ariaLabel="Centésimas"
        detail={`Paso de ${stepLabel}`}
        onClick={onDecrement}
      />
      <span id={stepDescriptionId} className="sr-only">
        Paso decimal de {stepLabel}
      </span>
    </div>
  );
}

function DigitInput({
  inputRef,
  nextInputRef,
  digit,
  ariaLabel,
  onDigitInput,
  onIncrement,
  onDecrement,
  invalid,
  embedded = false,
}: WheelInteractionProps & {
  inputRef: RefObject<HTMLInputElement | null>;
  nextInputRef?: RefObject<HTMLInputElement | null>;
  digit: number;
  ariaLabel: string;
  onDigitInput: (digit: number) => void;
  invalid: boolean;
  embedded?: boolean;
}) {
  const applyDigit = (nextDigit: number) => {
    onDigitInput(nextDigit);
    nextInputRef?.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onIncrement();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onDecrement();
      return;
    }
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      applyDigit(Number(event.key));
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={1}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      value={digit}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={handleKeyDown}
      onPaste={(event) => {
        event.preventDefault();
        const pastedDigit = event.clipboardData
          .getData("text")
          .match(/[0-9]/g)
          ?.at(-1);
        if (pastedDigit !== undefined) applyDigit(Number(pastedDigit));
      }}
      onChange={(event) => {
        const typedDigit = event.currentTarget.value.match(/[0-9]/g)?.at(-1);
        if (typedDigit !== undefined) applyDigit(Number(typedDigit));
      }}
      className={`min-w-0 appearance-none bg-transparent p-0 text-center font-mono text-lg font-bold text-[#165170ff] outline-none ${
        embedded
          ? "w-1/2"
          : "w-full rounded-md bg-gray-50 py-1.5 ring-1 ring-gray-200 focus:ring-2 focus:ring-[#165170ff]/40"
      }`}
    />
  );
}

function handleWheel(
  event: React.WheelEvent,
  onIncrement: () => void,
  onDecrement: () => void,
) {
  event.preventDefault();
  if (event.deltaY > 0) onDecrement();
  else onIncrement();
}

function WheelButton({
  direction,
  ariaLabel,
  detail,
  onClick,
}: {
  direction: "up" | "down";
  ariaLabel: string;
  detail?: string;
  onClick: () => void;
}) {
  const action = direction === "up" ? "Aumentar" : "Disminuir";
  return (
    <button
      type="button"
      aria-label={`${action} ${ariaLabel}`}
      title={detail}
      onClick={onClick}
      className="text-gray-400 hover:text-[#165170ff] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#165170ff]/40"
    >
      {direction === "up" ? <ChevronUp /> : <ChevronDown />}
    </button>
  );
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="mt-3 self-end pb-2 text-lg font-bold text-[#165170ff]"
    >
      .
    </span>
  );
}

function ChevronUp() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.94l-3.71 3.83a.75.75 0 11-1.08-1.04l4.25-4.39a.75.75 0 011.08 0l4.25 4.39a.75.75 0 01-.02 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
