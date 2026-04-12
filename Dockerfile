FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN yarn install
COPY . .
EXPOSE 3303
CMD ["yarn", "start"]