import Image from "next/image";
import styles from "@/styles/Button.module.css";
import type { CSSProperties, KeyboardEventHandler, MouseEventHandler } from "react";
import type { StaticImport } from "next/dist/shared/lib/get-img-props";

interface ButtonProps {
  text?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  iconSrc?: string | StaticImport;
  iconAlt?: string;
  isLight?: boolean;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
  ariaControls?: string;
  ariaExpanded?: boolean | "true" | "false";
  ariaLabel?: string;
  courseName?: string;
  batch?: string | number;
  tabIndex?: number;
  "aria-label"?: string;
}

export default function Button({
  text,
  onClick,
  onKeyDown,
  iconSrc,
  iconAlt = "", // decorat icon basic value
  isLight = false,
  style,
  className = "",
  disabled = false,
  ariaControls,
  ariaExpanded,
  ariaLabel, // if needed, explicitly specify
  courseName, // if needed, pass only as data-attr
  batch, // if needed, pass only as data-attr
}: ButtonProps) {
  const buttonClassName = [isLight ? styles.genericButtonLight : styles.genericButtonDark, className]
    .filter(Boolean)
    .join(" ");

  // default aria-label rule: prioritize directly passed ariaLabel.
  // exception: for 'Roster' button, create meaningful phrase.
  const computedAriaLabel =
    ariaLabel ??
    (text === "Roster" && courseName && batch ? `View attendance roster for ${courseName}, batch ${batch}` : undefined);

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={style}
      disabled={disabled}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls || undefined}
      aria-label={computedAriaLabel}
      data-course-name={courseName ?? undefined}
      data-batch={batch == null ? undefined : String(batch)}
    >
      {iconSrc ? (
        <Image
          alt={iconAlt} // if decorative, default value ""
          src={iconSrc}
          height={20}
          width={20}
          aria-hidden={iconAlt === ""} // if decorative, ignore screen reader
        />
      ) : null}

      {text ? <span className={styles.buttonText}>{text}</span> : null}
    </button>
  );
}
