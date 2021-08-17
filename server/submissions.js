function extractUniqueStudentsAndSectionNamesFromSections(sections) {
  return sections.reduce((accumulatedSectionStudents, currentSection) => {
    if (!currentSection.students) {
      // eslint-disable-next-line no-param-reassign
      currentSection.students = [];
    }

    const studentsInSection = currentSection.students.reduce(
      (accumulatedStudents, currentStudent) => {
        if (
          !accumulatedStudents.find(
            (student) => student.user_id === currentStudent.id
          )
        ) {
          const sectionName = currentSection.name;
          const previousStudentEntry = accumulatedSectionStudents.find(
            (sectionStudent) => sectionStudent.user_id === currentStudent.id
          );
          if (previousStudentEntry) {
            previousStudentEntry.section_names += ` / ${sectionName}`;
          } else {
            accumulatedStudents.push({
              user_id: currentStudent.id,
              section_names: sectionName,
              submissions: [], // Add this to preserve the order of the properties, to make deepEqual possible
              sis_user_id: currentStudent.sis_user_id,
            });
          }
        }

        return accumulatedStudents;
      },
      []
    );

    accumulatedSectionStudents.push(...studentsInSection);
    return accumulatedSectionStudents;
  }, []);
}

async function getSubmissions({ canvasCourseId, sections, canvasApi }) {
  const studentsFromSections =
    extractUniqueStudentsAndSectionNamesFromSections(sections);
  const submissions = await canvasApi.get(
    `courses/${canvasCourseId}/students/submissions?student_ids[]=all&order=id&order_direction=ascending&per_page=100`
  );
  const studentsWithSubmissions = studentsFromSections.map((student) => ({
    ...student,
    submissions: submissions.filter((sub) => sub.user_id === student.user_id),
  }));

  return studentsWithSubmissions;
}
module.exports = { getSubmissions };
