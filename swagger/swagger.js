const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Knit together Web Service API",
      version: "1.0.0",
      description: "API documentation for the Knit together Web Service project",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local server",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./swagger/*"],
};

const specs = swaggerJsDoc(options);

module.exports = {
  swaggerUi,
  specs,
};