const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "carRental.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

//Authentication Token verify
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// Get Brands API
app.get("/cars/brands/", authenticateToken, async (request, response) => {
  const { search_q = "", order_by = "" } = request.query;
  const getBrandsQuery = `
    SELECT
      *
    FROM
     cars
    WHERE
     car_brand LIKE '%${search_q}%'
     ORDER BY ${order_by}`;
  const carBrands = await db.all(getBrandsQuery);
  response.send(carBrands);
});

// POST BOOK A CAR API
app.post("/rent/", authenticateToken, async (request, response) => {
  const rentDetails = request.body;
  const { name, car_model, address, fare_price } = rentDetails;
  const addRentQuery = `
    INSERT INTO
      rent (name,car_model,address,fare_price)
    VALUES
      (
        '${name}',
        '${car_model}',
        '${address}',
         ${fare_price},
      );`;

  const dbResponse = await db.run(addBookQuery);
  const Rent = dbResponse.lastID;
  response.send("carBooked");
});

//Feedback to CAR RENTAL

app.post("/feedback/", authenticateToken, async (request, response) => {
  const { name, subject, message, date_of_experience, rating } = request.body;
  const postFeedBackQuery = `
  INSERT INTO
    feedback(name,subject,message,date_of_experience,rating)
  VALUES
    ('${name}', '${subject}', '${message}', '${date_of_experience}', ${rating});`;
  const feedback = await db.run(postFeedBackQuery);
  console.log(feedback);
  response.send("Thanks For your Valuable Feedback");
});
