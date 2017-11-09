function login () {
  cy.visit('https://kth.test.instructure.com/login/canvas')

  cy.get('#pseudonym_session_unique_id')
  .type(Cypress.env('CANVAS_TESTUSER_USERNAME'))

  cy.get('#pseudonym_session_password')
  .type(Cypress.env('CANVAS_TESTUSER_PASSWORD'))

  cy.get('#login_form .Button--login').click()
}

describe('Export', () => {
  it('should download a csv file', () => {
    login()
    // log.info(`The user ${b.lis_person_sourcedid}, ${b.custom_canvas_user_login_id}, is exporting the course ${b.context_label} with id ${b.custom_canvas_course_id}`)
    cy.visit('https://kth.test.instructure.com/courses/4/external_tools/489?display=borderless')
    cy.contains('Godkänn').click()
    cy.getCookie('kth-export-results-number-of-students2', {timeout:90000}).then(c => console.log('cookie:', c))
    cy.getCookie('kth-export-results-number-of-students2', {timeout:90000}).should('have.property', 'value', '123')

    // The download should now start. But we need to verify that the file gets downloaded

  })
})
