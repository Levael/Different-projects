// MAIN PART and VARIABLES

// process.env.NODE_ENV = 'production';

const   express     = require('express'),
        https       = require('https'),
        helmet      = require('helmet'),
        mongoose    = require('mongoose'),
        parser      = require('body-parser'),
        shortener   = require('shortid'),
        // compression = require('compression'),
        file        = require('fs'),
        path        = require('path'),

        // -------------------------------------------------------------------------------------

        HTTPS_PORT  = 443,
        IP          = 'localhost',

        // for https conection
        SSL_options = {
            'key' : file.readFileSync(path.join(__dirname, '..', 'ssl/key.pem')),
            'cert': file.readFileSync(path.join(__dirname, '..', 'ssl/cert.pem')),
        },

        app             = express(),
        HTTPS_server    = https.createServer(SSL_options, app),

        // --------------------------------------------------------------------------------------

        root_folder         = path.join(__dirname, '../../..'),
        sourse_folder       = path.join(root_folder, 'sourse');

// ---------------------------------------------------------------------------------------------------

HTTPS_server.listen(HTTPS_PORT, IP, (error) => {ServerStartLog(error, HTTPS_PORT, IP)});

mongoose.connect('mongodb://localhost/url', {
    useNewUrlParser: true, useUnifiedTopology: true
});

app.use(helmet());
app.set('view engine', 'ejs');
app.set('views', path.join(sourse_folder, '/Frontend'));
app.use(express.urlencoded({extended: false}));
// app.use(compression());

// MongoDB ---------------------------------------------------------------------------------------------------

const db_schema = new mongoose.Schema({
    full        : {type: String, required: true},
    short       : {type: String, required: true, default: shortener.generate},
    live_time   : {type: Number, required: true, default: 24},  // hours
    created_on  : {type: Date,   required: true, default: Date.now()},
});

const local_db = mongoose.model('local_db', db_schema);
// console.log(local_db.find());

// MAIN SERVER FUNCTIONS =============================================================================

function ServerStartLog(error, PORT, IP) {
    if (error) {
        console.log(`Error is: ${error}`);
    } else {
        console.log(
        	`==================================================================`,'\n',
        	`HTTPS server started at https://${IP}:${PORT}`,'\n',
        	`at ${new Date()}`,'\n',
            `------------------------------------------------------------------`,'\n'
        );
    }
}

async function InspirationTimer () {

    let urls = await local_db.find(),
        date_now = Date.now(),
        hour = 1000 * 60 * 60;

    urls.forEach((url) => {
        url.live_time -= Math.floor((date_now - url.created_on) / hour);
        url.save();

        if (url.live_time <= 0) {
            // deleting
            // urls.url = undefined;
            // local_db.findOneAndDelete({ full: 'http://google.com' }, function (err) {
            //   if(err) console.log(err);
            //   console.log("Successful deletion");
            // });
        }
    });
}

app.get('/', async (req, res) => {
    let urls = await local_db.find();
    res.render('index', {short_urls: urls});
});

app.post('/url', async (req, res) => {
    await local_db.create({full: req.body.url});
    res.redirect('/');
});

app.get('/:short_url', async (req, res) => {
    let url = await local_db.findOne({short: req.params.short_url});
    if (url == null) return res.sendStatus(404);
    res.redirect(url.full);
});

let TimeChecker = setInterval(InspirationTimer, 60000);     // every minute
