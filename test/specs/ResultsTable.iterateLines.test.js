/* eslint-disable max-classes-per-file */
const test = require("tape");
const rewire = require("rewire");
const log = require("bunyan").createLogger({
  name: "test",
  level: 0, // Creates a very noisy logger
});

const ResultsTable = rewire("../../server/ResultsTable");

ResultsTable.__set__("got", () => ({
  body: {
    auth: {
      access_token: "valid_access_token",
    },
  },
}));

test('"iterateLines()" with 0 students should finish without calling the callback', async (t) => {
  const ldapClientMock = {
    unbind: () => {},
  };
  class CanvasApiMock {
    // eslint-disable-next-line class-methods-use-this
    get(_url, cb) {
      cb([]);
      return [];
    }
  }

  ResultsTable.__set__("ldap.getBoundClient", () => ldapClientMock);
  ResultsTable.__set__("CanvasApi", CanvasApiMock);

  const file = await ResultsTable.create("canvas_course_id", {
    log,
    oauth: {},
  });

  await file.iterateRows(() => {
    t.fail("the callback was called");
  });

  t.end();
});

test('"iterateLines()" with 1 student should throw an error if preload() was not called before', async (t) => {
  const ldapClientMock = {
    unbind: () => {},
  };
  class CanvasApiMock {
    // eslint-disable-next-line class-methods-use-this
    async get(url, cb) {
      if (url.includes("sections")) {
        return {
          id: "section_id",
          name: "section_name",
        };
      }

      if (url.includes("students/submissions")) {
        return cb([{ id: "1" }]);
      }

      return [];
    }
  }

  ResultsTable.__set__("ldap.getBoundClient", () => ldapClientMock);
  ResultsTable.__set__("CanvasApi", CanvasApiMock);

  const file = await ResultsTable.create("canvas_course_id", {
    log,
    oauth: {},
  });

  try {
    await file.iterateRows(() => {
      t.fail("the callback was called");
    });
  } catch (e) {
    t.pass("should throw an error");
  }

  t.end();
});

test('"iterateLines()" should work normally', async (t) => {
  const ldapMock = {
    getBoundClient() {
      return {
        unbind: () => {},
      };
    },

    lookupUser(ldapClient, id) {
      if (id === "sis1") {
        return {
          givenName: "John",
          sn: "Doe",
          personnummer: "111122334455",
        };
      }

      return {};
    },
  };

  class CanvasApiMock {
    // eslint-disable-next-line class-methods-use-this
    async get(url, cb) {
      if (url.includes("courses/canvas_course_id/assignments")) {
        return [
          { name: "Assignment 1", id: "a1" },
          { name: "Assignment 2", id: "a2" },
        ];
      }

      if (
        url.includes(
          "courses/canvas_course_id/users?enrollment_type[]=student_view"
        )
      ) {
        return [];
      }

      if (
        url.includes("courses/canvas_course_id/users?enrollment_type[]=student")
      ) {
        return [{ name: "John", id: "u1", login_id: "john@example.com" }];
      }

      if (
        url.includes(
          "courses/canvas_course_id/custom_gradebook_columns/cc1/data"
        )
      ) {
        return [{ user_id: "u1", content: "CC content" }];
      }

      if (url.includes("courses/canvas_course_id/custom_gradebook_columns")) {
        return [{ title: "CC 1", id: "cc1", position: 0 }];
      }

      if (url.includes("courses/canvas_course_id/students/submissions")) {
        return cb([
          {
            user_id: "u1",
            sis_user_id: "sis1",
            section_id: "section1",
            submissions: [
              {
                assignment_id: "a1",
                submitted_at: "SUBMISSION-1",
                entered_grade: "pass1",
              },
              {
                assignment_id: "a2",
                submitted_at: "SUBMISSION-2",
                entered_grade: "pass2",
              },
            ],
          },
        ]);
      }

      return [];
    }

    // eslint-disable-next-line class-methods-use-this
    async requestUrl(url) {
      if (url.includes("sections/section1")) {
        return { name: "Section 1" };
      }

      return {};
    }
  }

  ResultsTable.__set__("ldap", ldapMock);
  ResultsTable.__set__("CanvasApi", CanvasApiMock);

  const file = await ResultsTable.create("canvas_course_id", {
    log,
    oauth: {},
  });

  await file.preload();

  t.plan(1);
  const expected = [
    "sis1",
    "u1",
    "Section 1",
    "John",
    "Doe",
    '="111122334455"',
    "john@example.com",
    "CC content",
    "SUBMISSION-1",
    "pass1",
    "SUBMISSION-2",
    "pass2",
  ];
  await file.iterateRows((row) => {
    t.deepEqual(row, expected);
  });
});

