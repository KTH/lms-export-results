# This Dockerfile uses multi-stage builds as recommended in
# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md
#

# "development" image (development dependencies, use it for testing)
FROM node:14 AS development
WORKDIR /usr/src/app/development
COPY ["package.json", "package.json"]
COPY ["package-lock.json", "package-lock.json"]

RUN npm ci

# "builder" image (production dependencies + artifacts for compiling the dependencies)
FROM node:14 AS builder
WORKDIR /usr/src/app/builder

COPY ["package.json", "package.json"]
COPY ["package-lock.json", "package-lock.json"]

RUN npm ci --production --unsafe-perm

# "production" image (only production dependencies)
FROM node:14-alpine AS production
WORKDIR /usr/src/app
RUN apk add graphicsmagick ghostscript
COPY --from=builder /usr/src/app/builder/node_modules node_modules
COPY . .

EXPOSE 3001

CMD node app.js
