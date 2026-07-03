--- Add new Role Trainer Cum Telecaller to dropdown values and dropdown configurations
INSERT INTO vastats.va_dropdown_values 
VALUES (24, 'staff_designation', 'Trainer plus Telecaller', 'Trainer plus Telecaller', 70, NOW());





INSERT INTO vastats.dropdown_configurations
(id, field_name, option_value, option_label, display_order, is_active, category, created_at, updated_at)
VALUES(141, 'designation', 'Trainer plus Telecaller', 'Trainer plus Telecaller', 0, 1, '', NOW(), NOW());