FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

COPY . .

# Generate Prisma client for dev
RUN npx prisma generate

# Expose port for debugging
EXPOSE 3000

CMD ["npm", "run", "start:dev"]
