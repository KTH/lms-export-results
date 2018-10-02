FROM node:8.12

# We do this to avoid npm install when we're only changing code
COPY ["config", "config"]
COPY ["package.json", "package.json"]
COPY ["package-lock.json", "package-lock.json"]

# Source files in root
COPY ["app.js", "app.js"]

# Source files directories
COPY ["server", "server"]

RUN npm install --production --no-optional

EXPOSE 3001

CMD ["node", "app.js"]
