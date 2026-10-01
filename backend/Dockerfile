FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY migrations ./migrations
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["sh", "-c", "npm run migrate && if [ \"$SEED_ON_STARTUP\" = \"true\" ]; then npm run seed; fi && npm start"]
