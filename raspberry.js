const express = require('express');
const bodyParser = require('body-parser');
const raspberryAC = require('./controllers/raspberryAccessControl');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(async (req, res, next) => {
    await raspberryAC.accessValidation(req, res);
    next();
});

app.get('/api/test_get', (req, res) => {
    res.json("GET method access control validated!");
});

app.post('/api/test_post', (req, res) => {
    res.json("POST method access control validated!");
});

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
