FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache poppler-utils tesseract-ocr tesseract-ocr-data-por
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build
CMD ["npm", "start"]
