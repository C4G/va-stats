import Link from "next/link";
import { useRouter } from "next/router";
import { useConfirm } from "@/components/notifications/ConfirmationProvider";
interface NavItemProps {
  text: string;
  href: string;
  active?: boolean;
  description?: string;
  sessionRequired?: boolean;
  allowedRoles?: string[];
  submenu?: Array<{ text: string; href: string; description?: string }>;
}

const NavItem = ({ text, href, active, description }: NavItemProps) => {
  const confirm = useConfirm();
  const router = useRouter();

  return (
    <Link
      onClick={async (event) => {
        // Logic to prompt user if there are any unsaved changes i.e they are in the edit mode

        const editMode = localStorage.getItem("editMode");

        // If edit mode is on and user tries to go to a different nav item show the prompt
        if (editMode === "true") {
          event.preventDefault();
          const navigationLink = event.currentTarget;
          const keepEditing = await confirm(
            "Your changes have not been saved. Keep editing to preserve them, or leave without saving to discard them.",
            {
              title: "Unsaved changes",
              confirmLabel: "Keep editing",
              cancelLabel: "Leave without saving",
              cancelDestructive: true,
              initialFocus: "confirm",
              escapeResult: true,
              focusTarget: () => navigationLink,
            }
          );

          if (keepEditing) return;

          localStorage.setItem("editMode", "false");
          await router.push(href);
        }
      }}
      aria-current={active ? "page" : undefined}
      href={href}
      className={`nav__item ${active ? "active" : ""}`}
      aria-label={description}
    >
      {text}
    </Link>
  );
};
export default NavItem;
