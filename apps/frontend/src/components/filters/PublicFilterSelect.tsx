"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpDown,
  AlertCircle,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  ChevronUp,
  Gavel,
  MapPinned,
  ReceiptText,
} from "lucide-react";

type FilterIcon = "municipality" | "nature" | "year" | "modality" | "sort";

interface FilterOption {
  value: string;
  label: string;
}

interface PublicFilterSelectProps {
  name: string;
  label: string;
  allLabel?: string;
  options: FilterOption[];
  defaultValue?: string;
  icon: FilterIcon;
  variant?: "landing" | "analysis" | "dashboard";
  disabled?: boolean;
  required?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}

const allValue = "__all__";
const MAX_VISIBLE_OPTIONS = 60;

export function PublicFilterSelect({
  name,
  label,
  allLabel,
  options,
  defaultValue = "",
  icon,
  variant = "analysis",
  disabled = false,
  required = false,
  value: controlledValue,
  onValueChange,
}: PublicFilterSelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || (allLabel ? allValue : ""));
  const value = controlledValue === undefined ? internalValue : controlledValue || (allLabel ? allValue : "");
  const [search, setSearch] = useState("");
  const [requiredError, setRequiredError] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const deferredSearch = useDeferredValue(search);
  const showSearch = options.length > 5;
  const Icon =
    icon === "municipality"
      ? MapPinned
      : icon === "year"
        ? CalendarDays
        : icon === "modality"
          ? Gavel
          : icon === "sort"
            ? ArrowUpDown
            : variant === "landing"
              ? ReceiptText
              : ChartNoAxesColumnIncreasing;
  const normalizedOptions = useMemo(
    () => options.map((item) => ({ item, normalizedLabel: item.label.toLocaleLowerCase("pt-BR") })),
    [options],
  );
  const { visibleOptions, hasMoreOptions } = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const matches = (term
      ? normalizedOptions.filter(({ normalizedLabel }) => normalizedLabel.includes(term))
      : [...normalizedOptions]);
    matches.sort((a, b) => Number(b.normalizedLabel.startsWith(term)) - Number(a.normalizedLabel.startsWith(term)));
    return {
      visibleOptions: matches.slice(0, MAX_VISIBLE_OPTIONS).map(({ item }) => item),
      hasMoreOptions: matches.length > MAX_VISIBLE_OPTIONS,
    };
  }, [deferredSearch, normalizedOptions]);
  const selectedLabel =
    value === allValue || value === ""
      ? allLabel ?? `Selecione ${label.toLocaleLowerCase("pt-BR")}`
      : options.find((item) => item.value === value)?.label;

  useEffect(() => {
    if (!required) return;
    const form = triggerRef.current?.closest("form");
    if (!form) return;
    const validate = (event: Event) => {
      if (value && value !== allValue) {
        setRequiredError(false);
        return;
      }
      event.preventDefault();
      setRequiredError(true);
      triggerRef.current?.focus();
    };
    form.addEventListener("submit", validate, true);
    return () => form.removeEventListener("submit", validate, true);
  }, [required, value]);

  return (
    <div className={`public-filter-select ${variant === "dashboard" ? "is-dashboard" : ""}`}>
      <Select.Root
        name={name}
        value={value}
        open={selectOpen}
        disabled={disabled}
        onValueChange={(nextValue) => {
          setInternalValue(nextValue);
          if (nextValue && nextValue !== allValue) setRequiredError(false);
          onValueChange?.(nextValue === allValue ? "" : nextValue);
        }}
        onOpenChange={(open) => {
          setSelectOpen(open);
          if (!open) setSearch("");
        }}
      >
        <Select.Trigger ref={triggerRef} className={`public-filter-trigger${requiredError ? " is-invalid" : ""}`} aria-label={label} aria-required={required} aria-invalid={requiredError} aria-describedby={requiredError ? `${name}-required-error` : undefined}>
          <Icon className="public-filter-leading" aria-hidden="true" />
          <span className="public-filter-copy">
            <small>{label}</small>
            <span className="public-filter-value">
              <Select.Value>{selectedLabel}</Select.Value>
            </span>
          </span>
          <Select.Icon asChild>
            <ChevronDown className="public-filter-chevron" aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className={`public-filter-content ${variant === "dashboard" ? "is-dashboard" : ""}`}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            {showSearch && <div className="public-filter-search-wrap">
              <input
                className="public-filter-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDownCapture={(event) => {
                  event.stopPropagation();
                  event.nativeEvent.stopImmediatePropagation();
                }}
                onKeyDown={(event) => event.stopPropagation()}
                onKeyUp={(event) => {
                  event.stopPropagation();
                  event.nativeEvent.stopImmediatePropagation();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                autoComplete="off"
                placeholder="Buscar"
                aria-label={`Buscar em ${label.toLowerCase()}`}
              />
            </div>}
            {showSearch && <Select.ScrollUpButton className="public-filter-scroll">
              <ChevronUp size={16} />
            </Select.ScrollUpButton>}
            <Select.Viewport className="public-filter-viewport">
              {allLabel && <FilterItem value={allValue} label={allLabel} />}
              {visibleOptions.map((item) => (
                <FilterItem
                  key={item.value}
                  value={item.value}
                  label={item.label}
                />
              ))}
              {!visibleOptions.length && (
                <p className="public-filter-empty">
                  Nenhum resultado encontrado.
                </p>
              )}
              {hasMoreOptions && <p className="public-filter-empty">Mostrando os primeiros {MAX_VISIBLE_OPTIONS} resultados. Digite mais letras para refinar.</p>}
            </Select.Viewport>
            {showSearch && <Select.ScrollDownButton className="public-filter-scroll">
              <ChevronDown size={16} />
            </Select.ScrollDownButton>}
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <Dialog.Root open={requiredError} onOpenChange={(open) => setRequiredError(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="public-filter-validation-overlay" />
          <Dialog.Content className="public-filter-validation-dialog" aria-describedby={`${name}-required-error`}>
            <span className="public-filter-validation-icon"><AlertCircle size={25} aria-hidden="true" /></span>
            <Dialog.Title>Selecione um município</Dialog.Title>
            <Dialog.Description id={`${name}-required-error`}>
              Para consultar os dados, escolha um município no campo Município. A opção de consultar todos não está disponível.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button type="button" className="public-filter-validation-button" onClick={() => {
                triggerRef.current?.focus();
                window.setTimeout(() => setSelectOpen(true), 0);
              }}>
                Voltar e escolher
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function FilterItem({ value, label }: FilterOption) {
  return (
    <Select.Item className="public-filter-item" value={value}>
      <Select.ItemText>{label}</Select.ItemText>
      <Select.ItemIndicator className="public-filter-check">
        <Check size={15} />
      </Select.ItemIndicator>
    </Select.Item>
  );
}
