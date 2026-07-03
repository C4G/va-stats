// Part of page group that populate a dynamic dropdown from MySQL:
// /db.js
// /pages/api/dropdownDataPm.js
// /pages/api/dropdownDataStaff.js
// /components/DropdownMenuStaff.js
// Author: Dante Ciolfi
// Last update: 5/4/2024

import React, { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

const DropdownMenuStaff = ({ id, name }) => {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("/api/dropdownDataStaff");
      const data = await response.json();
      setOptions(data);
    };
    fetchData();
  }, []);

  return (
    <select className={styles.addstaffforminputsbox} id={id} name={name}>
      {options.map((option) => (
        <option key={option.id} value={option.value}>
          {option.name}
        </option>
      ))}
    </select>
  );
};

export default DropdownMenuStaff;
