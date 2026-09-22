FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Ensure uploads directory exists and is writable
RUN mkdir -p public/uploads
RUN chmod -R 777 public/uploads

EXPOSE 3000

CMD [ "npm", "start" ]
