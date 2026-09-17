// NOTE: If default data should be entered when student is added to
// a batch, MySQL table column default and default value below must BOTH be set.

import { vastudents_enrollment_status, YesNo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCourseDays, isClassDay } from "@/utils/course-days";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateDateArray(startDate, endDate, courseDays) {
  // Parse YYYY-MM-DD dates as local dates to avoid timezone issues
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).split("T")[0]; // Extract YYYY-MM-DD part
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }

  const dateArray: string[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    if (isClassDay(currentDate.getDay(), courseDays)) {
      dateArray.push(formatDate(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
}

async function createAttendanceRecords(batch_id, student_id, coursestart, courseend, coursedays) {
  const dateArray = generateDateArray(coursestart, courseend, coursedays);
  if (!dateArray.length) return;

  try {
    await prisma.va_attendance.createMany({
      data: dateArray.map((date) => ({ batch_id, student_id, date: new Date(date), is_present: 1 })),
    });
  } catch (error) {
    console.log("Error inserting attendance records:", error);
  }
}

export default async function handler(req, res) {
  const { studentId, batchId } = req.body;

  try {
    const existingStudentBatch = await prisma.vastudent_to_batch.findFirst({
      where: { student_id: studentId },
      select: { id: true },
    });

    const studentAlreadyInBatch = Boolean(existingStudentBatch);
    await prisma.vastudent_to_batch.create({ data: { student_id: studentId, batch_id: batchId } });

    // Get the student ID proof, disability certificate, and photo information
    const getStudentIdInfo = await prisma.vastudents.findUnique({
      where: { id: studentId },
      select: { id_proof: true, disability_cert: true, photo: true },
    });

    const idProof = getStudentIdInfo?.id_proof || YesNo.Yes;
    const disabilityCert = getStudentIdInfo?.disability_cert || YesNo.Yes;
    const photo = getStudentIdInfo?.photo || YesNo.Yes;

    // If student is already in the batch, we update their ID proof, disability certificate, and photo information
    // otherwise, we set them to "yes" as default values
    await prisma.vastudents.update({
      where: { id: studentId },
      data: studentAlreadyInBatch
        ? { id_proof: idProof, disability_cert: disabilityCert, photo }
        : { id_proof: YesNo.Yes, disability_cert: YesNo.Yes, photo: YesNo.Yes },
    });

    const result = await prisma.va_grades.findMany({
      where: { batch_id: batchId },
      distinct: ["assignment_name"],
      select: { assignment_name: true },
    });

    const assignments = result.map((assignment) => assignment.assignment_name);

    const courseDatesResult = await prisma.vabatches.findUnique({
      where: { id: batchId },
      select: { coursestart: true, courseend: true, coursedays: true },
    });

    if (!courseDatesResult) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const coursestart = courseDatesResult.coursestart;
    const courseend = courseDatesResult.courseend;
    const coursedaysValue = courseDatesResult.coursedays;
    const coursedays = parseCourseDays(typeof coursedaysValue === "string" ? coursedaysValue : "");

    await prisma.vastudents.updateMany({
      where: { id: studentId, enrollment_status: { not: vastudents_enrollment_status.DROPOUT } },
      data: { enrollment_status: vastudents_enrollment_status.ENROLLED },
    });

    if (coursestart && courseend) {
      await createAttendanceRecords(batchId, studentId, coursestart, courseend, coursedays);
    }

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        if (typeof assignment !== "undefined") {
          await prisma.va_grades.create({
            data: {
              student_id: studentId,
              batch_id: batchId,
              assignment_name: assignment,
              assignment_type: "",
              assignment_weight: 0,
              grade: 0,
              max_marks: 0,
            },
          });
        } else {
          console.log("skipping");
        }
      }
    }

    try {
      await prisma.va_fees.create({
        data: {
          batch_id: batchId,
          student_id: studentId,
          fee_paid: "NA",
          amount_1: 0,
          amount_2: 0,
          amount_3: 0,
          nature_of_fee: "",
        },
      });
    } catch (error) {
      console.log("Error inserting fees record:", error);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
