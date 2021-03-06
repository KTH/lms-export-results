FROM node:12-alpine

WORKDIR /app
# We do this to avoid npm install when we're only changing code
COPY ["config", "config"]
COPY ["package.json", "package.json"]
COPY ["package-lock.json", "package-lock.json"]
COPY [".prettierignore", ".prettierignore"]

# Source files in root
COPY [".env.in", ".env.in"]
COPY ["app.js", "app.js"]

# Source files directories
COPY ["server", "server"]

RUN npm ci --production

EXPOSE 3001

CMD ["node", "app.js"]
