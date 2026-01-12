
const url = 'https://lrclib.net/api/search?q=coldplay';
fetch(url, {
    method: 'OPTIONS',
    headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
    }
}).then(res => {
    console.log('Status:', res.status);
    console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    console.log('Access-Control-Allow-Methods:', res.headers.get('access-control-allow-methods'));
}).catch(err => console.error(err));
