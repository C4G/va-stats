import { toDisplay } from "./types/date";

/**
 *
 * @param {string} dateString
 * @returns
 */
export const getDateWithTimezoneOffset = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000;
  // return new Date(date.getTime() - (offset >= 0 ? -offset : offset)).toLocaleDateString("en-GB");

  // const offset = date.getTimezoneOffset() * 60000;
  // var localDate = new Date(date.getTime() - (offset >= 0 ? -offset : offset)).toLocaleDateString("en-US");

  //var localDate = date.toString();
  // Remove the first 5 characters
  // const slicedDate = localDate.slice(5);
  // return slicedDate;
  // var date = new Date(dateString);
  // var slicedDate = date.slice(5);
  // return slicedDate;
  const adjustedDate = new Date(date.getTime() - (offset >= 0 ? -offset : offset));
  return toDisplay(adjustedDate);
};
