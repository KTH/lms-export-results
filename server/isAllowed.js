const defaultLog = require('./log')

/** Check if the user is allowed to use the app */
module.exports = async function isAllowed (
  canvasApi,
  courseId,
  { log = defaultLog } = {}
) {
  // These are role IDs mapped to roles in Canvas.
  const EXAMINER = 10
  const COURSE_RESPONSIBLE = 9
  const TEACHER = 4

  const enrollments = await canvasApi.get(
    `/courses/${courseId}/enrollments?user_id=self`
  )

  const allowedRoles = enrollments
    .map(enrollment => parseInt(enrollment.role_id, 10))
    .filter(
      role =>
        role === EXAMINER || role === COURSE_RESPONSIBLE || role === TEACHER
    )

  log.info(`The user has the roles: ${allowedRoles}`)
  return allowedRoles.length > 0
}
