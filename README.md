# LMS Export results

Canvas External Tool for downloading a CSV file that contains grades of a specific Canvas Course.

This tool exports to file, there is also
[a tool that exports directly to Ladok](https://github.com/KTH/lms-export-to-ladok).

## Getting started

1. You need a Developer Key and Secret from Canvas. Get it following these instructions: https://community.canvaslms.com/docs/DOC-12657-4214441833

2. Set the following environmental variables with that info:

   ```
   CANVAS_CLIENT_ID
   CANVAS_CLIENT_SECRET
   ```

3. If you want to launch the app from a Canvas Course, you need to add an external tool to Canvas. Follow these instructions to create an external tool: https://canvas.instructure.com/doc/api/external_tools.html

4. You also need access to LDAP to get information that is only stored there. Set the following environmental variables for that:

   ```
   LDAP_URL
   LDAP_USERNAME
   LDAP_PASSWORD
   ```

5. Alternatively, you can create an `.env` file with all the environmental variables. That file will be loaded when you start the app.

6. Install the dependencies and start the app

   ``` javascript
   npm install
   npm start
   ```
