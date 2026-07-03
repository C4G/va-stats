import Link from "next/link";
const NavItem = ({ text, href, active, description }) => {
  return (
    <Link
      onClick={(event) => {
        // Logic to prompt user if there are any unsaved changes i.e they are in the edit mode

        const editMode = localStorage.getItem("editMode");

        // If edit mode is on and user tries to go to a different nav item show the prompt
        if (editMode === "true") {
          if (
            confirm(
              "You have unsaved changes, click on OK to go back and save them. If you click cancel the changes will be lost."
            ) == true
          ) {
            // Prevent the navigation
            event.preventDefault();
            return;
          } else {
            // Allow navigation and set editmode to false
            localStorage.setItem("editMode", "false");
          }
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
