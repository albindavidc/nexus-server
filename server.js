const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./config/.env") });

const app = require("./app");
const connectDb = require("./config/db");

const startServer = async () => {
  try {
    connectDb();

    app.listen(process.env.PORT, () => {
      console.log("the server has been started on port", process.env.PORT);
    });
  } catch (error) {
    console.log(error);
  }
};

startServer();
