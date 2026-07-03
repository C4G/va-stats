import styles from "../styles/StudentReg.module.css";

const USER_GUIDE = "/documentation/VA-STATS User Guide - Spring 2026 Update.pdf";

const GUIDE_INFO = {
  "Student Management": {
    title: "Student Management",
    page: 7,
  },
  Registration: {
    title: "Registration",
    page: 12,
  },
  "Bulk Student Registration": {
    title: "Bulk Student Registration",
    page: 13,
  },
  "Batch Management": {
    title: "Batch Management",
    page: 17,
  },
  "Date Range Batch Reports": {
    title: "Date Range Batch Reports",
    page: 26,
  },
  "Single Batch Report": {
    title: "Single Batch Report",
    page: 26,
  },
  "Program Manager Report": {
    title: "Program Manager Report",
    page: 26,
  },
  "Course Management": {
    title: "Course Management",
    page: 30,
  },
  "All VisionAid Staff": {
    title: "All VisionAid Staff",
    page: 32,
  },
  Configurations: {
    title: "Configurations",
    page: 35,
  },
};

// Adds the page title and a user guide link to the page
function PageTitleWithUserGuideLink({ section_title, titleStyling = true }) {
  const section = GUIDE_INFO[section_title];
  const titleProps = titleStyling
    ? { className: styles.title, style: { marginLeft: 0, marginTop: 0, paddingTop: 0 } }
    : {};
  return (
    <h1 {...titleProps}>
      {section.title}
      <span style={{ fontSize: "0.9em", marginLeft: "0.5rem" }}>
        <a href={`${USER_GUIDE}#page=${section.page}`} target="_blank" rel="noopener noreferrer">
          ℹ️
        </a>
      </span>
    </h1>
  );
}

export default PageTitleWithUserGuideLink;
