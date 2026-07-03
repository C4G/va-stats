// Part of page group that populate a dynamic dropdown from MySQL:
// /db.js
// /pages/api/dropdownDataPm.js
// /pages/api/dropdownDataStaff.js
// /components/DropdownMenuStaff.js
// Author: Dante Ciolfi
// Last update: 5/4/2024

import React, { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

const DropdownMenuPm = ({ id = "PM", name = "PM", required = false, className = "", selectedValue = "" }) => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("/api/dropdownDataPm");
      const data = await response.json();
      const unique = data.filter((option, index, self) => index === self.findIndex((o) => o.name === option.name));
      setOptions(unique);
    };
    fetchData();
  }, []);

  return (
    <select
      id={id}
      name={name}
      required={required}
      defaultValue={selectedValue}
      className={`${styles.addstaffforminputsbox} ${className}`}
    >
      {options.map((option) => (
        <option key={option.id} value={option.value ?? option.name}>
          {option.name}
        </option>
      ))}
    </select>
  );
};

export default DropdownMenuPm;
