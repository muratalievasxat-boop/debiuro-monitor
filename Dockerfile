FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --omit=dev
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "dist/index.cjs"]
