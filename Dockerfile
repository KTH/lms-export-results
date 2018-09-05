FROM node:8.9-wheezy
FROM kthse/kth-nodejs-api:2.4

COPY ["config", "config"]
COPY ["package.json", "package.json"]
COPY ["package-lock.json", "package-lock.json"]

# Source files
COPY ["app.js", "app.js"]

# Source files directories
COPY ["server", "server"]

RUN npm install --production --no-optional

EXPOSE 3001

CMD ["node", "app.js"]
