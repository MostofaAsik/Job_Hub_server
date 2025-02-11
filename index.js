//Basic Requirement
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express()
const port = process.env.PORT || 3000

//middleware
app.use(express.json())
app.use(cors())

//mongodb code will appear here

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvjkksn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, } });

async function run() {
    try {
        await client.connect();

        //server code will appear here
        const jobsCollection = client.db("Job_Hub").collection("jobs");
        const jobApplicationCollection = client.db("Job_Hub").collection("job_application");


        //jobs apis

        app.get('/jobs', async (req, res) => {
            const cursor = jobsCollection.find({});
            const jobs = await cursor.toArray();
            res.send(jobs);
        });

        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const job = await jobsCollection.findOne({ _id: new ObjectId(id) });
            console.dir(job);
            res.send(job);
        });

        app.post('/jobs', async (req, res) => {
            const job = req.body;
            const result = await jobsCollection.insertOne(job);
            res.json(result);
        });

        app.patch('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const updatedJob = req.body;
            const result = await jobsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedJob });
            res.json(result);
        });

        app.delete('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });



        //appliction jobs apis
        //query based get data on email
        app.get('/application-job', async (req, res) => {
            const email = req.query.email;  // before semicolon email is sent from frontend
            const query = { applicant_email: email };
            const result = await jobApplicationCollection.find(query).toArray();

            for (const applicationsJob of result) {
                const job = await jobsCollection.findOne({ _id: new ObjectId(applicationsJob.job_id) });
                if (job) {
                    applicationsJob.title = job.title;
                    applicationsJob.company = job.company;
                    applicationsJob.location = job.location;
                    applicationsJob.company_logo = job.company_logo;
                }

            }

            res.json(result);
        });

        app.post('/application-job', async (req, res) => {
            const application_job = req.body;
            const result = await jobApplicationCollection.insertOne(application_job);
            res.json(result);
        });

        app.delete('/application-job/:id', async (req, res) => {
            const id = req.params.id;
            const result = await jobApplicationCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

// Simple Api's

app.get('/', (req, res) => {
    res.send('Job Hub  Server is Running ')
})

app.listen(port, () => {
    console.log(`Server is runnig on port ${port}`)
})