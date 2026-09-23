import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, vausers_isactive } from "@prisma/client";
import { E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD } from "../e2e/credentials.ts";

const mysqlHost = process.env.MYSQL_HOST;
const mysqlDatabase = process.env.MYSQL_DATABASE;
const mysqlUser = process.env.MYSQL_USER;
const mysqlPassword = process.env.MYSQL_PASSWORD;
const mysqlPort = Number(process.env.MYSQL_PORT ?? 3306);
const allowedHost = ["localhost", "127.0.0.1", "::1"].includes(mysqlHost ?? "");
const allowedDatabase = /^(ci|.+(?:_e2e|_test))$/i.test(mysqlDatabase ?? "");
const configuredDatabaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const configuredDatabaseUrlName = configuredDatabaseUrl?.pathname.slice(1);
const databaseUrlMatchesMysqlTarget =
  !configuredDatabaseUrl ||
  (configuredDatabaseUrl.hostname === mysqlHost && configuredDatabaseUrlName === mysqlDatabase);

if (
  process.env.NODE_ENV === "production" ||
  !allowedHost ||
  !allowedDatabase ||
  !databaseUrlMatchesMysqlTarget ||
  !mysqlUser ||
  mysqlPassword === undefined
) {
  throw new Error(
    "Refusing to seed: configure MYSQL_HOST as localhost/127.0.0.1 and MYSQL_DATABASE as ci, *_e2e, or *_test with valid credentials; if DATABASE_URL is set, it must target the same host and database (and do not use NODE_ENV=production)."
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: mysqlHost,
    port: mysqlPort,
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
    connectionLimit: 4,
  }),
});

const fixtureUsers = [
  { role: "STAFF", name: "E2E Staff", designation: "Trainer" },
  { role: "MANAGEMENT", name: "E2E Management", designation: "Program Manager" },
  { role: "ADMINISTRATOR", name: "E2E Administrator", designation: "Program Coordinator" },
  { role: "TELECALLER", name: "E2E Telecaller", designation: "Telecaller" },
  { role: "TRAINER", name: "E2E Trainer", designation: "Trainer" },
  {
    role: "TRAINERPLUSTELECALLER",
    name: "E2E Trainer Telecaller",
    designation: "Trainer plus Telecaller",
  },
];

const courseName = "E2E Test Course";
const batchName = "E2E-TEST-01";
const studentTraineeId = "E2E-TEST-STUDENT-01";
const authUserId = "e2e-login-user-0000000000000000";
const authAccountId = "e2e-login-account-00000000000000";

function fixtureEmail(role: string) {
  return role === "ADMINISTRATOR" ? E2E_LOGIN_EMAIL : `e2e-${role.toLowerCase()}@va-stats.test`;
}

