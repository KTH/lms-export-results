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
    cy.visit('https://kth.test.instructure.com/courses/4/external_tools/536?display=borderless')

    cy.contains('Godkänn').click()
    console.log('efter click...')
    // The file should be downloaded now. Check the ~/Downloads folder.

    // cy.exec('node cypress/integration/check-downloaded-file.js')
    // The download should now start. But we need to verify that the file gets downloaded
  })
})
