-- Transition Users from Admin role to mangement role 

----------------------------------
-- Print total admins 

select count(*) from vausers v where role = 'ADMINISTRATOR'

--- Below Script will update all the users with role as ADMINISTRATOR to MANAGEMENT except for the 4 users who are still active admins.

update vausers v 
set role = 'MANAGEMENT' 
where v.`role` = 'ADMINISTRATOR' and v.email
not in(
    'duttadheeraj3@gmail.com' , -- Dheeraj Dutta
    'kbvisionaid@gmail.com', -- Kulsum 
    'arunkumar@visionaid.org', -- Arun Kumar
    'vinimanoj1@gmail.com', -- Vineetha Manoj
    'tamkyletstuff@gmail.com', -- Kyle
    'tamkylet@gmail.com', -- Kyle
    'pooja.khanapurkar@gmail.com', -- Pooja Khanapurkar
    'divramesh.39@gmail.com' , -- Divya Ramesh
    'santosh.vempala@gmail.com', -- Santosh Vempala
    'Lfigu042@gmail.com', -- Laura
    'cristyevr94@gmail.com', -- Cristina
    'bmoran.bam@gmail.com' -- Brett Moran
    )  


 