test('"iterateLines()" should work even if some fields are missing', async (t) => {
  const ldapMock = {
    getBoundClient() {
      return {
        unbind: () => {},
      };
    },
    lookupUser() {},
  };

  class CanvasApiMock {
    // eslint-disable-next-line class-methods-use-this
    async get(url, cb) {
      if (url.includes("courses/canvas_course_id/assignments")) {
        return [{ name: "Assignment 1", id: "a1" }];
      }

      if (
        url.includes(
          "courses/canvas_course_id/users?enrollment_type[]=student_view"
        )
      ) {
        return [];
      }

      if (
        url.includes("courses/canvas_course_id/users?enrollment_type[]=student")
      ) {
        return [{ name: "John", id: "u1", login_id: "john@example.com" }];
      }

      if (
        url.includes(
          "courses/canvas_course_id/custom_gradebook_columns/cc1/data"
        )
      ) {
        return [{ user_id: "u1", content: "CC content" }];
      }

      if (url.includes("courses/canvas_course_id/custom_gradebook_columns")) {
        return [{ title: "CC 1", id: "cc1", position: 0 }];
      }

      if (url.includes("courses/canvas_course_id/students/submissions")) {
        return cb([
          {
            user_id: "u1",
            sis_user_id: "sis1",
            section_id: "section1",
            submissions: [],
          },
        ]);
      }

      return [];
    }

    // eslint-disable-next-line class-methods-use-this
    async requestUrl() {
      return {};
    }
  }

  ResultsTable.__set__("ldap", ldapMock);
  ResultsTable.__set__("CanvasApi", CanvasApiMock);

  const file = await ResultsTable.create("canvas_course_id", {
    log,
    oauth: {},
  });

  await file.preload();

  t.plan(1);
  const expected = [
    "sis1",
    "u1",
    "",
    "John",
    "",
    '=""',
    "john@example.com",
    "CC content",
    "",
    "",
  ];
  await file.iterateRows((row) => {
    t.deepEqual(row, expected);
  });
});

test("returned assignments should be in the right order", async (t) => {
  const ldapMock = {
    getBoundClient() {
      return {
        unbind: () => {},
      };
    },
    lookupUser(ldapClient, id) {
      if (id === "sis1") {
        return {
          givenName: "John",
          sn: "Doe",
          personnummer: "111122334455",
        };
      }

      return {
        givenName: "Anna",
        sn: "Doa",
        personnummer: "999988776655",
      };
    },
  };

  class CanvasApiMock {
    // eslint-disable-next-line class-methods-use-this
    async get(url, cb) {
      if (url.includes("courses/canvas_course_id/assignments")) {
        return [
          { name: "Assignment 1", id: "a1" },
          { name: "Assignment 2", id: "a2" },
        ];
      }
      if (
        url.includes(
          "courses/canvas_course_id/users?enrollment_type[]=student_view"
        )
      ) {
        return [];
      }
      if (
        url.includes("courses/canvas_course_id/users?enrollment_type[]=student")
      ) {
        return [
          { name: "John", id: "u1", login_id: "john@example.com" },
          { name: "Anna", id: "u2", login_id: "anna@example.com" },
        ];
      }
      if (
        url.includes(
          "courses/canvas_course_id/custom_gradebook_columns/cc1/data"
        )
      ) {
        return [];
      }
      if (url.includes("courses/canvas_course_id/custom_gradebook_columns")) {
        return [];
      }
      if (url.includes("courses/canvas_course_id/students/submissions")) {
        return cb([
          {
            user_id: "u1",
            sis_user_id: "sis1",
            section_id: "section1",
            submissions: [
              {
                assignment_id: "a2",
                submitted_at: "SUBMISSION-1-2",
                entered_grade: "pass1-2",
              },
            ],
          },
          {
            user_id: "u2",
            sis_user_id: "sis2",
            section_id: "section1",
            submissions: [
              {
                assignment_id: "a1",
                submitted_at: "SUBMISSION-2-1",
                entered_grade: "pass2-1",
              },
              {
                assignment_id: "a2",
                submitted_at: "SUBMISSION-2-2",
                entered_grade: "pass2-2",
              },
            ],
          },
        ]);
      }

      return [];
    }

    // eslint-disable-next-line class-methods-use-this
    async requestUrl(url) {
      if (url.includes("sections/section1")) {
        return { name: "Section 1" };
      }

      return {};
    }
  }

  ResultsTable.__set__("ldap", ldapMock);
  ResultsTable.__set__("CanvasApi", CanvasApiMock);

  const file = await ResultsTable.create("canvas_course_id", {
    log,
    oauth: {},
  });

  await file.preload();
  const body = [];

  await file.iterateRows((row) => body.push(row));
  const expectedBody = [
    [
      "sis1",
      "u1",
      "Section 1",
      "John",
      "Doe",
      '="111122334455"',
      "john@example.com",
      "",
      "",
      "SUBMISSION-1-2",
      "pass1-2",
    ],
    [
      "sis2",
      "u2",
      "Section 1",
      "Anna",
      "Doa",
      '="999988776655"',
      "anna@example.com",
      "SUBMISSION-2-1",
      "pass2-1",
      "SUBMISSION-2-2",
      "pass2-2",
    ],
  ];

  t.deepEqual(body[0], expectedBody[0], "first row should match");
  t.deepEqual(body[1], expectedBody[1], "second row should match");
  t.end();
});
