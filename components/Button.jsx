import Image from "next/image";
import PropTypes from "prop-types";
import styles from "@/styles/Button.module.css";

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
}) {
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
      data-batch={batch ?? undefined}
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

Button.propTypes = {
  text: PropTypes.string,
  onClick: PropTypes.func,
  onKeyDown: PropTypes.func,
  iconSrc: PropTypes.oneOfType([PropTypes.string, PropTypes.object]), // next/image StaticImport allow (next/image StaticImport allow)
  iconAlt: PropTypes.string,
  isLight: PropTypes.bool,
  style: PropTypes.object,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  ariaControls: PropTypes.string,
  ariaExpanded: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  ariaLabel: PropTypes.string,
  courseName: PropTypes.string,
  batch: PropTypes.string,
};
