## LMS Export results
#
Export results (betygsunderlag) from canvas to something that can be
used for Ladok import (first attempt).

### Node version

This project uses node version 8.

    nvm install 8
    npm install
    npm run start-dev

http://localhost:3001/api/lms-export-results/_about

#### Configuration

The following settings are needed, either in a .env or in the process
environment:

```
CANVAS_CLIENT_ID
CANVAS_CLIENT_SECRET
LDAP_URL
LDAP_USERNAME
LDAP_PASSWORD
(PROXY_BASE if the protocol and host that the app sees does not match what the user should see)
```


### Setup canvas

#### Add an external tool
```
NAME="Exportera resultat"
curl -X POST 'https://kth.test.instructure.com/api/v1/accounts/1/external_tools' \
     -H "Authorization: Bearer $CANVAS_TOKEN" \
     -F "name=$NAME" \
     -F 'consumer_key=not_used' \
     -F 'shared_secret=not_used' \
     -F "url=http://localhost:3001/api/lms-export-results/export" \
     -F 'privacy_level=public' \
     -F 'course_navigation[visibility]=admins' \
     -F 'course_navigation[windowTarget]=_blank' \
     -F 'editor_button[enabled]=true' \
     -F "course_navigation[text]=$NAME" \
     -F 'course_navigation[default]=false' \
     -F 'course_navigation[enabled]=true'
```
#### Create a developer key
- https://kth.test.instructure.com/accounts/1/developer_keys
- Enter 'Omdirigera URI (ark):' http://localhost:3001/api/lms-export-results/export2
- Copy id and key and paste these into the .env file.
#### Testing

The template project uses a [sample setup][sample-test] for
tests using [tape][tape]. It is not required to use this test
harness in your projects. Simply remove the sample code and
any reference to it in your project's `package.json` file.

Keep in mind that you still need to provide a working npm
script for `npm test` for the build server. If you don't want
or need tests, a simple `echo "ok"` will suffice.

[api]: https://github.com/KTH/node-api
[web]: https://github.com/KTH/node-web
[tape]: https://github.com/substack/tape
[sample-test]: test/unit/specs/sampleCtrl-test.js


