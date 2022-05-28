const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
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
    const reviewCollection = client
      .db("Drill_machine_tool")
      .collection("review");
    const paymentCollection = client
      .db("Drill_machine_tool")
      .collection("payment");
    //make admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    };

    //admin filter

    app.put(
      "/user/admin/:email",
      verifyAdmin,
      verifyJWT,
      async (req, res) => {
        const email = req.params.email;
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
    );

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

    app.post(
      "/create-payment-intent",
      verifyJWT,
      async (req, res) => {
        const service = req.body;
        const price = service.servicePrice;
        const amount = parseFloat(price) * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      }
    );

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

    //all purchase
    app.get("/allPurchase", async (req, res) => {
      const allPurchase = await purchaseCollection.find().toArray();
      res.send(allPurchase);
    });

    //all user get
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    //post-- add review
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    //get review
    app.get("/review", async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
    });

    app.post("/addService", async (req, res) => {
      const addService = req.body;
      const result = await servicesCollection.insertOne(addService);
      res.send(result);
    });

    app.get("/purchase/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const purchase = await purchaseCollection.findOne(query);
      res.send(purchase);
    });

    app.patch("/purchase/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedPurchase = await purchaseCollection.updateOne(
        filter,
        updateDoc
      );

      res.send({ updatedPurchase });
    });

    //delete service from all manage service
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });

    //delete purchase service
    app.delete("/purchase/:id",async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result);
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
