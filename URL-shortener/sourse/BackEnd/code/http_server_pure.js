// MAIN PART and VARIABLES

process.env.NODE_ENV = 'production';

const   http    = require('http'),
        file    = require('fs'),
        path    = require('path'),

        // -------------------------------------------------------------------------------------

        HTTP_PORT  = 80,
        IP         = 'localhost',

        HTTP_server    = http.createServer(),

        // --------------------------------------------------------------------------------------

        root_folder         = path.join(__dirname, '../../..'),
        sourse_folder       = path.join(root_folder, 'sourse');

// ---------------------------------------------------------------------------------------------------

HTTP_server.listen(HTTP_PORT, IP, (error) => {ServerStartLog(error, HTTP_PORT, IP)});
HTTP_server.on('request', (req, res) => {RequestListener(req, res)});

// MAIN SERVER FUNCTIONS =============================================================================

function ServerStartLog(error, PORT, IP) {
    if (error) {
        console.log(`Error is: ${error}`);
    } else {
        console.log(
        	`==================================================================`,'\n',
        	`HTTP server started at http://${IP}:${PORT}`,'\n',
        	`at ${new Date()}`,'\n',
            `------------------------------------------------------------------`,'\n'
        );
    }
}

function RequestListener (req, res) {   // requeat, response

    // Request method sort

    switch (req.method.toLowerCase()) {
        case 'post':
            PostResponse(req, res);
            break;
        case 'get':
            GetResponse(req, res);
            break;
        default:
            console.log('was getted strange request method: ', req.method);
    }

}

function GetResponse (req, res) {

    switch (req.url) {

        case '/':
            SendFile(res, path.join(sourse_folder, 'FrontEnd/index.html'));
            break;

        default:

            switch (true) {
                case Boolean(req.url.match(/Skyboxs/)):
                    SendFile(res, path.join(sourse_folder, 'FrontEnd/images/', req.url), 'image/png');
                    break;
                case Boolean(req.url.match(/models/)):
                    SendFile(res, path.join(sourse_folder, 'FrontEnd/images/', req.url), 'text/plain');
                    break;
                case Boolean(req.url.match(/libs/)):
                    SendFile(res, path.join(sourse_folder, 'FrontEnd/', req.url), 'text/javascript');
                    break;
                default:
                    SendFile(res, path.join(sourse_folder, 'FrontEnd/game_single_file/full_not_found.html'));
            }
    }

    console.log('=== end GET response ===');
}

function PostResponse (req, res) {
    // данные передаются потоком, поэтому их сначала нужно объединить, а в конце уже выполнить код
    let raw_data = '';

    req.on('data', data => raw_data += data).on('end', () => {
        if (raw_data) {
            console.log(raw_data);

            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end("response");
        }
    });

    console.log('=== end POST response ===');
}

function SendFile (res, file_path, file_type = 'text/html') {
    file.readFile(file_path, (error, data) => {
        if (error) {
            console.log(`Error in sending file: ${error}`);
            return;
        } else {
            res.writeHead(200, {'Content-Type': file_type});
            res.end(data);
        }
    });
}
