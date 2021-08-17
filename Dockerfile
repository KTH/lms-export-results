# This Dockerfile uses multi-stage builds as recommended in
# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md
#
FROM node:14-alpine AS production
WORKDIR /usr/src/app
COPY ["package.json", "package.json"]
COPY ["package-lock.json", "package-lock.json"]
RUN npm ci --production --unsafe-perm
COPY . .

EXPOSE 3001

CMD node app.js
