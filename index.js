const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

async function run() {
  try {
    await client.connect();
    const servicesCollection = client
      .db("Drill_machine_tool")
      .collection("Services");

    app.get("/service", async (req, res) => {
      const service = await servicesCollection.find().toArray();
      res.send(service)
    });



    app.get("/service/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const service = await servicesCollection.findOne(
          query
        );
        res.send(service);
      });


  } finally {
    
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Tools!");
});

app.listen(port, () => {
  console.log(`listening on port ready${port}`);
});