async function seed() {
  for (const user of fixtureUsers) {
    const email = fixtureEmail(user.role);
    await prisma.vausers.upsert({
      where: { email },
      update: {
        name: user.name,
        designation: user.designation,
        role: user.role,
        isactive: vausers_isactive.A,
      },
      create: {
        email,
        name: user.name,
        designation: user.designation,
        workbase: "E2E Test",
        supervisor: "E2E Test",
        natureofjob: "E2E Test",
        role: user.role,
        isactive: vausers_isactive.A,
        action: "E2E fixture",
      },
    });
  }

  const course = await prisma.vacourses.findFirst({ where: { course: courseName } });
  const seededCourse = course
    ? await prisma.vacourses.update({
        where: { id: course.id },
        data: { description: "Disposable course for browser tests", duration: "4", duration_type: "Weeks" },
      })
    : await prisma.vacourses.create({
        data: {
          course: courseName,
          description: "Disposable course for browser tests",
          duration: "4",
          duration_type: "Weeks",
        },
      });

  const batch = await prisma.vabatches.findFirst({ where: { batch: batchName } });
  const seededBatch = batch
    ? await prisma.vabatches.update({
        where: { id: batch.id },
        data: {
          coursename: courseName,
          coursestart: "2026-01-01",
          courseend: "2026-01-28",
          coursedays: "Monday-Friday",
          coursetimes: "09:00-12:00",
          instructor: "E2E Trainer",
          PM: "E2E Management",
          TA: "E2E Staff",
          dataentry: "E2E Staff",
          strength: 1,
          currency: "NA",
          trainingmode: "VIRTUAL",
          status: "ONGOING",
        },
      })
    : await prisma.vabatches.create({
        data: {
          coursename: courseName,
          batch: batchName,
          coursestart: "2026-01-01",
          courseend: "2026-01-28",
          coursedays: "Monday-Friday",
          coursetimes: "09:00-12:00",
          instructor: "E2E Trainer",
          PM: "E2E Management",
          TA: "E2E Staff",
          dataentry: "E2E Staff",
          strength: 1,
          currency: "NA",
          trainingmode: "VIRTUAL",
          status: "ONGOING",
        },
      });

  const student = await prisma.vastudents.findFirst({ where: { Trainee_ID: studentTraineeId } });
  const seededStudent = student
    ? await prisma.vastudents.update({
        where: { id: student.id },
        data: {
          name: "E2E Test Student",
          disability: "Not specified",
          edu_details: "E2E test fixture",
          gender: "E2E",
          phone_number: BigInt("1000000001"),
          age: new Date("2000-01-01T00:00:00.000Z"),
        },
      })
    : await prisma.vastudents.create({
        data: {
          Trainee_ID: studentTraineeId,
          name: "E2E Test Student",
          disability: "Not specified",
          edu_details: "E2E test fixture",
          gender: "E2E",
          phone_number: BigInt("1000000001"),
          age: new Date("2000-01-01T00:00:00.000Z"),
        },
      });

  const assignment = await prisma.vastudent_to_batch.findFirst({
    where: { student_id: seededStudent.id, batch_id: seededBatch.id },
  });
  if (!assignment) {
    await prisma.vastudent_to_batch.create({
      data: { student_id: seededStudent.id, batch_id: seededBatch.id },
    });
  }

  const passwordHash = await hashPassword(E2E_LOGIN_PASSWORD);
  const authUser = await prisma.user.upsert({
    where: { email: E2E_LOGIN_EMAIL },
    update: { name: "E2E Administrator", emailVerified: true },
    create: {
      id: authUserId,
      name: "E2E Administrator",
      email: E2E_LOGIN_EMAIL,
      emailVerified: true,
    },
  });
  await prisma.account.upsert({
    where: {
      issuer_accountId: {
        issuer: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        accountId: authUser.id,
      },
    },
    update: { password: passwordHash, providerId: "credential", userId: authUser.id },
    create: {
      id: authAccountId,
      issuer: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      accountId: authUser.id,
      providerId: "credential",
      userId: authUser.id,
      password: passwordHash,
    },
  });

  const [verifiedRoles, courseCount, batchCount, studentCount, assignmentCount, credentialCount] = await Promise.all([
    prisma.vausers.findMany({
      where: { email: { in: fixtureUsers.map((user) => fixtureEmail(user.role)) } },
      select: { role: true },
    }),
    prisma.vacourses.count({ where: { course: courseName } }),
    prisma.vabatches.count({ where: { batch: batchName } }),
    prisma.vastudents.count({ where: { Trainee_ID: studentTraineeId } }),
    prisma.vastudent_to_batch.count({
      where: { student_id: seededStudent.id, batch_id: seededBatch.id },
    }),
    prisma.account.count({
      where: {
        issuer: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        accountId: authUser.id,
        providerId: "credential",
      },
    }),
  ]);
  const actualRoles = verifiedRoles.map((user) => user.role).sort();
  const expectedRoles = fixtureUsers.map((user) => user.role).sort();
  if (
    actualRoles.join(",") !== expectedRoles.join(",") ||
    courseCount !== 1 ||
    batchCount !== 1 ||
    studentCount !== 1 ||
    assignmentCount !== 1 ||
    credentialCount !== 1
  ) {
    throw new Error("E2E fixture verification failed: expected one row for every fixture user and related record.");
  }

  console.info(
    `Seeded and verified E2E fixture in local database '${mysqlDatabase}' (6 roles, 1 course, 1 batch, 1 student, 1 assignment, 1 credential).`
  );
}

seed()
  .catch((error: unknown) => {
    console.error("Failed to seed E2E fixture:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
