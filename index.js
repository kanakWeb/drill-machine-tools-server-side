const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tn9l1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorize access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,
    function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      req.decoded = decoded;
      next();
    }
  );
}

async function run() {
  try {
    await client.connect();
    const servicesCollection = client
      .db("Drill_machine_tool")
      .collection("Services");
    const purchaseCollection = client
      .db("Drill_machine_tool")
      .collection("purchase");
    const userCollection = client
      .db("Drill_machine_tool")
      .collection("users");

    //admin make

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc
        );
        res.send(result);
      }
      else{
        res.status(403).send({message:'Forbidden access'})
      }
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    // get service tool home page
    app.get("/service", async (req, res) => {
      const service = await servicesCollection.find().toArray();
      res.send(service);
    });

    //get purchase
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    });

    //get per my purchase
    app.get("/purchase", verifyJWT, async (req, res) => {
      const clientEmail = req.query.clientEmail;
      const decodedEmail = req.decoded.email;
      if (clientEmail === decodedEmail) {
        const query = { clientEmail: clientEmail };
        const purchase = await purchaseCollection
          .find(query)
          .toArray();
        res.send(purchase);
      } else {
        return res.status(403).send({ message: "Forbidden access" });
      }
    });

    //purchase post
    app.post("/purchase", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      res.send(result);
    });

    //all user get
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Drill Machine Tools!");
});

app.listen(port, () => {
  console.log(`listening on port ready${port}`);
});
