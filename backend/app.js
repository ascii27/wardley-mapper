const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => res.send('Wardley Mapper API'));
app.listen(port, () => console.log(`API running on port ${port}`));
