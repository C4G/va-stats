This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

Follow instructions in Developer Guide for setting up the local development environment.

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Developer Guide

To learn more on how develop this project, refer to the Developer Guide in the /public/documentation folder. Also, see 'Code Modifications...' section below.

## User facing documentation

User facing documentation is also in the /public/documentation folder

## Learn about Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

This app is deployed on [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Code modifications required when changing hosting provider

PAGES FOLDER: files requiring mods to API routes:

- batch > [id].jsx
- student > [id].jsx
- batches.jsx
- courses.jsx
- students.jsx
- users.jsx

.env file:

- Adjust MySQL and NEXTAUTH_URL values

NOTE REGARDING BATCH ATTENDANCE DROPDOWN:

- This can be edited in /utils/tableHelper.js

## CSV download - related modifications

- Components to modify:
  - Vercel
    - /pages/users.jsx\*: name, accessor, htmlFor, id (input attribute)
    - /pages/api/getuserdata.js (if necessary)
  - DreamHost
    - [https://visionaid.dreamhosters.com/csv/staff.php](https://visionaid.dreamhosters.com/csv/staff.php): th tag list
    - /csv/csvfunctions.php: fputcsv(), while($row = mysqli_fetch_assoc($result)), get_all_user_records()

\*users.jsx file (staff) example: database and UI column names:

id Id
email Email
name Name
designation Designation

joindate Date of Joining
mobilenumber Mobile Number
workbase Work Location
supervisor Supervisor
natureofjob Nature of Job

visualacuity Visual Acuity
trainingprogram1 Training Program 1
trainingprogram2 Training Program 2
trainingprogram3 Training Program 3
role Role

isactive Staff Working Status
action Action

## Errors

- Can't log out? If you get an error preventing you from logging out:
  please modify the /components/Navbar.jsx file per comments
  at the top of the file.

## Dreamhost-mtl folder (DB hosting)

- This contains a folder and an HTM file to be uploaded to the HTML hosting service, Dreamhost (as opposed to Vercel for JS). The HTM file has been converted to HTM from an Excel file due to partner concerns, which explains the evident errors. The file still works. We will continue to work with the partner on a better solution when they have more time to provide necessary materials.
- To get schema: see /schema.docx
