// Part of page group that populate a dynamic dropdown from MySQL:
// /lib/db.ts
// /pages/api/dropdownDataPm.ts
// /pages/api/dropdownDataStaff.ts
// /components/DropdownMenuStaff.tsx
// Author: Dante Ciolfi
// Last update: 5/4/2024

import React, { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

const DropdownMenuStaff = ({
  id,
  name,
  className = "",
  selectedValue = "",
  required = false,
}: {
  id?: string;
  name?: string;
  className?: string;
  selectedValue?: string;
  required?: boolean;
}) => {
  const [options, setOptions] = useState<Array<{ id?: string | number; value?: string; name: string }>>([]);
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("/api/dropdownDataStaff");
      const data = await response.json();
      setOptions(data);
    };
    fetchData();
  }, []);

  return (
    <select
      className={styles.addstaffforminputsbox + " " + className}
      id={id}
      name={name}
      defaultValue={selectedValue}
      required={required}
    >
      {options.map((option) => (
        <option key={option.id} value={option.value}>
          {option.name}
        </option>
      ))}
    </select>
  );
};

export default DropdownMenuStaff;
